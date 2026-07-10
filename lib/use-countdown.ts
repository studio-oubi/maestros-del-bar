"use client";

import { useEffect, useRef, useState } from "react";

function formato(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function useCountdown(activo: boolean, segundos: number, onExpirar: () => void) {
  const [restante, setRestante] = useState(Math.ceil(segundos));
  const inicioRef = useRef<number | null>(null);
  const expiradoRef = useRef(false);
  const mostradoRef = useRef(Math.ceil(segundos));
  const onExpirarRef = useRef(onExpirar);
  onExpirarRef.current = onExpirar;

  useEffect(() => {
    if (!activo) {
      inicioRef.current = null;
      expiradoRef.current = false;
      mostradoRef.current = Math.ceil(segundos);
      setRestante(Math.ceil(segundos));
      return;
    }

    inicioRef.current = performance.now();
    expiradoRef.current = false;
    let raf: number;

    const tick = () => {
      const inicio = inicioRef.current;
      if (inicio === null) return;
      const transcurrido = (performance.now() - inicio) / 1000;
      const nuevoRestante = Math.max(0, segundos - transcurrido);
      const mostrado = Math.ceil(nuevoRestante);
      if (mostrado !== mostradoRef.current) {
        mostradoRef.current = mostrado;
        setRestante(mostrado);
      }
      if (nuevoRestante <= 0) {
        if (!expiradoRef.current) {
          expiradoRef.current = true;
          onExpirarRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, segundos]);

  return { restante, formato: formato(restante) };
}
