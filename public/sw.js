// Service worker artesanal (sin next-pwa) para el kiosko Mix Challenge: tras la
// primera carga con red, la app debe abrir y jugarse SIN internet. Los registros
// hechos offline se encolan en localStorage (ver lib/cola-offline.ts), no aquí.
const CACHE = "mix-challenge-v1";
// Cache propio para el video de lanzamiento (44MB): se prefetchea aparte, en
// segundo plano, para no cargarlo en el arranque ni mezclarlo con el resto.
// v2 (2026-07-23): la v1 podía quedar corrupta/atascada — el put del prefetch
// clonaba la respuesta sin consumir el original, y con 44MB ese gemelo sin leer
// puede estancar la escritura y dejar el Cache Storage del video bloqueado
// (síntoma real: video con "Format error" al instante o petición colgada, el
// overlay se cierra y la app arranca sin video). El rename purga la v1 en cada
// dispositivo vía el barrido del activate.
const VIDEO_CACHE = "mc-video-v2";
const VIDEO_URL = "/video-lanzamiento.mp4";
// Núcleo precacheado en install: shell + manifest e iconos PWA para que la app
// instalada abra standalone y offline.
const NUCLEO = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

// Prefetch del video (no bloqueante): descarga completa una sola vez a VIDEO_CACHE.
function prefetchVideo() {
  return caches.open(VIDEO_CACHE).then((cache) =>
    cache.match(VIDEO_URL).then((hit) => {
      if (hit) return; // ya cacheado
      return fetch(VIDEO_URL, { cache: "no-cache" })
        .then((res) => {
          // put() consume la respuesta directamente — NUNCA clonar acá: un
          // clone sin consumir su gemelo de 44MB es lo que atascaba la v1.
          if (res && res.ok && res.status === 200) return cache.put(VIDEO_URL, res);
        })
        .catch(() => {});
    }),
  );
}

// Sirve el video desde VIDEO_CACHE atendiendo Range (los <video>, sobre todo en
// Safari/WebKit, piden rangos y esperan un 206 con Content-Range). Sin cache
// aún: pasa a red (online) y la guarda para la próxima. Con cache: corta el
// buffer completo y responde el rango pedido.
async function servirVideo(req) {
  // Red con 504 de respaldo (offline sin cache): el overlay recibe error y
  // cierra a Home, sin pantalla negra colgada.
  const red = () => fetch(req).catch(() => new Response(null, { status: 504 }));
  let buf, tipo;
  try {
    const cache = await caches.open(VIDEO_CACHE);
    const res = await cache.match(VIDEO_URL);
    // Sin cache: red directa, sin más. El prefetch (post-precarga) es el ÚNICO
    // que escribe a VIDEO_CACHE — antes acá se disparaba una segunda descarga
    // completa en paralelo, complejidad que contribuía al atasco de la v1.
    if (!res) return red();
    buf = await res.arrayBuffer();
    // Entrada corrupta (descarga interrumpida / escritura a medias): el tamaño
    // real no cuadra con el declarado. Se purga y se sirve de red — nunca
    // entregar bytes truncados al <video> (da "Format error" y mata el intro).
    const declarado = parseInt(res.headers.get("Content-Length") || "0", 10);
    if (declarado > 0 && buf.byteLength !== declarado) {
      cache.delete(VIDEO_URL).catch(() => {});
      return red();
    }
    tipo = res.headers.get("Content-Type") || "video/mp4";
  } catch {
    // Cache Storage caído o ilegible: que el video no dependa de él.
    return red();
  }
  const total = buf.byteLength;
  const range = req.headers.get("range");
  if (!range) {
    return new Response(buf, {
      status: 200,
      headers: { "Content-Type": tipo, "Content-Length": String(total), "Accept-Ranges": "bytes" },
    });
  }
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let inicio = m && m[1] ? parseInt(m[1], 10) : 0;
  let fin = m && m[2] ? parseInt(m[2], 10) : total - 1;
  if (isNaN(inicio)) inicio = 0;
  if (isNaN(fin) || fin >= total) fin = total - 1;
  if (inicio > fin || inicio >= total) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
  }
  const trozo = buf.slice(inicio, fin + 1);
  return new Response(trozo, {
    status: 206,
    headers: {
      "Content-Type": tipo,
      "Content-Range": `bytes ${inicio}-${fin}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(trozo.byteLength),
    },
  });
}

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
        Promise.all(
          claves.filter((k) => k !== CACHE && k !== VIDEO_CACHE).map((k) => caches.delete(k)),
        ),
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
                  // put() consume la respuesta; sin clone (ver prefetchVideo).
                  if (res && res.ok) return cache.put(url, res);
                })
                .catch(() => {}),
          ),
        ),
      ),
    )
      // Cuando las imágenes ya están cacheadas, arranca el prefetch del video en
      // segundo plano (no bloquea el arranque; el video no está en el loading).
      .then(() => prefetchVideo()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return; // POST/API: solo red, nunca cacheado
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // terceros: sin tocar
  if (url.pathname.startsWith("/api/")) return; // API: solo red

  // Video de lanzamiento: cache-first desde VIDEO_CACHE con soporte de Range
  // (206). Debe ir ANTES del handler genérico, que devolvería un 200 completo
  // a una petición Range y rompería la reproducción en Safari/WebKit.
  if (url.pathname === VIDEO_URL) {
    // Con query (p.ej. ?red=1, el reintento del overlay tras un error): pasa
    // DIRECTO a red, sin tocar Cache Storage — vía de escape si el cache del
    // video quedó en mal estado en el dispositivo.
    if (url.search) return;
    evento.respondWith(servirVideo(req));
    return;
  }

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
