import { createSign } from "node:crypto";

import { getGaMeasurementId, isGaDataApiConfigured } from "./config";

export interface AnalyticsDailyPoint {
  date: string;
  pageViews: number;
  activeUsers: number;
}

export interface AnalyticsTopPage {
  path: string;
  views: number;
}

export interface AnalyticsSummary {
  configured: {
    measurementId: boolean;
    dataApi: boolean;
  };
  measurementId?: string;
  propertyId?: string;
  periodDays: number;
  totals: {
    activeUsers: number;
    pageViews: number;
    sessions: number;
  };
  daily: AnalyticsDailyPoint[];
  topPages: AnalyticsTopPage[];
  fetchedAt: string;
  error?: string;
}

function base64url(value: string | Buffer): string {
  const buf = typeof value === "string" ? Buffer.from(value) : value;
  return buf.toString("base64url");
}

async function getGoogleAccessToken(): Promise<string> {
  const email = process.env.GA_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !privateKey) {
    throw new Error("Credenciais GA4 Data API ausentes");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = base64url(sign.sign(privateKey));
  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Falha ao obter token OAuth: ${tokenRes.status}`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("Resposta OAuth sem access_token");
  }
  return tokenJson.access_token;
}

async function runGaReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GA4 runReport falhou (${res.status}): ${detail.slice(0, 200)}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

function metricValue(
  rows: Array<{ metricValues?: Array<{ value?: string }> }> | undefined,
  index: number,
  metricIndex: number,
): number {
  const raw = rows?.[index]?.metricValues?.[metricIndex]?.value;
  return raw ? Number(raw) : 0;
}

function dimensionValue(
  row: { dimensionValues?: Array<{ value?: string }> } | undefined,
  index: number,
): string {
  return row?.dimensionValues?.[index]?.value ?? "";
}

export async function fetchAnalyticsSummary(periodDays = 7): Promise<AnalyticsSummary> {
  const measurementId = getGaMeasurementId();
  const propertyId = process.env.GA_PROPERTY_ID?.trim();
  const dataApi = isGaDataApiConfigured();

  const empty: AnalyticsSummary = {
    configured: {
      measurementId: Boolean(measurementId),
      dataApi,
    },
    measurementId,
    propertyId,
    periodDays,
    totals: { activeUsers: 0, pageViews: 0, sessions: 0 },
    daily: [],
    topPages: [],
    fetchedAt: new Date().toISOString(),
  };

  if (!dataApi || !propertyId) {
    return empty;
  }

  try {
    const accessToken = await getGoogleAccessToken();
    const startDate = `${periodDays}daysAgo`;
    const endDate = "today";

    const [totalsReport, dailyReport, topPagesReport] = await Promise.all([
      runGaReport(accessToken, propertyId, {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "sessions" },
        ],
      }),
      runGaReport(accessToken, propertyId, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
      runGaReport(accessToken, propertyId, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
    ]);

    const totalsRows = totalsReport.rows as Array<{
      metricValues?: Array<{ value?: string }>;
    }>;

    const dailyRows = dailyReport.rows as Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;

    const topRows = topPagesReport.rows as Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;

    return {
      ...empty,
      totals: {
        activeUsers: metricValue(totalsRows, 0, 0),
        pageViews: metricValue(totalsRows, 0, 1),
        sessions: metricValue(totalsRows, 0, 2),
      },
      daily: (dailyRows ?? []).map((row) => {
        const rawDate = dimensionValue(row, 0);
        const formatted =
          rawDate.length === 8
            ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
            : rawDate;
        return {
          date: formatted,
          pageViews: metricValue([row], 0, 0),
          activeUsers: metricValue([row], 0, 1),
        };
      }),
      topPages: (topRows ?? []).map((row) => ({
        path: dimensionValue(row, 0) || "/",
        views: metricValue([row], 0, 0),
      })),
    };
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : "Erro ao consultar GA4 Data API",
    };
  }
}
