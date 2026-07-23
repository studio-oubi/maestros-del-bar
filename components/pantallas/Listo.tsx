"use client";

import Image from "next/image";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";

// Última pantalla antes del reto cronometrado: confirma inicio.
export function Listo() {
  const { despachar } = useJuego();

  return (
    <div className="relative h-full w-full px-[8cqw] text-center">
      {/* Logo fuera del flujo, centrado a 17.5cqh (igual que Home/Intro). */}
      <div className="absolute left-1/2 top-[17.5cqh] -translate-x-1/2 -translate-y-1/2">
        <Image
          src={IMG.logoBrugal}
          alt="Brugal"
          width={220}
          height={90}
          className="h-auto w-[42cqw] max-w-[220px]"
        />
      </div>

      {/* Bloque título+botón anclado cerca del tercio medio-superior (no
          centrado verticalmente): el vacío queda abajo, como en la
          referencia de diseño. */}
      <div className="absolute left-1/2 top-[33cqh] flex w-full -translate-x-1/2 flex-col items-center gap-[3cqh]">
        <h1 className="max-w-[80cqw] font-titulo text-[7.7cqh] font-medium leading-[1.02] uppercase text-white">
          ¿Listo para
          <br />
          preparar el cóctel
          <br />
          perfecto?
        </h1>
        <button
          type="button"
          onClick={() => despachar({ tipo: "INICIAR_RETO" })}
          className="flex h-[4.5cqh] w-[57cqw] items-center justify-center rounded-full bg-gradient-to-b from-oro-claro to-oro font-titulo text-[2.7cqh] font-medium uppercase text-[var(--tinta-boton)] shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-[transform,filter] duration-100 active:scale-95 active:brightness-90"
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}
