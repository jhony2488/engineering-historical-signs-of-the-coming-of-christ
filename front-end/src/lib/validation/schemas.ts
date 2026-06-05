import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export const historicoQuerySchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(365).optional(),
});

export const rankingParamsSchema = z.object({
  personagem: z.enum(["besta_mar", "besta_terra", "mar", "terra"]),
});

export const approveReviewSchema = z.object({
  data_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const snapshotJanelaSchema = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "quarterly_hybrid",
  "semiannual_hybrid",
  "annual_hybrid",
]);

export const newsletterSubscribeSchema = z.object({
  email: z.string().email().max(254),
  source: z.enum(["web", "footer", "profecias", "dashboard", "rankings"]).optional(),
});

export const newsletterUnsubscribeSchema = z.object({
  token: z.string().min(32).max(64),
});

export const newsletterSendSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(50_000),
});
