"use client";

import Image from "next/image";
import { useRef } from "react";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";
import { RECETAS } from "@/lib/recetas";

const UMBRAL_MOV = 12; // px: más que esto se considera scroll/drag, no un toque

// Pantalla "memoriza" (mock 5): muestra las 3 recetas completas antes del
// reto. Toda la pantalla es "toca para continuar" (igual que Intro.tsx).
// Debe caber en 100dvh sin scroll (390×844).
export function Recetas() {
  const { despachar } = useJuego();
  const inicio = useRef<{ x: number; y: number } | null>(null);

  const continuar = () => despachar({ tipo: "IR", a: "intro" });

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
        const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (dist <= UMBRAL_MOV) continuar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") continuar();
      }}
      className="flex h-full w-full cursor-pointer select-none flex-col items-center px-[7cqw] pt-[7cqh] pb-[3cqh] outline-none"
    >
      <Image
        src={IMG.logoBrugal}
        alt="Brugal"
        width={220}
        height={90}
        className="h-auto w-[28cqw] max-w-[130px] shrink-0"
      />

      <div className="flex w-full flex-1 flex-col justify-center">
        {RECETAS.map((receta, i) => (
          <div key={receta.id}>
            {i > 0 && <div className="ml-[17cqw] h-px bg-oro/25" />}
            <div className="flex items-center gap-[4cqw] py-[1.8cqh]">
              <Image
                src={receta.imgTrago}
                alt=""
                width={160}
                height={160}
                className="h-[13.5cqh] w-[13.5cqh] shrink-0 object-contain"
              />
              <div className="flex-1">
                <h2 className="font-titulo text-[2.3cqh] font-medium uppercase leading-[1.04] text-white">
                  {receta.nombre}
                </h2>
                <ul className="mt-[0.7cqh] space-y-[0.2cqh]">
                  {receta.lineasReceta.map((linea) => (
                    <li key={linea} className="texto-label !text-[1.15cqh] !tracking-[0.04em] leading-tight">
                      • {linea}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mb-[1.2cqh] animate-pulse font-cuerpo text-[1cqh] text-crema/60 [animation-duration:2.4s]">
        toca para continuar....
      </p>

      <div className="relative aspect-[1031/300] w-[62cqw] max-w-[260px] shrink-0">
        <Image
          src={IMG.escapate}
          alt="Escápate a lo extraordinario"
          fill
          sizes="64vw"
          className="select-none object-contain"
        />
      </div>
    </div>
  );
}
