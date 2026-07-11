import { describe, it, expect, vi, beforeEach } from "vitest";

// Resultados controlables de la BD falsa (hoisted para el factory de vi.mock).
const bd = vi.hoisted(() => ({ update: [] as unknown[], select: [] as unknown[] }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "tok" }) }) }));
vi.mock("@/lib/admin-auth", () => ({ verificarToken: vi.fn(() => true) }));
vi.mock("drizzle-orm", () => ({ and: (...a: unknown[]) => ({ and: a }), eq: (...a: unknown[]) => ({ eq: a }) }));
vi.mock("@/lib/db", () => ({
  registros: { id: "id", regalo: "regalo" },
  getDb: () => {
    const ub = { set: () => ub, where: () => ub, returning: () => Promise.resolve(bd.update) };
    const sb = { from: () => sb, where: () => Promise.resolve(bd.select) };
    return { update: () => ub, select: () => sb };
  },
}));

import { POST } from "./route";
import { verificarToken } from "@/lib/admin-auth";

const req = (body: unknown) =>
  new Request("http://x/api/regalo", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  process.env.ADMIN_SECRET = "s";
  process.env.POSTGRES_URL = "postgres://x";
  vi.mocked(verificarToken).mockReturnValue(true);
  bd.update = [];
  bd.select = [];
});

describe("POST /api/regalo — asignación única", () => {
  it("asigna cuando el registro no tenía regalo (200)", async () => {
    bd.update = [{ id: 5, regalo: "Vaso" }]; // UPDATE ... WHERE regalo='' afectó 1 fila
    const res = await POST(req({ id: 5, regalo: "Vaso" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 5, regalo: "Vaso" });
  });

  it("409 si ya estaba asignado (0 filas), devolviendo el valor real del servidor", async () => {
    bd.update = []; // el guard WHERE regalo='' no afectó filas
    bd.select = [{ regalo: "Gorra" }];
    const res = await POST(req({ id: 5, regalo: "Vaso" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ regalo: "Gorra" });
  });

  it("400 si el regalo no está en la lista de 5", async () => {
    expect((await POST(req({ id: 5, regalo: "Taza" }))).status).toBe(400);
  });

  it("400 si el id es inválido", async () => {
    expect((await POST(req({ id: "x", regalo: "Vaso" }))).status).toBe(400);
  });

  it("401 sin sesión de admin válida", async () => {
    vi.mocked(verificarToken).mockReturnValue(false);
    expect((await POST(req({ id: 5, regalo: "Vaso" }))).status).toBe(401);
  });
});
