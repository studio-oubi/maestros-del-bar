import { describe, it, expect, vi, beforeEach } from "vitest";

// Captura los valores insertados por la BD falsa para verificar el payload.
const bd = vi.hoisted(() => ({ insertado: null as unknown }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
}));
vi.mock("@/lib/db", () => ({
  registros: { id: "id" },
  getDb: () => ({
    insert: () => ({
      values: (v: unknown) => {
        bd.insertado = v;
        return { returning: () => Promise.resolve([{ id: 42 }]) };
      },
    }),
  }),
}));

import { POST } from "./route";

const base = {
  nombre: "Juan Perez",
  cedula: "001-1234567-8",
  telefono: "8091234567",
  correo: "",
  ciudad: "Santo Domingo",
  establecimiento: "La Posta Bar",
  producto: "Brugal XV",
  tipo: "Botella",
  cantidad: 2,
  regalo: "Vaso",
};
const req = (body: unknown) =>
  new Request("http://x/api/registro-individual", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  process.env.POSTGRES_URL = "postgres://x";
  bd.insertado = null;
});

describe("POST /api/registro-individual", () => {
  it("inserta el registro con regalo, ubicación y consumo (201)", async () => {
    const res = await POST(req(base));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 42 });
    expect(bd.insertado).toMatchObject({
      nombre: "Juan Perez",
      cedula: "001-1234567-8",
      ciudad: "Santo Domingo",
      establecimiento: "La Posta Bar",
      producto: "Brugal XV",
      tipo: "Botella",
      cantidad: 2,
      regalo: "Vaso",
    });
  });

  it("acepta la cantidad como string numérica (la envía el form)", async () => {
    expect((await POST(req({ ...base, cantidad: "3" }))).status).toBe(201);
    expect(bd.insertado).toMatchObject({ cantidad: 3 });
  });

  it("400 si el regalo no está en la lista", async () => {
    expect((await POST(req({ ...base, regalo: "Taza" }))).status).toBe(400);
  });

  it("400 si el producto no está en la lista", async () => {
    expect((await POST(req({ ...base, producto: "Brugal Añejo" }))).status).toBe(400);
  });

  it("400 si el tipo no es Botella ni Trago", async () => {
    expect((await POST(req({ ...base, tipo: "Copa" }))).status).toBe(400);
  });

  it("400 si la cantidad no es un entero en rango", async () => {
    for (const cantidad of [0, -1, 100, 1.5, "", "abc", null]) {
      expect((await POST(req({ ...base, cantidad }))).status).toBe(400);
    }
  });

  it("400 si falta la ciudad", async () => {
    expect((await POST(req({ ...base, ciudad: "" }))).status).toBe(400);
  });

  it("400 si falta el establecimiento", async () => {
    expect((await POST(req({ ...base, establecimiento: "  " }))).status).toBe(400);
  });

  it("400 si los datos base son inválidos (cédula)", async () => {
    expect((await POST(req({ ...base, cedula: "123" }))).status).toBe(400);
  });

  it("503 si la BD no está configurada", async () => {
    delete process.env.POSTGRES_URL;
    expect((await POST(req(base))).status).toBe(503);
  });
});
