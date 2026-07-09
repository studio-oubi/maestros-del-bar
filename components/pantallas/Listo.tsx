"use client";

import Image from "next/image";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";

// Última pantalla antes del reto cronometrado: confirma inicio.
export function Listo() {
  const { despachar } = useJuego();

  return (
    <div className="flex h-full w-full flex-col items-center px-[8cqw] text-center">
      <div className="pt-[5cqh]">
        <Image
          src={IMG.logoBrugal}
          alt="Brugal"
          width={220}
          height={90}
          className="h-auto w-[28cqw] max-w-[130px]"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[4.5cqh]">
        <h1 className="texto-titulo max-w-[80cqw]">
          ¿Listo para
          <br />
          armar el mix
          <br />
          perfecto?
        </h1>
        <button
          type="button"
          onClick={() => despachar({ tipo: "INICIAR_RETO" })}
          className="texto-boton rounded-full bg-gradient-to-b from-oro-claro to-oro px-[11cqw] py-[0.55cqh] leading-none shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-transform active:scale-95"
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}
