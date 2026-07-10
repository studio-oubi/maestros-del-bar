"use client";

import { useActionState, useState } from "react";
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
        className="w-full rounded-full border border-oro/40 bg-navy-deep px-5 py-3 text-center text-crema placeholder:text-crema-suave focus:border-oro focus:outline-none"
      />
      {estado?.error && <p className="text-sm text-neon">{estado.error}</p>}
      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-full bg-oro px-5 py-3 font-titulo tracking-wide text-navy-deep transition hover:bg-oro-claro disabled:opacity-60"
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
  fecha: string;
  resultado: string | null;
}

const BADGE: Record<string, string> = {
  gano: "bg-oro text-navy-deep",
  fallo: "bg-crema-suave text-navy-deep",
  tiempo: "border border-oro/40 text-crema",
};

const ETIQUETA: Record<string, string> = { gano: "Ganó", fallo: "Falló", tiempo: "Tiempo" };

export function TablaRegistros({ filas }: { filas: FilaRegistro[] }) {
  const [busqueda, setBusqueda] = useState("");
  const q = busqueda.trim().toLowerCase();
  const filtradas = q
    ? filas.filter((f) =>
        [f.nombre, f.cedula, f.telefono, f.correo, f.ciudad, f.establecimiento].some((v) => v.toLowerCase().includes(q))
      )
    : filas;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, cédula, teléfono, correo, ciudad o establecimiento…"
        className="w-full rounded-full border border-oro/40 bg-navy px-5 py-3 text-crema placeholder:text-crema-suave focus:border-oro focus:outline-none"
      />
      <p className="font-cuerpo text-sm text-crema-suave">
        {filtradas.length} de {filas.length} registros
      </p>
      <div className="overflow-x-auto rounded-2xl border border-oro/20">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-oro/20 text-oro-claro">
              <th className="px-4 py-3 font-titulo font-medium">Nombre</th>
              <th className="px-4 py-3 font-titulo font-medium">Cédula</th>
              <th className="px-4 py-3 font-titulo font-medium">Teléfono</th>
              <th className="px-4 py-3 font-titulo font-medium">Correo</th>
              <th className="px-4 py-3 font-titulo font-medium">Ciudad</th>
              <th className="px-4 py-3 font-titulo font-medium">Establecimiento</th>
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
                <td colSpan={8} className="px-4 py-6 text-center text-crema-suave">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
