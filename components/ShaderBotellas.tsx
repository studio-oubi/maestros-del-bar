"use client";

import { useEffect, useRef, useState } from "react";
import { crearDissolve } from "@/lib/webgl-dissolve";

interface Props {
  imagenes: string[];
  intervaloMs?: number;
  className?: string;
}

/**
 * Escena de botellas que se funden entre sí con un shader de ruido (dissolve).
 * Si WebGL no está disponible, cae a un crossfade CSS con máscara radial.
 */
export function ShaderBotellas({ imagenes, intervaloMs = 6000, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [usarFallback, setUsarFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctrl = crearDissolve(canvas, imagenes, intervaloMs);
    if (!ctrl) {
      setUsarFallback(true);
      return;
    }
    return () => ctrl.destruir();
  }, [imagenes, intervaloMs]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ display: usarFallback ? "none" : "block" }}
        aria-hidden
      />
      {usarFallback && <FallbackCss imagenes={imagenes} intervaloMs={intervaloMs} />}
    </div>
  );
}

/** Fallback sin WebGL: stack de imágenes con crossfade y máscara radial animada. */
function FallbackCss({ imagenes, intervaloMs }: { imagenes: string[]; intervaloMs: number }) {
  const [activo, setActivo] = useState(0);

  useEffect(() => {
    if (imagenes.length < 2) return;
    const id = setInterval(() => setActivo((i) => (i + 1) % imagenes.length), intervaloMs);
    return () => clearInterval(id);
  }, [imagenes.length, intervaloMs]);

  return (
    <div className="absolute inset-0">
      {imagenes.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[1600ms] ease-in-out"
          style={{
            opacity: i === activo ? 1 : 0,
            maskImage:
              i === activo
                ? "radial-gradient(circle at 50% 45%, black 60%, transparent 120%)"
                : undefined,
            WebkitMaskImage:
              i === activo
                ? "radial-gradient(circle at 50% 45%, black 60%, transparent 120%)"
                : undefined,
          }}
        />
      ))}
    </div>
  );
}
