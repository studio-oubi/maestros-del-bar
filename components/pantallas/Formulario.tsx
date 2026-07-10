"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";
import { mascaraCedula, mascaraTelefono } from "@/lib/mascaras";
import { enviarRegistro, reiniciarSesionOffline } from "@/lib/registro-cliente";
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

// Preserva la posición del cursor en inputs con máscara: React resetea la
// selección al final cada vez que el valor controlado cambia, así que
// contamos dígitos (no caracteres) a la izquierda del cursor antes de
// enmascarar y recolocamos el cursor tras el mismo dígito en el resultado.
function contarDigitosAntes(bruto: string, cursor: number): number {
  return (bruto.slice(0, cursor).match(/\d/g) ?? []).length;
}

function posicionTrasDigitos(enmascarado: string, digitos: number): number {
  if (digitos <= 0) {
    const idx = enmascarado.search(/\d/);
    return idx === -1 ? enmascarado.length : idx;
  }
  let contados = 0;
  for (let i = 0; i < enmascarado.length; i++) {
    if (/\d/.test(enmascarado[i])) {
      contados++;
      if (contados === digitos) return i + 1;
    }
  }
  return enmascarado.length;
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

    // Optimista: no esperamos la red, el juego avanza de inmediato. Cuando el
    // POST resuelve, el id real se enlaza aparte (sin tocar la pantalla) para
    // que la partida quede asociada al registro.
    enviarRegistro(resultado.datos).then((id) => {
      if (id != null) despachar({ tipo: "REGISTRO_ID", id });
    });
    despachar({ tipo: "REGISTRADO", id: null });
    despachar({ tipo: "IR", a: "recetas" });
  }

  function omitir() {
    // Sin registro: la partida de este juego no debe adjuntarse a un registro
    // offline de un juego anterior.
    reiniciarSesionOffline();
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

      <h1 className="texto-titulo mt-[4cqh] text-center">Únete al challenge</h1>
      <p className="texto-sub mt-[0.8cqh] text-center">Llena tus datos para continuar</p>

      <form onSubmit={enviar} autoComplete="off" className="mt-[3.5cqh] w-[58cqw]">
        <div className="flex flex-col gap-[1.6cqh]">
          <Campo
            etiqueta="Nombre"
            valor={datos.nombre}
            onCambio={(v) => actualizar("nombre", v)}
            placeholder="Tu nombre"
            type="text"
            error={errores.nombre}
          />
          <Campo
            etiqueta="Cédula"
            valor={datos.cedula}
            onCambio={(v) => actualizar("cedula", v)}
            mascara={mascaraCedula}
            placeholder="000-0000000-0"
            type="text"
            inputMode="numeric"
            error={errores.cedula}
          />
          <Campo
            etiqueta="Teléfono"
            valor={datos.telefono}
            onCambio={(v) => actualizar("telefono", v)}
            mascara={mascaraTelefono}
            placeholder="(809) 000-0000"
            type="tel"
            inputMode="numeric"
            error={errores.telefono}
          />
          <Campo
            etiqueta="Correo (opcional)"
            valor={datos.correo}
            onCambio={(v) => actualizar("correo", v)}
            placeholder="tucorreo@ejemplo.com"
            type="email"
            inputMode="email"
            error={errores.correo}
          />
        </div>

        <button
          type="submit"
          className="texto-boton mt-[3cqh] w-full rounded-full bg-linear-to-r from-oro-claro to-oro py-[0.55cqh] leading-none shadow-[0_16px_34px_rgba(0,0,0,0.45)] transition-transform active:scale-[0.98]"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={omitir}
          className="mt-[1.4cqh] block w-full text-center font-cuerpo text-[1.1cqh] text-crema/60 underline decoration-crema/30 underline-offset-2 transition-colors hover:text-crema/80"
        >
          Omitir
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
  error,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  mascara?: (bruto: string) => string;
  placeholder: string;
  type: string;
  inputMode?: "numeric" | "email" | "tel";
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    const bruto = e.target.value;
    if (!mascara) {
      onCambio(bruto);
      return;
    }
    const cursor = e.target.selectionStart ?? bruto.length;
    const digitosAntes = contarDigitosAntes(bruto, cursor);
    const enmascarado = mascara(bruto);
    onCambio(enmascarado);
    const pos = posicionTrasDigitos(enmascarado, digitosAntes);
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  return (
    <label className="block">
      <span className="texto-label mb-[0.7cqh] block">{etiqueta}</span>
      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        value={valor}
        onChange={manejarCambio}
        placeholder={placeholder}
        className="texto-input w-full rounded-full border border-oro/25 bg-black/40 px-[5cqw] py-[1.6cqh] text-crema outline-none transition-colors focus:border-oro"
      />
      {error && <span className="mt-[0.5cqh] block text-[clamp(10px,2.6cqw,12px)] text-[#ff6b6b]">{error}</span>}
    </label>
  );
}
