"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Check, MapPin } from "lucide-react";
import { IMG } from "@/lib/asset-manifest";
import { CIUDADES } from "@/lib/establecimientos";
import { mascaraCedula, mascaraTelefono } from "@/lib/mascaras";
import { REGALOS } from "@/lib/regalos";
import { validarRegistro } from "@/lib/validacion";

const CLAVE_UBICACION = "ri_ubicacion";

interface Ubicacion {
  ciudad: string;
  establecimiento: string;
}

interface Datos {
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  regalo: string;
}

const datosVacios: Datos = { nombre: "", cedula: "", telefono: "", correo: "", regalo: "" };

// Pill de input (mismo estilo que el formulario del kiosko, en tamaños fijos
// para una página normal scrollable en lugar de container-queries).
const INPUT =
  "w-full rounded-full border border-oro/25 bg-black/40 px-5 py-3.5 text-[15px] text-crema outline-none transition-colors placeholder:text-crema/40 focus:border-oro focus:ring-2 focus:ring-oro/40 disabled:opacity-40";
const SELECT =
  "w-full appearance-none rounded-full border border-oro/25 bg-black/40 bg-no-repeat px-5 py-3.5 pr-11 text-[15px] text-crema outline-none transition-colors focus:border-oro focus:ring-2 focus:ring-oro/40 disabled:opacity-40 [color-scheme:dark] [&>option]:bg-navy [&>option]:text-crema";
const ESTILO_FLECHA = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none'%3E%3Cpath d='M1 1L7 7L13 1' stroke='%23c9a84c' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 1.4rem center",
};
const ETIQUETA = "mb-1.5 block font-cuerpo text-[11px] font-bold uppercase tracking-[0.14em] text-oro";

function leerUbicacion(): Ubicacion | null {
  try {
    const crudo = localStorage.getItem(CLAVE_UBICACION);
    if (!crudo) return null;
    const c = JSON.parse(crudo) as Partial<Ubicacion> | null;
    if (c?.ciudad && c?.establecimiento && typeof c.ciudad === "string" && typeof c.establecimiento === "string") {
      return { ciudad: c.ciudad, establecimiento: c.establecimiento };
    }
    return null;
  } catch {
    return null;
  }
}

export default function RegistroIndividualPage() {
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [hidratado, setHidratado] = useState(false);

  // La ubicación se resuelve solo en el cliente (localStorage): hasta que
  // hidrata, no decidimos qué paso mostrar para evitar parpadeo/mismatch SSR.
  useEffect(() => {
    setUbicacion(leerUbicacion());
    setHidratado(true);
  }, []);

  function guardarUbicacion(u: Ubicacion) {
    try {
      localStorage.setItem(CLAVE_UBICACION, JSON.stringify(u));
    } catch {
      // localStorage no disponible: seguimos con la ubicación en memoria.
    }
    setUbicacion(u);
  }

  return (
    <main className="flex min-h-dvh w-full flex-col items-center bg-navy-deep px-6 py-8">
      <div className="flex w-full max-w-[420px] flex-1 flex-col">
        <Image
          src={IMG.logoBrugal}
          alt="Brugal"
          width={340}
          height={90}
          priority
          className="mx-auto h-auto w-[150px] drop-shadow-[0_3px_12px_rgba(0,0,0,0.6)]"
        />
        {!hidratado ? null : ubicacion ? (
          <FormularioIndividual ubicacion={ubicacion} onCambiarLocal={() => setUbicacion(null)} />
        ) : (
          <PasoUbicacion onListo={guardarUbicacion} />
        )}
      </div>
    </main>
  );
}

function PasoUbicacion({ onListo }: { onListo: (u: Ubicacion) => void }) {
  const [ciudad, setCiudad] = useState("");
  const [establecimiento, setEstablecimiento] = useState("");
  const establecimientos = CIUDADES.find((c) => c.ciudad === ciudad)?.establecimientos ?? [];

  return (
    <div className="mt-8">
      <h1 className="text-center font-titulo text-2xl uppercase tracking-wide text-white">Registro individual</h1>
      <p className="mt-1.5 text-center font-cuerpo text-sm text-crema/70">Selecciona el local donde registras</p>

      <div className="mt-8">
        <label className="block">
          <span className={ETIQUETA}>Ciudad</span>
          <select
            value={ciudad}
            onChange={(e) => {
              setCiudad(e.target.value);
              setEstablecimiento("");
            }}
            className={SELECT}
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
          <span className={ETIQUETA}>Establecimiento</span>
          <select
            value={establecimiento}
            onChange={(e) => setEstablecimiento(e.target.value)}
            disabled={!ciudad}
            className={SELECT}
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
      </div>

      <button
        type="button"
        disabled={!ciudad || !establecimiento}
        onClick={() => onListo({ ciudad, establecimiento })}
        className="mt-8 w-full rounded-full bg-linear-to-r from-oro-claro to-oro py-3.5 font-titulo text-lg uppercase text-navy-deep shadow-[0_16px_34px_rgba(0,0,0,0.45)] transition-[transform,filter] duration-100 active:scale-[0.98] active:brightness-90 disabled:opacity-40"
      >
        Continuar
      </button>
    </div>
  );
}

function FormularioIndividual({
  ubicacion,
  onCambiarLocal,
}: {
  ubicacion: Ubicacion;
  onCambiarLocal: () => void;
}) {
  const [datos, setDatos] = useState<Datos>(datosVacios);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  function actualizar(campo: keyof Datos, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setError(null);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;

    const validacion = validarRegistro({ ...datos, ...ubicacion });
    if (!validacion.ok) {
      setError(validacion.error);
      return;
    }
    if (!datos.regalo) {
      setError("Selecciona un regalo");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/registro-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validacion.datos, ...ubicacion, regalo: datos.regalo }),
      });
      if (!res.ok) {
        const cuerpo = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(cuerpo?.error ?? "No se pudo guardar. Revisa la conexión e intenta de nuevo.");
        return;
      }
      setExito(true);
    } catch {
      setError("Sin conexión. Vuelve a intentar cuando tengas señal.");
    } finally {
      setEnviando(false);
    }
  }

  function otro() {
    setDatos(datosVacios);
    setExito(false);
    setError(null);
  }

  if (exito) {
    return (
      <div className="mt-14 flex flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-oro bg-oro/15">
          <Check size={40} strokeWidth={2.5} className="text-oro" />
        </div>
        <h2 className="mt-6 font-titulo text-2xl uppercase tracking-wide text-white">¡Registrado!</h2>
        <p className="mt-2 font-cuerpo text-sm text-crema/70">
          {ubicacion.ciudad} — {ubicacion.establecimiento}
        </p>
        <button
          type="button"
          onClick={otro}
          className="mt-10 w-full rounded-full bg-linear-to-r from-oro-claro to-oro py-3.5 font-titulo text-lg uppercase text-navy-deep shadow-[0_16px_34px_rgba(0,0,0,0.45)] transition-[transform,filter] duration-100 active:scale-[0.98] active:brightness-90"
        >
          Registrar otro
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onCambiarLocal}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-oro/25 px-3.5 py-1.5 font-cuerpo text-xs text-crema/80 transition-[transform,border-color] duration-100 active:scale-[0.98] active:border-oro"
      >
        <MapPin size={13} strokeWidth={2} className="text-oro" />
        {ubicacion.ciudad} — {ubicacion.establecimiento}
      </button>

      <h1 className="mt-6 text-center font-titulo text-2xl uppercase tracking-wide text-white">Nuevo registro</h1>
      <p className="mt-1.5 text-center font-cuerpo text-sm text-crema/70">Llena los datos del participante</p>

      <form onSubmit={enviar} autoComplete="off" className="mt-7 flex flex-col gap-4">
        <Campo etiqueta="Nombre" valor={datos.nombre} onCambio={(v) => actualizar("nombre", v)} placeholder="Nombre y apellido" type="text" />
        <Campo
          etiqueta="Cédula"
          valor={datos.cedula}
          onCambio={(v) => actualizar("cedula", v)}
          mascara={mascaraCedula}
          placeholder="000-0000000-0"
          type="text"
          inputMode="numeric"
        />
        <Campo
          etiqueta="Teléfono"
          valor={datos.telefono}
          onCambio={(v) => actualizar("telefono", v)}
          mascara={mascaraTelefono}
          placeholder="(809) 000-0000"
          type="tel"
          inputMode="numeric"
        />
        <Campo
          etiqueta="Correo (opcional)"
          valor={datos.correo}
          onCambio={(v) => actualizar("correo", v)}
          placeholder="correo@ejemplo.com"
          type="email"
          inputMode="email"
        />

        <label className="block">
          <span className={ETIQUETA}>Regalo</span>
          <select
            value={datos.regalo}
            onChange={(e) => actualizar("regalo", e.target.value)}
            className={SELECT}
            style={ESTILO_FLECHA}
          >
            <option value="">Selecciona…</option>
            {REGALOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-center text-sm text-[#ff6b6b]">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 w-full rounded-full bg-linear-to-r from-oro-claro to-oro py-3.5 font-titulo text-lg uppercase text-navy-deep shadow-[0_16px_34px_rgba(0,0,0,0.45)] transition-[transform,filter] duration-100 active:scale-[0.98] active:brightness-90 disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar registro"}
        </button>
      </form>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  onCambio,
  mascara,
  placeholder,
  type,
  inputMode,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  mascara?: (bruto: string) => string;
  placeholder: string;
  type: string;
  inputMode?: "numeric" | "email" | "tel";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    const bruto = e.target.value;
    onCambio(mascara ? mascara(bruto) : bruto);
  }

  return (
    <label className="block">
      <span className={ETIQUETA}>{etiqueta}</span>
      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        value={valor}
        onChange={manejarCambio}
        placeholder={placeholder}
        className={INPUT}
      />
    </label>
  );
}
