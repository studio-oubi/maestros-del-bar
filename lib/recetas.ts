import { IMG } from "@/lib/asset-manifest";

export const GAME_SECONDS = 60;

export type TragoId = "toronja" | "sour" | "albahaca";
export type RonId = "doble" | "triple" | "extraviejo";
export type VasoId = "vaso-toronja" | "vaso-sour" | "vaso-albahaca";
export type MezclaId = "perrier" | "limon" | "tonica" | "ginger" | "arandano";
export type IngredienteId =
  | "toronja" | "romero" | "hielo" | "sirope" | "naranja" | "clara" | "albahaca" | "limon"
  | "canela" | "jengibre" | "frambuesa" | "menta" | "angostura" | "cafe" | "demerara";

export interface Receta {
  id: TragoId; nombre: string; ron: RonId; ronNombre: string;
  vaso: VasoId; mezcla: MezclaId; mezclaNombre: string;
  ingredientes: IngredienteId[];        // exactamente 3
  lineasReceta: string[];               // bullets del mock 5
  imgTrago: string; imgVaso: string;
}

export const RECETAS: Receta[] = [
  { id: "toronja", nombre: "TORONJA RESERVA", ron: "doble", ronNombre: "BRUGAL DOBLE RESERVA",
    vaso: "vaso-toronja", mezcla: "perrier", mezclaNombre: "AGUA CON GÁS",
    ingredientes: ["toronja", "romero", "hielo"],
    lineasReceta: ["2 OZ BRUGAL DOBLE RESERVA", "ZUMO DE LIMÓN", "ZUMO DE TORONJA ROSADA", "TORONJA + ROMERO"],
    imgTrago: IMG.tragoToronja, imgVaso: IMG.vasoToronja },
  { id: "sour", nombre: "SOUR RESERVA", ron: "triple", ronNombre: "BRUGAL TRIPLE RESERVA",
    vaso: "vaso-sour", mezcla: "limon", mezclaNombre: "ZUMO DE LIMÓN",
    ingredientes: ["sirope", "naranja", "clara"],
    lineasReceta: ["2 OZ BRUGAL TRIPLE RESERVA", "ZUMO DE LIMÓN", "SIROPE SIMPLE", "BITTER DE NARANJA"],
    imgTrago: IMG.tragoSour, imgVaso: IMG.vasoSour },
  { id: "albahaca", nombre: "LIMÓN ALBAHACA EXTRA VIEJO", ron: "extraviejo", ronNombre: "BRUGAL EXTRA VIEJO",
    vaso: "vaso-albahaca", mezcla: "limon", mezclaNombre: "ZUMO DE LIMÓN",
    ingredientes: ["albahaca", "sirope", "limon"],
    lineasReceta: ["2 OZ BRUGAL EXTRA VIEJO", "ZUMO DE LIMÓN", "SIROPE DE ALBAHACA"],
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
export const MEZCLAS: { id: MezclaId; nombre: string; img: string }[] = [
  { id: "perrier", nombre: "AGUA CON GÁS", img: IMG.mixerPerrier },
  { id: "limon", nombre: "ZUMO DE LIMÓN", img: IMG.mixerLimon },
  { id: "tonica", nombre: "AGUA TÓNICA", img: IMG.mixerTonica },
  { id: "ginger", nombre: "GINGER ALE", img: IMG.mixerGinger },
  { id: "arandano", nombre: "JUGO DE ARÁNDANO", img: IMG.mixerArandano },
];
export const INGREDIENTES: Record<IngredienteId, { nombre: string; img: string }> = {
  toronja: { nombre: "TORONJA", img: IMG.ingToronja }, romero: { nombre: "ROMERO", img: IMG.ingRomero },
  hielo: { nombre: "HIELO", img: IMG.ingHielo }, sirope: { nombre: "SIROPE", img: IMG.ingSirope },
  naranja: { nombre: "NARANJA", img: IMG.ingNaranja }, clara: { nombre: "CLARA", img: IMG.ingClara },
  albahaca: { nombre: "ALBAHACA", img: IMG.ingAlbahaca }, limon: { nombre: "LIMÓN", img: IMG.ingLimon },
  canela: { nombre: "CANELA", img: IMG.ingCanela }, jengibre: { nombre: "JENGIBRE", img: IMG.ingJengibre },
  frambuesa: { nombre: "FRAMBUESA", img: IMG.ingFrambuesa }, menta: { nombre: "MENTA", img: IMG.ingMenta },
  angostura: { nombre: "ANGOSTURA", img: IMG.ingAngostura }, cafe: { nombre: "CAFÉ", img: IMG.ingCafe },
  demerara: { nombre: "DEMERARA", img: IMG.ingDemerara },
};
export const SENUELOS: IngredienteId[] = ["canela", "jengibre", "frambuesa", "menta", "angostura", "cafe", "demerara"];

export function armarGrid(receta: Receta, rng: () => number = Math.random): IngredienteId[] {
  const decoyPool = [...SENUELOS];
  const decoys: IngredienteId[] = [];
  for (let i = 0; i < 6 && decoyPool.length > 0; i++) {
    const idx = Math.floor(rng() * decoyPool.length);
    decoys.push(decoyPool.splice(idx, 1)[0]);
  }
  const grid = [...receta.ingredientes, ...decoys];
  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }
  return grid;
}

export interface Elecciones { vaso: VasoId | null; ron: RonId | null; mezcla: MezclaId | null; ingredientes: IngredienteId[] }
export interface Evaluacion {
  gano: boolean;
  vasoOk: boolean; ronOk: boolean; mezclaOk: boolean;
  faltaron: IngredienteId[];   // correctos no elegidos
  sobraron: IngredienteId[];   // elegidos que no van
}
export function evaluar(receta: Receta, e: Elecciones): Evaluacion {
  const vasoOk = e.vaso === receta.vaso;
  const ronOk = e.ron === receta.ron;
  const mezclaOk = e.mezcla === receta.mezcla;
  const faltaron = receta.ingredientes.filter((ing) => !e.ingredientes.includes(ing));
  const sobraron = e.ingredientes.filter((ing) => !receta.ingredientes.includes(ing));
  const gano = vasoOk && ronOk && mezclaOk && faltaron.length === 0 && sobraron.length === 0;
  return { gano, vasoOk, ronOk, mezclaOk, faltaron, sobraron };
}
