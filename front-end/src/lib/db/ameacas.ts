import { prisma } from "@/lib/prisma";
import type {
  AmeacaPais,
  AmeacaPaisDetail,
  ProvenanceDayResponse,
} from "@/lib/types";
import { getJoshuaCountrySummary } from "@/lib/db/joshua";
import { getUltimoResultado } from "@/lib/db/resultados";

/** Coords de países foco (espelho de backend/config/countries_focus.json). */
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name?: string }> = {
  BRA: { lat: -14.235, lng: -51.9253 },
  USA: { lat: 37.0902, lng: -95.7129 },
  ISR: { lat: 31.0461, lng: 34.8516 },
  RUS: { lat: 61.524, lng: 105.3188 },
  CHN: { lat: 35.8617, lng: 104.1954 },
  IRN: { lat: 32.4279, lng: 53.688 },
  TUR: { lat: 38.9637, lng: 35.2433 },
  DEU: { lat: 51.1657, lng: 10.4515 },
  GBR: { lat: 55.3781, lng: -3.436 },
  FRA: { lat: 46.2276, lng: 2.2137 },
  ARG: { lat: -38.4161, lng: -63.6167 },
  MEX: { lat: 23.6345, lng: -102.5528 },
  IND: { lat: 20.5937, lng: 78.9629 },
  UKR: { lat: 48.3794, lng: 31.1656 },
  SAU: { lat: 23.8859, lng: 45.0792 },
};

function enrichCoords(row: AmeacaPais): AmeacaPais {
  const c = COUNTRY_COORDS[row.country_code];
  if (!c) return row;
  return { ...row, lat: row.lat ?? c.lat, lng: row.lng ?? c.lng };
}

function mapAmeacaRow(row: {
  dataReferencia: Date;
  countryCode: string;
  countryName: string;
  riskScore: number;
  metrics: unknown;
  prescriptions: unknown;
  historicalEcho: unknown;
}): AmeacaPais {
  return enrichCoords({
    country_code: row.countryCode,
    country_name: row.countryName,
    risk_score: row.riskScore,
    metrics: (row.metrics as AmeacaPais["metrics"]) ?? {},
    prescriptions: (row.prescriptions as AmeacaPais["prescriptions"]) ?? {},
    historical_echo: (row.historicalEcho as AmeacaPais["historical_echo"]) ?? {},
    data_referencia: row.dataReferencia.toISOString().split("T")[0],
  });
}

export async function getAmeacasPaises(dataRef?: string): Promise<AmeacaPais[]> {
  const latest = await getUltimoResultado();
  if (!dataRef && latest?.ameacas_paises?.length) {
    return latest.ameacas_paises.map(enrichCoords);
  }

  const where = dataRef ? { dataReferencia: new Date(dataRef) } : undefined;
  const rows = await prisma.ameacaPais.findMany({
    where,
    orderBy: [{ dataReferencia: "desc" }, { riskScore: "desc" }],
    take: dataRef ? 50 : 50,
  });

  if (rows.length) {
    const day = rows[0].dataReferencia.toISOString().split("T")[0];
    return rows
      .filter((r) => r.dataReferencia.toISOString().split("T")[0] === day)
      .map(mapAmeacaRow);
  }

  return (latest?.ameacas_paises ?? []).map(enrichCoords);
}

export async function getAmeacaPaisDetail(
  code: string,
  dataRef?: string,
): Promise<AmeacaPaisDetail | null> {
  const upper = code.toUpperCase();
  const ameacas = await getAmeacasPaises(dataRef);
  const ameaca = ameacas.find((a) => a.country_code === upper);
  if (!ameaca) return null;

  const latest = await getUltimoResultado();
  const ref = dataRef ?? ameaca.data_referencia ?? latest?.data_referencia;

  const [abmRow, advRow, recRows, joshuaSummary] = await Promise.all([
    prisma.simulacaoAbm.findFirst({
      where: {
        countryCode: upper,
        ...(ref ? { dataReferencia: new Date(ref) } : {}),
      },
      orderBy: { dataReferencia: "desc" },
    }),
    prisma.adversarialReview.findFirst({
      where: {
        countryCode: upper,
        ...(ref ? { dataReferencia: new Date(ref) } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.recomendacaoAdaptativa.findMany({
      where: {
        countryCode: upper,
        ...(ref ? { dataReferencia: new Date(ref) } : {}),
      },
      take: 5,
    }),
    getJoshuaCountrySummary(upper),
  ]);

  const ameacaEnriched: AmeacaPais = {
    ...ameaca,
    joshua:
      joshuaSummary != null
        ? {
            avg_joshua_scale: joshuaSummary.avg_joshua_scale,
            peoples_count: joshuaSummary.peoples_count,
            expansion_score:
              ameaca.joshua?.expansion_score ?? joshuaSummary.expansion_hint,
            contraction_score:
              ameaca.joshua?.contraction_score ?? joshuaSummary.contraction_hint,
            missiological_risk: ameaca.joshua?.missiological_risk,
          }
        : ameaca.joshua,
  };

  return {
    ameaca: ameacaEnriched,
    abm:
      (abmRow?.resultado as AmeacaPaisDetail["abm"]) ??
      latest?.simulacoes_abm?.find((s) => s.country_code === upper) ??
      null,
    adversarial:
      (advRow?.payload as AmeacaPaisDetail["adversarial"]) ??
      latest?.adversarial?.find((a) => a.country_code === upper) ??
      null,
    recomendacoes:
      recRows.length > 0
        ? recRows.map((r) => ({
            country_code: r.countryCode ?? undefined,
            urgency: r.urgency as "agora" | "semana" | "mes" | "condicional",
            triggers: (r.triggers as unknown[]) ?? [],
            actions: (r.actions as string[]) ?? [],
            payload: (r.payload as Record<string, unknown>) ?? {},
          }))
        : (latest?.recomendacoes_adaptativas ?? []).filter(
            (r) => r.country_code === upper,
          ),
    provenance: latest?.provenance ?? null,
  };
}

export async function getProvenanceDay(day: string): Promise<ProvenanceDayResponse> {
  const rows = await prisma.provenanceLog.findMany({
    where: { dataReferencia: new Date(day) },
    orderBy: { createdAt: "asc" },
  });

  const entries = rows.map((r) => ({
    stage: r.stage,
    source_hash: r.sourceHash,
    parent_hash: r.parentHash,
    result_hash: r.resultHash,
    merkle_root: r.merkleRoot,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));

  let ok = true;
  let prev: string | null = null;
  for (const e of entries) {
    if (prev !== null && e.parent_hash !== prev && e.stage !== "merkle_root") {
      ok = false;
      break;
    }
    if (e.result_hash) prev = e.result_hash;
  }

  const latest = await getUltimoResultado();
  const payloadProv =
    latest?.data_referencia === day ? latest.provenance ?? null : null;

  return {
    data_referencia: day,
    entries,
    verification: {
      ok,
      stages: entries.length,
      merkle_root: entries.find((e) => e.merkle_root)?.merkle_root ?? null,
    },
    payload_provenance: payloadProv,
  };
}
