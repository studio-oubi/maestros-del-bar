import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { getDb, registros, partidas } from "@/lib/db";
import { verificarToken } from "@/lib/admin-auth";

const PRIORIDAD: Record<string, number> = { gano: 3, fallo: 2, tiempo: 1 };
const ETIQUETA: Record<string, string> = { gano: "Ganó", fallo: "Falló", tiempo: "Tiempo" };
const formateador = new Intl.DateTimeFormat("es-DO", { dateStyle: "short", timeStyle: "short" });

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

export async function GET() {
  if (!process.env.POSTGRES_URL || !process.env.ADMIN_SECRET) {
    return new Response("No configurado", { status: 503 });
  }

  const token = (await cookies()).get("mc_admin")?.value;
  if (!verificarToken(token, process.env.ADMIN_SECRET)) {
    return new Response("No autorizado", { status: 401 });
  }

  const db = getDb();
  const filasRegistros = await db.select().from(registros).orderBy(desc(registros.createdAt));
  const todasPartidas = await db.select().from(partidas);

  const mejorPorRegistro = new Map<number, (typeof todasPartidas)[number]>();
  for (const p of todasPartidas) {
    if (p.registroId === null) continue;
    const actual = mejorPorRegistro.get(p.registroId);
    if (!actual) {
      mejorPorRegistro.set(p.registroId, p);
      continue;
    }
    const prioridadNueva = PRIORIDAD[p.resultado] ?? 0;
    const prioridadActual = PRIORIDAD[actual.resultado] ?? 0;
    if (
      prioridadNueva > prioridadActual ||
      (prioridadNueva === prioridadActual && p.tiempoRestante > actual.tiempoRestante)
    ) {
      mejorPorRegistro.set(p.registroId, p);
    }
  }

  const BOM = String.fromCharCode(0xfeff);
  const encabezado = "Nombre,Cédula,Teléfono,Correo,Fecha,Resultado";
  const filas = filasRegistros.map((r) => {
    const mejor = mejorPorRegistro.get(r.id);
    const resultado = mejor ? ETIQUETA[mejor.resultado] ?? mejor.resultado : "";
    return [r.nombre, r.cedula, r.telefono, r.correo, formateador.format(r.createdAt), resultado]
      .map((v) => escaparCsv(String(v)))
      .join(",");
  });

  const csv = BOM + [encabezado, ...filas].join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="registros-mix-challenge.csv"',
    },
  });
}
