"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";

const UMBRAL_MOV = 12; // px: más que esto se considera scroll/drag, no un toque
// Ignora activaciones justo tras montar: el pointerup que hace avanzar a
// Recetas dispara además un "click" fantasma del MISMO toque, que cae sobre
// esta pantalla en cuanto se monta (mismo punto en la mismas coordenadas) y
// la saltaba de inmediato. El patrón pointerdown/pointerup (sin click) ya
// evita que ese fantasma dispare por sí solo; esta guarda es un cinturón
// extra para variantes del navegador que sí reenvíen pointerdown+up.
const GUARDA_MONTAJE_MS = 400;

// Pantalla puente entre "recetas" y el reto: toda la pantalla es el CTA.
export function Intro() {
  const { despachar } = useJuego();
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const montadoEn = useRef(0);

  useEffect(() => {
    montadoEn.current = performance.now();
  }, []);

  const continuar = () => despachar({ tipo: "IR", a: "elige-trago" });

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Continuar"
      onPointerDown={(e) => {
        inicio.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const p = inicio.current;
        inicio.current = null;
        if (!p) return;
        if (performance.now() - montadoEn.current < GUARDA_MONTAJE_MS) return;
        const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (dist <= UMBRAL_MOV) continuar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") continuar();
      }}
      className="relative h-full w-full cursor-pointer select-none px-[8cqw] text-center outline-none"
    >
      {/* Logo fuera del flujo, centrado a 17.5cqh (igual que Home). */}
      <div className="absolute left-1/2 top-[17.5cqh] -translate-x-1/2 -translate-y-1/2">
        <Image
          src={IMG.logoBrugal}
          alt="Brugal"
          width={220}
          height={90}
          className="h-auto w-[42cqw] max-w-[220px]"
        />
      </div>

      {/* Bloque título+subtítulo anclado cerca del tercio superior (no
          centrado verticalmente): el vacío queda abajo, como en la
          referencia de diseño. */}
      <div className="absolute left-1/2 top-[28cqh] flex w-full -translate-x-1/2 flex-col items-center gap-[2.5cqh]">
        <h1 className="font-titulo text-[7.7cqh] font-medium leading-[1.02] uppercase text-white">
          Arma el mix
          <br />
          Perfecto
        </h1>
        <p className="max-w-[60cqw] font-cuerpo text-[1.6cqh] font-bold uppercase leading-snug tracking-[0.14em] text-oro">
          Recuerda la receta y
          <br />
          completa tu trago
          <br />
          antes de llegar a cero.
        </p>
      </div>

      <p className="absolute left-1/2 top-[62cqh] -translate-x-1/2 animate-pulse font-titulo text-[2.3cqh] font-medium text-crema/45 [animation-duration:2.4s]">
        toca para continuar....
      </p>
    </div>
  );
}
