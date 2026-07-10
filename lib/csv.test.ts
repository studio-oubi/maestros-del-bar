import { describe, it, expect } from "vitest";
import { escaparCsv } from "./csv";

describe("escaparCsv", () => {
  it("deja intacto un valor normal", () => {
    expect(escaparCsv("Juan Pérez")).toBe("Juan Pérez");
  });

  it("entrecomilla valores con coma", () => {
    expect(escaparCsv("Calle 1, Sector 2")).toBe('"Calle 1, Sector 2"');
  });

  it("escapa comillas dobles duplicándolas", () => {
    expect(escaparCsv('El "mejor" trago')).toBe('"El ""mejor"" trago"');
  });

  it("entrecomilla valores con salto de línea", () => {
    expect(escaparCsv("línea1\nlínea2")).toBe('"línea1\nlínea2"');
  });

  it("neutraliza fórmulas que empiezan con =", () => {
    expect(escaparCsv('=HYPERLINK("http://evil.com","click")')).toBe(
      '"\'=HYPERLINK(""http://evil.com"",""click"")"'
    );
  });

  it("neutraliza fórmulas que empiezan con +", () => {
    expect(escaparCsv("+1+1")).toBe("'+1+1");
  });

  it("neutraliza fórmulas que empiezan con -", () => {
    expect(escaparCsv("-2+3")).toBe("'-2+3");
  });

  it("neutraliza fórmulas que empiezan con @", () => {
    expect(escaparCsv("@SUM(A1:A9)")).toBe("'@SUM(A1:A9)");
  });

  it("neutraliza valores que empiezan con tab", () => {
    expect(escaparCsv("\tmalicioso")).toBe("'\tmalicioso");
  });

  it("neutraliza valores que empiezan con retorno de carro", () => {
    expect(escaparCsv("\rmalicioso")).toBe("'\rmalicioso");
  });
});
