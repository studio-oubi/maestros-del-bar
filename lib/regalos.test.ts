import { describe, it, expect } from "vitest";
import { REGALOS, esRegaloValido } from "./regalos";

describe("REGALOS", () => {
  it("son exactamente las 5 opciones acordadas", () => {
    expect([...REGALOS]).toEqual(["Vaso", "Lentes", "Gorra", "Bolso", "Sombrero"]);
  });
});

describe("esRegaloValido", () => {
  it("acepta cada opción válida", () => {
    for (const r of REGALOS) expect(esRegaloValido(r)).toBe(true);
  });
  it("rechaza cadenas fuera de la lista (case-sensitive)", () => {
    for (const v of ["", "vaso", "VASO", "Taza", "Vaso ", "Lentes,Gorra"]) {
      expect(esRegaloValido(v)).toBe(false);
    }
  });
  it("rechaza no-strings", () => {
    for (const v of [null, undefined, 0, 1, {}, [], ["Vaso"], true]) {
      expect(esRegaloValido(v)).toBe(false);
    }
  });
});
