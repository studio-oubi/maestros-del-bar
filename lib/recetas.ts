import { IMG } from "@/lib/asset-manifest";

export const GAME_SECONDS = 60;

export type TragoId = "toronja" | "sour" | "albahaca";
export type RonId = "doble" | "triple" | "extraviejo";
export type VasoId = "vaso-toronja" | "vaso-sour" | "vaso-albahaca";
export type MezclaId =
  | "zumo-limon" | "sirope-albahaca" | "zumo-toronja" | "sirope-simple"
  | "bitter-naranja" | "agua-gas" | "soda";
// Grid fijo 3×4: EXACTAMENTE estos 12 ingredientes (ya no hay señuelos muestreados;
// armarGrid solo baraja los 12).
export type IngredienteId =
  | "toronja" | "romero" | "cascara" | "albahaca" | "hielo" | "menta"
  | "canela" | "anis" | "frambuesa" | "jengibre" | "cafe" | "demerara";

export interface Receta {
  id: TragoId; nombre: string; ron: RonId; ronNombre: string;
  vaso: VasoId;
  mezclas: MezclaId[];                  // set exacto a marcar en el paso MEZCLA
  ingredientes: IngredienteId[];        // set exacto a marcar en el paso COMPLETA
  lineasReceta: string[];               // bullets de la tarjeta (mock 5)
  imgTrago: string; imgVaso: string;
}

export const RECETAS: Receta[] = [
  { id: "toronja", nombre: "TORONJA RESERVA", ron: "doble", ronNombre: "BRUGAL DOBLE RESERVA",
    vaso: "vaso-toronja",
    mezclas: ["zumo-limon", "zumo-toronja"],
    ingredientes: ["toronja", "romero", "hielo"],
    lineasReceta: ["2 OZ BRUGAL DOBLE RESERVA", "ZUMO DE LIMÓN", "ZUMO DE TORONJA", "TORONJA + ROMERO + HIELO"],
    imgTrago: IMG.tragoToronja, imgVaso: IMG.vasoToronja },
  { id: "sour", nombre: "SOUR RESERVA", ron: "triple", ronNombre: "BRUGAL TRIPLE RESERVA",
    vaso: "vaso-sour",
    mezclas: ["zumo-limon", "sirope-simple", "bitter-naranja"],
    ingredientes: ["cascara", "hielo"],
    lineasReceta: ["2 OZ BRUGAL TRIPLE RESERVA", "ZUMO DE LIMÓN", "SIROPE SIMPLE", "BITTER DE NARANJA", "CÁSCARA DE NARANJA + HIELO"],
    imgTrago: IMG.tragoSour, imgVaso: IMG.vasoSour },
  { id: "albahaca", nombre: "LIMÓN ALBAHACA EXTRA VIEJO", ron: "extraviejo", ronNombre: "BRUGAL EXTRA VIEJO",
    vaso: "vaso-albahaca",
    mezclas: ["zumo-limon", "sirope-albahaca"],
    ingredientes: ["albahaca", "hielo"],
    lineasReceta: ["2 OZ BRUGAL EXTRA VIEJO", "ZUMO DE LIMÓN", "SIROPE DE ALBAHACA", "ALBAHACA + HIELO"],
    imgTrago: IMG.tragoAlbahaca, imgVaso: IMG.vasoAlbahaca },
];

export const RONES: { id: RonId; nombre: string; img: string }[] = [
  { id: "doble", nombre: "BRUGAL DOBLE RESERVA", img: IMG.ronDoble },
  { id: "triple", nombre: "BRUGAL TRIPLE RESERVA", img: IMG.ronTriple },
  { id: "extraviejo", nombre: "BRUGAL EXTRA VIEJO", img: IMG.ronExtraviejo },
];
export const VASOS: { id: VasoId; nombre: string; img: string }[] = [
  { id: "vaso-toronja", nombre: "VASO ACANALADO", img: IMG.vasoToronja },
  { id: "vaso-sour", nombre: "VASO TALLADO", img: IMG.vasoSour },
  { id: "vaso-albahaca", nombre: "VASO REDONDO", img: IMG.vasoAlbahaca },
];
// Botellas de mezclas RELABELADAS (stock/, ver scripts/build-stock.mjs): fotos
// reales de legacy/assets con la etiqueta de marca tapada por una genérica
// navy/dorado propia del juego. Sin assets externos (excepto ing-anis, ver
// stock/LICENCIAS.md).
export const MEZCLAS: { id: MezclaId; nombre: string; img: string }[] = [
  { id: "agua-gas", nombre: "AGUA CON GAS", img: IMG.mixerAguaGas },
  { id: "zumo-limon", nombre: "ZUMO DE LIMÓN", img: IMG.mixerZumoLimon },
  { id: "bitter-naranja", nombre: "BITTER DE NARANJA", img: IMG.mixerBitterNaranja },
  { id: "soda", nombre: "SODA", img: IMG.mixerSoda },
  { id: "sirope-albahaca", nombre: "SIROPE DE ALBAHACA", img: IMG.mixerSiropeAlbahaca },
  { id: "zumo-toronja", nombre: "ZUMO DE TORONJA", img: IMG.mixerZumoToronja },
  { id: "sirope-simple", nombre: "SIROPE SIMPLE", img: IMG.mixerSiropeSimple },
];
// EXACTAMENTE 12 (grid 3×4).
export const INGREDIENTES: Record<IngredienteId, { nombre: string; img: string }> = {
  toronja: { nombre: "TORONJA", img: IMG.ingToronja },
  romero: { nombre: "ROMERO", img: IMG.ingRomero },
  cascara: { nombre: "CÁSCARA DE NARANJA", img: IMG.ingCascara },
  albahaca: { nombre: "ALBAHACA", img: IMG.ingAlbahaca },
  hielo: { nombre: "HIELO", img: IMG.ingHielo },
  menta: { nombre: "MENTA", img: IMG.ingMenta },
  canela: { nombre: "CANELA", img: IMG.ingCanela },
  anis: { nombre: "ANÍS", img: IMG.ingAnis },
  frambuesa: { nombre: "FRAMBUESA", img: IMG.ingFrambuesa },
  jengibre: { nombre: "JENGIBRE", img: IMG.ingJengibre },
  cafe: { nombre: "CAFÉ", img: IMG.ingCafe },
  demerara: { nombre: "PIMIENTA NEGRA", img: IMG.ingDemerara },
};

// Grid de 12: baraja (Fisher-Yates) los 12 IngredienteId. La receta ya no
// influye en la composición (siempre están los 12, correctos incluidos).
export function armarGrid(rng: () => number = Math.random): IngredienteId[] {
  const grid = Object.keys(INGREDIENTES) as IngredienteId[];
  const copia = [...grid];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export interface Elecciones { vaso: VasoId | null; ron: RonId | null; mezclas: MezclaId[]; ingredientes: IngredienteId[] }
export interface Evaluacion {
  gano: boolean;
  vasoOk: boolean; ronOk: boolean; mezclaOk: boolean;
  mezclasFaltaron: MezclaId[];   // mezclas de la receta no elegidas
  mezclasSobraron: MezclaId[];   // mezclas elegidas que no van
  faltaron: IngredienteId[];     // ingredientes correctos no elegidos
  sobraron: IngredienteId[];     // ingredientes elegidos que no van
}
// Regla: en Mezcla y en Completa hay que marcar EXACTAMENTE lo de la receta
// (de más o de menos = pierde). Vaso y ron: coincidencia simple.
export function evaluar(receta: Receta, e: Elecciones): Evaluacion {
  const vasoOk = e.vaso === receta.vaso;
  const ronOk = e.ron === receta.ron;
  const mezclasFaltaron = receta.mezclas.filter((m) => !e.mezclas.includes(m));
  const mezclasSobraron = e.mezclas.filter((m) => !receta.mezclas.includes(m));
  const mezclaOk = mezclasFaltaron.length === 0 && mezclasSobraron.length === 0;
  const faltaron = receta.ingredientes.filter((ing) => !e.ingredientes.includes(ing));
  const sobraron = e.ingredientes.filter((ing) => !receta.ingredientes.includes(ing));
  const gano = vasoOk && ronOk && mezclaOk && faltaron.length === 0 && sobraron.length === 0;
  return { gano, vasoOk, ronOk, mezclaOk, mezclasFaltaron, mezclasSobraron, faltaron, sobraron };
}
