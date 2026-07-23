import { describe, it, expect, vi, beforeEach } from "vitest";

// BD falsa: captura el SET del update y permite simular "id no existe".
const bd = vi.hoisted(() => ({ set: null as unknown, filas: [{ id: 7 }] }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "token-valido" }) }),
}));
vi.mock("@/lib/admin-auth", () => ({ verificarToken: () => true }));
vi.mock("drizzle-orm", () => ({ eq: () => ({}) }));
vi.mock("@/lib/db", () => ({
  registros: { id: "id" },
  getDb: () => ({
    update: () => ({
      set: (v: unknown) => {
        bd.set = v;
        return { where: () => ({ returning: () => Promise.resolve(bd.filas) }) };
      },
    }),
  }),
}));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://x/api/consumo", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  process.env.POSTGRES_URL = "postgres://x";
  process.env.ADMIN_SECRET = "s3creto";
  bd.set = null;
  bd.filas = [{ id: 7 }];
});

describe("POST /api/consumo", () => {
  it("asigna un solo campo (actualización parcial)", async () => {
    const res = await POST(req({ id: 7, producto: "Brugal Leyenda" }));
    expect(res.status).toBe(200);
    expect(bd.set).toEqual({ producto: "Brugal Leyenda" });
  });

  it("asigna los tres campos a la vez", async () => {
    const res = await POST(req({ id: 7, producto: "Brugal 1888", tipo: "Trago", cantidad: 3 }));
    expect(res.status).toBe(200);
    expect(bd.set).toEqual({ producto: "Brugal 1888", tipo: "Trago", cantidad: 3 });
  });

  it("REASIGNA sin 409 — a diferencia del regalo, el consumo se puede corregir", async () => {
    expect((await POST(req({ id: 7, tipo: "Botella" }))).status).toBe(200);
    expect((await POST(req({ id: 7, tipo: "Trago" }))).status).toBe(200);
    expect(bd.set).toEqual({ tipo: "Trago" });
  });

  it("acepta la cantidad como string numérica", async () => {
    expect((await POST(req({ id: 7, cantidad: "5" }))).status).toBe(200);
    expect(bd.set).toEqual({ cantidad: 5 });
  });

  it("400 si no viene ningún campo que actualizar", async () => {
    expect((await POST(req({ id: 7 }))).status).toBe(400);
  });

  it("400 con valores fuera de las listas", async () => {
    expect((await POST(req({ id: 7, producto: "Barceló" }))).status).toBe(400);
    expect((await POST(req({ id: 7, tipo: "Copa" }))).status).toBe(400);
    expect((await POST(req({ id: 7, cantidad: 0 }))).status).toBe(400);
    expect((await POST(req({ id: 7, cantidad: 11 }))).status).toBe(400);
  });

  it("los bordes del rango de cantidad entran (1 y 10)", async () => {
    expect((await POST(req({ id: 7, cantidad: 1 }))).status).toBe(200);
    expect((await POST(req({ id: 7, cantidad: 10 }))).status).toBe(200);
  });

  it("400 si el id es inválido", async () => {
    expect((await POST(req({ id: "x", tipo: "Trago" }))).status).toBe(400);
  });

  it("404 si el registro no existe", async () => {
    bd.filas = [];
    expect((await POST(req({ id: 999, tipo: "Trago" }))).status).toBe(404);
  });

  it("503 si la BD no está configurada", async () => {
    delete process.env.POSTGRES_URL;
    expect((await POST(req({ id: 7, tipo: "Trago" }))).status).toBe(503);
  });
});
