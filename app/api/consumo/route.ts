import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { verificarToken } from "@/lib/admin-auth";
import { getDb, registros } from "@/lib/db";
import { esProductoValido, esTipoValido, normalizarCantidad } from "@/lib/productos";

// Asigna/edita el consumo (producto, tipo, cantidad) de un registro ya creado,
// desde el panel. Protegida con la misma cookie de admin que /api/regalo.
//
// A diferencia del regalo, esto NO es de asignación única: el regalo se entrega
// una sola vez (por eso su UPDATE lleva WHERE regalo = '' y devuelve 409), pero
// el consumo es un dato que se corrige — se puede reasignar cuantas veces haga
// falta. Por eso el UPDATE va solo por id y no hay 409.
//
// Acepta actualizaciones PARCIALES: el panel edita un campo a la vez, así que
// solo se tocan las claves presentes en el cuerpo.
export async function POST(req: Request) {
  const secreto = process.env.ADMIN_SECRET;
  const token = (await cookies()).get("mc_admin")?.value;
  if (!secreto || !verificarToken(token, secreto)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ error: "DB no configurada" }, { status: 503 });
  }

  const cuerpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(cuerpo?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const cambios: { producto?: string; tipo?: string; cantidad?: number } = {};

  if (cuerpo?.producto !== undefined) {
    if (!esProductoValido(cuerpo.producto)) {
      return NextResponse.json({ error: "producto inválido" }, { status: 400 });
    }
    cambios.producto = cuerpo.producto;
  }
  if (cuerpo?.tipo !== undefined) {
    if (!esTipoValido(cuerpo.tipo)) {
      return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
    }
    cambios.tipo = cuerpo.tipo;
  }
  if (cuerpo?.cantidad !== undefined) {
    const n = normalizarCantidad(cuerpo.cantidad);
    if (n === null) {
      return NextResponse.json({ error: "cantidad inválida" }, { status: 400 });
    }
    cambios.cantidad = n;
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }

  try {
    const actualizadas = await getDb()
      .update(registros)
      .set(cambios)
      .where(eq(registros.id, id))
      .returning({ id: registros.id });

    if (actualizadas.length === 0) {
      return NextResponse.json({ error: "registro no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ id, ...cambios }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}
