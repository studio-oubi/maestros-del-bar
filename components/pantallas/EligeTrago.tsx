"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { BarraEscena } from "@/components/BarraEscena";
import { Coverflow3D } from "@/components/Coverflow3D";
import type { CoverflowItem } from "@/components/Coverflow3D";
import { IMG } from "@/lib/asset-manifest";
import { RECETAS } from "@/lib/recetas";
import { useJuego } from "@/lib/juego";

// Pantalla "elige tu trago" (mock 7): logo Brugal, epígrafe + nombre del trago
// centrado, y el coverflow 3D sobre la barra. Tocar el vaso central prepara el
// trago (dispatch ELIGE_TRAGO -> el reducer avanza a "listo").
export function EligeTrago() {
  const { despachar } = useJuego();

  const items = useMemo<CoverflowItem[]>(
    () => RECETAS.map((r) => ({ id: r.id, img: r.imgTrago, nombre: r.nombre })),
    [],
  );
  const [centro, setCentro] = useState(0); // ruleta infinita: arranca en el primer trago

  const onCentroChange = useCallback((_it: CoverflowItem, i: number) => setCentro(i), []);

  const onSelect = useCallback(
    (id: string) => {
      const receta = RECETAS.find((r) => r.id === id);
      if (receta) despachar({ tipo: "ELIGE_TRAGO", receta });
    },
    [despachar],
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Logo Brugal */}
      <div className="absolute inset-x-0 top-[7cqh] z-10 flex justify-center">
        <div className="relative h-[5cqh] w-[38cqw]">
          <Image src={IMG.logoBrugal} alt="Brugal" fill sizes="40vw" className="object-contain" priority />
        </div>
      </div>

      {/* Epígrafe + nombre del trago centrado */}
      <div className="absolute inset-x-0 top-[18cqh] z-10 flex flex-col items-center gap-[1cqh] px-[8cqw] text-center">
        <span className="font-cuerpo text-[1.35cqh] font-bold uppercase tracking-[0.14em] text-oro">
          ELIGE TU TRAGO
        </span>
        <span
          key={centro}
          className="font-titulo text-[3.1cqh] font-medium uppercase leading-tight text-white [animation:aparece_.24s_ease]"
        >
          {items[centro]?.nombre}
        </span>
      </div>

      {/* Escena de barra + coverflow */}
      <BarraEscena>
        <Coverflow3D items={items} onSelect={onSelect} onCentroChange={onCentroChange} alturaItem={40} />
      </BarraEscena>

      <style jsx>{`
        @keyframes aparece {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
