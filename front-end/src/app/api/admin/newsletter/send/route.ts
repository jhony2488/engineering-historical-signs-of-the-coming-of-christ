import { NextResponse } from "next/server";

import { sendMassNewsletter } from "@/lib/db/newsletter";
import { isEmailConfigured, isEmailDryRun } from "@/lib/email/sender";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { newsletterSendSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = checkRateLimit(`admin-newsletter-send:${clientIp(request)}`, 3, 60_000);
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec ?? 60);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = newsletterSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Assunto ou corpo inválido" }, { status: 400 });
  }

  if (!isEmailConfigured() && !isEmailDryRun()) {
    return NextResponse.json(
      { error: "E-mail não configurado (EMAIL_FROM + RESEND_API_KEY)" },
      { status: 503 },
    );
  }

  try {
    const result = await sendMassNewsletter(parsed.data.subject, parsed.data.body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/newsletter/send]", error);
    return NextResponse.json({ error: "Falha ao enviar campanha" }, { status: 500 });
  }
}
