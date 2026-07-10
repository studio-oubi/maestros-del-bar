// Preferencia de PORTADA del Home, compartida entre ConfigOculta (la elige) y
// Home (la pinta). Persiste dentro de la misma clave mc_config, junto a
// ciudad/establecimiento, para no fragmentar la config del kiosko. Default
// "actual" (la composición de botellas de siempre); "kv" = imagen de evento.
export type Portada = "actual" | "kv";

const CLAVE_CONFIG = "mc_config";
// Evento propio para que el Home reaccione al vuelo cuando el promotor cambia la
// portada desde el popup (que se dibuja por encima del Home).
export const EVENTO_PORTADA = "mc-portada-cambio";

export function leerPortada(): Portada {
  try {
    const crudo = localStorage.getItem(CLAVE_CONFIG);
    if (!crudo) return "actual";
    const c = JSON.parse(crudo) as { portada?: unknown } | null;
    return c?.portada === "kv" ? "kv" : "actual";
  } catch {
    return "actual";
  }
}

export function guardarPortada(portada: Portada): void {
  try {
    const crudo = localStorage.getItem(CLAVE_CONFIG);
    const base = crudo ? (JSON.parse(crudo) as Record<string, unknown>) : {};
    localStorage.setItem(CLAVE_CONFIG, JSON.stringify({ ...base, portada }));
    window.dispatchEvent(new CustomEvent(EVENTO_PORTADA, { detail: portada }));
  } catch {
    // localStorage no disponible: la portada se queda en su valor por defecto.
  }
}
