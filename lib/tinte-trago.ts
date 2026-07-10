import type { IngredienteId } from "@/lib/recetas";

// Colores de referencia por ingrediente (tono real del ingrediente), usados
// para desviar el tinte del trago cuando el jugador falla. cascara (cáscara de
// naranja) y anis se añaden con el rediseño de la lista; llevan un tono elegido
// a mano con el mismo criterio.
const COLOR_INGREDIENTE: Record<IngredienteId, string> = {
  toronja: "#e8547a",
  romero: "#4a6b3f",
  cascara: "#d97a2b",
  albahaca: "#4f7a3d",
  hielo: "#bcd8e0",
  menta: "#3f7d4e",
  canela: "#8a5a30",
  anis: "#dfe0b8",
  frambuesa: "#b3123f",
  jengibre: "#c9a35a",
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
