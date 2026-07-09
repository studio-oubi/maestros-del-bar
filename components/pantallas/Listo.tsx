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
        <h1 className="max-w-[80cqw] font-titulo text-[clamp(30px,9.3cqw,46px)] font-semibold uppercase leading-[1.05] text-white">
          ¿Listo para
          <br />
          armar el mix
          <br />
          perfecto?
        </h1>
        <button
          type="button"
          onClick={() => despachar({ tipo: "INICIAR_RETO" })}
          className="rounded-full bg-gradient-to-b from-oro-claro to-oro px-[11cqw] py-[1.8cqh] font-cuerpo text-[clamp(13px,3.4cqw,15px)] font-medium uppercase tracking-[0.16em] text-navy-deep shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-transform active:scale-95"
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}
