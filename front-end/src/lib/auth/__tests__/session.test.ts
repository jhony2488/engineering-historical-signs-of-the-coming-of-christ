import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "../session";

describe("session", () => {
  it("creates and validates session token", async () => {
    const token = await createSessionToken("admin");
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sub: "admin", role: "admin" });
  });

  it("rejects invalid token", async () => {
    expect(await verifySessionToken("invalid.token")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
  });
});
