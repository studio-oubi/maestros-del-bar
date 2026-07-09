import { NextResponse } from "next/server";
import { getDb, partidas } from "@/lib/db";

interface PartidaInput {
  registroId: number | null;
  trago: string;
  resultado: "gano" | "fallo" | "tiempo";
  tiempoRestante: number;
  detalles: unknown;
}

const RESULTADOS = new Set(["gano", "fallo", "tiempo"]);

function validarPartida(d: unknown): { ok: true; datos: PartidaInput } | { ok: false; error: string } {
  if (typeof d !== "object" || d === null) {
    return { ok: false, error: "Payload inválido" };
  }

  const { registroId, trago, resultado, tiempoRestante, detalles } = d as Record<string, unknown>;

  if (registroId !== null && typeof registroId !== "number") {
    return { ok: false, error: "registroId inválido" };
  }
  if (typeof trago !== "string" || trago.trim().length === 0) {
    return { ok: false, error: "Trago inválido" };
  }
  if (typeof resultado !== "string" || !RESULTADOS.has(resultado)) {
    return { ok: false, error: "Resultado inválido" };
  }
  if (typeof tiempoRestante !== "number" || !Number.isInteger(tiempoRestante) || tiempoRestante < 0) {
    return { ok: false, error: "tiempoRestante inválido" };
  }

  return {
    ok: true,
    datos: {
      registroId,
      trago,
      resultado: resultado as PartidaInput["resultado"],
      tiempoRestante,
      detalles,
    },
  };
}

export async function POST(req: Request) {
  const v = validarPartida(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (!process.env.POSTGRES_URL) return NextResponse.json({ error: "DB no configurada" }, { status: 503 });
  try {
    const [fila] = await getDb().insert(partidas).values(v.datos).returning({ id: partidas.id });
    return NextResponse.json({ id: fila.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}
