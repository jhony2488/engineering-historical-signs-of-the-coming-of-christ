/**
 * Submete URLs públicas ao Google Indexing API (requer service account JSON).
 * Alternativa ao IndexNow para propriedades verificadas no Search Console.
 */
import { readFileSync } from "fs";
import { createSign } from "crypto";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const keyPath = process.env.GOOGLE_INDEXING_KEY_FILE;
const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.replace(/\\n/g, "\n");

const publicPaths = ["/", "/rankings"];

async function getAccessToken(): Promise<string> {
  if (!clientEmail || !privateKey) {
    throw new Error("Defina GOOGLE_INDEXING_CLIENT_EMAIL e GOOGLE_INDEXING_PRIVATE_KEY");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(privateKey).toString("base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth falhou: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function notifyUrl(accessToken: string, url: string) {
  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });
  const body = await res.text();
  console.log(url, res.status, body.slice(0, 120));
}

async function run() {
  if (keyPath) {
    const key = JSON.parse(readFileSync(keyPath, "utf-8")) as {
      client_email: string;
      private_key: string;
    };
    process.env.GOOGLE_INDEXING_CLIENT_EMAIL = key.client_email;
    process.env.GOOGLE_INDEXING_PRIVATE_KEY = key.private_key;
  }

  const token = await getAccessToken();
  const base = siteUrl.replace(/\/$/, "");
  for (const path of publicPaths) {
    await notifyUrl(token, `${base}${path}`);
  }
  console.log("Google Indexing API: concluído.");
}

run().catch((err) => {
  console.error("Google Indexing falhou:", err);
  process.exit(1);
});
