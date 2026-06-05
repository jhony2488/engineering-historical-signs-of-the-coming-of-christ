import type { AnalyticsSummary } from "@/lib/analytics/ga-data";
import { MOCK_RESULTADO } from "@/lib/mock";
import { MOCK_RANKING_MAR, MOCK_RANKING_TERRA } from "@/lib/mock-rankings";
import { MOCK_CENARIOS, MOCK_NOS_GRAFO, buildGrafoArestas } from "@/lib/mock-cenarios";

export const MOCK_ANALYTICS: AnalyticsSummary = {
  configured: { measurementId: true, dataApi: true },
  measurementId: "G-DEMO123",
  propertyId: "123456789",
  periodDays: 7,
  totals: { activeUsers: 142, pageViews: 387, sessions: 201 },
  daily: [
    { date: "2026-05-29", pageViews: 42, activeUsers: 18 },
    { date: "2026-05-30", pageViews: 51, activeUsers: 22 },
    { date: "2026-05-31", pageViews: 38, activeUsers: 15 },
    { date: "2026-06-01", pageViews: 55, activeUsers: 24 },
    { date: "2026-06-02", pageViews: 61, activeUsers: 28 },
    { date: "2026-06-03", pageViews: 72, activeUsers: 31 },
    { date: "2026-06-04", pageViews: 68, activeUsers: 29 },
  ],
  topPages: [
    { path: "/", views: 210 },
    { path: "/rankings", views: 98 },
    { path: "/login", views: 12 },
  ],
  fetchedAt: new Date().toISOString(),
};

const MOCK_REVISAO = [
  {
    id: "rev-1",
    data_referencia: "2026-06-03",
    fase_atual: "FASE_II",
    indice_global: 0.612,
    confianca: 0.74,
    status: "pending_review",
    transicao_fase: {
      transicao_entre_fases: true,
      descricao: "FASE_I → FASE_II com aceleração macro",
    },
  },
];

type FetchInput = RequestInfo | URL;

function matchUrl(input: FetchInput): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.pathname;
  return input.url;
}

/** Intercepta fetch para stories que dependem de API routes. */
export function installMockFetch(): () => void {
  const original = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: FetchInput, init?: RequestInit) => {
    const url = matchUrl(input);

    if (url.includes("/api/admin/analytics")) {
      return new Response(JSON.stringify(MOCK_ANALYTICS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/admin/revisao/pending")) {
      return new Response(JSON.stringify(MOCK_REVISAO), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/admin/revisao/approve")) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/db/cenarios")) {
      return new Response(JSON.stringify(MOCK_CENARIOS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/db/grafo")) {
      const body = {
        nodes: MOCK_NOS_GRAFO,
        edges: buildGrafoArestas(),
        gnn_convergence: 0.87,
      };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/db/resultado/atual")) {
      return new Response(JSON.stringify(MOCK_RESULTADO), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/db/resultado/historico")) {
      return new Response(JSON.stringify([MOCK_RESULTADO]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/db/ranking/besta_mar")) {
      return new Response(JSON.stringify(MOCK_RANKING_MAR), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/db/ranking/besta_terra")) {
      return new Response(JSON.stringify(MOCK_RANKING_TERRA), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/auth/logout")) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return original(input, init);
  };

  return () => {
    globalThis.fetch = original;
  };
}
