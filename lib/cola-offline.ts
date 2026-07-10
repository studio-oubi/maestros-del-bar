import type { RegistroInput } from "@/lib/validacion";

// Cola de sesiones pendientes de subir cuando no hubo red. Cada sesión agrupa un
// registro (o null si el usuario pulsó "Omitir") con las partidas jugadas en esa
// misma sesión, para preservar el enlace registro→partidas al reintentar.
export const CLAVE_COLA = "mc_cola";
export const CLAVE_PENDIENTE_LEGACY = "mc_registro_pendiente";

// tempId de la sesión que agrupa partidas anónimas (juegos "Omitir" sin registro).
export const TEMP_ID_ANONIMO = "anonimo";

// Payload de enviarPartida SIN registroId: el id (real o null) se resuelve al subir.
export interface PartidaPendiente {
  trago: string;
  resultado: "gano" | "fallo" | "tiempo";
  tiempoRestante: number;
  detalles: unknown;
}

export interface SesionCola {
  tempId: string;
  registro: RegistroInput | null;
  partidas: PartidaPendiente[];
}

// Interfaz mínima de almacenamiento para poder inyectar un doble en los tests.
// localStorage la cumple tal cual.
export interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

function nuevoTempId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function crearSesion(registro: RegistroInput | null, tempId?: string): SesionCola {
  return { tempId: tempId ?? nuevoTempId(), registro, partidas: [] };
}

// --- Operaciones puras sobre el arreglo de la cola (inmutables) ---

export function agregarSesion(cola: SesionCola[], sesion: SesionCola): SesionCola[] {
  return [...cola, sesion];
}

// Adjunta una partida a la sesión con ese tempId. Si no existe (p.ej. juego
// "Omitir" sin registro previo, o tempId ya subido), crea una sesión nueva con
// registro:null para no perder la partida.
export function adjuntarPartida(
  cola: SesionCola[],
  tempId: string,
  partida: PartidaPendiente,
): SesionCola[] {
  const idx = cola.findIndex((s) => s.tempId === tempId);
  if (idx === -1) {
    return [...cola, { tempId, registro: null, partidas: [partida] }];
  }
  const copia = cola.slice();
  copia[idx] = { ...copia[idx], partidas: [...copia[idx].partidas, partida] };
  return copia;
}

export function serializar(cola: SesionCola[]): string {
  return JSON.stringify(cola);
}

// Parseo tolerante: cualquier basura devuelve una cola vacía; se descartan las
// sesiones con forma inválida.
export function parsear(crudo: string | null): SesionCola[] {
  if (!crudo) return [];
  let datos: unknown;
  try {
    datos = JSON.parse(crudo);
  } catch {
    return [];
  }
  if (!Array.isArray(datos)) return [];
  return datos.filter(esSesionValida);
}

function esSesionValida(s: unknown): s is SesionCola {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.tempId === "string" &&
    Array.isArray(o.partidas) &&
    (o.registro === null || (typeof o.registro === "object" && o.registro !== null))
  );
}

function leerCrudo(almacen: Almacen, clave: string): string | null {
  try {
    return almacen.getItem(clave);
  } catch {
    return null;
  }
}

export function leerCola(almacen: Almacen): SesionCola[] {
  return parsear(leerCrudo(almacen, CLAVE_COLA));
}

export function escribirCola(almacen: Almacen, cola: SesionCola[]): void {
  try {
    almacen.setItem(CLAVE_COLA, serializar(cola));
  } catch {
    // almacenamiento no disponible: no hay más que hacer
  }
}

// Convierte el formato antiguo de un único registro pendiente
// ("mc_registro_pendiente") en una sesión de la cola nueva y borra la clave
// vieja. Idempotente: sin clave vieja no hace nada.
export function migrar(almacen: Almacen): void {
  const crudo = leerCrudo(almacen, CLAVE_PENDIENTE_LEGACY);
  if (!crudo) return;
  try {
    const viejo = JSON.parse(crudo) as { datos?: RegistroInput; pendiente?: boolean } | null;
    if (viejo?.pendiente && viejo.datos) {
      escribirCola(almacen, agregarSesion(leerCola(almacen), crearSesion(viejo.datos)));
    }
  } catch {
    // registro viejo corrupto: se descarta junto con la clave
  }
  try {
    almacen.removeItem(CLAVE_PENDIENTE_LEGACY);
  } catch {
    // sin almacenamiento: se ignora
  }
}
