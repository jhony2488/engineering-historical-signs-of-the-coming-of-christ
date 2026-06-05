/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("middleware", () => {
  it("ignora rotas /api públicas sem headers extras", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/db/resultado/atual"));
    const res = await middleware(req);
    expect(res.headers.get("X-Frame-Options")).toBeNull();
  });

  it("bloqueia API de snapshot sem sessão", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/db/snapshot/weekly"));
    const res = await middleware(req);
    expect(res.status).toBe(401);
  });

  it("bloqueia API de analytics admin sem sessão", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/admin/analytics"));
    const res = await middleware(req);
    expect(res.status).toBe(401);
  });

  it("redireciona páginas privadas para login", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/historico"));
    const res = await middleware(req);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("location")).toContain("from=%2Fhistorico");
  });

  it("aplica headers de segurança em páginas públicas", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/rankings"));
    const res = await middleware(req);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });

  it("ignora arquivos estáticos", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/favicon.ico"));
    const res = await middleware(req);
    expect(res.headers.get("X-Frame-Options")).toBeNull();
  });
});
