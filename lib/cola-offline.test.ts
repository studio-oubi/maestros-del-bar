import { describe, it, expect } from "vitest";
import {
  CLAVE_COLA,
  CLAVE_PENDIENTE_LEGACY,
  TEMP_ID_ANONIMO,
  type Almacen,
  type PartidaPendiente,
  type SesionCola,
  crearSesion,
  agregarSesion,
  adjuntarPartida,
  serializar,
  parsear,
  leerCola,
  escribirCola,
  migrar,
} from "./cola-offline";

// Doble de almacenamiento en memoria que cumple la interfaz Almacen.
function almacenFalso(inicial: Record<string, string> = {}): Almacen & { datos: Record<string, string> } {
  const datos: Record<string, string> = { ...inicial };
  return {
    datos,
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => {
      datos[k] = v;
    },
    removeItem: (k) => {
      delete datos[k];
    },
  };
}

const registro = { nombre: "Ana", cedula: "1", telefono: "8090000000", correo: "a@b.com" };
const partida: PartidaPendiente = { trago: "sour", resultado: "gano", tiempoRestante: 12, detalles: {} };

describe("crearSesion", () => {
  it("genera un tempId único y arranca sin partidas", () => {
    const a = crearSesion(registro);
    const b = crearSesion(registro);
    expect(a.tempId).not.toBe(b.tempId);
    expect(a.registro).toEqual(registro);
    expect(a.partidas).toEqual([]);
  });

  it("acepta registro null para sesiones anónimas", () => {
    expect(crearSesion(null).registro).toBeNull();
  });

  it("respeta un tempId explícito", () => {
    expect(crearSesion(null, TEMP_ID_ANONIMO).tempId).toBe(TEMP_ID_ANONIMO);
  });
});

describe("agregarSesion", () => {
  it("añade sin mutar la cola original", () => {
    const cola: SesionCola[] = [];
    const s = crearSesion(registro);
    const nueva = agregarSesion(cola, s);
    expect(nueva).toHaveLength(1);
    expect(cola).toHaveLength(0);
  });
});

describe("adjuntarPartida", () => {
  it("agrega la partida a la sesión con ese tempId", () => {
    const s = crearSesion(registro, "t1");
    const cola = adjuntarPartida([s], "t1", partida);
    expect(cola[0].partidas).toEqual([partida]);
  });

  it("crea una sesión anónima si el tempId no existe", () => {
    const cola = adjuntarPartida([], TEMP_ID_ANONIMO, partida);
    expect(cola).toHaveLength(1);
    expect(cola[0].tempId).toBe(TEMP_ID_ANONIMO);
    expect(cola[0].registro).toBeNull();
    expect(cola[0].partidas).toEqual([partida]);
  });

  it("no muta la sesión original al adjuntar", () => {
    const s = crearSesion(registro, "t1");
    adjuntarPartida([s], "t1", partida);
    expect(s.partidas).toEqual([]);
  });
});

describe("serializar / parsear", () => {
  it("hace round-trip de una cola válida", () => {
    const cola = [{ ...crearSesion(registro, "t1"), partidas: [partida] }];
    expect(parsear(serializar(cola))).toEqual(cola);
  });

  it("devuelve cola vacía ante null, basura o JSON no-arreglo", () => {
    expect(parsear(null)).toEqual([]);
    expect(parsear("{no json")).toEqual([]);
    expect(parsear('{"tempId":"x"}')).toEqual([]);
  });

  it("descarta sesiones con forma inválida", () => {
    const crudo = JSON.stringify([
      { tempId: "ok", registro: null, partidas: [] },
      { tempId: 42, partidas: [] },
      { registro: null, partidas: [] },
    ]);
    const cola = parsear(crudo);
    expect(cola).toHaveLength(1);
    expect(cola[0].tempId).toBe("ok");
  });
});

describe("leerCola / escribirCola", () => {
  it("persiste y recupera contra el almacén", () => {
    const alm = almacenFalso();
    const cola = agregarSesion([], crearSesion(registro, "t1"));
    escribirCola(alm, cola);
    expect(alm.datos[CLAVE_COLA]).toBeDefined();
    expect(leerCola(alm)).toEqual(cola);
  });

  it("lee cola vacía si no hay nada guardado", () => {
    expect(leerCola(almacenFalso())).toEqual([]);
  });
});

describe("migrar", () => {
  it("convierte el registro pendiente antiguo en una sesión de la cola nueva", () => {
    const alm = almacenFalso({
      [CLAVE_PENDIENTE_LEGACY]: JSON.stringify({ datos: registro, pendiente: true }),
    });
    migrar(alm);
    const cola = leerCola(alm);
    expect(cola).toHaveLength(1);
    expect(cola[0].registro).toEqual(registro);
    expect(cola[0].partidas).toEqual([]);
    expect(alm.datos[CLAVE_PENDIENTE_LEGACY]).toBeUndefined();
  });

  it("preserva las sesiones ya encoladas al migrar", () => {
    const previa = crearSesion(registro, "previa");
    const alm = almacenFalso({
      [CLAVE_COLA]: serializar([previa]),
      [CLAVE_PENDIENTE_LEGACY]: JSON.stringify({ datos: registro, pendiente: true }),
    });
    migrar(alm);
    expect(leerCola(alm)).toHaveLength(2);
  });

  it("no hace nada si no existe la clave antigua", () => {
    const alm = almacenFalso();
    migrar(alm);
    expect(leerCola(alm)).toEqual([]);
  });

  it("borra la clave antigua aunque esté corrupta", () => {
    const alm = almacenFalso({ [CLAVE_PENDIENTE_LEGACY]: "{basura" });
    migrar(alm);
    expect(alm.datos[CLAVE_PENDIENTE_LEGACY]).toBeUndefined();
    expect(leerCola(alm)).toEqual([]);
  });

  it("es idempotente: correr dos veces no duplica", () => {
    const alm = almacenFalso({
      [CLAVE_PENDIENTE_LEGACY]: JSON.stringify({ datos: registro, pendiente: true }),
    });
    migrar(alm);
    migrar(alm);
    expect(leerCola(alm)).toHaveLength(1);
  });
});
