import { NextResponse } from "next/server";
import { getDb, registros } from "@/lib/db";
import { validarRegistro } from "@/lib/validacion";
import { esRegaloValido } from "@/lib/regalos";

// Registro INDIVIDUAL (promotor): a diferencia del formulario del kiosko, aquí
// ciudad/establecimiento y el regalo llegan en el mismo POST y son obligatorios.
// El regalo se inserta directo con la fila (no pasa por la asignación única del
// panel: cada registro individual es su propia fila con su regalo elegido).
// La hora la fija la BD con createdAt.defaultNow(); el panel/CSV la muestran en
// zona de República Dominicana igual que el resto de registros.
export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const v = validarRegistro(cuerpo);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const ciudad = typeof cuerpo?.ciudad === "string" ? cuerpo.ciudad.trim() : "";
  const establecimiento = typeof cuerpo?.establecimiento === "string" ? cuerpo.establecimiento.trim() : "";
  if (!ciudad) return NextResponse.json({ error: "Ciudad requerida" }, { status: 400 });
  if (!establecimiento) return NextResponse.json({ error: "Establecimiento requerido" }, { status: 400 });

  const regalo = cuerpo?.regalo;
  if (!esRegaloValido(regalo)) return NextResponse.json({ error: "Regalo inválido" }, { status: 400 });

  if (!process.env.POSTGRES_URL) return NextResponse.json({ error: "DB no configurada" }, { status: 503 });

  try {
    const [fila] = await getDb()
      .insert(registros)
      .values({ ...v.datos, ciudad, establecimiento, regalo })
      .returning({ id: registros.id });
    return NextResponse.json({ id: fila.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}
