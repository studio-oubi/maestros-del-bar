import type { RegistroInput } from "@/lib/validacion";

const CLAVE_PENDIENTE = "mc_registro_pendiente";

// Envía el registro al servidor. Si falla (red caída o 503 por DB no configurada),
// guarda los datos en localStorage para reintentar más tarde y devuelve null:
// el juego nunca debe bloquearse esperando por la red.
export async function enviarRegistro(datos: RegistroInput): Promise<number | null> {
  try {
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (!res.ok) {
      guardarPendiente(datos);
      return null;
    }
    const { id } = (await res.json()) as { id: number };
    return id;
  } catch {
    guardarPendiente(datos);
    return null;
  }
}

function guardarPendiente(datos: RegistroInput): void {
  try {
    localStorage.setItem(CLAVE_PENDIENTE, JSON.stringify({ datos, pendiente: true }));
  } catch {
    // localStorage no disponible (SSR, privado, etc.): no hay más que hacer.
  }
}

// Reintenta enviar un registro pendiente guardado en localStorage.
// Se llama al montar la app y al terminar la partida.
export async function reintentarPendiente(): Promise<void> {
  let crudo: string | null;
  try {
    crudo = localStorage.getItem(CLAVE_PENDIENTE);
  } catch {
    return;
  }
  if (!crudo) return;

  let registro: { datos: RegistroInput; pendiente: boolean };
  try {
    registro = JSON.parse(crudo);
  } catch {
    localStorage.removeItem(CLAVE_PENDIENTE);
    return;
  }
  if (!registro?.pendiente) return;

  try {
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro.datos),
    });
    if (res.ok) localStorage.removeItem(CLAVE_PENDIENTE);
  } catch {
    // sigue pendiente, se reintentará en la próxima oportunidad
  }
}
