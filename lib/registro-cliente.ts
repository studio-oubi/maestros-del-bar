import type { RegistroInput } from "@/lib/validacion";

const CLAVE_PENDIENTE = "mc_registro_pendiente";
const CLAVE_CONFIG = "mc_config";

interface ConfigLocal {
  ciudad: string;
  establecimiento: string;
}

// Lee la config del local (ciudad+establecimiento) guardada por el popup oculto
// (components/ConfigOculta.tsx). "" en cada campo si el kiosko no fue configurado.
function leerConfig(): ConfigLocal {
  try {
    const crudo = localStorage.getItem(CLAVE_CONFIG);
    if (!crudo) return { ciudad: "", establecimiento: "" };
    const c = JSON.parse(crudo) as Partial<ConfigLocal> | null;
    return {
      ciudad: typeof c?.ciudad === "string" ? c.ciudad : "",
      establecimiento: typeof c?.establecimiento === "string" ? c.establecimiento : "",
    };
  } catch {
    return { ciudad: "", establecimiento: "" };
  }
}

// Envía el registro al servidor, añadiendo ciudad/establecimiento leídos en el
// momento del envío (no al llenar el formulario). Si falla (red caída o 503 por
// DB no configurada), guarda los datos originales en localStorage para
// reintentar más tarde y devuelve null: el juego nunca debe bloquearse
// esperando por la red.
export async function enviarRegistro(datos: RegistroInput): Promise<number | null> {
  const payload: RegistroInput = { ...datos, ...leerConfig() };
  try {
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  const payload: RegistroInput = { ...registro.datos, ...leerConfig() };
  try {
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) localStorage.removeItem(CLAVE_PENDIENTE);
  } catch {
    // sigue pendiente, se reintentará en la próxima oportunidad
  }
}
