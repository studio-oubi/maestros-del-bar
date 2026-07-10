import { ALL_IMAGES } from "@/lib/asset-manifest";

// Registra el service worker (public/sw.js) solo en producción y, cuando está
// listo, le envía la lista de imágenes + la página raíz para precachearlas. Así,
// tras una sola visita con red, un refresco sin internet carga y juega completo.
export function registrarServiceWorker(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) =>
      navigator.serviceWorker.ready.then(() => {
        const activo = reg.active || navigator.serviceWorker.controller;
        activo?.postMessage({ tipo: "precache", urls: [...ALL_IMAGES, "/"] });
      }),
    )
    .catch(() => {
      // Sin SW la app sigue funcionando online; el registro offline no depende de él.
    });
}
