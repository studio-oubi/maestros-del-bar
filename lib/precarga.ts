// Precarga una lista de imágenes e informa el progreso (0-100).
// Los errores también cuentan como "terminado" para no colgar la carga.
export function precargar(urls: string[], onProgress: (pct: number) => void): Promise<void> {
  const total = urls.length;
  if (total === 0) {
    onProgress(100);
    return Promise.resolve();
  }

  let hechas = 0;

  return new Promise((resolve) => {
    const marcar = () => {
      hechas += 1;
      onProgress(Math.round((hechas / total) * 100));
      if (hechas === total) resolve();
    };

    for (const url of urls) {
      const img = new Image();
      img.onload = marcar;
      img.onerror = marcar;
      img.src = url;
    }
  });
}
