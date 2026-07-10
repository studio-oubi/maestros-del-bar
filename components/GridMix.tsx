"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { IMG } from "@/lib/asset-manifest";
import { INGREDIENTES } from "@/lib/recetas";
import type { IngredienteId } from "@/lib/recetas";
import { PanelConfirmar } from "@/components/PanelConfirmar";
import { useJuego } from "@/lib/juego";

// Ingredientes cuyo asset es una foto recortada (llenan el medallón, object-cover).
// El resto son PNG aislados sobre fondo transparente (object-contain, con aire).
const RECORTES_FOTO = new Set<IngredienteId>(["toronja", "albahaca"]);

// Paso COMPLETA (mock 12): grid 3×4 con los 12 ingredientes. Hay que marcar
// EXACTAMENTE los de la receta (el reducer no deja marcar de más). Contador
// "TE FALTAN N"; al completar la cuenta se desenfoca el fondo y aparecen
// MEZCLAR / VOLVER ATRÁS (volver quita el blur y deja seguir editando).
export function GridMix({ restante }: { restante: number }) {
  const { estado, despachar } = useJuego();
  const seleccionados = estado.elecciones.ingredientes;
  const requeridos = estado.receta?.ingredientes.length ?? 0;
  const restantes = Math.max(0, requeridos - seleccionados.length);
  const completo = requeridos > 0 && restantes === 0;

  const [confirmando, setConfirmando] = useState(false);
  // El panel aparece al completar la cuenta y se retira si vuelve a faltar algo.
  useEffect(() => setConfirmando(completo), [completo]);

  const onMezclar = useCallback(() => {
    despachar({ tipo: "MEZCLAR", tiempoRestante: restante });
  }, [despachar, restante]);

  const contador = restantes === 1 ? "TE FALTA 1" : `TE FALTAN ${restantes}`;

  // Resumen visual de lo elegido para el panel de confirmación (medallones,
  // mismo lenguaje que el grid).
  const itemsElegidos = seleccionados.map((id) => ({
    img: INGREDIENTES[id].img,
    nombre: INGREDIENTES[id].nombre,
    cover: RECORTES_FOTO.has(id),
  }));

  return (
    <div className="relative flex h-full w-full flex-col items-center px-[7cqw] pt-[7cqh] pb-[4cqh] text-center">
      <div className="relative h-[5cqh] w-[38cqw]">
        <Image src={IMG.logoBrugal} alt="Brugal" fill sizes="40vw" className="object-contain" priority />
      </div>

      <div className="mt-[3.6cqh] flex flex-col items-center gap-[0.8cqh]">
        <span className="font-titulo text-[2.6cqh] font-medium uppercase leading-tight text-white">
          COMPLETA EL MIX
        </span>
        <span
          className={`font-cuerpo text-[1.5cqh] font-bold uppercase tracking-[0.14em] ${
            completo ? "text-oro" : "text-crema/80"
          }`}
        >
          {completo ? "MIX LISTO" : contador}
        </span>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="grid w-full max-w-[80cqw] grid-cols-3 gap-x-[2.4cqw] gap-y-[1.2cqh]">
          {estado.grid.map((ing) => {
            const info = INGREDIENTES[ing];
            const activo = seleccionados.includes(ing);
            const cover = RECORTES_FOTO.has(ing);
            return (
              <button
                key={ing}
                type="button"
                aria-label={info.nombre}
                aria-pressed={activo}
                onClick={() => despachar({ tipo: "TOGGLE_INGREDIENTE", ing })}
                className="flex flex-col items-center gap-[0.5cqh] transition-[transform,filter] duration-100 active:scale-95 active:brightness-90"
              >
                <span
                  className={`relative flex h-[9.5cqh] w-[9.5cqh] items-center justify-center overflow-hidden rounded-full bg-navy/70 ring-2 transition-shadow duration-200 ${
                    activo ? "ring-oro shadow-[0_0_0_3px_rgba(201,164,92,.25)]" : "ring-crema/15"
                  }`}
                >
                  <Image
                    src={info.img}
                    alt=""
                    fill
                    sizes="20vw"
                    className={cover ? "object-cover" : "object-contain p-[14%]"}
                  />
                  {activo && (
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-navy-deep/50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[40%] w-[40%] text-oro drop-shadow-[0_2px_6px_rgba(0,0,0,.5)]"
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
                <span className="font-cuerpo text-[1.1cqh] font-medium uppercase tracking-[0.04em] text-crema">
                  {info.nombre}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {confirmando && (
        <PanelConfirmar
          titulo="TU MIX ESTÁ LISTO"
          items={itemsElegidos}
          forma="medallon"
          onConfirmar={onMezclar}
          textoConfirmar="Preparar"
          onVolver={() => setConfirmando(false)}
          textoVolver="Cambiar ingredientes"
        />
      )}
    </div>
  );
}
