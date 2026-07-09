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
type Modo = "webgl" | "css-mascara" | "css-simple";

export function ShaderBotellas({ imagenes, intervaloMs = 6000, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modo, setModo] = useState<Modo>("webgl");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // prefers-reduced-motion: nada de shader ni máscara animada, solo un
    // crossfade simple (el spec pide movimiento mínimo).
    const reducido =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido) {
      setModo("css-simple");
      return;
    }

    const ctrl = crearDissolve(canvas, imagenes, intervaloMs);
    if (!ctrl) {
      setModo("css-mascara");
      return;
    }
    return () => ctrl.destruir();
  }, [imagenes, intervaloMs]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ display: modo === "webgl" ? "block" : "none" }}
        aria-hidden
      />
      {modo !== "webgl" && (
        <FallbackCss
          imagenes={imagenes}
          intervaloMs={intervaloMs}
          conMascara={modo === "css-mascara"}
        />
      )}
    </div>
  );
}

/**
 * Fallback sin WebGL: stack de imágenes con crossfade por opacidad.
 * `conMascara` añade una máscara radial (look "dissolve") cuando el fallback es
 * por falta de WebGL; en reduced-motion se omite para un crossfade limpio.
 */
function FallbackCss({
  imagenes,
  intervaloMs,
  conMascara,
}: {
  imagenes: string[];
  intervaloMs: number;
  conMascara: boolean;
}) {
  const [activo, setActivo] = useState(0);

  useEffect(() => {
    if (imagenes.length < 2) return;
    const id = setInterval(() => setActivo((i) => (i + 1) % imagenes.length), intervaloMs);
    return () => clearInterval(id);
  }, [imagenes.length, intervaloMs]);

  const mascara =
    conMascara && "radial-gradient(circle at 50% 45%, black 60%, transparent 120%)";

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
            maskImage: i === activo && mascara ? mascara : undefined,
            WebkitMaskImage: i === activo && mascara ? mascara : undefined,
          }}
        />
      ))}
    </div>
  );
}
