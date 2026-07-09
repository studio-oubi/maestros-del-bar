"use client";

import Image from "next/image";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";

// Pantalla puente entre "recetas" y el reto: toda la pantalla es el CTA.
export function Intro() {
  const { despachar } = useJuego();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => despachar({ tipo: "IR", a: "elige-trago" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") despachar({ tipo: "IR", a: "elige-trago" });
      }}
      className="flex h-full w-full cursor-pointer flex-col items-center px-[8cqw] text-center"
    >
      <div className="pt-[5cqh]">
        <Image
          src={IMG.logoBrugal}
          alt="Brugal"
          width={220}
          height={90}
          className="h-auto w-[28cqw] max-w-[130px]"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[2.6cqh]">
        <h1 className="font-titulo text-[clamp(34px,10.5cqw,52px)] font-semibold uppercase leading-[0.95] text-white">
          Arma el mix
          <br />
          Perfecto
        </h1>
        <p className="max-w-[78cqw] font-titulo text-[clamp(14px,3.9cqw,17px)] font-semibold uppercase leading-snug tracking-[0.03em] text-oro">
          Recuerda la receta y completa tu trago antes de llegar a cero.
        </p>
      </div>

      <p className="mb-[8cqh] animate-pulse font-cuerpo text-[clamp(11px,2.8cqw,13px)] text-crema/60 [animation-duration:2.4s]">
        toca para continuar....
      </p>
    </div>
  );
}
