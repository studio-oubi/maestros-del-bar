"use client";

import Image from "next/image";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";

// Última pantalla antes del reto cronometrado: confirma inicio.
export function Listo() {
  const { despachar } = useJuego();

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-[8cqw] text-center">
      {/* Logo fuera del flujo centrado: así el bloque título+botón se centra
          respecto a TODA la pantalla (no solo al espacio bajo el logo) y el
          botón INICIAR cae cerca del centro vertical, como pide el mock. */}
      <div className="absolute left-1/2 top-[5cqh] -translate-x-1/2">
        <Image
          src={IMG.logoBrugal}
          alt="Brugal"
          width={220}
          height={90}
          className="h-auto w-[42cqw] max-w-[220px]"
        />
      </div>

      {/* El grupo se centra respecto a TODA la pantalla (justify-center del
          contenedor), pero el título (3 líneas) pesa más que el botón, así
          que sin ayuda el botón quedaría por debajo del centro real. Un
          "fantasma" invisible del título, del mismo alto, espeja el bloque
          bajo el botón para que el botón —no el conjunto— caiga en el
          centro vertical exacto de la pantalla. */}
      <div className="flex flex-col items-center gap-[4.5cqh]">
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
        <div aria-hidden className="texto-titulo invisible max-w-[80cqw]">
          ¿Listo para
          <br />
          armar el mix
          <br />
          perfecto?
        </div>
      </div>
    </div>
  );
}
