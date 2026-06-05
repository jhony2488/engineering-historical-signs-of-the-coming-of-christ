import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password", () => {
  it("verifica senha correta", () => {
    const stored = hashPassword("senha-segura-123");
    expect(verifyPassword("senha-segura-123", stored)).toBe(true);
    expect(verifyPassword("errada", stored)).toBe(false);
  });

  it("rejeita hash malformado", () => {
    expect(verifyPassword("x", "invalid")).toBe(false);
  });
});
