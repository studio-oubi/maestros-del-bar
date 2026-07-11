"use client";

import { useActionState, useState } from "react";
import { REGALOS } from "@/lib/regalos";
import { entrar } from "./acciones";

export function FormularioLogin() {
  const [estado, accionFormulario, pendiente] = useActionState(entrar, null);
  return (
    <form action={accionFormulario} className="flex w-full flex-col items-center gap-4">
      <input
        type="password"
        name="password"
        placeholder="Contraseña"
        required
        autoFocus
        className="w-full rounded-full border border-oro/40 bg-navy-deep px-5 py-3 text-center text-crema placeholder:text-crema-suave focus:border-oro focus:outline-none focus:ring-2 focus:ring-oro/40"
      />
      {estado?.error && <p className="text-sm text-neon">{estado.error}</p>}
      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-full bg-oro px-5 py-3 font-titulo tracking-wide text-navy-deep transition duration-100 hover:bg-oro-claro active:scale-[0.98] active:bg-oro-claro disabled:opacity-60"
      >
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export interface FilaRegistro {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  ciudad: string;
  establecimiento: string;
  regalo: string;
  fecha: string;
  resultado: string | null;
}

const BADGE: Record<string, string> = {
  gano: "bg-oro text-navy-deep",
  fallo: "bg-crema-suave text-navy-deep",
  tiempo: "border border-oro/40 text-crema",
};

const ETIQUETA: Record<string, string> = { gano: "Ganó", fallo: "Falló", tiempo: "Tiempo" };

// Control del regalo: si no hay regalo, un dropdown con las 5 opciones que al
// elegir lo asigna vía API (optimista) y desaparece dejando el texto. Si ya
// tiene, solo el texto. La asignación única la garantiza el servidor (409); ante
// 409 se recarga el valor real; ante error de red se revierte y vuelve el dropdown.
function CeldaRegalo({ id, inicial }: { id: number; inicial: string }) {
  const [regalo, setRegalo] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function asignar(valor: string) {
    if (!valor || guardando) return;
    const previo = regalo;
    setGuardando(true);
    setAviso(null);
    setRegalo(valor); // optimista: el dropdown desaparece de inmediato
    try {
      const res = await fetch("/api/regalo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, regalo: valor }),
      });
      if (res.status === 409) {
        const data = (await res.json().catch(() => null)) as { regalo?: unknown } | null;
        const real = typeof data?.regalo === "string" && data.regalo ? data.regalo : previo;
        setRegalo(real);
        setAviso("Ya tenía regalo");
      } else if (!res.ok) {
        setRegalo(previo); // revierte: vuelve el dropdown
        setAviso("No se pudo guardar");
      }
    } catch {
      setRegalo(previo);
      setAviso("Sin conexión");
    } finally {
      setGuardando(false);
    }
  }

  if (regalo) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-oro/15 px-3 py-1 text-xs font-medium text-oro ring-1 ring-oro/40">{regalo}</span>
        {aviso && <span className="text-[11px] text-crema-suave">{aviso}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select
        aria-label="Asignar regalo"
        defaultValue=""
        disabled={guardando}
        onChange={(e) => asignar(e.target.value)}
        className="rounded-full border border-oro/40 bg-navy px-3 py-1.5 text-xs text-crema focus:border-oro focus:outline-none disabled:opacity-60"
      >
        <option value="" disabled>
          {guardando ? "Guardando…" : "Asignar…"}
        </option>
        {REGALOS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {aviso && <span className="text-[11px] text-neon">{aviso}</span>}
    </span>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <>
      <dt className="text-crema-suave">{etiqueta}</dt>
      <dd className="break-words text-crema">{valor || "—"}</dd>
    </>
  );
}

// Tarjeta apilada para pantallas angostas (el admin revisa desde el teléfono).
function CardRegistro({ f }: { f: FilaRegistro }) {
  return (
    <li className="rounded-2xl border border-oro/20 bg-navy/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-titulo text-base text-crema">{f.nombre}</p>
          <p className="text-xs text-crema-suave">{f.fecha}</p>
        </div>
        {f.resultado ? (
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${BADGE[f.resultado] ?? ""}`}>
            {ETIQUETA[f.resultado] ?? f.resultado}
          </span>
        ) : (
          <span className="shrink-0 text-crema-suave">—</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Dato etiqueta="Cédula" valor={f.cedula} />
        <Dato etiqueta="Teléfono" valor={f.telefono} />
        <Dato etiqueta="Correo" valor={f.correo} />
        <Dato etiqueta="Ciudad" valor={f.ciudad} />
        <Dato etiqueta="Local" valor={f.establecimiento} />
      </dl>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-oro/10 pt-3">
        <span className="font-titulo text-xs uppercase tracking-wide text-oro-claro">Regalo</span>
        <CeldaRegalo id={f.id} inicial={f.regalo} />
      </div>
    </li>
  );
}

export function TablaRegistros({ filas }: { filas: FilaRegistro[] }) {
  const [busqueda, setBusqueda] = useState("");
  const q = busqueda.trim().toLowerCase();
  const filtradas = q
    ? filas.filter((f) =>
        [f.nombre, f.cedula, f.telefono, f.correo, f.ciudad, f.establecimiento, f.regalo].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
    : filas;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, cédula, teléfono, correo, ciudad, local o regalo…"
        className="w-full rounded-full border border-oro/40 bg-navy px-5 py-3 text-crema placeholder:text-crema-suave focus:border-oro focus:outline-none"
      />
      <p className="font-cuerpo text-sm text-crema-suave">
        {filtradas.length} de {filas.length} registros
      </p>

      {/* Escritorio: tabla completa (con scroll horizontal solo si hiciera falta) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-oro/20 sm:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-oro/20 text-oro-claro">
              <th className="px-4 py-3 font-titulo font-medium">Nombre</th>
              <th className="px-4 py-3 font-titulo font-medium">Cédula</th>
              <th className="px-4 py-3 font-titulo font-medium">Teléfono</th>
              <th className="px-4 py-3 font-titulo font-medium">Correo</th>
              <th className="px-4 py-3 font-titulo font-medium">Ciudad</th>
              <th className="px-4 py-3 font-titulo font-medium">Establecimiento</th>
              <th className="px-4 py-3 font-titulo font-medium">Regalo</th>
              <th className="px-4 py-3 font-titulo font-medium">Fecha</th>
              <th className="px-4 py-3 font-titulo font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((f) => (
              <tr key={f.id} className="border-b border-oro/10 last:border-0">
                <td className="px-4 py-3">{f.nombre}</td>
                <td className="px-4 py-3">{f.cedula}</td>
                <td className="px-4 py-3">{f.telefono}</td>
                <td className="px-4 py-3">{f.correo}</td>
                <td className="px-4 py-3">{f.ciudad || <span className="text-crema-suave">—</span>}</td>
                <td className="px-4 py-3">{f.establecimiento || <span className="text-crema-suave">—</span>}</td>
                <td className="px-4 py-3">
                  <CeldaRegalo id={f.id} inicial={f.regalo} />
                </td>
                <td className="px-4 py-3 text-crema-suave">{f.fecha}</td>
                <td className="px-4 py-3">
                  {f.resultado ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE[f.resultado] ?? ""}`}>
                      {ETIQUETA[f.resultado] ?? f.resultado}
                    </span>
                  ) : (
                    <span className="text-crema-suave">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-crema-suave">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas apiladas, legibles a 390px sin scroll horizontal */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {filtradas.map((f) => (
          <CardRegistro key={f.id} f={f} />
        ))}
        {filtradas.length === 0 && (
          <li className="rounded-2xl border border-oro/20 px-4 py-6 text-center text-crema-suave">Sin resultados.</li>
        )}
      </ul>
    </div>
  );
}
