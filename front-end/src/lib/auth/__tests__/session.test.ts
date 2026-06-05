import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "../session";

describe("session", () => {
  it("cria e valida token de sessão", async () => {
    const token = await createSessionToken("admin");
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sub: "admin", role: "admin" });
  });

  it("rejeita token inválido", async () => {
    expect(await verifySessionToken("invalid.token")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
  });
});
