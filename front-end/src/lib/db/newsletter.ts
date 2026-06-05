import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const ALLOWED_SOURCES = new Set(["web", "footer", "profecias", "dashboard", "rankings"]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function newUnsubscribeToken(): string {
  return randomBytes(32).toString("hex");
}

export async function subscribeNewsletter(
  email: string,
  source = "web",
): Promise<{ ok: true; status: "active" }> {
  const normalized = normalizeEmail(email);
  const safeSource = ALLOWED_SOURCES.has(source) ? source : "web";

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: normalized },
  });

  if (existing) {
    if (existing.status === "active") {
      return { ok: true, status: "active" };
    }
    await prisma.newsletterSubscriber.update({
      where: { email: normalized },
      data: {
        status: "active",
        unsubscribedAt: null,
        source: safeSource,
        subscribedAt: new Date(),
      },
    });
    return { ok: true, status: "active" };
  }

  await prisma.newsletterSubscriber.create({
    data: {
      email: normalized,
      status: "active",
      unsubscribeToken: newUnsubscribeToken(),
      source: safeSource,
    },
  });

  return { ok: true, status: "active" };
}

export async function unsubscribeNewsletter(token: string): Promise<boolean> {
  const clean = token.trim();
  if (!clean) return false;

  const row = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: clean },
  });
  if (!row) return false;

  await prisma.newsletterSubscriber.update({
    where: { unsubscribeToken: clean },
    data: {
      status: "unsubscribed",
      unsubscribedAt: new Date(),
    },
  });

  return true;
}

export function buildUnsubscribeUrl(token: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/inscricao/cancelar?token=${encodeURIComponent(token)}`;
}

export function buildEmailUnsubscribeFooter(token: string, siteUrl: string): string {
  const url = buildUnsubscribeUrl(token, siteUrl);
  return `Para deixar de receber estes avisos, cancele sua inscrição: ${url}`;
}

export type NewsletterSubscriberRow = {
  email: string;
  source: string | null;
  subscribedAt: Date;
};

export async function listActiveSubscribers(limit = 2000): Promise<NewsletterSubscriberRow[]> {
  const rows = await prisma.newsletterSubscriber.findMany({
    where: { status: "active" },
    orderBy: { subscribedAt: "desc" },
    take: limit,
    select: {
      email: true,
      source: true,
      subscribedAt: true,
    },
  });
  return rows;
}

export async function getNewsletterStats(): Promise<{
  active: number;
  unsubscribed: number;
}> {
  const [active, unsubscribed] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { status: "active" } }),
    prisma.newsletterSubscriber.count({ where: { status: "unsubscribed" } }),
  ]);
  return { active, unsubscribed };
}

export async function sendMassNewsletter(
  subject: string,
  body: string,
): Promise<{ sent: number; failed: number; dryRun: boolean; total: number }> {
  const { sendEmail, plainTextToHtml, isEmailDryRun } = await import("@/lib/email/sender");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "active" },
    select: { email: true, unsubscribeToken: true },
  });

  let sent = 0;
  let failed = 0;
  const dryRun = isEmailDryRun();

  for (const sub of subscribers) {
    const footer = buildEmailUnsubscribeFooter(sub.unsubscribeToken, siteUrl);
    const text = `${body.trim()}\n\n—\n${footer}`;
    const html = `${plainTextToHtml(body.trim())}<hr><p style="font-size:12px;color:#666">${footer}</p>`;

    const ok = await sendEmail({
      to: sub.email,
      subject: subject.trim(),
      text,
      html,
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  return { sent, failed, dryRun, total: subscribers.length };
}
