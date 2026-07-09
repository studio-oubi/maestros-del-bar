"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormEvent } from "react";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";
import { mascaraCedula, mascaraTelefono } from "@/lib/mascaras";
import { enviarRegistro } from "@/lib/registro-cliente";
import { validarRegistro } from "@/lib/validacion";
import type { RegistroInput } from "@/lib/validacion";

const CAMPOS: { clave: keyof RegistroInput; etiqueta: string; palabraError: string }[] = [
  { clave: "nombre", etiqueta: "Nombre", palabraError: "Nombre" },
  { clave: "cedula", etiqueta: "Cédula", palabraError: "Cédula" },
  { clave: "telefono", etiqueta: "Teléfono", palabraError: "Teléfono" },
  { clave: "correo", etiqueta: "Correo", palabraError: "Correo" },
];

const datosVacios: RegistroInput = { nombre: "", cedula: "", telefono: "", correo: "" };

function campoDeError(mensaje: string): keyof RegistroInput | null {
  const campo = CAMPOS.find((c) => mensaje.includes(c.palabraError));
  return campo?.clave ?? null;
}

export function Formulario() {
  const { despachar } = useJuego();
  const [datos, setDatos] = useState<RegistroInput>(datosVacios);
  const [errores, setErrores] = useState<Partial<Record<keyof RegistroInput, string>>>({});

  function actualizar(campo: keyof RegistroInput, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const resultado = validarRegistro(datos);
    if (!resultado.ok) {
      const campo = campoDeError(resultado.error);
      setErrores(campo ? { [campo]: resultado.error } : {});
      return;
    }

    // Optimista: no esperamos la red, el juego avanza de inmediato.
    void enviarRegistro(resultado.datos);
    despachar({ tipo: "REGISTRADO", id: null });
    despachar({ tipo: "IR", a: "recetas" });
  }

  return (
    <div className="flex h-full w-full flex-col items-center overflow-y-auto px-[6cqw] pt-[8cqh] pb-[6cqh]">
      <Image
        src={IMG.logoBrugal}
        alt="Brugal"
        width={340}
        height={90}
        priority
        className="h-auto w-[42cqw] max-w-[220px] drop-shadow-[0_3px_12px_rgba(0,0,0,0.6)]"
      />

      <h1 className="mt-[4cqh] text-center font-titulo text-[clamp(26px,8cqw,40px)] font-semibold uppercase tracking-wide text-white">
        Únete al challenge
      </h1>
      <p className="mt-[0.8cqh] text-center font-cuerpo text-[clamp(11px,2.8cqw,13px)] font-medium uppercase tracking-[0.25em] text-oro">
        Llena tus datos para continuar
      </p>

      <form onSubmit={enviar} autoComplete="off" className="mt-[3.5cqh] w-full max-w-[480px]">
        <div className="flex flex-col gap-[1.6cqh]">
          <Campo
            etiqueta="Nombre"
            valor={datos.nombre}
            onCambio={(v) => actualizar("nombre", v)}
            placeholder="Tu nombre"
            type="text"
            autoComplete="name"
            error={errores.nombre}
          />
          <Campo
            etiqueta="Cédula"
            valor={datos.cedula}
            onCambio={(v) => actualizar("cedula", mascaraCedula(v))}
            placeholder="000-0000000-0"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            error={errores.cedula}
          />
          <Campo
            etiqueta="Teléfono"
            valor={datos.telefono}
            onCambio={(v) => actualizar("telefono", mascaraTelefono(v))}
            placeholder="(809) 000-0000"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            error={errores.telefono}
          />
          <Campo
            etiqueta="Correo"
            valor={datos.correo}
            onCambio={(v) => actualizar("correo", v)}
            placeholder="tucorreo@ejemplo.com"
            type="email"
            inputMode="email"
            autoComplete="email"
            error={errores.correo}
          />
        </div>

        <button
          type="submit"
          className="mt-[3cqh] w-full rounded-full bg-linear-to-r from-oro-claro to-oro py-[1.8cqh] font-titulo text-[clamp(15px,4cqw,19px)] font-semibold uppercase tracking-wide text-navy shadow-[0_16px_34px_rgba(0,0,0,0.45)] transition-transform active:scale-[0.98]"
        >
          Continuar
        </button>
      </form>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  onCambio,
  placeholder,
  type,
  inputMode,
  autoComplete,
  error,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  placeholder: string;
  type: string;
  inputMode?: "numeric" | "email" | "tel";
  autoComplete: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-[0.7cqh] block font-cuerpo text-[clamp(10px,2.6cqw,12px)] font-medium uppercase tracking-[0.28em] text-oro">
        {etiqueta}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-oro/25 bg-black/40 px-[5cqw] py-[1.6cqh] font-cuerpo text-[clamp(14px,3.6cqw,17px)] text-crema outline-none transition-colors placeholder:text-crema-suave focus:border-oro"
      />
      {error && <span className="mt-[0.5cqh] block text-[clamp(10px,2.6cqw,12px)] text-[#ff6b6b]">{error}</span>}
    </label>
  );
}
