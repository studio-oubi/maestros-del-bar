// Service worker artesanal (sin next-pwa) para el kiosko Mix Challenge: tras la
// primera carga con red, la app debe abrir y jugarse SIN internet. Los registros
// hechos offline se encolan en localStorage (ver lib/cola-offline.ts), no aquí.
const CACHE = "mix-challenge-v1";
// Núcleo precacheado en install: shell + manifest e iconos PWA para que la app
// instalada abra standalone y offline.
const NUCLEO = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (evento) => {
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(NUCLEO).catch(() => {})),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// El cliente envía la lista de imágenes a precachear justo después de registrar
// el SW (ver lib/sw-registro.ts). Cada URL ya lleva su ?v= (hash de contenido).
self.addEventListener("message", (evento) => {
  const data = evento.data;
  if (!data || data.tipo !== "precache" || !Array.isArray(data.urls)) return;
  evento.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        data.urls.map((url) =>
          cache.match(url).then(
            (hit) =>
              hit ||
              fetch(url, { cache: "no-cache" })
                .then((res) => {
                  if (res && res.ok) return cache.put(url, res.clone());
                })
                .catch(() => {}),
          ),
        ),
      ),
    ),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return; // POST/API: solo red, nunca cacheado
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // terceros: sin tocar
  if (url.pathname.startsWith("/api/")) return; // API: solo red

  // Navegaciones: network-first para tomar la última versión del HTML; si no hay
  // red, se sirve la copia cacheada de "/" y la app arranca offline.
  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/").then((res) => res || caches.match(req))),
    );
    return;
  }

  // Imágenes y estáticos de Next (hasheados/inmutables): cache-first, se cachean
  // al primer fetch.
  if (url.pathname.startsWith("/img/") || url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res && res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copia)).catch(() => {});
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Resto de GET del mismo origen (manifest e iconos PWA precacheados, etc.):
  // cache-first con respaldo a red, para servirlos también sin conexión.
  evento.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
