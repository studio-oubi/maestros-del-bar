import { cookies } from "next/headers";
import { verificarToken } from "@/lib/admin-auth";
import { escaparCsv } from "@/lib/csv";
import { obtenerRegistrosConResultado } from "../consultas";

const ETIQUETA: Record<string, string> = { gano: "Ganó", fallo: "Falló", tiempo: "Tiempo" };
const formateador = new Intl.DateTimeFormat("es-DO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santo_Domingo" });

export async function GET() {
  const secreto = process.env.ADMIN_SECRET;
  const token = (await cookies()).get("mc_admin")?.value;
  if (!secreto || !verificarToken(token, secreto)) {
    return new Response("No autorizado", { status: 401 });
  }

  if (!process.env.POSTGRES_URL) {
    return new Response("No configurado", { status: 503 });
  }

  const filasRegistros = await obtenerRegistrosConResultado();

  const BOM = String.fromCharCode(0xfeff);
  const encabezado =
    "Nombre,Cédula,Teléfono,Correo,Ciudad,Establecimiento,Producto,Tipo,Cantidad,Regalo,Fecha,Resultado";
  const filas = filasRegistros.map((r) => {
    const resultado = r.resultado ? ETIQUETA[r.resultado] ?? r.resultado : "";
    // Los registros del kiosko no llevan consumo: cantidad 0 se exporta vacía.
    const cantidad = r.cantidad > 0 ? r.cantidad : "";
    return [
      r.nombre,
      r.cedula,
      r.telefono,
      r.correo,
      r.ciudad,
      r.establecimiento,
      r.producto,
      r.tipo,
      cantidad,
      r.regalo,
      formateador.format(r.createdAt),
      resultado,
    ]
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
