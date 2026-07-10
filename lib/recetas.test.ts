import { describe, it, expect } from "vitest";
import { RECETAS, INGREDIENTES, armarGrid, evaluar } from "./recetas";
import type { Elecciones } from "./recetas";

const toronja = RECETAS[0]; // mezclas: [zumo-limon, zumo-toronja], ingredientes: [toronja, romero, hielo]

// Elección que gana la receta 1 (base para mutar en cada caso).
const ganadora: Elecciones = {
  vaso: "vaso-toronja",
  ron: "doble",
  mezclas: ["zumo-limon", "zumo-toronja"],
  ingredientes: ["toronja", "romero", "hielo"],
};

describe("armarGrid", () => {
  it("devuelve los 12 ingredientes sin duplicados", () => {
    const grid = armarGrid(() => 0.5);
    expect(grid).toHaveLength(12);
    expect(new Set(grid).size).toBe(12);
    expect(new Set(grid)).toEqual(new Set(Object.keys(INGREDIENTES)));
  });
  it("incluye siempre los ingredientes correctos de la receta", () => {
    const grid = armarGrid(() => 0.2);
    for (const ing of toronja.ingredientes) expect(grid).toContain(ing);
  });
  it("baraja (distinto orden con distinto rng) pero mismo conjunto", () => {
    const a = armarGrid(() => 0.1);
    const b = armarGrid(() => 0.9);
    expect(new Set(a)).toEqual(new Set(b));
  });
});

describe("evaluar", () => {
  it("todo exacto gana", () => {
    const ev = evaluar(toronja, ganadora);
    expect(ev.gano).toBe(true);
    expect(ev.vasoOk).toBe(true);
    expect(ev.ronOk).toBe(true);
    expect(ev.mezclaOk).toBe(true);
    expect(ev.mezclasFaltaron).toEqual([]);
    expect(ev.mezclasSobraron).toEqual([]);
    expect(ev.faltaron).toEqual([]);
    expect(ev.sobraron).toEqual([]);
  });

  it("el orden de mezclas e ingredientes no importa", () => {
    const ev = evaluar(toronja, {
      ...ganadora,
      mezclas: ["zumo-toronja", "zumo-limon"],
      ingredientes: ["hielo", "toronja", "romero"],
    });
    expect(ev.gano).toBe(true);
  });

  it("mezcla de menos: no gana y marca la faltante", () => {
    const ev = evaluar(toronja, { ...ganadora, mezclas: ["zumo-limon"] });
    expect(ev.gano).toBe(false);
    expect(ev.mezclaOk).toBe(false);
    expect(ev.mezclasFaltaron).toEqual(["zumo-toronja"]);
    expect(ev.mezclasSobraron).toEqual([]);
  });

  it("mezcla de más: no gana y marca la sobrante", () => {
    const ev = evaluar(toronja, { ...ganadora, mezclas: ["zumo-limon", "zumo-toronja", "soda"] });
    expect(ev.gano).toBe(false);
    expect(ev.mezclaOk).toBe(false);
    expect(ev.mezclasFaltaron).toEqual([]);
    expect(ev.mezclasSobraron).toEqual(["soda"]);
  });

  it("ingrediente de menos: no gana y marca el faltante", () => {
    const ev = evaluar(toronja, { ...ganadora, ingredientes: ["toronja", "romero"] });
    expect(ev.gano).toBe(false);
    expect(ev.faltaron).toEqual(["hielo"]);
    expect(ev.sobraron).toEqual([]);
  });

  it("ingrediente de más: no gana y marca el sobrante", () => {
    const ev = evaluar(toronja, { ...ganadora, ingredientes: ["toronja", "romero", "hielo", "menta"] });
    expect(ev.gano).toBe(false);
    expect(ev.faltaron).toEqual([]);
    expect(ev.sobraron).toEqual(["menta"]);
  });

  it("vaso o ron incorrecto: no gana aunque mezclas/ingredientes sean exactos", () => {
    expect(evaluar(toronja, { ...ganadora, vaso: "vaso-sour" }).gano).toBe(false);
    expect(evaluar(toronja, { ...ganadora, ron: "triple" }).gano).toBe(false);
  });

  it("faltantes y sobrantes en ambos ejes a la vez", () => {
    const ev = evaluar(toronja, {
      vaso: "vaso-toronja",
      ron: "doble",
      mezclas: ["zumo-limon", "soda"], // falta zumo-toronja, sobra soda
      ingredientes: ["toronja", "menta"], // faltan romero+hielo, sobra menta
    });
    expect(ev.gano).toBe(false);
    expect(ev.mezclasFaltaron).toEqual(["zumo-toronja"]);
    expect(ev.mezclasSobraron).toEqual(["soda"]);
    expect(ev.faltaron.sort()).toEqual(["hielo", "romero"]);
    expect(ev.sobraron).toEqual(["menta"]);
  });
});
