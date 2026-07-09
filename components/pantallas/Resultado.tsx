"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { BarraEscena } from "@/components/BarraEscena";
import { IMG } from "@/lib/asset-manifest";
import { INGREDIENTES } from "@/lib/recetas";
import type { IngredienteId } from "@/lib/recetas";
import { enviarPartida } from "@/lib/partida-cliente";
import { reintentarPendiente } from "@/lib/registro-cliente";
import { useJuego } from "@/lib/juego";

const BOTON =
  "rounded-full bg-gradient-to-b from-oro-claro to-oro px-[12cqw] py-[1.8cqh] font-cuerpo text-[clamp(13px,3.4cqw,15px)] font-medium uppercase tracking-[0.16em] text-navy-deep shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-transform active:scale-95";

function Logo() {
  return (
    <div className="absolute inset-x-0 top-[5cqh] z-10 flex justify-center">
      <Image
        src={IMG.logoBrugal}
        alt="Brugal"
        width={220}
        height={90}
        className="h-auto w-[28cqw] max-w-[130px]"
      />
    </div>
  );
}

// Confetti CSS: partículas doradas cayendo una sola vez (sin librería).
function Confetti() {
  const piezas = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duracion: 1.6 + Math.random() * 0.9,
        ancho: 4 + Math.random() * 4,
        deriva: (Math.random() - 0.5) * 50,
        dorado: Math.random() > 0.4,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {piezas.map((p, i) => (
        <span
          key={i}
          className={`absolute top-[-6%] rounded-[1px] [animation:confetti-caer_var(--dur)_ease-in_var(--delay)_1_forwards] ${
            p.dorado ? "bg-oro-claro" : "bg-oro"
          }`}
          style={{
            left: `${p.left}%`,
            width: p.ancho,
            height: p.ancho * 1.7,
            ["--dur" as string]: `${p.duracion}s`,
            ["--delay" as string]: `${p.delay}s`,
            ["--deriva" as string]: `${p.deriva}px`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-caer {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(78cqh) translateX(var(--deriva)) rotate(340deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Variante "gano" (mock 13): título gigante, confetti sutil, trago sobre la
// barra con su tarjeta de receta al lado.
function Ganaste() {
  const { estado } = useJuego();
  const receta = estado.receta;
  if (!receta) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Confetti />
      <Logo />

      <div className="absolute inset-x-0 top-[15cqh] z-10 flex justify-center px-[6cqw] text-center">
        <h1 className="font-titulo text-[clamp(40px,13cqw,64px)] font-bold uppercase leading-none text-white">
          GANASTE!!
        </h1>
      </div>

      <BarraEscena>
        <div
          className="absolute inset-x-0 z-10 flex items-end justify-center gap-[4cqw] px-[6cqw]"
          style={{ bottom: "calc(100cqh - var(--linea-barra, 62cqh))" }}
        >
          <div className="relative flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receta.imgTrago}
              alt={receta.nombre}
              draggable={false}
              className="pointer-events-none h-[26cqh] w-auto select-none object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,.55)]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receta.imgTrago}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-full h-[26cqh] w-auto -translate-x-1/2 select-none object-contain opacity-[0.18]"
              style={{
                transform: "translateX(-50%) scaleY(-1)",
                WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 55%)",
                maskImage: "linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 55%)",
              }}
            />
          </div>

          <div className="mb-[3.4cqh] flex max-w-[42cqw] flex-col items-start gap-[1cqh] text-left">
            <h2 className="font-titulo text-[clamp(14px,4.4cqw,18px)] font-600 uppercase leading-tight text-white">
              {receta.nombre}
            </h2>
            <ul className="flex flex-col gap-[0.5cqh]">
              {receta.lineasReceta.map((linea) => (
                <li
                  key={linea}
                  className="font-cuerpo text-[clamp(9px,2.6cqw,11px)] font-medium uppercase tracking-[0.02em] text-oro"
                >
                  • {linea}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </BarraEscena>
    </div>
  );
}

function FilaCheck({ etiqueta, ok }: { etiqueta: string; ok: boolean }) {
  return (
    <div className="flex w-full max-w-[74cqw] items-center justify-between gap-[3cqw] border-b border-crema/10 py-[1.3cqh]">
      <span className="font-titulo text-[clamp(12px,3.6cqw,15px)] font-600 uppercase tracking-[0.06em] text-crema">
        {etiqueta}
      </span>
      <span className={`text-[clamp(16px,4.6cqw,20px)] font-bold ${ok ? "text-oro" : "text-red-400"}`} aria-hidden>
        {ok ? "✓" : "✗"}
      </span>
      <span className="sr-only">{ok ? "correcto" : "incorrecto"}</span>
    </div>
  );
}

function ChipIngrediente({ id, correcto }: { id: IngredienteId; correcto: boolean }) {
  const info = INGREDIENTES[id];
  return (
    <span
      className={`flex items-center gap-[1.4cqw] rounded-full px-[3.4cqw] py-[0.9cqh] font-cuerpo text-[clamp(10px,2.6cqw,12px)] font-medium uppercase tracking-[0.03em] ${
        correcto ? "bg-oro/15 text-oro ring-1 ring-oro/50" : "bg-red-500/10 text-red-400 ring-1 ring-red-400/50"
      }`}
    >
      <span aria-hidden>{correcto ? "✓" : "✗"}</span>
      {info.nombre}
      {!correcto && " · TE FALTÓ"}
    </span>
  );
}

// Variante "fallo": desglose de lo que se eligió mal (checklist vaso/rón/mezcla
// + ingredientes correctos/faltantes/sobrantes). Sin mock; mismo lenguaje
// visual que "gano" (logo, Oswald gigante, dorado).
function Casi() {
  const { estado, despachar } = useJuego();
  const receta = estado.receta;
  const ev = estado.evaluacion;
  if (!receta || !ev) return null;

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden px-[7cqw] pb-[3.5cqh] pt-[5cqh] text-center">
      <Logo />

      <div className="mt-[10cqh] flex flex-col items-center gap-[0.8cqh]">
        <h1 className="font-titulo text-[clamp(34px,10.5cqw,50px)] font-bold uppercase leading-none text-white">
          CASI...
        </h1>
        <p className="font-titulo text-[clamp(12px,3.6cqw,15px)] font-600 uppercase tracking-[0.08em] text-oro">
          ASÍ ERA EL {receta.nombre}
        </p>
      </div>

      <div className="mt-[3.2cqh] flex w-full flex-col items-center">
        <FilaCheck etiqueta="VASO" ok={ev.vasoOk} />
        <FilaCheck etiqueta={receta.ronNombre} ok={ev.ronOk} />
        <FilaCheck etiqueta={receta.mezclaNombre} ok={ev.mezclaOk} />
      </div>

      <div className="mt-[3cqh] flex w-full flex-col items-center gap-[1.4cqh]">
        <span className="font-titulo text-[1.5cqh] font-600 tracking-[0.28em] text-oro/80">INGREDIENTES</span>
        <div className="flex flex-wrap items-center justify-center gap-[1.6cqw]">
          {receta.ingredientes.map((id) => (
            <ChipIngrediente key={id} id={id} correcto={!ev.faltaron.includes(id)} />
          ))}
        </div>
        {ev.sobraron.length > 0 && (
          <div className="mt-[0.4cqh] flex flex-wrap items-center justify-center gap-[1.6cqw]">
            {ev.sobraron.map((id) => (
              <span
                key={id}
                className="rounded-full bg-crema/5 px-[3.4cqw] py-[0.9cqh] font-cuerpo text-[clamp(9px,2.4cqw,11px)] font-medium uppercase tracking-[0.02em] text-crema/40 line-through"
              >
                TE SOBRÓ: {INGREDIENTES[id].nombre}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => despachar({ tipo: "REINICIAR" })}
        className={`mt-[3.4cqh] shrink-0 ${BOTON}`}
      >
        VOLVER AL INICIO
      </button>
    </div>
  );
}

// Variante "tiempo" (mock 14): título + botón en la mitad superior, barra
// decorativa (sin trago) debajo.
function TiempoAgotado() {
  const { despachar } = useJuego();
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Logo />
      <div className="absolute inset-x-0 top-[16cqh] z-10 flex flex-col items-center gap-[3.6cqh] px-[9cqw] text-center">
        <h1 className="font-titulo text-[clamp(30px,9.6cqw,48px)] font-bold uppercase leading-[1.05] text-white">
          UPP.. SE ACABO
          <br />
          EL TIEMPO
        </h1>
        <button type="button" onClick={() => despachar({ tipo: "REINICIAR" })} className={BOTON}>
          INICIO
        </button>
      </div>
      <BarraEscena>{null}</BarraEscena>
    </div>
  );
}

// Pantalla de resultado (mock 13/14): 3 variantes según estado.resultado.
// Al montar, reporta la partida al backend una única vez y reintenta
// cualquier registro pendiente de la pantalla de formulario.
export function Resultado() {
  const { estado } = useJuego();
  const enviadoRef = useRef(false);

  useEffect(() => {
    if (enviadoRef.current || !estado.resultado) return;
    enviadoRef.current = true;
    enviarPartida({
      registroId: estado.registroId,
      trago: estado.receta?.id ?? "",
      resultado: estado.resultado,
      tiempoRestante: estado.tiempoRestante,
      detalles: { elecciones: estado.elecciones, evaluacion: estado.evaluacion },
    });
    reintentarPendiente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado.resultado === "gano") return <Ganaste />;
  if (estado.resultado === "fallo") return <Casi />;
  if (estado.resultado === "tiempo") return <TiempoAgotado />;
  return null;
}
