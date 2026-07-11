// Opciones de regalo asignables a un registro desde el panel. Fuente única
// compartida por la API (validación), el panel (dropdown) y los tests.
export const REGALOS = ["Vaso", "Lentes", "Gorra", "Bolso", "Sombrero"] as const;
export type Regalo = (typeof REGALOS)[number];

export function esRegaloValido(v: unknown): v is Regalo {
  return typeof v === "string" && (REGALOS as readonly string[]).includes(v);
}
