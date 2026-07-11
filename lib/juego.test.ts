import { describe, it, expect } from "vitest";
import { reducer, estadoInicial } from "./juego";
import { RECETAS } from "./recetas";
import type { Elecciones } from "./recetas";

const elecciones: Elecciones = {
  vaso: "vaso-sour",
  ron: "triple",
  mezclas: ["zumo-limon"],
  ingredientes: ["toronja"],
};

// Estado tras PERDER el intento indicado, con registro ya hecho.
function perdido(intento = 1) {
  return {
    ...estadoInicial,
    pantalla: "resultado" as const,
    registroId: 42,
    registroHecho: true,
    receta: RECETAS[0],
    grid: [...RECETAS[0].ingredientes],
    elecciones,
    resultado: "fallo" as const,
    tiempoRestante: 12,
    intento,
  };
}

describe("reducer REINTENTAR", () => {
  it("conserva el registro, resetea la partida, va a recetas e incrementa intento", () => {
    const s = reducer(perdido(1), { tipo: "REINTENTAR" });
    expect(s.registroId).toBe(42); // clave: la 2ª partida va al MISMO registro
    expect(s.registroHecho).toBe(true);
    expect(s.pantalla).toBe("recetas");
    expect(s.intento).toBe(2);
    expect(s.receta).toBeNull();
    expect(s.resultado).toBeNull();
    expect(s.evaluacion).toBeNull();
    expect(s.grid).toEqual([]);
    expect(s.elecciones).toEqual({ vaso: null, ron: null, mezclas: [], ingredientes: [] });
  });

  it("incrementa de nuevo en un intento posterior (2 -> 3)", () => {
    expect(reducer(perdido(2), { tipo: "REINTENTAR" }).intento).toBe(3);
  });
});

describe("reducer REINICIAR", () => {
  it("limpia el registro y vuelve el intento a 1 (kiosko: nuevo jugador)", () => {
    const s = reducer(perdido(2), { tipo: "REINICIAR" });
    expect(s.registroId).toBeNull();
    expect(s.registroHecho).toBe(false);
    expect(s.pantalla).toBe("home");
    expect(s.intento).toBe(1);
  });
});
