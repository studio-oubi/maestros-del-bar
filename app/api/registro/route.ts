import { NextResponse } from "next/server";
import { getDb, registros } from "@/lib/db";
import { validarRegistro } from "@/lib/validacion";

export async function POST(req: Request) {
  const v = validarRegistro(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (!process.env.POSTGRES_URL) return NextResponse.json({ error: "DB no configurada" }, { status: 503 });
  try {
    const [fila] = await getDb().insert(registros).values(v.datos).returning({ id: registros.id });
    return NextResponse.json({ id: fila.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}
