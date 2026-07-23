// Consumo registrado por el promotor en /registro-individual: qué producto
// Brugal, en qué formato y cuántas unidades. Fuente única compartida por la API
// (validación), el formulario (dropdowns) y los tests.

export const PRODUCTOS = [
  "Brugal XV",
  "Brugal Extra Viejo",
  "Brugal Leyenda",
  "Brugal Doble Reserva",
  "Brugal Triple Reserva",
  "Brugal 1888",
] as const;
export type Producto = (typeof PRODUCTOS)[number];

export const TIPOS = ["Botella", "Trago"] as const;
export type Tipo = (typeof TIPOS)[number];

// El form ofrece la cantidad como dropdown (los 3 campos de consumo se tocan
// igual, sin teclado). Tope 10 a pedido del cliente; para un caso mayor se
// registra dos veces. El servidor valida contra este mismo rango.
export const CANTIDAD_MIN = 1;
export const CANTIDAD_MAX = 10;
export const CANTIDADES = Array.from({ length: CANTIDAD_MAX }, (_, i) => String(i + 1));

export function esProductoValido(v: unknown): v is Producto {
  return typeof v === "string" && (PRODUCTOS as readonly string[]).includes(v);
}

export function esTipoValido(v: unknown): v is Tipo {
  return typeof v === "string" && (TIPOS as readonly string[]).includes(v);
}

/** Acepta number o string numérica (el form envía texto). Devuelve null si no
 * es un entero dentro del rango. */
export function normalizarCantidad(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < CANTIDAD_MIN || n > CANTIDAD_MAX) return null;
  return n;
}
