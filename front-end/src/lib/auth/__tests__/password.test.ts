import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password", () => {
  it("verifies correct password", () => {
    const stored = hashPassword("senha-segura-123");
    expect(verifyPassword("senha-segura-123", stored)).toBe(true);
    expect(verifyPassword("errada", stored)).toBe(false);
  });

  it("rejects malformed hash", () => {
    expect(verifyPassword("x", "invalid")).toBe(false);
  });
});
