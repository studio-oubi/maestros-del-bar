"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { BarraEscena } from "@/components/BarraEscena";
import { Coverflow3D } from "@/components/Coverflow3D";
import type { CoverflowItem } from "@/components/Coverflow3D";
import { GridMix } from "@/components/GridMix";
import { TimerHud } from "@/components/TimerHud";
import { IMG } from "@/lib/asset-manifest";
import { GAME_SECONDS, MEZCLAS, RONES, VASOS } from "@/lib/recetas";
import { useCountdown } from "@/lib/use-countdown";
import { useJuego } from "@/lib/juego";

// Pantalla "elige X" compartida por vaso/rón/mezcla (mocks 9-11): logo,
// epígrafe + nombre del item CENTRADO del coverflow (nunca la respuesta
// correcta — sin pistas), y el coverflow sobre la barra.
function PasoCoverflow({
  eyebrow,
  items,
  onSelect,
}: {
  eyebrow: string;
  items: CoverflowItem[];
  onSelect: (id: string) => void;
}) {
  const [centro, setCentro] = useState(() => Math.floor((items.length - 1) / 2));
  const onCentroChange = useCallback((_it: CoverflowItem, i: number) => setCentro(i), []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-x-0 top-[7cqh] z-10 flex justify-center">
        <div className="relative h-[5cqh] w-[38cqw]">
          <Image src={IMG.logoBrugal} alt="Brugal" fill sizes="40vw" className="object-contain" priority />
        </div>
      </div>

      <div className="absolute inset-x-0 top-[18cqh] z-10 flex flex-col items-center gap-[1cqh] px-[8cqw] text-center">
        <span className="font-titulo text-[1.7cqh] font-600 tracking-[0.32em] text-oro">{eyebrow}</span>
        <span
          key={centro}
          className="font-titulo text-[3.6cqh] font-600 leading-tight tracking-[0.04em] text-crema [animation:aparece-item_.24s_ease]"
        >
          {items[centro]?.nombre}
        </span>
      </div>

      <BarraEscena>
        <Coverflow3D items={items} onSelect={onSelect} onCentroChange={onCentroChange} alturaItem={30} />
      </BarraEscena>

      <style jsx>{`
        @keyframes aparece-item {
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

// Reto contra reloj: vaso → rón → mezcla → grid "completa el mix". El timer
// se monta UNA sola vez aquí y sobrevive a los 4 sub-pasos (nunca se
// reinicia). Al expirar en cualquier paso, dispara TIEMPO_AGOTADO.
export function Reto() {
  const { estado, despachar } = useJuego();
  const onExpirar = useCallback(() => despachar({ tipo: "TIEMPO_AGOTADO" }), [despachar]);
  const { restante, formato } = useCountdown(true, GAME_SECONDS, onExpirar);
  const critico = restante <= 10;

  const vasoItems: CoverflowItem[] = VASOS.map((v) => ({ id: v.id, img: v.img, nombre: v.nombre }));
  const ronItems: CoverflowItem[] = RONES.map((r) => ({ id: r.id, img: r.img, nombre: r.nombre }));
  const mezclaItems: CoverflowItem[] = MEZCLAS.map((m) => ({ id: m.id, img: m.img, nombre: m.nombre }));

  const onSelectVaso = useCallback(
    (id: string) => {
      const vaso = VASOS.find((v) => v.id === id);
      if (vaso) despachar({ tipo: "ELIGE_VASO", vaso: vaso.id });
    },
    [despachar],
  );
  const onSelectRon = useCallback(
    (id: string) => {
      const ron = RONES.find((r) => r.id === id);
      if (ron) despachar({ tipo: "ELIGE_RON", ron: ron.id });
    },
    [despachar],
  );
  const onSelectMezcla = useCallback(
    (id: string) => {
      const mezcla = MEZCLAS.find((m) => m.id === id);
      if (mezcla) despachar({ tipo: "ELIGE_MEZCLA", mezcla: mezcla.id });
    },
    [despachar],
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <TimerHud formato={formato} critico={critico} />

      <div key={estado.pantalla} className="absolute inset-0 [animation:paso-entra_.3s_ease]">
        {estado.pantalla === "reto-vaso" && (
          <PasoCoverflow eyebrow="ELIGE TU VASO" items={vasoItems} onSelect={onSelectVaso} />
        )}
        {estado.pantalla === "reto-ron" && (
          <PasoCoverflow eyebrow="ELIGE TU RÓN" items={ronItems} onSelect={onSelectRon} />
        )}
        {estado.pantalla === "reto-mezcla" && (
          <PasoCoverflow eyebrow="ELIGE TU MEZCLA" items={mezclaItems} onSelect={onSelectMezcla} />
        )}
        {estado.pantalla === "reto-mix" && <GridMix restante={restante} />}
      </div>

      <style jsx>{`
        @keyframes paso-entra {
          from {
            opacity: 0;
            transform: translateY(10px);
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
