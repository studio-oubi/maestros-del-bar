"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { CANTIDADES, PRODUCTOS, TIPOS } from "@/lib/productos";
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
  producto: string;
  tipo: string;
  cantidad: string;
  regalo: string;
  fecha: string;
  resultado: string | null;
}

const BADGE: Record<string, string> = {
  gano: "bg-oro text-navy-deep",
  // "crema-suave" NO está declarado en el @theme de globals.css (solo existe la
  // var suelta --crema-suave), así que bg-crema-suave no generaba ninguna clase
  // y el badge quedaba navy sobre navy: "Falló" era ilegible. Se usa bg-crema,
  // que sí está en el tema, con el mismo patrón que el badge de "gano".
  fallo: "bg-crema text-navy-deep",
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

// Celda de consumo (producto / tipo / cantidad): mismo gesto que CeldaRegalo
// —dropdown que asigna vía API, optimista, revierte ante error— pero EDITABLE:
// el regalo se entrega una sola vez (asignación única con 409 del servidor),
// mientras que el consumo es un dato que se corrige, así que una vez puesto el
// valor se muestra como pill con lápiz y al tocarlo vuelve el dropdown.
// Ver app/api/consumo/route.ts.
function CeldaConsumo({
  id,
  campo,
  inicial,
  opciones,
}: {
  id: number;
  campo: "producto" | "tipo" | "cantidad";
  inicial: string;
  opciones: readonly string[];
}) {
  const [valor, setValor] = useState(inicial);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function asignar(nuevo: string) {
    if (!nuevo || guardando) return;
    const previo = valor;
    setGuardando(true);
    setAviso(null);
    setValor(nuevo); // optimista
    setEditando(false);
    try {
      const res = await fetch("/api/consumo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // cantidad viaja como número; el endpoint igual acepta string numérica
        body: JSON.stringify({ id, [campo]: campo === "cantidad" ? Number(nuevo) : nuevo }),
      });
      if (!res.ok) {
        setValor(previo);
        setAviso("No se pudo guardar");
      }
    } catch {
      setValor(previo);
      setAviso("Sin conexión");
    } finally {
      setGuardando(false);
    }
  }

  if (valor && !editando) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Editar ${campo}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-oro/10 px-3 py-1 text-xs font-medium text-crema ring-1 ring-oro/25 transition-[transform,background-color] duration-100 hover:bg-oro/20 active:scale-[0.98]"
        >
          {valor}
          <Pencil size={11} strokeWidth={2} className="text-oro/70" />
        </button>
        {aviso && <span className="text-[11px] text-neon">{aviso}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <select
        aria-label={`Asignar ${campo}`}
        defaultValue={valor}
        autoFocus={editando}
        disabled={guardando}
        onChange={(e) => asignar(e.target.value)}
        onBlur={() => setEditando(false)}
        className="rounded-full border border-oro/40 bg-navy px-3 py-1.5 text-xs text-crema focus:border-oro focus:outline-none disabled:opacity-60"
      >
        <option value="" disabled>
          {guardando ? "Guardando…" : "Asignar…"}
        </option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
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

// El ancho de un <select> lo fija su opción más larga, así que sin esto los 4
// controles de la tarjeta salen escalonados (Producto es el más ancho por
// "Brugal Doble Reserva"). Se les da una columna de ancho fijo y el select la
// llena, para que todos compartan los dos bordes.
function FilaAsignable({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-titulo text-xs uppercase tracking-wide text-oro-claro">{etiqueta}</span>
      {/* El span envoltorio de cada celda es inline-flex (se dimensiona por su
          contenido), así que estirarlo es lo que hace que el w-full del select
          tenga contra qué resolverse; el justify-end deja el pill del estado ya
          asignado pegado al mismo borde derecho. */}
      <div className="flex w-[172px] shrink-0 justify-end [&>span]:w-full [&>span]:justify-end [&_select]:w-full">
        {children}
      </div>
    </div>
  );
}

// Los 4 campos asignables de una fila. Compartido por la tarjeta de móvil (que
// los muestra siempre, no hay scroll que evitar ahí) y por el modal de
// escritorio (donde viven fuera de la tabla justamente para no ensancharla).
function CamposAsignables({ f }: { f: FilaRegistro }) {
  return (
    <>
      <FilaAsignable etiqueta="Producto">
        <CeldaConsumo id={f.id} campo="producto" inicial={f.producto} opciones={PRODUCTOS} />
      </FilaAsignable>
      <FilaAsignable etiqueta="Tipo">
        <CeldaConsumo id={f.id} campo="tipo" inicial={f.tipo} opciones={TIPOS} />
      </FilaAsignable>
      <FilaAsignable etiqueta="Cantidad">
        <CeldaConsumo id={f.id} campo="cantidad" inicial={f.cantidad} opciones={CANTIDADES} />
      </FilaAsignable>
      <FilaAsignable etiqueta="Regalo">
        <CeldaRegalo id={f.id} inicial={f.regalo} />
      </FilaAsignable>
    </>
  );
}

// Modal de edición (escritorio). Cada campo guarda solo al elegirlo —son las
// mismas celdas de la tarjeta de móvil—, así que no hay botón Guardar: al
// cerrar se refresca la tabla para que las columnas de solo lectura muestren lo
// recién guardado (el estado vive en cada celda, no en la fila).
function ModalEditar({ f, onCerrar }: { f: FilaRegistro; onCerrar: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${f.nombre}`}
      onClick={onCerrar}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-oro/30 bg-navy p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-titulo text-base text-crema">{f.nombre}</p>
            <p className="text-xs text-crema-suave">
              {f.cedula} · {f.fecha}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-oro/30 text-crema transition-[transform,background-color] duration-100 hover:bg-oro/15 active:scale-90"
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 border-t border-oro/10 pt-4">
          <CamposAsignables f={f} />
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full rounded-full bg-oro px-5 py-2.5 font-titulo text-sm text-navy-deep transition duration-100 hover:bg-oro-claro active:scale-[0.98]"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

// Resumen del consumo para la tabla (solo lectura: se edita en el modal).
function ResumenConsumo({ f }: { f: FilaRegistro }) {
  if (!f.producto && !f.tipo && !f.cantidad) return <span className="text-crema-suave">—</span>;
  return (
    <span className="block leading-tight">
      <span className="block">{f.producto || "—"}</span>
      <span className="block text-xs text-crema-suave">
        {f.tipo || "—"} × {f.cantidad || "—"}
      </span>
    </span>
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
      <div className="mt-3 flex flex-col gap-2 border-t border-oro/10 pt-3">
        <CamposAsignables f={f} />
      </div>
    </li>
  );
}

export function TablaRegistros({ filas }: { filas: FilaRegistro[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<FilaRegistro | null>(null);
  const router = useRouter();
  const q = busqueda.trim().toLowerCase();
  const filtradas = q
    ? filas.filter((f) =>
        [f.nombre, f.cedula, f.telefono, f.correo, f.ciudad, f.establecimiento, f.producto, f.tipo, f.regalo].some(
          (v) => v.toLowerCase().includes(q),
        ),
      )
    : filas;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, cédula, teléfono, correo, ciudad, local, producto o regalo…"
        className="w-full rounded-full border border-oro/40 bg-navy px-5 py-3 text-crema placeholder:text-crema-suave focus:border-oro focus:outline-none"
      />
      <p className="font-cuerpo text-sm text-crema-suave">
        {filtradas.length} de {filas.length} registros
      </p>

      {editando && (
        <ModalEditar
          f={editando}
          onCerrar={() => {
            setEditando(null);
            // El estado vive dentro de cada celda del modal; refrescar el server
            // component es lo que hace que las columnas de solo lectura de la
            // tabla muestren lo que se acaba de guardar.
            router.refresh();
          }}
        />
      )}

      {/* Escritorio: los campos editables NO van en la tabla —sus selects la
          ensanchaban hasta forzar scroll horizontal—; se editan en el modal. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-oro/20 sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-oro/20 text-oro-claro">
              <th className="px-4 py-3 font-titulo font-medium">Nombre</th>
              <th className="px-4 py-3 font-titulo font-medium">Cédula</th>
              <th className="px-4 py-3 font-titulo font-medium">Teléfono</th>
              <th className="px-4 py-3 font-titulo font-medium">Correo</th>
              <th className="px-4 py-3 font-titulo font-medium">Ciudad</th>
              <th className="px-4 py-3 font-titulo font-medium">Establecimiento</th>
              <th className="px-4 py-3 font-titulo font-medium">Consumo</th>
              <th className="px-4 py-3 font-titulo font-medium">Regalo</th>
              <th className="px-4 py-3 font-titulo font-medium">Fecha</th>
              <th className="px-4 py-3 font-titulo font-medium">Resultado</th>
              <th className="px-4 py-3 font-titulo font-medium">
                <span className="sr-only">Editar</span>
              </th>
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
                  <ResumenConsumo f={f} />
                </td>
                <td className="px-4 py-3">
                  {f.regalo ? (
                    <span className="rounded-full bg-oro/15 px-3 py-1 text-xs font-medium text-oro ring-1 ring-oro/40">
                      {f.regalo}
                    </span>
                  ) : (
                    <span className="text-crema-suave">—</span>
                  )}
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
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setEditando(f)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-oro/40 px-3 py-1.5 text-xs text-crema transition-[transform,background-color] duration-100 hover:bg-oro/15 active:scale-[0.98]"
                  >
                    <Pencil size={11} strokeWidth={2} className="text-oro" />
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-crema-suave">
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
