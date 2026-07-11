"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { BarraEscena } from "@/components/BarraEscena";
import { IMG, PAD_INFERIOR } from "@/lib/asset-manifest";
import { INGREDIENTES, MEZCLAS, VASOS } from "@/lib/recetas";
import type { IngredienteId, MezclaId, Receta, VasoId } from "@/lib/recetas";
import { enviarPartida } from "@/lib/partida-cliente";
import { reintentarPendiente } from "@/lib/registro-cliente";
import { filtroTinte } from "@/lib/tinte-trago";
import { useJuego } from "@/lib/juego";

const BOTON =
  "texto-boton rounded-full bg-gradient-to-b from-oro-claro to-oro px-[12cqw] py-[0.55cqh] leading-none shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-[transform,filter] duration-100 active:scale-95 active:brightness-90";

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
    // pointer-events-none: el lienzo (con su alpha inferior) se solapa por los
    // márgenes negativos con los botones de abajo; al ser un elemento
    // posicionado interceptaba los taps aunque las <img> ya fueran none.
    <div
      ref={revRef}
      className={`pointer-events-none relative aspect-[1536/2752] ${alturaClase}`}
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
// alpha (25-32% arriba, 18-26% abajo): a esta caja el vaso VISIBLE queda más
// pequeño. Como la HUELLA de layout es fija (2 + (1-padFrac)·REF, ver abajo) y
// la base va anclada por el margen negativo por alpha, bajar este valor encoge
// el trago HACIA ARRIBA (la base no se mueve, la ficha tampoco): así el TOP
// visible del trago —incluido el garnish alto de toronja/albahaca (rodaja +
// romero)— baja por DEBAJO del subtítulo "ASÍ ERA EL..." con margen, en vez de
// taparlo. Valor calibrado con medición pixel-real del garnish (canvas):
// toronja (romero, el más alto: solo ~11% de alpha superior) queda ~1.9cqh por
// debajo del subtítulo; albahaca, más holgado. Verificado en ambos viewports +
// Sour perdido sin scroll.
const ALTURA_TRAGO_CASI_CQH = 28;
// Alto de caja con el que se calibró la posición de la ficha: el margen superior
// negativo mantiene el final de layout del bloque en el punto que produce esta
// referencia. La HUELLA de layout del bloque es 2 + (1-padFrac)·REF (independiente
// de ALTURA_TRAGO), así que esta constante es la palanca real para liberar alto:
// se baja para que el peor caso de CASI (Sour perdido: 3 filas de mezcla + hasta
// 2 chips de mezcla + 2 de ingrediente + 2 sobrantes) quepa SIN scroll en
// 390×844 y 786×1397.
const ALTURA_REF_CASI_CQH = 24;

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

function nombreMezcla(id: MezclaId): string {
  return MEZCLAS.find((m) => m.id === id)?.nombre ?? id;
}

// Tabla de dos columnas TE FALTÓ / TE SOBRÓ (mezclas + complementos juntos).
// Texto centrado, sin división vertical entre columnas; solo divisores
// horizontales finos entre filas (mismo lenguaje que la ficha de checks). Si una
// columna queda vacía muestra un "—" para no romper la tabla.
function TablaFaltoSobro({ falto, sobro }: { falto: string[]; sobro: string[] }) {
  const filas = Math.max(falto.length, sobro.length, 1);
  const celda = (lista: string[], i: number) => lista[i] ?? (lista.length === 0 && i === 0 ? "—" : "");
  const CELDA = "px-[1cqw] text-center font-cuerpo text-[clamp(10px,2.7cqw,13px)] font-medium uppercase tracking-[0.03em]";
  return (
    <div className="w-full max-w-[74cqw]">
      <div className="grid grid-cols-2 border-b border-oro/25 pb-[0.55cqh]">
        <span className="texto-label text-center">TE FALTÓ</span>
        <span className="texto-label text-center">TE SOBRÓ</span>
      </div>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="grid grid-cols-2 border-b border-crema/10 py-[0.5cqh] last:border-b-0">
          <span className={`${CELDA} text-red-400/90`}>{celda(falto, i)}</span>
          <span className={`${CELDA} text-crema/55`}>{celda(sobro, i)}</span>
        </div>
      ))}
    </div>
  );
}

function FilaCheck({ etiqueta, ok }: { etiqueta: string; ok: boolean }) {
  return (
    <div className="flex w-full max-w-[74cqw] items-center justify-between gap-[3cqw] border-b border-crema/10 py-[0.7cqh]">
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

const BOTON_PRIMARIO =
  "texto-boton rounded-full bg-gradient-to-b from-oro-claro to-oro px-[12cqw] py-[0.7cqh] leading-none shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-[transform,filter] duration-100 active:scale-95 active:brightness-90";
const BOTON_GHOST =
  "font-cuerpo text-[1.5cqh] font-medium uppercase tracking-[0.16em] text-crema/70 underline decoration-crema/30 underline-offset-4 transition-[transform,color] duration-100 hover:text-crema active:scale-[0.98] active:text-crema";

// Acciones al perder (CASI y TIEMPO AGOTADO): solo en el PRIMER intento perdido
// aparece "VOLVER A INTENTAR" (2ª partida al MISMO registro, ver reducer
// REINTENTAR) con "IR A INICIO" como ghost debajo. En el 2º intento (o más)
// queda únicamente "IR A INICIO" como botón primario.
function AccionesPerder() {
  const { estado, despachar } = useJuego();
  const puedeReintentar = estado.intento === 1;
  return (
    <div className="flex shrink-0 flex-col items-center gap-[1.1cqh]">
      {puedeReintentar && (
        <button type="button" onClick={() => despachar({ tipo: "REINTENTAR" })} className={BOTON_PRIMARIO}>
          VOLVER A INTENTAR
        </button>
      )}
      <button
        type="button"
        onClick={() => despachar({ tipo: "REINICIAR" })}
        className={puedeReintentar ? BOTON_GHOST : BOTON_PRIMARIO}
      >
        IR A INICIO
      </button>
    </div>
  );
}

// Variante "fallo": desglose de lo que se eligió mal (checklist vaso/rón/mezcla
// + ingredientes correctos/faltantes/sobrantes). Sin mock; mismo lenguaje
// visual que "gano" (logo, Oswald gigante, dorado).
function Casi() {
  const { estado } = useJuego();
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

  // Intento 1: invita a reintentar; 2º intento perdido: cierre.
  const titulo = estado.intento === 1 ? "VUELVE A INTENTARLO" : "INTENTO FALLIDO";
  // Todo lo que faltó / sobró (mezclas + complementos juntos) para la tabla.
  const falto = [...ev.mezclasFaltaron.map(nombreMezcla), ...ev.faltaron.map((id) => INGREDIENTES[id].nombre)];
  const sobro = [...ev.mezclasSobraron.map(nombreMezcla), ...ev.sobraron.map((id) => INGREDIENTES[id].nombre)];

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden px-[7cqw] pb-[2.5cqh] pt-[5cqh] text-center">
      <Logo />

      {/* relative z-10: el trago agrandado sube hasta esta zona (el garnish
          puede cruzarla); el texto debe pintarse ENCIMA para seguir legible. */}
      <div className="relative z-10 mt-[4.5cqh] flex flex-col items-center gap-[0.6cqh]">
        <h1 className="texto-titulo">{titulo}</h1>
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

      {/* Botones inmediatamente debajo del vaso, antes de la ficha. */}
      <div className="relative z-10 mt-[4cqh]">
        <AccionesPerder />
      </div>

      {/* Filas ✓/✗ de vaso/rón/mezclas de la receta (se mantienen). */}
      <div className="mt-[1.6cqh] flex w-full flex-col items-center">
        <FilaCheck etiqueta="VASO" ok={ev.vasoOk} />
        <FilaCheck etiqueta={receta.ronNombre} ok={ev.ronOk} />
        {receta.mezclas.map((m) => (
          <FilaCheck key={m} etiqueta={nombreMezcla(m)} ok={estado.elecciones.mezclas.includes(m)} />
        ))}
      </div>

      <div className="mt-[1.4cqh] w-full">
        <TablaFaltoSobro falto={falto} sobro={sobro} />
      </div>
    </div>
  );
}

// Variante "tiempo" (mock 14): título + botón en la mitad superior, barra
// decorativa (sin trago) debajo.
function TiempoAgotado() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Logo />
      <div className="absolute inset-x-0 top-[16cqh] z-10 flex flex-col items-center gap-[3.6cqh] px-[9cqw] text-center">
        <h1 className="font-titulo text-[7.7cqh] font-medium uppercase leading-[1.02] text-white">
          PERDISTE..
          <br />
          TIEMPO AGOTADO
        </h1>
        <AccionesPerder />
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
      detalles: { elecciones: estado.elecciones, evaluacion: estado.evaluacion, intento: estado.intento },
    });
    reintentarPendiente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado.resultado === "gano") return <Ganaste />;
  if (estado.resultado === "fallo") return <Casi />;
  if (estado.resultado === "tiempo") return <TiempoAgotado />;
  return null;
}
