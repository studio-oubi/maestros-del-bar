import { cookies } from "next/headers";
import { verificarToken } from "@/lib/admin-auth";
import { obtenerRegistrosConResultado } from "./consultas";
import { FormularioLogin, TablaRegistros, type FilaRegistro } from "./interactivo";

export const dynamic = "force-dynamic";

const formateador = new Intl.DateTimeFormat("es-DO", { dateStyle: "short", timeStyle: "short" });

async function obtenerFilas(): Promise<FilaRegistro[]> {
  const filas = await obtenerRegistrosConResultado();
  return filas.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    cedula: r.cedula,
    telefono: r.telefono,
    correo: r.correo,
    ciudad: r.ciudad,
    establecimiento: r.establecimiento,
    fecha: formateador.format(r.createdAt),
    resultado: r.resultado,
  }));
}

export default async function PaginaRegistros() {
  if (!process.env.POSTGRES_URL) {
    return (
      <main className="grid h-dvh place-items-center bg-navy-deep px-6 text-center font-cuerpo text-crema">
        <p>Base de datos no configurada.</p>
      </main>
    );
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) {
    return (
      <main className="grid h-dvh place-items-center bg-navy-deep px-6 text-center font-cuerpo text-crema">
        <p>Panel no configurado.</p>
      </main>
    );
  }

  const token = (await cookies()).get("mc_admin")?.value;
  const autenticado = verificarToken(token, process.env.ADMIN_SECRET);

  if (!autenticado) {
    return (
      <main className="grid h-dvh place-items-center bg-navy-deep px-6 font-cuerpo">
        <div className="flex w-full max-w-xs flex-col items-center gap-6 rounded-3xl border border-oro/30 bg-navy px-6 py-10">
          <h1 className="font-titulo text-xl tracking-wide text-oro">Panel de registros</h1>
          <FormularioLogin />
        </div>
      </main>
    );
  }

  const filas = await obtenerFilas();

  return (
    <main className="min-h-dvh bg-navy-deep px-4 py-8 font-cuerpo text-crema sm:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-titulo text-2xl tracking-wide text-oro">Registros — Mix Challenge</h1>
            <p className="text-sm text-crema-suave">{filas.length} registros totales</p>
          </div>
          <a
            href="/registros/export"
            className="inline-block rounded-full bg-oro px-5 py-2 font-titulo text-sm text-navy-deep transition duration-100 hover:bg-oro-claro active:scale-[0.98] active:bg-oro-claro"
          >
            Exportar CSV
          </a>
        </header>
        <TablaRegistros filas={filas} />
      </div>
    </main>
  );
}
