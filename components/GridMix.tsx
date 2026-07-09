"use client";

import Image from "next/image";
import { useCallback } from "react";
import { IMG } from "@/lib/asset-manifest";
import { INGREDIENTES } from "@/lib/recetas";
import type { IngredienteId } from "@/lib/recetas";
import { useJuego } from "@/lib/juego";

// Ingredientes cuyo asset es una foto recortada (llenan el medallón, object-cover).
// El resto son PNG aislados sobre fondo transparente (object-contain, con aire).
const RECORTES_FOTO = new Set<IngredienteId>(["toronja", "albahaca", "limon"]);

// Última pantalla del reto (mock 12): grid 3×3 de ingredientes, sin límite de
// selección (elegir de más = "sobraron", lo evalúa el reducer). MEZCLAR evalúa.
export function GridMix({ restante }: { restante: number }) {
  const { estado, despachar } = useJuego();
  const seleccionados = estado.elecciones.ingredientes;

  const onMezclar = useCallback(() => {
    despachar({ tipo: "MEZCLAR", tiempoRestante: restante });
  }, [despachar, restante]);

  return (
    <div className="flex h-full w-full flex-col items-center px-[7cqw] pt-[7cqh] pb-[4cqh] text-center">
      <div className="relative h-[5cqh] w-[38cqw]">
        <Image src={IMG.logoBrugal} alt="Brugal" fill sizes="40vw" className="object-contain" priority />
      </div>

      <div className="mt-[3.6cqh] flex flex-col items-center gap-[1cqh]">
        <span className="texto-label">ELIGE TU MEZCLA</span>
        <span className="font-titulo text-[2.6cqh] font-medium uppercase leading-tight text-white">
          COMPLETA EL MIX
        </span>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="grid w-full max-w-[86cqw] grid-cols-3 gap-x-[3.5cqw] gap-y-[2.6cqh]">
          {estado.grid.map((ing) => {
            const info = INGREDIENTES[ing];
            const activo = seleccionados.includes(ing);
            const cover = RECORTES_FOTO.has(ing);
            return (
              <button
                key={ing}
                type="button"
                onClick={() => despachar({ tipo: "TOGGLE_INGREDIENTE", ing })}
                className="flex flex-col items-center gap-[0.8cqh]"
              >
                <span
                  className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full bg-navy/70 ring-2 transition-shadow duration-200 ${
                    activo ? "ring-oro shadow-[0_0_0_3px_rgba(201,164,92,.25)]" : "ring-crema/15"
                  }`}
                >
                  <Image
                    src={info.img}
                    alt=""
                    fill
                    sizes="30vw"
                    className={cover ? "object-cover" : "object-contain p-[14%]"}
                  />
                  {activo && (
                    <span className="absolute right-[4%] top-[4%] flex h-[20%] min-h-[16px] w-[20%] min-w-[16px] items-center justify-center rounded-full bg-oro text-navy-deep shadow-[0_2px_6px_rgba(0,0,0,.4)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[65%] w-[65%]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className="font-cuerpo text-[clamp(9px,2.6cqw,11px)] font-medium uppercase tracking-[0.04em] text-crema">
                  {info.nombre}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onMezclar}
        disabled={seleccionados.length === 0}
        className="texto-boton shrink-0 rounded-full bg-gradient-to-b from-oro-claro to-oro px-[14cqw] py-[0.55cqh] leading-none shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      >
        Mezclar
      </button>
    </div>
  );
}
