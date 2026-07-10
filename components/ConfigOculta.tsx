"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Settings, X } from "lucide-react";
import { CIUDADES } from "@/lib/establecimientos";
import { guardarPortada, leerPortada, type Portada } from "@/lib/portada";

const VIDEO_LANZAMIENTO = "/video-lanzamiento.mp4";

const CLAVE_CONFIG = "mc_config";

interface ConfigLocal {
  ciudad: string;
  establecimiento: string;
}

function leerConfig(): ConfigLocal | null {
  try {
    const crudo = localStorage.getItem(CLAVE_CONFIG);
    if (!crudo) return null;
    const c = JSON.parse(crudo) as Partial<ConfigLocal> | null;
    if (typeof c?.ciudad === "string" && typeof c?.establecimiento === "string" && c.ciudad && c.establecimiento) {
      return { ciudad: c.ciudad, establecimiento: c.establecimiento };
    }
    return null;
  } catch {
    return null;
  }
}

function guardarConfig(config: ConfigLocal): void {
  try {
    // Merge: conserva otras claves de mc_config (p.ej. la portada elegida) al
    // guardar ciudad/establecimiento.
    const previo = localStorage.getItem(CLAVE_CONFIG);
    const base = previo ? (JSON.parse(previo) as Record<string, unknown>) : {};
    localStorage.setItem(CLAVE_CONFIG, JSON.stringify({ ...base, ...config }));
  } catch {
    // localStorage no disponible: no hay más que hacer.
  }
}

async function alternarFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // navegador sin soporte o gesto insuficiente: se ignora en silencio.
  }
}

// Mismo pill que los inputs de Formulario.tsx (borde oro/25, fondo negro
// translúcido, texto crema) + flecha dorada propia porque appearance-none
// quita la nativa, y color-scheme:dark para que el listado de opciones
// respete la paleta oscura en navegadores que lo permiten (Chrome/Edge).
const CAMPO =
  "w-full appearance-none rounded-full border border-oro/25 bg-black/40 bg-no-repeat px-[5cqw] py-[1.6cqh] pr-11 font-cuerpo text-[15px] text-crema outline-none transition-colors focus:border-oro focus:ring-2 focus:ring-oro/40 disabled:opacity-40 [color-scheme:dark] [&>option]:bg-navy [&>option]:text-crema";

// Flecha en style (no en clase Tailwind) para no depender del escapado de
// una data URI dentro de un valor arbitrario: aquí es una cadena normal.
const ESTILO_FLECHA = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none'%3E%3Cpath d='M1 1L7 7L13 1' stroke='%23c9a84c' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 1.4rem center",
};

// Overlay a pantalla completa que reproduce el video de lanzamiento EN LOOP.
// Se renderiza a nivel de App (hermano del Marco, ver App.tsx), NO dentro del
// Marco: así escapa de su container-type:size y de su borde dorado (z-30), y
// cubre la pantalla de borde a borde —por encima del marco y de NavBotones— sin
// filo dorado visible. Pide fullscreen real del contenedor si el navegador lo
// permite y sale al cerrar. El ÚNICO cierre es la X, que empieza OCULTA (y no
// clickeable) y reaparece al tocar la pantalla, ocultándose tras 3s sin tocar.
export function VideoOverlay({ onCerrar }: { onCerrar: () => void }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pediFullscreen = useRef(false);
  const timerRef = useRef<number | null>(null);
  const [controlesVisibles, setControlesVisibles] = useState(false);

  useEffect(() => {
    const el = contenedorRef.current;
    el?.requestFullscreen?.()
      .then(() => {
        pediFullscreen.current = true;
      })
      .catch(() => {});
    // Refuerza el autoplay (algunos navegadores ignoran el atributo).
    videoRef.current?.play?.().catch(() => {});
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pediFullscreen.current && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Muestra la X y programa ocultarla tras 3s sin interacción.
  const revelarControles = () => {
    setControlesVisibles(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setControlesVisibles(false), 3000);
  };

  return (
    <div
      ref={contenedorRef}
      onPointerDown={revelarControles}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={VIDEO_LANZAMIENTO}
        autoPlay
        loop
        playsInline
        className="h-full w-full object-contain"
      />
      <button
        type="button"
        aria-label="Cerrar video"
        onClick={onCerrar}
        className={`absolute right-[18px] top-[18px] z-10 grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/50 text-white transition-[opacity,transform,filter] duration-[250ms] active:scale-90 active:brightness-90 ${
          controlesVisibles ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <X size={22} strokeWidth={2.25} />
      </button>
    </div>
  );
}

function ModalConfig({ onCerrar, onVideo }: { onCerrar: () => void; onVideo: () => void }) {
  const actual = leerConfig();
  const [ciudad, setCiudad] = useState(actual?.ciudad ?? "");
  const [establecimiento, setEstablecimiento] = useState(actual?.establecimiento ?? "");
  const [portada, setPortada] = useState<Portada>(leerPortada);

  const establecimientos = CIUDADES.find((c) => c.ciudad === ciudad)?.establecimientos ?? [];

  function guardar() {
    if (!ciudad || !establecimiento) return;
    guardarConfig({ ciudad, establecimiento });
    onCerrar();
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-6"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurar local"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] rounded-3xl border border-oro/40 bg-navy px-6 py-7 shadow-[0_30px_70px_rgba(0,0,0,.6)]"
      >
        <h2 className="font-titulo text-lg uppercase tracking-wide text-oro">Configurar local</h2>
        <p className="mt-1 font-cuerpo text-xs text-crema-suave">
          {actual ? `Actual: ${actual.ciudad} — ${actual.establecimiento}` : "Este kiosko aún no tiene local asignado."}
        </p>

        <button
          type="button"
          onClick={onVideo}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-oro/40 py-2.5 font-titulo text-sm uppercase tracking-wide text-oro transition-[transform,filter] duration-100 active:scale-[0.98] active:brightness-90"
        >
          <Play size={15} strokeWidth={2.25} className="fill-current" /> Video
        </button>

        {/* Selector de PORTADA del Home. Se guarda al instante (persiste como
            default) y el Home reacciona al vuelo. "Evento" = imagen KV a
            pantalla completa; "Actual" = composición de botellas de siempre. */}
        <div className="mt-4">
          <span className="texto-label mb-1.5 block">Portada</span>
          <div className="flex gap-3">
            {([["actual", "Actual"], ["kv", "Evento"]] as const).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={portada === valor}
                onClick={() => {
                  setPortada(valor);
                  guardarPortada(valor);
                }}
                className={`flex-1 rounded-2xl border py-3 font-titulo text-sm uppercase tracking-wide transition-[transform,filter,color,border-color] duration-100 active:scale-[0.98] active:brightness-90 ${
                  portada === valor ? "border-oro bg-oro/15 text-oro" : "border-oro/25 text-crema-suave"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 block">
          <span className="texto-label mb-1.5 block">Ciudad</span>
          <select
            value={ciudad}
            onChange={(e) => {
              setCiudad(e.target.value);
              setEstablecimiento("");
            }}
            className={CAMPO}
            style={ESTILO_FLECHA}
          >
            <option value="">Selecciona…</option>
            {CIUDADES.map((c) => (
              <option key={c.ciudad} value={c.ciudad}>
                {c.ciudad}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="texto-label mb-1.5 block">Establecimiento</span>
          <select
            value={establecimiento}
            onChange={(e) => setEstablecimiento(e.target.value)}
            disabled={!ciudad}
            className={CAMPO}
            style={ESTILO_FLECHA}
          >
            <option value="">Selecciona…</option>
            {establecimientos.map((e) => (
              <option key={e.nombre} value={e.nombre}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-full border border-oro/30 py-2.5 font-cuerpo text-sm text-crema-suave transition-[transform,color,border-color] duration-100 active:scale-[0.98] active:border-oro active:text-oro"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!ciudad || !establecimiento}
            className="flex-1 rounded-full bg-linear-to-r from-oro-claro to-oro py-2.5 font-titulo text-sm uppercase text-navy-deep shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition-[transform,filter] duration-100 active:scale-[0.98] active:brightness-90 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// Dos controles invisibles para uso del promotor, no del jugador: nunca se ven
// ni interfieren con el juego. Esquina superior derecha = configurar el local
// del kiosko (una sola vez); esquina inferior derecha = alternar pantalla
// completa (los tótems suelen requerir un gesto para entrar en fullscreen).
export function ConfigOculta({ onAbrirVideo }: { onAbrirVideo: () => void }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      {/* Config del local: antes 100% invisible; ahora un engranaje fantasma al
          20% para que el promotor lo encuentre sin distraer al jugador. El área
          táctil sigue siendo 56×56. */}
      <button
        type="button"
        aria-label="Configuración del local"
        onClick={() => setModalAbierto(true)}
        className="pointer-events-auto absolute right-0 top-0 z-50 grid h-[56px] w-[56px] place-items-center opacity-20 transition-[transform,opacity] duration-100 active:scale-90 active:opacity-40"
      >
        <Settings size={18} strokeWidth={1.75} className="text-crema" />
      </button>
      {/* Fullscreen: se queda 100% invisible (gesto del promotor). */}
      <button
        type="button"
        aria-label="Pantalla completa"
        onClick={() => void alternarFullscreen()}
        className="pointer-events-auto absolute bottom-0 right-0 z-50 h-[56px] w-[56px] opacity-0"
      />
      {modalAbierto && (
        <ModalConfig
          onCerrar={() => setModalAbierto(false)}
          onVideo={() => {
            setModalAbierto(false);
            onAbrirVideo();
          }}
        />
      )}
    </>
  );
}
