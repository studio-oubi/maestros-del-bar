import { desc } from "drizzle-orm";
import { getDb, registros, partidas } from "@/lib/db";

const PRIORIDAD: Record<string, number> = { gano: 3, fallo: 2, tiempo: 1 };

export interface RegistroConResultado {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  createdAt: Date;
  resultado: string | null;
}

/** Registros ordenados por fecha desc, cada uno con su mejor partida asociada
 * (gano > fallo > tiempo, desempate por tiempoRestante mayor). */
export async function obtenerRegistrosConResultado(): Promise<RegistroConResultado[]> {
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

  return filasRegistros.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    cedula: r.cedula,
    telefono: r.telefono,
    correo: r.correo,
    createdAt: r.createdAt,
    resultado: mejorPorRegistro.get(r.id)?.resultado ?? null,
  }));
}
