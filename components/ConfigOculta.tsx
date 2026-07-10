"use client";

import { useState } from "react";
import { CIUDADES } from "@/lib/establecimientos";

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
    localStorage.setItem(CLAVE_CONFIG, JSON.stringify(config));
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

function ModalConfig({ onCerrar }: { onCerrar: () => void }) {
  const actual = leerConfig();
  const [ciudad, setCiudad] = useState(actual?.ciudad ?? "");
  const [establecimiento, setEstablecimiento] = useState(actual?.establecimiento ?? "");

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
export function ConfigOculta() {
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Configuración del local"
        onClick={() => setModalAbierto(true)}
        className="pointer-events-auto absolute right-0 top-0 z-50 h-[56px] w-[56px] opacity-0"
      />
      <button
        type="button"
        aria-label="Pantalla completa"
        onClick={() => void alternarFullscreen()}
        className="pointer-events-auto absolute bottom-0 right-0 z-50 h-[56px] w-[56px] opacity-0"
      />
      {modalAbierto && <ModalConfig onCerrar={() => setModalAbierto(false)} />}
    </>
  );
}
