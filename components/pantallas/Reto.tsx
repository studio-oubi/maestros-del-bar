"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarraEscena } from "@/components/BarraEscena";
import { Coverflow3D } from "@/components/Coverflow3D";
import type { CoverflowItem } from "@/components/Coverflow3D";
import { GridMix } from "@/components/GridMix";
import { PanelConfirmar } from "@/components/PanelConfirmar";
import { TimerHud } from "@/components/TimerHud";
import { IMG } from "@/lib/asset-manifest";
import { GAME_SECONDS, MEZCLAS, RONES, VASOS } from "@/lib/recetas";
import type { MezclaId } from "@/lib/recetas";
import { useCountdown } from "@/lib/use-countdown";
import { useJuego } from "@/lib/juego";

// Cabecera compartida (logo + epígrafe + nombre del item centrado del coverflow).
function CabeceraPaso({ eyebrow, nombreCentro }: { eyebrow: string; nombreCentro?: string }) {
  return (
    <>
      <div className="absolute inset-x-0 top-[7cqh] z-10 flex justify-center">
        <div className="relative h-[5.9cqh] w-[42cqw]">
          <Image src={IMG.logoBrugal} alt="Brugal" fill sizes="40vw" className="object-contain" priority />
        </div>
      </div>
      <div className="absolute inset-x-0 top-[18cqh] z-10 flex flex-col items-center gap-[1cqh] px-[8cqw] text-center">
        <span className="font-cuerpo text-[1.35cqh] font-bold uppercase tracking-[0.14em] text-oro">{eyebrow}</span>
        <span
          key={nombreCentro}
          className="font-titulo text-[3.1cqh] font-medium uppercase leading-tight text-white [animation:aparece-item_.24s_ease]"
        >
          {nombreCentro}
        </span>
      </div>
    </>
  );
}

// Pantalla "elige X" single-select para vaso/rón (mocks 9-10): tap sobre el item
// centrado lo elige y avanza.
function PasoCoverflow({
  eyebrow,
  items,
  onSelect,
  alturaItem,
}: {
  eyebrow: string;
  items: CoverflowItem[];
  onSelect: (id: string) => void;
  alturaItem?: number;
}) {
  const [centro, setCentro] = useState(() => Math.floor((items.length - 1) / 2));
  const onCentroChange = useCallback((_it: CoverflowItem, i: number) => setCentro(i), []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <CabeceraPaso eyebrow={eyebrow} nombreCentro={items[centro]?.nombre} />
      <BarraEscena>
        <Coverflow3D items={items} onSelect={onSelect} onCentroChange={onCentroChange} alturaItem={alturaItem} />
      </BarraEscena>
      <style jsx>{estilos}</style>
    </div>
  );
}

// Paso MEZCLA multi-select (mock 11): tap marca/desmarca el item centrado con
// overlay de check; contador de restantes respecto a receta.mezclas.length. Al
// completar la cuenta se desenfoca el fondo y aparecen CONTINUAR / VOLVER (volver
// quita el blur y deja seguir editando). No se puede marcar de más (el reducer
// ignora el tap extra).
function PasoMezclas() {
  const { estado, despachar } = useJuego();
  const requeridas = estado.receta?.mezclas.length ?? 0;
  const seleccionadas = estado.elecciones.mezclas;
  const restantes = Math.max(0, requeridas - seleccionadas.length);
  const completo = requeridas > 0 && restantes === 0;

  const [confirmando, setConfirmando] = useState(false);
  // El overlay aparece al completar la cuenta y se retira si vuelve a faltar algo.
  useEffect(() => setConfirmando(completo), [completo]);

  const items: CoverflowItem[] = useMemo(
    () => MEZCLAS.map((m) => ({ id: m.id, img: m.img, nombre: m.nombre })),
    [],
  );
  const marcados = useMemo(() => new Set<string>(seleccionadas), [seleccionadas]);
  const [centro, setCentro] = useState(() => Math.floor((items.length - 1) / 2));
  const onCentroChange = useCallback((_it: CoverflowItem, i: number) => setCentro(i), []);
  const onToggle = useCallback(
    (id: string) => despachar({ tipo: "TOGGLE_MEZCLA", mezcla: id as MezclaId }),
    [despachar],
  );

  const contador = restantes === 1 ? "TE FALTA 1" : `TE FALTAN ${restantes}`;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <CabeceraPaso eyebrow="ELIGE TU MEZCLA" nombreCentro={items[centro]?.nombre} />

      <div className="absolute inset-x-0 top-[26.5cqh] z-10 flex justify-center">
        <span
          className={`font-cuerpo text-[1.5cqh] font-bold uppercase tracking-[0.14em] ${
            completo ? "text-oro" : "text-crema/80"
          }`}
        >
          {completo ? "MEZCLA LISTA" : contador}
        </span>
      </div>

      <BarraEscena>
        <Coverflow3D
          items={items}
          onSelect={onToggle}
          onCentroChange={onCentroChange}
          alturaItem={29}
          marcados={marcados}
        />
      </BarraEscena>

      {confirmando && (
        <PanelConfirmar
          onConfirmar={() => despachar({ tipo: "CONFIRMA_MEZCLAS" })}
          onVolver={() => setConfirmando(false)}
          textoConfirmar="Continuar"
          textoVolver="Volver"
        />
      )}

      <style jsx>{estilos}</style>
    </div>
  );
}

const estilos = `
  @keyframes aparece-item {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// Reto contra reloj: vaso → rón → mezcla → completa. El timer se monta UNA sola
// vez aquí y sobrevive a los 4 sub-pasos (nunca se reinicia). Al expirar en
// cualquier paso, dispara TIEMPO_AGOTADO.
export function Reto() {
  const { estado, despachar } = useJuego();
  const onExpirar = useCallback(() => despachar({ tipo: "TIEMPO_AGOTADO" }), [despachar]);
  const { restante, formato } = useCountdown(true, GAME_SECONDS, onExpirar);
  const critico = restante <= 10;

  const vasoItems: CoverflowItem[] = VASOS.map((v) => ({ id: v.id, img: v.img, nombre: v.nombre }));
  const ronItems: CoverflowItem[] = RONES.map((r) => ({ id: r.id, img: r.img, nombre: r.nombre }));

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

  return (
    <div className="relative h-full w-full overflow-hidden">
      <TimerHud formato={formato} critico={critico} />

      <div key={estado.pantalla} className="absolute inset-0 [animation:paso-entra_.3s_ease]">
        {estado.pantalla === "reto-vaso" && (
          <PasoCoverflow eyebrow="ELIGE TU VASO" items={vasoItems} onSelect={onSelectVaso} alturaItem={36} />
        )}
        {estado.pantalla === "reto-ron" && (
          <PasoCoverflow eyebrow="ELIGE TU RÓN" items={ronItems} onSelect={onSelectRon} alturaItem={35} />
        )}
        {estado.pantalla === "reto-mezcla" && <PasoMezclas />}
        {estado.pantalla === "reto-mix" && <GridMix restante={restante} />}
      </div>

      <style jsx>{`
        @keyframes paso-entra {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
