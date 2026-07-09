import { describe, it, expect } from "vitest";
import { crearToken, verificarToken } from "./admin-auth";

describe("admin-auth", () => {
  it("token recién creado verifica", () => {
    expect(verificarToken(crearToken("s3cr3t"), "s3cr3t")).toBe(true);
  });
  it("secreto incorrecto no verifica", () => {
    expect(verificarToken(crearToken("a"), "b")).toBe(false);
  });
  it("token expirado no verifica", () => {
    const viejo = `${Date.now() - 1000}.deadbeef`;
    expect(verificarToken(viejo, "s3cr3t")).toBe(false);
  });
  it("token undefined/malformado no verifica", () => {
    expect(verificarToken(undefined, "s")).toBe(false);
    expect(verificarToken("garbage", "s")).toBe(false);
  });
});
