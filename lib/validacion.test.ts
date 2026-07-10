import { describe, it, expect } from "vitest";
import { validarRegistro } from "./validacion";

describe("validarRegistro", () => {
  it("acepta y normaliza un registro válido", () => {
    const r = validarRegistro({ nombre: "Ana Pérez", cedula: "00112345678", telefono: "8095551234", correo: "ana@mail.com" });
    expect(r).toEqual({ ok: true, datos: { nombre: "Ana Pérez", cedula: "001-1234567-8", telefono: "(809) 555-1234", correo: "ana@mail.com" } });
  });
  it("rechaza cédula corta", () => {
    expect(validarRegistro({ nombre: "Ana", cedula: "123", telefono: "8095551234", correo: "a@b.co" }).ok).toBe(false);
  });
  it("rechaza correo inválido con contenido", () => {
    expect(validarRegistro({ nombre: "Ana", cedula: "00112345678", telefono: "8095551234", correo: "nope" }).ok).toBe(false);
  });
  it("correo vacío es válido", () => {
    const r = validarRegistro({ nombre: "Ana", cedula: "00112345678", telefono: "8095551234", correo: "" });
    expect(r).toEqual({ ok: true, datos: { nombre: "Ana", cedula: "001-1234567-8", telefono: "(809) 555-1234", correo: "" } });
  });
  it("correo ausente es válido", () => {
    const r = validarRegistro({ nombre: "Ana", cedula: "00112345678", telefono: "8095551234" });
    expect(r.ok).toBe(true);
  });
  it("rechaza payload no-objeto", () => {
    expect(validarRegistro(null).ok).toBe(false);
  });
});
