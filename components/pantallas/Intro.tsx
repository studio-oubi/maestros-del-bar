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
      className="flex h-full w-full cursor-pointer select-none flex-col items-center px-[8cqw] text-center outline-none"
    >
      <div className="pt-[5cqh]">
        <Image
          src={IMG.logoBrugal}
          alt="Brugal"
          width={220}
          height={90}
          className="h-auto w-[42cqw] max-w-[220px]"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[2.6cqh]">
        <h1 className="texto-titulo">
          Arma el mix
          <br />
          Perfecto
        </h1>
        <p className="texto-sub max-w-[78cqw] leading-snug">
          Recuerda la receta y completa tu trago antes de llegar a cero.
        </p>
      </div>

      <p className="mb-[8cqh] animate-pulse font-cuerpo text-[1cqh] text-crema/60 [animation-duration:2.4s]">
        toca para continuar....
      </p>
    </div>
  );
}
