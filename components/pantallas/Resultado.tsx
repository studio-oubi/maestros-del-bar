"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { BarraEscena } from "@/components/BarraEscena";
import { IMG, PAD_INFERIOR } from "@/lib/asset-manifest";
import { INGREDIENTES, VASOS } from "@/lib/recetas";
import type { IngredienteId, Receta, VasoId } from "@/lib/recetas";
import { enviarPartida } from "@/lib/partida-cliente";
import { reintentarPendiente } from "@/lib/registro-cliente";
import { filtroTinte } from "@/lib/tinte-trago";
import { useJuego } from "@/lib/juego";

const BOTON =
  "texto-boton rounded-full bg-gradient-to-b from-oro-claro to-oro px-[12cqw] py-[0.55cqh] leading-none shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-transform active:scale-95";

function Logo() {
  return (
    <div className="absolute inset-x-0 top-[5cqh] z-10 flex justify-center">
      <Image
        src={IMG.logoBrugal}
        alt="Brugal"
        width={220}
        height={90}
        className="h-auto w-[42cqw] max-w-[195px]"
      />
    </div>
  );
}

// Paleta del confetti: oro/oro claro/blanco/azul medio/azul claro, repartida
// por índice (determinista, sin depender de Math.random() para el color).
const PALETA_CONFETTI = ["#c9a84c", "#e7cf9f", "#ffffff", "#2f4d8a", "#7ea1d4"];

// Confetti CSS: partículas cayendo una sola vez (sin librería).
function Confetti() {
  const piezas = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duracion: 1.6 + Math.random() * 0.9,
        ancho: 4 + Math.random() * 4,
        deriva: (Math.random() - 0.5) * 50,
        color: PALETA_CONFETTI[i % PALETA_CONFETTI.length],
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {piezas.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-6%] rounded-[1px] [animation:resultado-confetti-caer_var(--dur)_ease-in_var(--delay)_1_forwards]"
          style={{
            left: `${p.left}%`,
            width: p.ancho,
            height: p.ancho * 1.7,
            backgroundColor: p.color,
            ["--dur" as string]: `${p.duracion}s`,
            ["--delay" as string]: `${p.delay}s`,
            ["--deriva" as string]: `${p.deriva}px`,
          }}
        />
      ))}
      {/* global: styled-jsx renombra los @keyframes por componente (modo scoped);
          la clase Tailwind arbitrary [animation:...] referencia el nombre literal,
          así que el keyframe debe declararse global para que coincida. */}
      <style jsx global>{`
        @keyframes resultado-confetti-caer {
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

// Anima --rev de 0 a 104% con easing cúbico (rAF), timings del legacy
// (animarRevelado()/preparar() en legacy/index.html) ×1.5 más lento a
// pedido del usuario: arranca `delayMs` (600, igual que el legacy — tiempo
// de leer "Agitando…") después de montar, sube 0→104% en `duracionMs`
// (104% para que el borde de la máscara salga del cuadro y no quede una
// línea dura). Corre una sola vez.
function useRevelado<T extends HTMLElement>(duracionMs: number, delayMs = 600) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const espera = setTimeout(() => {
      const t0 = performance.now();
      function paso(t: number) {
        const p = Math.min(1, (t - t0) / duracionMs);
        const ease = 1 - Math.pow(1 - p, 3);
        el!.style.setProperty("--rev", `${(104 * ease).toFixed(2)}%`);
        if (p < 1) raf = requestAnimationFrame(paso);
      }
      raf = requestAnimationFrame(paso);
    }, delayMs);
    return () => {
      clearTimeout(espera);
      cancelAnimationFrame(raf);
    };
  }, [duracionMs, delayMs]);
  return ref;
}

// Misma máscara que .rev-trago en legacy/index.html: revela la imagen de
// abajo hacia arriba según --rev.
const MASCARA_REVELADO = "linear-gradient(to top, #000 0%, #000 calc(var(--rev, 0%) - 4%), transparent var(--rev, 0%))";

// Trago con reveal de máscara (líquido "subiendo" DENTRO del vaso) + tinte
// por ingredientes, portados de legacy/index.html (preparar() / .rev-wrap):
// capa base = el vaso vacío QUE ELIGIÓ el jugador (visible desde el frame 0,
// sin máscara — igual que `sel.vaso===r.vasoId ? r.imgVaso : vasoElegido.img`
// en preparar(): si acertó el vaso coincide con el correcto, si no se ve SU
// vaso llenándose con el trago tintado, para que el error se lea ahí mismo)
// y encima receta.imgTrago enmascarado subiendo. Las fotos comparten el
// mismo encuadre (1536×2752), así que una caja con aspect-ratio +
// object-contain las alinea automáticamente, igual que el legacy (ambas con
// inset:0 dentro de .rev-wrap). Sin reflejo (quitado de toda la app).
// Si `elecciones` coincide EXACTO con `receta.ingredientes` el trago se ve
// normal; si no, se aplica un hue-rotate proporcional a la desviación
// cromática entre lo elegido y lo correcto — el fallo se lee en el vaso.
function TragoRevelado({
  receta,
  elecciones,
  vasoElegido,
  alturaClase,
  style,
}: {
  receta: Receta;
  elecciones: IngredienteId[];
  // Vaso que el jugador eligió (estado.elecciones.vaso). Si es null (no
  // debería llegar a "resultado" sin elegir vaso, pero por si acaso) cae al
  // vaso correcto de la receta.
  vasoElegido: VasoId | null;
  alturaClase: string;
  // Extra inline styles (p.ej. el margin-bottom negativo que usa Ganaste
  // para compensar el padding transparente inferior del PNG y anclar la
  // base VISIBLE del vaso a la línea de la barra).
  style?: CSSProperties;
}) {
  const tinte = filtroTinte(elecciones, receta.ingredientes);
  const acerto = tinte === "";
  const revRef = useRevelado<HTMLDivElement>(acerto ? 4800 : 3900);
  const sombra = "drop-shadow(0 18px 30px rgba(0,0,0,.55))";
  const imgVasoBase = (vasoElegido && VASOS.find((v) => v.id === vasoElegido)?.img) || receta.imgVaso;

  return (
    <div
      ref={revRef}
      className={`relative aspect-[1536/2752] ${alturaClase}`}
      style={{ ["--rev" as string]: "0%", ...style }}
    >
      {/* Vaso vacío QUE ELIGIÓ el jugador: base siempre visible, sin máscara. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgVasoBase}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        style={{ filter: sombra }}
      />
      {/* Trago: se revela de abajo hacia arriba encima del vaso. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={receta.imgTrago}
        alt={receta.nombre}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        style={{
          WebkitMaskImage: MASCARA_REVELADO,
          maskImage: MASCARA_REVELADO,
          filter: tinte ? `${tinte} ${sombra}` : sombra,
        }}
      />
    </div>
  );
}

// Alto del trago en la escena de "Ganaste" (cqh). Grande a propósito: debe
// dominar la escena sin invadir el título GANASTE!! (ver comentario abajo).
const ALTURA_TRAGO_GANASTE_CQH = 45;

// Alto de la CAJA del trago revelado en "Casi". Los PNG del set traen mucho
// alpha (25-32% arriba, 18-26% abajo): a 58cqh de caja el vaso VISIBLE queda
// en ~25-30cqh. El crecimiento respecto al alto de referencia se absorbe con
// margen superior negativo, así el vaso crece hacia ARRIBA (hacia el hueco
// bajo el subtítulo) y la ficha de ingredientes no se mueve.
const ALTURA_TRAGO_CASI_CQH = 58;
// Alto de caja con el que se calibró la posición actual de la ficha: el
// margen superior negativo mantiene el final de layout del bloque idéntico
// al que produce esta referencia.
const ALTURA_REF_CASI_CQH = 40;

// Variante "gano" (mock 13): título gigante, confetti sutil, trago sobre la
// barra con su tarjeta de receta al lado.
function Ganaste() {
  const { estado, despachar } = useJuego();
  const receta = estado.receta;
  if (!receta) return null;

  // Los PNG del trago/vaso traen padding transparente inferior (recorte
  // consistente del set), así que su base real (el pie del vaso) queda por
  // encima del borde del lienzo. Sin compensar, el trago "flota" separado
  // de la línea de la barra. imgVasoBase es la MISMA imagen base que pinta
  // TragoRevelado (el vaso que eligió el jugador, o el de la receta si no
  // hay elección); su fracción en PAD_INFERIOR nos dice cuánto compensar.
  const imgVasoBase =
    (estado.elecciones.vaso && VASOS.find((v) => v.id === estado.elecciones.vaso)?.img) || receta.imgVaso;
  const padFrac = PAD_INFERIOR[imgVasoBase] ?? 0;
  const padCqh = padFrac * ALTURA_TRAGO_GANASTE_CQH;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Confetti />
      <Logo />

      <div className="absolute inset-x-0 top-[13cqh] z-10 flex justify-center px-[6cqw] text-center">
        {/* Mismo tamaño que los títulos de Intro/Listo (7.7cqh): el peso
            visual de fondo aquí es el trago, así que el título no puede
            quedarse en la escala de texto.texto-titulo (4.99cqh). */}
        <h1 className="font-titulo text-[7.7cqh] font-medium uppercase leading-[1.02] text-white">GANASTE!!</h1>
      </div>

      <BarraEscena>
        {/* items-center (no items-end): el margin-bottom negativo de abajo
            "recorta" el alto de layout del trago a su base VISIBLE (sin el
            padding transparente), así el centro de la tarjeta —que sí usa
            su alto natural— cae exactamente en el centro del vaso visible,
            sin necesidad de conocer su alto de antemano. */}
        <div
          className="absolute inset-x-0 z-10 flex items-center justify-center gap-[4cqw] px-[6cqw]"
          style={{ bottom: "calc(100cqh - var(--linea-barra, 64cqh))" }}
        >
          <TragoRevelado
            receta={receta}
            elecciones={estado.elecciones.ingredientes}
            vasoElegido={estado.elecciones.vaso}
            // Alto vía `style` (no clase Tailwind): ALTURA_TRAGO_GANASTE_CQH
            // es una constante JS, y una clase arbitraria construida con un
            // template string no la detecta el escaneo estático de Tailwind.
            alturaClase=""
            style={{ height: `${ALTURA_TRAGO_GANASTE_CQH}cqh`, marginBottom: `${-padCqh}cqh` }}
          />

          <div className="flex max-w-[50cqw] flex-col items-start gap-[1cqh] text-left">
            <h2 className="font-titulo text-[2.1cqh] font-medium uppercase leading-[1.04] text-white">
              {receta.nombre}
            </h2>
            <ul className="flex flex-col gap-[0.5cqh]">
              {receta.lineasReceta.map((linea) => (
                <li key={linea} className="texto-label !tracking-[0.04em]">
                  • {linea}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Botón bajo la línea de la barra (zona del frente de la mesa),
            no flotando arriba junto al título. */}
        <div
          className="absolute inset-x-0 z-10 flex justify-center"
          style={{ top: "calc(var(--linea-barra, 62cqh) + 8cqh)" }}
        >
          <button type="button" onClick={() => despachar({ tipo: "REINICIAR" })} className={BOTON}>
            INICIO
          </button>
        </div>
      </BarraEscena>
    </div>
  );
}

function FilaCheck({ etiqueta, ok }: { etiqueta: string; ok: boolean }) {
  return (
    <div className="flex w-full max-w-[74cqw] items-center justify-between gap-[3cqw] border-b border-crema/10 py-[1.3cqh]">
      <span className="font-titulo text-[clamp(12px,3.6cqw,15px)] font-medium uppercase tracking-[0.06em] text-crema">
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

  // Igual que en Ganaste: los PNG traen padding transparente inferior, así
  // que a este tamaño el trago quedaría "despegado" del checklist de abajo.
  // El margin-bottom negativo recorta el alto de layout a la base VISIBLE.
  const imgVasoBase =
    (estado.elecciones.vaso && VASOS.find((v) => v.id === estado.elecciones.vaso)?.img) || receta.imgVaso;
  const padFracCasi = PAD_INFERIOR[imgVasoBase] ?? 0;
  const padCasiCqh = padFracCasi * ALTURA_TRAGO_CASI_CQH;
  // Mantiene el final de layout del bloque (y con él la ficha de abajo) en el
  // punto que produce la caja de referencia: todo el alto extra se proyecta
  // hacia arriba. Incluye el mt-[2cqh] original del contenedor.
  const mtCasiCqh = 2 + (1 - padFracCasi) * (ALTURA_REF_CASI_CQH - ALTURA_TRAGO_CASI_CQH);

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden px-[7cqw] pb-[3.5cqh] pt-[5cqh] text-center">
      <Logo />

      {/* relative z-10: el trago agrandado sube hasta esta zona (el garnish
          puede cruzarla); el texto debe pintarse ENCIMA para seguir legible. */}
      <div className="relative z-10 mt-[7cqh] flex flex-col items-center gap-[0.8cqh]">
        <h1 className="texto-titulo">CASI...</h1>
        <p className="texto-sub">ASÍ ERA EL {receta.nombre}</p>
      </div>

      <div style={{ marginTop: `${mtCasiCqh}cqh` }}>
        <TragoRevelado
          receta={receta}
          elecciones={estado.elecciones.ingredientes}
          vasoElegido={estado.elecciones.vaso}
          alturaClase=""
          style={{ height: `${ALTURA_TRAGO_CASI_CQH}cqh`, marginBottom: `${-padCasiCqh}cqh` }}
        />
      </div>

      <div className="mt-[3cqh] flex w-full flex-col items-center">
        <FilaCheck etiqueta="VASO" ok={ev.vasoOk} />
        <FilaCheck etiqueta={receta.ronNombre} ok={ev.ronOk} />
        <FilaCheck etiqueta={receta.mezclaNombre} ok={ev.mezclaOk} />
      </div>

      <div className="mt-[3cqh] flex w-full flex-col items-center gap-[1.4cqh]">
        <span className="texto-label">INGREDIENTES</span>
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
        <h1 className="texto-titulo">
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
