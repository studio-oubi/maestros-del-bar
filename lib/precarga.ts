// Precarga una lista de imágenes e informa el progreso (0-100).
// Los errores también cuentan como "terminado" para no colgar la carga.
// Descarga en tandas pequeñas (CONCURRENCIA) para no saturar red/CPU en
// dispositivos de gama baja: mismo resultado, picos mucho menores.
const CONCURRENCIA = 5;

// Cache de imágenes RETENIDAS a nivel de módulo. Sin esto, los HTMLImageElement
// creados en la precarga se recogen (GC) al terminar y el bitmap DECODIFICADO se
// libera: al volver a mostrar la imagen (p.ej. las fotos de Recetas) el navegador
// la relee del disk cache y la RE-DECODIFICA → parpadeo/"aparece tarde". Mantener
// la referencia viva conserva la imagen en el memory cache decodificada, así un
// <img> posterior con la MISMA url pinta al instante (sin red ni re-decode).
const retenidas = new Map<string, HTMLImageElement>();

export function precargar(urls: string[], onProgress: (pct: number) => void): Promise<void> {
  const total = urls.length;
  if (total === 0) {
    onProgress(100);
    return Promise.resolve();
  }

  let hechas = 0;
  let siguiente = 0;

  return new Promise((resolve) => {
    const marcar = () => {
      hechas += 1;
      onProgress(Math.round((hechas / total) * 100));
      if (hechas === total) resolve();
      else lanzar();
    };

    const lanzar = () => {
      if (siguiente >= total) return;
      const url = urls[siguiente];
      siguiente += 1;
      if (retenidas.has(url)) {
        marcar();
        return;
      }
      const img = new Image();
      img.onload = () => {
        // decode() fuerza que el bitmap quede completamente decodificado (no solo
        // descargado); combinado con la retención evita el re-decode posterior.
        img.decode().catch(() => {});
        marcar();
      };
      img.onerror = marcar;
      img.src = url;
      retenidas.set(url, img); // referencia viva: no se libera el decodificado
    };

    for (let i = 0; i < Math.min(CONCURRENCIA, total); i += 1) lanzar();
  });
}
