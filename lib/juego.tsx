"use client";

import { createContext, useContext, useReducer } from "react";
import type { ReactNode } from "react";
import { armarGrid, evaluar } from "@/lib/recetas";
import type { Elecciones, Evaluacion, IngredienteId, MezclaId, Receta, RonId, VasoId } from "@/lib/recetas";

// Alterna un id en un arreglo (quita si está, agrega si no), respetando un tope:
// si ya se alcanzó `max` no agrega más (regla "no marcar más de lo requerido").
function alternarConTope<T>(actual: T[], id: T, max: number): T[] {
  if (actual.includes(id)) return actual.filter((x) => x !== id);
  if (actual.length >= max) return actual;
  return [...actual, id];
}

export type Pantalla = "loading" | "home" | "formulario" | "recetas" | "intro"
  | "elige-trago" | "listo" | "reto-vaso" | "reto-ron" | "reto-mezcla" | "reto-mix" | "resultado";
export type ResultadoTipo = "gano" | "fallo" | "tiempo";

interface EstadoJuego {
  pantalla: Pantalla;
  registroId: number | null;
  registroHecho: boolean;         // true tras el formulario u Omitir; REINICIAR la limpia (kiosko)
  receta: Receta | null;          // trago elegido
  grid: IngredienteId[];          // 9 tiles de la partida
  elecciones: Elecciones;
  resultado: ResultadoTipo | null;
  evaluacion: Evaluacion | null;
  tiempoRestante: number;         // segundos al terminar (para guardar)
  intento: number;                // 1 en el primer juego, +1 con REINTENTAR (mismo registro)
}

type Accion =
  | { tipo: "CARGA_LISTA" } | { tipo: "IR"; a: Pantalla }
  | { tipo: "REGISTRADO"; id: number | null }
  | { tipo: "REGISTRO_ID"; id: number }               // llega el id real del POST /api/registro (optimista, no cambia pantalla)
  | { tipo: "ELIGE_TRAGO"; receta: Receta }
  | { tipo: "INICIAR_RETO" }
  | { tipo: "ELIGE_VASO"; vaso: VasoId } | { tipo: "ELIGE_RON"; ron: RonId }
  | { tipo: "TOGGLE_MEZCLA"; mezcla: MezclaId }       // multi-select del paso MEZCLA
  | { tipo: "CONFIRMA_MEZCLAS" }                      // pasa de reto-mezcla a reto-mix
  | { tipo: "TOGGLE_INGREDIENTE"; ing: IngredienteId }
  | { tipo: "MEZCLAR"; tiempoRestante: number }      // evalúa y va a resultado
  | { tipo: "TIEMPO_AGOTADO" }                        // resultado = 'tiempo'
  | { tipo: "REINTENTAR" }                            // 2º intento: mismo registro, vuelve a recetas
  | { tipo: "REINICIAR" };                            // vuelve a home, limpia registro (kiosko: no hereda el del jugador anterior)

const elecionesVacias: Elecciones = { vaso: null, ron: null, mezclas: [], ingredientes: [] };

export const estadoInicial: EstadoJuego = {
  pantalla: "loading",
  registroId: null,
  registroHecho: false,
  receta: null,
  grid: [],
  elecciones: elecionesVacias,
  resultado: null,
  evaluacion: null,
  tiempoRestante: 0,
  intento: 1,
};

export function reducer(estado: EstadoJuego, accion: Accion): EstadoJuego {
  switch (accion.tipo) {
    case "CARGA_LISTA":
      return { ...estado, pantalla: "home" };
    case "IR":
      return { ...estado, pantalla: accion.a };
    case "REGISTRADO":
      return { ...estado, registroId: accion.id, registroHecho: true, pantalla: "recetas" };
    case "REGISTRO_ID":
      return { ...estado, registroId: accion.id };
    case "ELIGE_TRAGO":
      return {
        ...estado,
        receta: accion.receta,
        grid: armarGrid(),
        elecciones: elecionesVacias,
        resultado: null,
        evaluacion: null,
        pantalla: "listo",
      };
    case "INICIAR_RETO":
      return { ...estado, pantalla: "reto-vaso" };
    case "ELIGE_VASO":
      return { ...estado, elecciones: { ...estado.elecciones, vaso: accion.vaso }, pantalla: "reto-ron" };
    case "ELIGE_RON":
      return { ...estado, elecciones: { ...estado.elecciones, ron: accion.ron }, pantalla: "reto-mezcla" };
    case "TOGGLE_MEZCLA": {
      if (!estado.receta) return estado;
      const mezclas = alternarConTope(estado.elecciones.mezclas, accion.mezcla, estado.receta.mezclas.length);
      return { ...estado, elecciones: { ...estado.elecciones, mezclas } };
    }
    case "CONFIRMA_MEZCLAS":
      return { ...estado, pantalla: "reto-mix" };
    case "TOGGLE_INGREDIENTE": {
      if (!estado.receta) return estado;
      const ingredientes = alternarConTope(estado.elecciones.ingredientes, accion.ing, estado.receta.ingredientes.length);
      return { ...estado, elecciones: { ...estado.elecciones, ingredientes } };
    }
    case "MEZCLAR": {
      if (!estado.receta) return estado;
      const evaluacion = evaluar(estado.receta, estado.elecciones);
      return {
        ...estado,
        evaluacion,
        resultado: evaluacion.gano ? "gano" : "fallo",
        tiempoRestante: accion.tiempoRestante,
        pantalla: "resultado",
      };
    }
    case "TIEMPO_AGOTADO":
      return { ...estado, resultado: "tiempo", evaluacion: null, tiempoRestante: 0, pantalla: "resultado" };
    case "REINTENTAR":
      // 2º intento del MISMO participante: conserva registroId/registroHecho
      // (enviarPartida ya reporta a estado.registroId, así que la 2ª partida
      // queda en el mismo registro) y vuelve a "recetas" para memorizar de nuevo
      // y seguir el flujo normal. Solo resetea lo de la partida.
      return {
        ...estado,
        receta: null,
        grid: [],
        elecciones: elecionesVacias,
        resultado: null,
        evaluacion: null,
        tiempoRestante: 0,
        intento: estado.intento + 1,
        pantalla: "recetas",
      };
    case "REINICIAR":
      // Kiosko: el siguiente jugador no debe heredar el registro del anterior.
      return {
        ...estado,
        pantalla: "home",
        registroId: null,
        registroHecho: false,
        receta: null,
        grid: [],
        elecciones: elecionesVacias,
        resultado: null,
        evaluacion: null,
        tiempoRestante: 0,
        intento: 1,
      };
    default:
      return estado;
  }
}

const JuegoContext = createContext<{ estado: EstadoJuego; despachar: React.Dispatch<Accion> } | null>(null);

export function JuegoProvider({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducer, estadoInicial);
  return <JuegoContext.Provider value={{ estado, despachar }}>{children}</JuegoContext.Provider>;
}

export function useJuego() {
  const ctx = useContext(JuegoContext);
  if (!ctx) throw new Error("useJuego debe usarse dentro de JuegoProvider");
  return ctx;
}
