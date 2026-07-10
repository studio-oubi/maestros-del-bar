"use client";

import Image from "next/image";

export interface ItemResumen {
  img: string;
  nombre: string;
  cover?: boolean; // true = foto recortada (object-cover); false = PNG aislado (object-contain)
}

// Panel de confirmación con fondo desenfocado, en el lenguaje del legacy
// (overlay "Preparar"): título grande (Kaneda), resumen VISUAL de lo elegido
// (mini-medallones/botellitas + nombre) y dos acciones — primaria dorada con
// latido (Preparar/Continuar) y secundaria ghost (Cambiar ingredientes/mezclas).
// Compartido por el paso COMPLETA (GridMix) y el paso MEZCLA (Reto). Cubre la
// escena (intercepta taps) hasta que el jugador confirma o vuelve a editar.
export function PanelConfirmar({
  titulo,
  items,
  forma = "medallon",
  onConfirmar,
  textoConfirmar,
  onVolver,
  textoVolver,
}: {
  titulo: string;
  items: ItemResumen[];
  forma?: "medallon" | "botella";
  onConfirmar: () => void;
  textoConfirmar: string;
  onVolver: () => void;
  textoVolver: string;
}) {
  const esBotella = forma === "botella";
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-[2.8cqh] bg-navy-deep/45 px-[6cqw] text-center backdrop-blur-xl backdrop-saturate-150 [animation:panel-aparece_.3s_ease]">
      <h2 className="font-titulo text-[3.6cqh] font-medium uppercase leading-[1.05] text-white">{titulo}</h2>

      <div className="flex max-w-[92cqw] flex-wrap items-start justify-center gap-x-[4cqw] gap-y-[1.4cqh]">
        {items.map((it, i) => (
          <div key={`${it.nombre}-${i}`} className="flex w-[19cqw] max-w-[88px] flex-col items-center gap-[0.7cqh]">
            <span
              className={`relative flex w-full items-center justify-center overflow-hidden bg-navy/70 ring-2 ring-oro/55 ${
                esBotella ? "aspect-[3/4] rounded-[1.4cqh]" : "aspect-square rounded-full"
              }`}
            >
              <Image
                src={it.img}
                alt=""
                fill
                sizes="20vw"
                className={it.cover ? "object-cover" : `object-contain ${esBotella ? "p-[10%]" : "p-[16%]"}`}
              />
            </span>
            <span className="font-cuerpo text-[1.15cqh] font-medium uppercase leading-tight tracking-[0.04em] text-crema">
              {it.nombre}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-[1.6cqh]">
        <button
          type="button"
          onClick={onConfirmar}
          className="texto-boton rounded-full bg-gradient-to-b from-oro-claro to-oro px-[15cqw] py-[0.8cqh] leading-none shadow-[0_0_50px_rgba(201,164,92,.35),0_16px_40px_rgba(0,0,0,.55)] [animation:panel-latido_2.2s_ease-in-out_infinite] active:scale-95"
        >
          {textoConfirmar}
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="font-cuerpo text-[1.5cqh] font-medium uppercase tracking-[0.18em] text-crema/70 underline decoration-crema/30 underline-offset-4 transition-[transform,color] duration-100 hover:text-crema active:scale-[0.98] active:text-crema"
        >
          {textoVolver}
        </button>
      </div>

      <style jsx>{`
        @keyframes panel-aparece {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes panel-latido {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.035);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          button {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
