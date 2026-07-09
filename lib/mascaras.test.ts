import { describe, it, expect } from "vitest";
import { mascaraCedula, mascaraTelefono } from "./mascaras";

describe("mascaras", () => {
  it("cedula progresiva", () => {
    expect(mascaraCedula("001")).toBe("001");
    expect(mascaraCedula("0011234")).toBe("001-1234");
    expect(mascaraCedula("00112345678")).toBe("001-1234567-8");
    expect(mascaraCedula("001123456789999")).toBe("001-1234567-8");
  });
  it("telefono progresivo", () => {
    expect(mascaraTelefono("809")).toBe("(809");
    expect(mascaraTelefono("8095551")).toBe("(809) 555-1");
    expect(mascaraTelefono("8095551234")).toBe("(809) 555-1234");
  });
});
