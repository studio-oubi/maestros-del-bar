// Precarga una lista de imágenes e informa el progreso (0-100).
// Los errores también cuentan como "terminado" para no colgar la carga.
// Descarga en tandas pequeñas (CONCURRENCIA) para no saturar red/CPU en
// dispositivos de gama baja: mismo resultado, picos mucho menores.
const CONCURRENCIA = 5;

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
      const img = new Image();
      img.onload = marcar;
      img.onerror = marcar;
      img.src = url;
    };

    for (let i = 0; i < Math.min(CONCURRENCIA, total); i += 1) lanzar();
  });
}
