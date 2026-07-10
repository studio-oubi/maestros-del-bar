"use client";

import Image from "next/image";

export interface ItemResumen {
  img: string;
  nombre: string;
  cover?: boolean; // true = foto recortada (object-cover); false = PNG aislado (object-contain)
}

// Grupo etiquetado del resumen (review final): p.ej. RON / MEZCLA / COMPLEMENTOS.
export interface GrupoResumen {
  etiqueta?: string;
  forma?: "medallon" | "botella";
  items: ItemResumen[];
}

// Miniatura de un item (medallón o botellita) con su nombre. `compacto` se usa
// en el review agrupado, donde caben más elementos.
function Miniatura({
  it,
  forma,
  compacto,
}: {
  it: ItemResumen;
  forma: "medallon" | "botella";
  compacto?: boolean;
}) {
  const esBotella = forma === "botella";
  const ancho = compacto ? "w-[14cqw] max-w-[64px]" : "w-[19cqw] max-w-[88px]";
  const gap = compacto ? "gap-[0.55cqh]" : "gap-[0.7cqh]";
  const redondeo = compacto ? "rounded-[1.2cqh]" : "rounded-[1.4cqh]";
  const tamNombre = compacto ? "text-[0.98cqh]" : "text-[1.15cqh]";
  return (
    <div className={`flex ${ancho} flex-col items-center ${gap}`}>
      <span
        className={`relative flex w-full items-center justify-center overflow-hidden bg-navy/70 ring-2 ring-oro/55 ${
          esBotella ? `aspect-[3/4] ${redondeo}` : "aspect-square rounded-full"
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
      <span className={`font-cuerpo ${tamNombre} font-medium uppercase leading-tight tracking-[0.04em] text-crema`}>
        {it.nombre}
      </span>
    </div>
  );
}

// Panel de confirmación con fondo desenfocado, en el lenguaje del legacy
// (overlay "Preparar"): título grande (Kaneda), resumen VISUAL de lo elegido y
// dos acciones — primaria dorada con latido (Preparar/Continuar) y secundaria
// ghost (Cambiar ingredientes/mezclas). Dos modos: `grupos` (review final
// agrupado con etiquetas RON/MEZCLA/COMPLEMENTOS) o `items`+`forma` (lista plana,
// paso MEZCLA). Cubre la escena (intercepta taps) hasta confirmar o volver.
export function PanelConfirmar({
  titulo,
  grupos,
  items,
  forma = "medallon",
  onConfirmar,
  textoConfirmar,
  onVolver,
  textoVolver,
}: {
  titulo: string;
  grupos?: GrupoResumen[];
  items?: ItemResumen[];
  forma?: "medallon" | "botella";
  onConfirmar: () => void;
  textoConfirmar: string;
  onVolver: () => void;
  textoVolver: string;
}) {
  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-navy-deep/45 px-[6cqw] text-center backdrop-blur-xl backdrop-saturate-150 [animation:panel-aparece_.3s_ease] ${
        grupos ? "gap-[1.8cqh]" : "gap-[2.8cqh]"
      }`}
    >
      <h2
        className={`font-titulo font-medium uppercase leading-[1.05] text-white ${grupos ? "text-[3cqh]" : "text-[3.6cqh]"}`}
      >
        {titulo}
      </h2>

      {grupos ? (
        <div className="flex max-w-[94cqw] flex-col items-center gap-[1.5cqh]">
          {grupos.map((g, gi) => (
            <div key={g.etiqueta ?? gi} className="flex flex-col items-center gap-[0.5cqh]">
              {g.etiqueta && (
                <span className="font-cuerpo text-[1.2cqh] font-bold uppercase tracking-[0.2em] text-oro/90">
                  {g.etiqueta}
                </span>
              )}
              <div className="flex flex-wrap items-start justify-center gap-x-[3.5cqw] gap-y-[1cqh]">
                {g.items.map((it, i) => (
                  <Miniatura key={`${it.nombre}-${i}`} it={it} forma={g.forma ?? "medallon"} compacto />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex max-w-[92cqw] flex-wrap items-start justify-center gap-x-[4cqw] gap-y-[1.4cqh]">
          {(items ?? []).map((it, i) => (
            <Miniatura key={`${it.nombre}-${i}`} it={it} forma={forma} />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-[1.6cqh]">
        <button
          type="button"
          onClick={onConfirmar}
          className="texto-boton rounded-full bg-gradient-to-b from-oro-claro to-oro px-[15cqw] py-[0.8cqh] leading-none shadow-[0_0_50px_rgba(201,164,92,.35),0_16px_40px_rgba(0,0,0,.55)] [animation:panel-latido_2.2s_ease-in-out_infinite] transition-[filter] duration-100 active:brightness-90 active:scale-95"
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
