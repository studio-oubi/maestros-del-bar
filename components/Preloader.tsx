"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ALL_IMAGES, IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";
import { precargar } from "@/lib/precarga";

// Pantalla de carga: precarga todos los assets del manifiesto y, al llegar
// al 100%, espera un instante y despacha CARGA_LISTA para pasar a home.
export function Preloader() {
  const { despachar } = useJuego();
  const [pct, setPct] = useState(0);
  const yaDespachado = useRef(false);

  useEffect(() => {
    let activo = true;
    precargar(ALL_IMAGES, (valor) => {
      if (activo) setPct(valor);
    }).then(() => {
      if (!activo || yaDespachado.current) return;
      yaDespachado.current = true;
      setTimeout(() => {
        if (activo) despachar({ tipo: "CARGA_LISTA" });
      }, 300);
    });
    return () => {
      activo = false;
    };
  }, [despachar]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[5cqh] px-8">
      <Image
        src={IMG.logoBrugal}
        alt="Brugal"
        width={220}
        height={90}
        priority
        className="h-auto w-[42cqw] max-w-[220px]"
      />
      <div className="flex w-[200px] flex-col items-center gap-3">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-oro/20">
          <div
            className="h-full rounded-full bg-oro transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="texto-label text-center">Cargando experiencia</p>
      </div>
    </div>
  );
}
