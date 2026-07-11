import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { verificarToken } from "@/lib/admin-auth";
import { getDb, registros } from "@/lib/db";
import { esRegaloValido } from "@/lib/regalos";

// Asigna un regalo a un registro. Protegida con la misma cookie de admin del
// panel. La asignación es ÚNICA y se garantiza en el servidor:
// UPDATE ... WHERE id = $1 AND regalo = ''. Si no afecta filas (ya asignado o no
// existe) responde 409 con el valor real actual — nunca se confía en la UI.
export async function POST(req: Request) {
  const secreto = process.env.ADMIN_SECRET;
  const token = (await cookies()).get("mc_admin")?.value;
  if (!secreto || !verificarToken(token, secreto)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ error: "DB no configurada" }, { status: 503 });
  }

  const cuerpo = (await req.json().catch(() => null)) as { id?: unknown; regalo?: unknown } | null;
  const id = Number(cuerpo?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  if (!esRegaloValido(cuerpo?.regalo)) {
    return NextResponse.json({ error: "regalo inválido" }, { status: 400 });
  }
  const regalo = cuerpo.regalo;

  const db = getDb();
  try {
    const actualizadas = await db
      .update(registros)
      .set({ regalo })
      .where(and(eq(registros.id, id), eq(registros.regalo, "")))
      .returning({ id: registros.id, regalo: registros.regalo });

    if (actualizadas.length === 0) {
      // Ya tenía regalo (o el id no existe): devuelve el valor real para que el
      // panel recargue el estado correcto en vez de mostrar el optimista.
      const [fila] = await db
        .select({ regalo: registros.regalo })
        .from(registros)
        .where(eq(registros.id, id));
      return NextResponse.json(
        { error: "Regalo ya asignado", regalo: fila?.regalo ?? null },
        { status: 409 },
      );
    }
    return NextResponse.json({ id, regalo }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}
