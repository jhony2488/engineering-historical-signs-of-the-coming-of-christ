import { NextResponse } from "next/server";

import { withNewsletterRateLimit } from "@/lib/api-guard";
import { subscribeNewsletter } from "@/lib/db/newsletter";
import { newsletterSubscribeSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = withNewsletterRateLimit(request);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = newsletterSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  try {
    const result = await subscribeNewsletter(
      parsed.data.email,
      parsed.data.source ?? "web",
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[db/newsletter/subscribe]", error);
    return NextResponse.json({ error: "Não foi possível inscrever o e-mail" }, { status: 500 });
  }
}
