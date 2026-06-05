import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkLoginRateLimit, recordFailedLogin } from "@/lib/auth/login-rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { clientIp } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Credenciais inválidas.";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rate = checkLoginRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 60) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    await delay(350);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const username = parsed.data.username.trim();
  const password = parsed.data.password;

  if (!username || !password) {
    await delay(350);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    console.error("[auth/login] ADMIN_USERNAME ou ADMIN_PASSWORD_HASH não configurados");
    return NextResponse.json({ error: "Autenticação indisponível." }, { status: 503 });
  }

  const userBuf = Buffer.from(username);
  const expectedBuf = Buffer.from(expectedUser);
  const userMatch =
    userBuf.length === expectedBuf.length && timingSafeEqual(userBuf, expectedBuf);
  const credentialsOk = userMatch && verifyPassword(password, expectedHash);

  if (!credentialsOk) {
    recordFailedLogin(ip);
    await delay(400);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  try {
    const token = await createSessionToken(username);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Autenticação indisponível." }, { status: 503 });
  }
}
