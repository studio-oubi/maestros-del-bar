"use client";

import Image from "next/image";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";
import { RECETAS } from "@/lib/recetas";

// Pantalla "memoriza": muestra las 3 recetas completas antes del reto.
// Debe caber en 100dvh sin scroll (390×844).
export function Recetas() {
  const { despachar } = useJuego();

  return (
    <div className="flex h-full w-full flex-col items-center px-[7cqw] pt-[3.5cqh] pb-[2.5cqh]">
      <Image
        src={IMG.logoBrugal}
        alt="Brugal"
        width={220}
        height={90}
        className="h-auto w-[30cqw] max-w-[140px]"
      />

      <div className="flex w-full flex-1 flex-col justify-center divide-y divide-oro/25">
        {RECETAS.map((receta) => (
          <div key={receta.id} className="flex items-center gap-[4cqw] py-[1.6cqh]">
            <Image
              src={receta.imgTrago}
              alt=""
              width={96}
              height={96}
              className="h-[8.4cqh] w-[8.4cqh] max-h-[72px] max-w-[72px] shrink-0 object-contain"
            />
            <div className="flex-1">
              <h2 className="font-titulo text-[clamp(14px,4.4cqw,18px)] font-semibold uppercase leading-[1.05] text-white">
                {receta.nombre}
              </h2>
              <ul className="mt-[0.6cqh] space-y-[0.25cqh]">
                {receta.lineasReceta.map((linea) => (
                  <li
                    key={linea}
                    className="font-cuerpo text-[clamp(9px,2.5cqw,10.5px)] font-medium uppercase tracking-[0.04em] text-oro"
                  >
                    • {linea}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => despachar({ tipo: "IR", a: "intro" })}
        className="mt-[1cqh] shrink-0 rounded-full bg-gradient-to-b from-oro-claro to-oro px-[9cqw] py-[1.4cqh] font-cuerpo text-[clamp(11px,3.1cqw,13px)] font-medium uppercase tracking-[0.16em] text-navy-deep shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-transform active:scale-95"
      >
        Continuar
      </button>

      <Image
        src={IMG.escapate}
        alt="Escápate a lo extraordinario"
        width={1031}
        height={300}
        className="mt-[1.6cqh] h-auto w-[58cqw] max-w-[230px] shrink-0"
      />
    </div>
  );
}
