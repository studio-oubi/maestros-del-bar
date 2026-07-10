import type { RegistroInput } from "@/lib/validacion";
import type { PartidaInput } from "@/lib/partida-cliente";
import {
  type Almacen,
  type PartidaPendiente,
  type SesionCola,
  TEMP_ID_ANONIMO,
  agregarSesion,
  adjuntarPartida,
  crearSesion,
  escribirCola,
  leerCola,
  migrar,
} from "@/lib/cola-offline";

const CLAVE_CONFIG = "mc_config";

interface ConfigLocal {
  ciudad: string;
  establecimiento: string;
}

// localStorage envuelto en la interfaz Almacen, o null si no está disponible
// (SSR, modo privado, etc.).
function almacenLocal(): Almacen | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

// Lee la config del local (ciudad+establecimiento) guardada por el popup oculto
// (components/ConfigOculta.tsx). "" en cada campo si el kiosko no fue configurado.
function leerConfig(): ConfigLocal {
  const alm = almacenLocal();
  try {
    const crudo = alm?.getItem(CLAVE_CONFIG);
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

// tempId de la sesión encolada offline del juego en curso. Permite que las
// partidas de este mismo juego se adjunten a su registro pendiente. null cuando
// el registro se envió con éxito o cuando el usuario pulsó "Omitir".
let sesionOfflineActual: string | null = null;

// Reinicia el enlace de sesión offline (juegos "Omitir" que no llaman a
// enviarRegistro): sus partidas no deben colgarse del registro del juego previo.
export function reiniciarSesionOffline(): void {
  sesionOfflineActual = null;
}

// Envía el registro al servidor, añadiendo ciudad/establecimiento leídos en el
// momento del envío. Si falla (red caída o 503 por DB no configurada), encola la
// sesión en localStorage para subirla luego y devuelve null: el juego nunca debe
// bloquearse esperando por la red. El contrato Promise<number|null> se conserva;
// el tempId de la sesión offline queda en sesionOfflineActual para que las
// partidas de este juego se le adjunten.
export async function enviarRegistro(datos: RegistroInput): Promise<number | null> {
  sesionOfflineActual = null;
  const payload: RegistroInput = { ...datos, ...leerConfig() };
  try {
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return encolarRegistro(payload);
    const { id } = (await res.json()) as { id: number };
    return id;
  } catch {
    return encolarRegistro(payload);
  }
}

function encolarRegistro(payload: RegistroInput): null {
  const sesion = crearSesion(payload);
  sesionOfflineActual = sesion.tempId;
  const alm = almacenLocal();
  if (alm) escribirCola(alm, agregarSesion(leerCola(alm), sesion));
  return null;
}

function encolarPartida(tempId: string, partida: PartidaPendiente): void {
  const alm = almacenLocal();
  if (!alm) return;
  escribirCola(alm, adjuntarPartida(leerCola(alm), tempId, partida));
}

// Reporta la partida al backend. Si el registro de este juego se encoló offline,
// la partida va a esa misma sesión (aún no hay id real). Si no, se intenta el
// POST directo; ante fallo de red se encola como partida anónima para no
// perderla. Fire-and-forget: la pantalla de resultado nunca se bloquea.
export async function enviarPartida(p: PartidaInput): Promise<void> {
  const pendiente: PartidaPendiente = {
    trago: p.trago,
    resultado: p.resultado,
    tiempoRestante: p.tiempoRestante,
    detalles: p.detalles,
  };

  if (sesionOfflineActual) {
    encolarPartida(sesionOfflineActual, pendiente);
    return;
  }

  try {
    const res = await fetch("/api/partida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) encolarPartida(TEMP_ID_ANONIMO, pendiente);
  } catch {
    encolarPartida(TEMP_ID_ANONIMO, pendiente);
  }
}

// Sube una sesión completa: primero el registro (si lo hay) para obtener su id,
// luego cada partida con ese id (o null si es anónima). Devuelve true solo si
// TODOS los POST tuvieron éxito; ante el primer fallo devuelve false para
// reintentar la sesión completa más tarde.
async function subirSesion(sesion: SesionCola): Promise<boolean> {
  try {
    let id: number | null = null;
    if (sesion.registro != null) {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sesion.registro),
      });
      if (!res.ok) return false;
      id = ((await res.json()) as { id: number }).id;
    }
    for (const partida of sesion.partidas) {
      const res = await fetch("/api/partida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroId: id, ...partida }),
      });
      if (!res.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}

let procesando = false;

// Vacía la cola offline en orden. Se detiene en el primer fallo de red (deja el
// resto para el próximo intento) y se protege contra ejecuciones concurrentes.
export async function procesarCola(): Promise<void> {
  const alm = almacenLocal();
  if (!alm || procesando) return;
  procesando = true;
  try {
    migrar(alm);
    let cola = leerCola(alm);
    while (cola.length > 0) {
      const ok = await subirSesion(cola[0]);
      if (!ok) break;
      cola = cola.slice(1);
      escribirCola(alm, cola);
    }
  } finally {
    procesando = false;
  }
}

// Alias histórico: los sitios de llamada existentes (App, Resultado) siguen
// invocando reintentarPendiente; ahora procesa toda la cola.
export async function reintentarPendiente(): Promise<void> {
  await procesarCola();
}
