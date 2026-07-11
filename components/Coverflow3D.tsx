"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { DIMENSIONES, PAD_INFERIOR } from "@/lib/asset-manifest";

export interface CoverflowItem {
  id: string;
  img: string;
  nombre: string;
}

interface Props {
  items: CoverflowItem[];
  onSelect: (id: string) => void; // tap sobre el item CENTRADO
  alturaItem?: number; // en cqh
  onCentroChange?: (item: CoverflowItem, index: number) => void; // opcional: snap
  marcados?: Set<string>; // ids con overlay de check (paso MEZCLA multi-select)
}

// Reparto/física del coverflow (ruleta infinita estilo legacy).
const FACTOR = 0.69; // separación horizontal (× 46cqw) — laterales bien separados del centro
// rotateY suave: la profundidad se lee por TAMAÑO y BRILLO, no por deformación.
// Un giro fuerte estiraba los laterales; se baja a un ángulo sutil.
const ROT = 12; // grados de rotateY por unidad de distancia
// El encogimiento de los laterales viene sobre todo de la PROFUNDIDAD (perspectiva
// con punto de fuga en la línea de la barra): así los pies quedan anclados a la
// barra a cualquier tamaño. `scale` solo añade un extra pequeño (no despega la base).
const DEPTH = 185; // px de translateZ por unidad de distancia
const SCALE_STEP = 0.12; // reducción de escala extra por unidad (pequeña, no rompe el anclaje)
const BRIGHT_STEP = 0.3; // oscurecimiento por unidad (centro = 1)
// Profundidad de campo: desenfoque proporcional a la distancia al centro (0px
// nítido en el centro; laterales hasta BLUR_MAX). El blur es el filtro más caro
// en GPUs débiles, así que se CUANTIZA a pasos de BLUR_CUANTO para no
// re-rasterizarlo en cada micro-cambio al rotar (el raster se reusa entre pasos)
// y el nodo lleva will-change:filter + translateZ para componerlo en GPU.
const BLUR_MAX = 2.5; // px máximos (sutil: sensación de foco sin verse borroso)
const BLUR_POR_UNIDAD = 2.0; // px de blur por unidad de distancia al centro
const BLUR_CUANTO = 0.25; // cuantización del radio de blur (px)
const SUAVE_DESDE = 1.5; // a partir de esta distancia se comprime el reparto (útil con 5+ items)
const K = 170; // rigidez del muelle
const C = 26; // amortiguación (≈ crítica para k=170)
const PROY = 0.16; // s de proyección de la inercia al soltar

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function Coverflow3D({ items, onSelect, alturaItem = 40, onCentroChange, marcados }: Props) {
  const n = items.length;
  const inicial = 0; // ruleta infinita: en 0 el primer item queda centrado con ambos vecinos
  const stageRef = useRef<HTMLDivElement>(null);
  const nodosRef = useRef<(HTMLDivElement | null)[]>([]);
  const [centro, setCentro] = useState(inicial);

  // Feedback de selección (portado del legacy `.cf-item.elegido .cf-foto`): al
  // confirmar el item CENTRAL, su foto interna hace scale + subida ANTES de
  // avanzar. Se aplica al elemento interno (NO al nodo 3D, que reescribe pintar()
  // cada frame y cuyo transform-style:preserve-3d se aplanaría). En multi-select
  // (marcar) es un pulso más corto que vuelve; en single-select bloquea y avanza.
  const [feedback, setFeedback] = useState<{ idx: number; modo: "confirmar" | "marcar" } | null>(null);
  const bloqueadoRef = useRef(false);
  const timerConfirmRef = useRef<number | null>(null);
  const timerBumpRef = useRef<number | null>(null);
  const multiSelect = marcados !== undefined;

  // Estado físico en refs: nunca provoca re-render (el rAF escribe al DOM directo).
  const posRef = useRef(inicial); // posición en "espacio de índice" (0..n-1)
  const velRef = useRef(0); // velocidad en índice/seg
  const objetivoRef = useRef(inicial); // índice destino del muelle
  const arrastreRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const ultimoTRef = useRef(0);
  const centroRef = useRef(inicial);
  const onCentroRef = useRef(onCentroChange);
  onCentroRef.current = onCentroChange;

  // Puntero. `id` = pointerId del primer dedo activo (guard multi-touch).
  const punteroRef = useRef({ id: -1, x0: 0, y0: 0, pos0: 0, t0: 0, xPrev: 0, tPrev: 0, vpx: 0, idx: -1 });

  function pasoPx() {
    const w = stageRef.current?.clientWidth ?? 390;
    return w * 0.46 * FACTOR;
  }

  function pintar() {
    const pos = posRef.current;
    const nodos = nodosRef.current;
    for (let k = 0; k < n; k++) {
      const el = nodos[k];
      if (!el) continue;
      // Distancia envuelta al centro (ruleta infinita): el item aparece en su
      // copia más cercana, en [-n/2, n/2]. Al pasar el último reaparece el primero.
      let d = k - pos;
      d = d - n * Math.round(d / n);
      const a = Math.abs(d);
      const sign = Math.sign(d);
      // Comprime el reparto de los items lejanos para que no se disparen (5+ items).
      const aSuave = a <= SUAVE_DESDE ? a : SUAVE_DESDE + (a - SUAVE_DESDE) * 0.45;
      const txCqw = sign * aSuave * 46 * FACTOR;
      const ry = clamp(-d * ROT, -52, 52);
      const tz = -aSuave * DEPTH;
      const sc = Math.max(0.34, 1 - a * SCALE_STEP);
      const brillo = Math.max(0.5, 1 - a * BRIGHT_STEP);
      // Desenfoque de profundidad, cuantizado a BLUR_CUANTO: al rotar, el radio
      // solo cambia en saltos de 0.25px, así el navegador reusa el raster del
      // blur entre esos saltos (evita re-rasterizar cada frame en gama baja).
      const blurCrudo = Math.min(BLUR_MAX, a * BLUR_POR_UNIDAD);
      const blur = Math.round(blurCrudo / BLUR_CUANTO) * BLUR_CUANTO;
      // Sombra fuerte y centrada en el item central; se diluye hacia los lados.
      const sombra = Math.max(0, 1 - a) * 22;
      // Funde los items que se van al fondo (costura de la ruleta con pocos items).
      const opacidad = a < 2 ? 1 : Math.max(0, 1 - (a - 2) / 0.6);
      // Orden clave: translateZ ANTES de rotateY, para que la profundidad recule
      // en el marco del contenedor (converge hacia el punto de fuga en la barra,
      // sin abrirse hacia los bordes). rotateY gira sobre el eje vertical de la
      // base (transform-origin bottom center), así el pie no se desplaza.
      el.style.transform =
        `translateX(-50%) translateX(${txCqw}cqw) translateZ(${tz}px) ` +
        `rotateY(${ry}deg) scale(${sc})`;
      // El blur va PRIMERO en el filtro compuesto; se omite en el centro (blur 0)
      // para no procesar un filtro de más en el item focal (el más mirado).
      const desenfoque = blur > 0 ? `blur(${blur.toFixed(2)}px) ` : "";
      el.style.filter =
        `${desenfoque}brightness(${brillo.toFixed(3)}) ` +
        `drop-shadow(0 ${(6 + sombra).toFixed(0)}px ${(10 + sombra).toFixed(0)}px rgba(0,0,0,.55))`;
      el.style.opacity = opacidad.toFixed(2);
      el.style.zIndex = String(200 - Math.round(a * 10));
    }
    const c = ((Math.round(pos) % n) + n) % n; // índice centrado envuelto
    if (c !== centroRef.current) {
      centroRef.current = c;
      setCentro(c);
      onCentroRef.current?.(items[c], c);
    }
  }

  function pararRaf() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  // Bucle de muelle críticamente amortiguado hacia objetivoRef, con inercia.
  function correrMuelle() {
    pararRaf();
    ultimoTRef.current = performance.now();
    const paso = (t: number) => {
      let dt = (t - ultimoTRef.current) / 1000;
      ultimoTRef.current = t;
      dt = Math.min(dt, 1 / 30); // acota saltos si cae un frame
      const objetivo = objetivoRef.current;
      const x = posRef.current;
      const a = -K * (x - objetivo) - C * velRef.current;
      velRef.current += a * dt;
      posRef.current += velRef.current * dt;
      pintar();
      if (Math.abs(posRef.current - objetivo) < 0.001 && Math.abs(velRef.current) < 0.02) {
        posRef.current = objetivo;
        velRef.current = 0;
        pintar();
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(paso);
    };
    rafRef.current = requestAnimationFrame(paso);
  }

  // Anima hacia un índice (posiblemente envuelto). Elige la copia más cercana a
  // la posición actual para que gire por el camino corto.
  function irA(indice: number) {
    const pos = posRef.current;
    let objetivo = indice;
    objetivo = objetivo - n * Math.round((objetivo - pos) / n);
    objetivoRef.current = objetivo;
    correrMuelle();
  }

  // ---- Punteros ----
  function onDown(e: React.PointerEvent) {
    // Guard multi-touch: si ya hay un dedo arrastrando, ignora los siguientes.
    // bloqueadoRef: durante el feedback de confirmación no se acepta input.
    if (arrastreRef.current || bloqueadoRef.current) return;
    pararRaf();
    arrastreRef.current = true;
    const p = punteroRef.current;
    p.id = e.pointerId;
    p.x0 = p.xPrev = e.clientX;
    p.y0 = e.clientY;
    p.pos0 = posRef.current;
    p.t0 = p.tPrev = performance.now();
    p.vpx = 0;
    const objetivo = (e.target as HTMLElement)?.closest?.("[data-idx]") as HTMLElement | null;
    p.idx = objetivo ? Number(objetivo.dataset.idx) : -1;
    velRef.current = 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }

  function onMove(e: React.PointerEvent) {
    if (!arrastreRef.current || e.pointerId !== punteroRef.current.id) return;
    const p = punteroRef.current;
    const t = performance.now();
    const dtm = Math.max(1, t - p.tPrev);
    p.vpx = (e.clientX - p.xPrev) / dtm; // px/ms
    p.xPrev = e.clientX;
    p.tPrev = t;
    // Ruleta infinita: la posición no se acota (el render envuelve al índice).
    posRef.current = p.pos0 - (e.clientX - p.x0) / pasoPx();
    pintar();
  }

  function onUp(e: React.PointerEvent) {
    const p = punteroRef.current;
    if (!arrastreRef.current || e.pointerId !== p.id) return;
    arrastreRef.current = false;
    p.id = -1;
    const dx = e.clientX - p.x0;
    const dy = e.clientY - p.y0;
    const mov = Math.hypot(dx, dy);
    const centroActual = ((Math.round(posRef.current) % n) + n) % n; // índice envuelto centrado
    if (mov < 8) {
      // Tap: sobre el central -> seleccionar; sobre un lateral -> ir hacia él.
      const idx = p.idx >= 0 ? p.idx : centroActual;
      if (idx === centroActual) {
        if (multiSelect) {
          // Marcar/desmarcar: pulso corto (vuelve solo) + toggle inmediato, sin
          // bloquear ni avanzar (se sigue editando la multi-selección).
          if (timerBumpRef.current) clearTimeout(timerBumpRef.current);
          setFeedback({ idx, modo: "marcar" });
          timerBumpRef.current = window.setTimeout(() => setFeedback(null), 200);
          onSelect(items[idx].id);
        } else {
          // Confirmar: scale + subida en la foto y avanzar tras 380ms (legacy),
          // bloqueando el input mientras dura el feedback.
          bloqueadoRef.current = true;
          setFeedback({ idx, modo: "confirmar" });
          timerConfirmRef.current = window.setTimeout(() => {
            bloqueadoRef.current = false;
            setFeedback(null);
            onSelect(items[idx].id);
          }, 380);
        }
      } else irA(idx);
      return;
    }
    // Inercia: proyecta con la velocidad medida y engancha al índice más cercano
    // (sin límites: la ruleta puede dar vueltas completas).
    const velIdx = (-p.vpx * 1000) / pasoPx(); // índice/seg
    velRef.current = velIdx;
    const proyectado = posRef.current + velIdx * PROY;
    objetivoRef.current = Math.round(proyectado);
    correrMuelle();
  }

  // pointercancel NO es un tap: un gesto del sistema (menú contextual, segundo
  // dedo, cancelación del navegador) no debe seleccionar ni navegar. Solo se
  // reencaja al índice más cercano.
  function onCancel(e: React.PointerEvent) {
    const p = punteroRef.current;
    if (!arrastreRef.current || e.pointerId !== p.id) return;
    arrastreRef.current = false;
    p.id = -1;
    objetivoRef.current = Math.round(posRef.current); // reencaja al índice más cercano
    correrMuelle();
  }

  // Pintado inicial y en cambios de tamaño / lista. useLayoutEffect (no useEffect):
  // aplica los transforms SÍNCRONAMENTE antes del primer paint del navegador, así
  // los items nacen con su tamaño/posición finales. Con useEffect (pasivo, tras el
  // paint) en gama baja se pintaba un frame con scale(1) sin translateX (items
  // grandes/apilados) que luego se encogían: el "scale" visible al aparecer.
  useLayoutEffect(() => {
    pintar();
    // Notifica el centro inicial para que el consumidor sincronice el título
    // (el índice de arranque es 0, no el que el consumidor asuma por defecto).
    onCentroRef.current?.(items[centroRef.current], centroRef.current);
    const ro = new ResizeObserver(() => pintar());
    if (stageRef.current) ro.observe(stageRef.current);
    return () => {
      ro.disconnect();
      pararRaf();
      if (timerConfirmRef.current) clearTimeout(timerConfirmRef.current);
      if (timerBumpRef.current) clearTimeout(timerBumpRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return (
    <div
      ref={stageRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      // El fundido de entrada va AQUÍ (elemento con perspective, transform-style
      // flat), no en el contenedor preserve-3d: opacity<1 sobre un preserve-3d lo
      // APLANA (spec CSS), quitando la profundidad y haciendo que los laterales
      // nazcan a tamaño ortográfico (más grandes) y salten al 3D al acabar el fade.
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing [perspective:1100px] [animation:coverflow-aparece_.25s_ease-out]"
      // El punto de fuga se sitúa en la línea de la barra: así los pies de los
      // items (todos con base en esa línea) no se despegan al recular en Z.
      style={{
        ["--altura-item" as string]: `${alturaItem}cqh`,
        perspectiveOrigin: "50% var(--linea-barra, 62cqh)",
      }}
    >
      {/* Contenedor 3D. El fundido de entrada NO va aquí (ver stage): opacity
          sobre un preserve-3d lo aplana y rompe la perspectiva de los laterales. */}
      <div className="absolute inset-0 [transform-style:preserve-3d]">
        {items.map((it, k) => {
          // Padding transparente inferior precomputado (fracción del alto). Anclar
          // la base VISIBLE del item a la barra desde el PRIMER frame, sin scan.
          const padFrac = PAD_INFERIOR[it.img] ?? 0;
          // Ancho de la caja fijado SÍNCRONAMENTE desde las dimensiones precomputadas
          // (alto = --altura-item, ancho = alto × ratio): el layout no espera al
          // decode del webp, así el lateral nace ya a su tamaño (sin flick de resize).
          const dim = DIMENSIONES[it.img];
          const ratio = dim ? dim.w / dim.h : null;
          // Feedback de selección sobre la foto interna (no el nodo 3D): scale +
          // subida con origen en la base, como el legacy `.cf-item.elegido`.
          const esFeedback = feedback?.idx === k;
          const durFeedback = feedback?.modo === "marcar" ? "0.18s" : "0.42s";
          const estiloFeedback: React.CSSProperties = {
            transformOrigin: "50% 100%",
            transition: `transform ${durFeedback} cubic-bezier(0.22, 0.9, 0.28, 1)`,
            ...(esFeedback && {
              transform:
                feedback?.modo === "confirmar"
                  ? "scale(1.1) translateY(-6px)"
                  : "scale(1.12) translateY(-4px)",
            }),
          };
          return (
            <div
              key={it.id}
              data-idx={k}
              ref={(el) => {
                nodosRef.current[k] = el;
              }}
              aria-label={it.nombre}
              className="absolute left-1/2 will-change-[transform,filter] [transform-style:preserve-3d]"
              style={{
                bottom: "calc(100cqh - var(--linea-barra, 62cqh))",
                transformOrigin: "bottom center",
              }}
            >
              {/* Área táctil generosa alrededor del vaso sin alterar su tamaño visual */}
              <div className="relative flex flex-col items-center px-[6cqw]" style={estiloFeedback}>
                {/* margin-bottom negativo = padding transparente: sube el borde
                    inferior de la caja hasta la base VISIBLE del vaso, para que
                    se apoye en la barra a cualquier escala. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.img}
                  alt={it.nombre}
                  draggable={false}
                  width={dim?.w}
                  height={dim?.h}
                  className="pointer-events-none block select-none object-contain"
                  style={{
                    height: "var(--altura-item)",
                    width: ratio ? `calc(var(--altura-item) * ${ratio.toFixed(4)})` : "auto",
                    marginBottom: `calc(var(--altura-item) * ${(-padFrac).toFixed(4)})`,
                  }}
                />
                {/* Overlay de check (mismo lenguaje visual que GridMix): marca el
                    item en el paso MEZCLA multi-select. Va dentro del nodo 3D para
                    escalar/rotar con él. */}
                {marcados?.has(it.id) && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex h-[5cqh] w-[5cqh] items-center justify-center rounded-full bg-navy ring-2 ring-oro shadow-[0_2px_10px_rgba(0,0,0,.5)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[55%] w-[55%] text-oro"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* centro expuesto por accesibilidad; el título lo pinta el consumidor */}
      <span className="sr-only" aria-live="polite">
        {items[centro]?.nombre}
      </span>

      <style jsx>{`
        @keyframes coverflow-aparece {
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
