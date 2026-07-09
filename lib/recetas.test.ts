import { describe, it, expect } from "vitest";
import { RECETAS, armarGrid, evaluar, SENUELOS } from "./recetas";

const toronja = RECETAS[0];

describe("armarGrid", () => {
  it("devuelve 9 sin duplicados incluyendo los 3 correctos", () => {
    const grid = armarGrid(toronja, () => 0.5);
    expect(grid).toHaveLength(9);
    expect(new Set(grid).size).toBe(9);
    for (const ing of toronja.ingredientes) expect(grid).toContain(ing);
  });
  it("los 6 restantes salen del pool de señuelos", () => {
    const grid = armarGrid(toronja, () => 0.5);
    const extras = grid.filter((g) => !toronja.ingredientes.includes(g));
    expect(extras).toHaveLength(6);
    for (const e of extras) expect(SENUELOS).toContain(e);
  });
});

describe("evaluar", () => {
  it("todo correcto gana", () => {
    const ev = evaluar(toronja, { vaso: "vaso-toronja", ron: "doble", mezcla: "perrier", ingredientes: ["toronja", "romero", "hielo"] });
    expect(ev.gano).toBe(true);
    expect(ev.faltaron).toEqual([]); expect(ev.sobraron).toEqual([]);
  });
  it("marca faltantes y sobrantes", () => {
    const ev = evaluar(toronja, { vaso: "vaso-sour", ron: "doble", mezcla: "perrier", ingredientes: ["toronja", "canela"] });
    expect(ev.gano).toBe(false);
    expect(ev.vasoOk).toBe(false); expect(ev.ronOk).toBe(true);
    expect(ev.faltaron.sort()).toEqual(["hielo", "romero"]);
    expect(ev.sobraron).toEqual(["canela"]);
  });
  it("orden de ingredientes no importa", () => {
    const ev = evaluar(toronja, { vaso: "vaso-toronja", ron: "doble", mezcla: "perrier", ingredientes: ["hielo", "toronja", "romero"] });
    expect(ev.gano).toBe(true);
  });
});
