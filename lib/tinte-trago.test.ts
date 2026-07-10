import { describe, it, expect } from "vitest";
import { filtroTinte } from "./tinte-trago";

const correctos = ["toronja", "romero", "hielo"] as const;

describe("filtroTinte", () => {
  it("sin filtro cuando el set elegido coincide exacto (mismo orden o distinto)", () => {
    expect(filtroTinte(["toronja", "romero", "hielo"], [...correctos])).toBe("");
    expect(filtroTinte(["hielo", "toronja", "romero"], [...correctos])).toBe("");
  });

  it("sin filtro cuando no hay ingredientes elegidos (evita NaN)", () => {
    expect(filtroTinte([], [...correctos])).toBe("");
  });

  it("aplica hue-rotate/saturate/brightness cuando difiere", () => {
    const f = filtroTinte(["cafe", "canela"], [...correctos]);
    expect(f).toMatch(/^hue-rotate\(-?\d+deg\) saturate\(\.85\) brightness\(\.95\)$/);
  });

  it("el desvío es determinista para el mismo par de sets", () => {
    const a = filtroTinte(["cafe", "canela"], [...correctos]);
    const b = filtroTinte(["cafe", "canela"], [...correctos]);
    expect(a).toBe(b);
  });

  it("faltan ingredientes (subconjunto) también tiñe si el tono difiere", () => {
    const f = filtroTinte(["toronja"], [...correctos]);
    expect(f).toMatch(/^hue-rotate\(-?\d+deg\) saturate\(\.85\) brightness\(\.95\)$/);
  });
});
