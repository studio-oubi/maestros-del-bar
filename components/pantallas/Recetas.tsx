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
      className="flex h-full w-full cursor-pointer select-none flex-col items-center pt-[14cqh] pb-[9.5cqh] outline-none"
    >
      <Image
        src={IMG.logoBrugal}
        alt="Brugal"
        width={220}
        height={90}
        className="h-auto w-[42cqw] max-w-[210px] shrink-0"
      />

      {/* Ancho de contenido (w-max), NO fijo: si el contenedor fuera más ancho
          que la fila más ancha, el grupo (foto+texto, alineados a la
          izquierda ENTRE SÍ) quedaría pegado a la izquierda de esa caja con
          un hueco muerto a la derecha. Con w-max la caja mide exactamente lo
          que ocupa la fila más ancha, y mx-auto centra ESE conjunto como
          bloque — foto y texto quedan simétricos respecto al centro, igual
          que en el mock. */}
      <div className="mx-auto flex w-max flex-1 flex-col justify-center">
        {RECETAS.map((receta, i) => (
          <div key={receta.id}>
            {i > 0 && <div className="h-px bg-oro/25" />}
            <div className="flex items-center gap-[2cqw] py-[1.2cqh]">
              <Image
                src={receta.imgTrago}
                alt=""
                width={726}
                height={1300}
                className="h-[18.5cqh] w-auto shrink-0 object-contain"
              />
              {/* max-w acota el nombre más largo (LIMÓN ALBAHACA EXTRA VIEJO)
                  a 2 líneas como en el mock, en vez de una sola línea
                  enorme que ensancharía el w-max de todo el grupo. */}
              <div className="max-w-[46cqw]">
                <h2 className="font-titulo text-[2.9cqh] font-medium uppercase leading-[1.04] text-white">
                  {receta.nombre}
                </h2>
                <ul className="mt-[0.15cqh] space-y-[0.2cqh]">
                  {receta.lineasReceta.map((linea) => (
                    <li key={linea} className="texto-label !text-[1.3cqh] !tracking-[0.04em] leading-tight">
                      • {linea}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mb-[0.8cqh] animate-pulse font-cuerpo text-[1cqh] text-crema/60 [animation-duration:2.4s]">
        toca para continuar....
      </p>

      <div className="relative aspect-[1031/300] w-[66cqw] max-w-[280px] shrink-0">
        <Image
          src={IMG.escapate}
          alt="Escápate a lo extraordinario"
          fill
          sizes="68vw"
          className="select-none object-contain"
        />
      </div>
    </div>
  );
}
