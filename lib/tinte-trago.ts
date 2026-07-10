import type { IngredienteId } from "@/lib/recetas";

// Colores de referencia por ingrediente, portados de legacy/index.html
// (INGREDIENTES[].color). Los ids que no existían en el legacy (toronja,
// albahaca, limon; "sirope" reemplaza a su "syrup") llevan un tono
// equivalente elegido a mano siguiendo el mismo criterio (color real del
// ingrediente).
const COLOR_INGREDIENTE: Record<IngredienteId, string> = {
  toronja: "#e8547a",
  romero: "#4a6b3f",
  hielo: "#bcd8e0",
  sirope: "#d9a441",
  naranja: "#d97a2b",
  clara: "#f3ead6",
  albahaca: "#4f7a3d",
  limon: "#d7d94a",
  canela: "#8a5a30",
  jengibre: "#c9a35a",
  frambuesa: "#b3123f",
  menta: "#3f7d4e",
  angostura: "#7a3421",
  cafe: "#3b2415",
  demerara: "#a5763d",
};

// Promedia el color de un set de ingredientes y devuelve su tono (hue,
// 0-360). Mismo algoritmo que tonoDe() en legacy/index.html.
function tono(ids: IngredienteId[]): number {
  if (ids.length === 0) return 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const id of ids) {
    const x = parseInt(COLOR_INGREDIENTE[id].slice(1), 16);
    r += x >> 16;
    g += (x >> 8) & 255;
    b += x & 255;
  }
  const k = ids.length;
  r /= k * 255;
  g /= k * 255;
  b /= k * 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return h;
}

// Filtro CSS del tinte del trago según lo que el jugador eligió, mismo
// criterio que legacy/index.html (preparar()): si el set de ingredientes
// elegidos coincide EXACTO con el correcto, sin filtro (el trago se ve
// como debe). Si no, se desvía el tono según la distancia cromática entre
// lo elegido y lo correcto — así el fallo se lee directamente en el vaso.
// Devuelve "" (sin tinte) o la función de filtro, NUNCA la palabra "none"
// (el llamador la combina con otros filtros, p.ej. drop-shadow).
export function filtroTinte(elegidos: IngredienteId[], correctos: IngredienteId[]): string {
  const mismos = elegidos.length === correctos.length && correctos.every((id) => elegidos.includes(id));
  if (mismos || elegidos.length === 0) return "";
  const desvio = tono(elegidos) - tono(correctos);
  return `hue-rotate(${desvio.toFixed(0)}deg) saturate(.85) brightness(.95)`;
}
