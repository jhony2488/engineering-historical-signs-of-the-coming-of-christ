import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

export type JoshuaNormalized = {
  peopleId: string;
  peopleName: string;
  countryCode: string;
  countryName: string | null;
  population: number;
  joshuaScale: number | null;
  primaryLanguage: string | null;
  bibleTranslationStatus: string | null;
  jesusFilmAvailable: boolean;
  audioRecordingsAvailable: boolean;
  percentChristian: number | null;
  percentEvangelical: number | null;
  percentAdherent: number | null;
  sourceUrl: string | null;
  dataHash: string;
};

/** ISO2 → ISO3 for common focus countries; pass-through if already 3 letters. */
const ISO2_TO_ISO3: Record<string, string> = {
  BR: "BRA",
  US: "USA",
  IL: "ISR",
  RU: "RUS",
  CN: "CHN",
  IR: "IRN",
  TR: "TUR",
  DE: "DEU",
  GB: "GBR",
  FR: "FRA",
  AR: "ARG",
  MX: "MEX",
  IN: "IND",
  UA: "UKR",
  SA: "SAU",
  AF: "AFG",
  NG: "NGA",
  EG: "EGY",
  PK: "PAK",
  ID: "IDN",
};

export function toIso3(code: string | null | undefined): string {
  const raw = (code || "UNK").trim().toUpperCase();
  if (raw.length === 3) return raw;
  if (raw.length === 2) return ISO2_TO_ISO3[raw] ?? raw;
  return raw.slice(0, 3);
}

export function hashPayload(obj: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function normalizeJoshuaRecord(raw: Record<string, unknown>): JoshuaNormalized | null {
  const peopleId = String(
    raw.PeopIDInJP ?? raw.peopleId ?? raw.PeopleID ?? raw.ROG3 ?? raw.id ?? "",
  ).trim();
  if (!peopleId) return null;

  const peopleName = String(
    raw.PeopNameInCountry ?? raw.PeopleName ?? raw.peopleName ?? raw.name ?? peopleId,
  ).trim();
  const countryCode = toIso3(
    String(raw.ROG3 ?? raw.Ctry ?? raw.countryCode ?? raw.CountryCode ?? "UNK"),
  );
  const countryName = raw.Ctry
    ? String(raw.Ctry)
    : raw.Country
      ? String(raw.Country)
      : null;
  const population = Math.max(0, Number(raw.Population ?? raw.population ?? 0) || 0);
  const scaleRaw = Number(raw.JPScale ?? raw.joshuaScale ?? raw.LeastReached ?? NaN);
  const joshuaScale =
    Number.isFinite(scaleRaw) && scaleRaw >= 1 && scaleRaw <= 5 ? Math.round(scaleRaw) : null;

  const bibleStatus = String(
    raw.BibleStatus ?? raw.bibleTranslationStatus ?? raw.BibleYear ?? "UNKNOWN",
  ).toUpperCase();
  let bibleTranslationStatus = "NONE";
  if (bibleStatus.includes("COMPLETE") || bibleStatus === "4" || bibleStatus === "5") {
    bibleTranslationStatus = "COMPLETE";
  } else if (bibleStatus.includes("PORTION") || bibleStatus === "2" || bibleStatus === "3") {
    bibleTranslationStatus = "PORTIONS";
  } else if (bibleStatus === "UNKNOWN") {
    bibleTranslationStatus = "UNKNOWN";
  }

  const base = {
    peopleId,
    peopleName,
    countryCode,
    countryName,
    population,
    joshuaScale,
    primaryLanguage: raw.PrimaryLanguageName
      ? String(raw.PrimaryLanguageName)
      : raw.Language
        ? String(raw.Language)
        : null,
    bibleTranslationStatus,
    jesusFilmAvailable: Boolean(raw.JF ?? raw.jesusFilmAvailable ?? false),
    audioRecordingsAvailable: Boolean(raw.AudioRecordings ?? raw.audioRecordingsAvailable ?? false),
    percentChristian: numOrNull(raw.PercentAdherents ?? raw.percentChristian),
    percentEvangelical: numOrNull(raw.PercentEvangelical ?? raw.percentEvangelical),
    percentAdherent: numOrNull(raw.PercentAdherents ?? raw.percentAdherent),
    sourceUrl: raw.URL ? String(raw.URL) : "https://joshuaproject.net",
  };

  return {
    ...base,
    dataHash: hashPayload(base),
  };
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Seed demo rows when API key missing (offline / mock sync). */
export function getJoshuaSeedRecords(): JoshuaNormalized[] {
  const seeds = [
    {
      peopleId: "PG_DEMO_BRA_01",
      peopleName: "Guarani (demo)",
      countryCode: "BRA",
      countryName: "Brasil",
      population: 85000,
      joshuaScale: 3,
      primaryLanguage: "Guarani",
      bibleTranslationStatus: "PORTIONS",
      jesusFilmAvailable: true,
      audioRecordingsAvailable: true,
      percentChristian: 42,
      percentEvangelical: 8,
      percentAdherent: 42,
      sourceUrl: "https://joshuaproject.net",
    },
    {
      peopleId: "PG_DEMO_AFG_01",
      peopleName: "Pashtun (demo)",
      countryCode: "AFG",
      countryName: "Afghanistan",
      population: 450000,
      joshuaScale: 1,
      primaryLanguage: "Pashto",
      bibleTranslationStatus: "NONE",
      jesusFilmAvailable: false,
      audioRecordingsAvailable: true,
      percentChristian: 0.02,
      percentEvangelical: 0.01,
      percentAdherent: 0.02,
      sourceUrl: "https://joshuaproject.net",
    },
    {
      peopleId: "PG_DEMO_CHN_01",
      peopleName: "Hui (demo)",
      countryCode: "CHN",
      countryName: "China",
      population: 11000000,
      joshuaScale: 1,
      primaryLanguage: "Chinese",
      bibleTranslationStatus: "PORTIONS",
      jesusFilmAvailable: false,
      audioRecordingsAvailable: false,
      percentChristian: 0.1,
      percentEvangelical: 0.05,
      percentAdherent: 0.1,
      sourceUrl: "https://joshuaproject.net",
    },
    {
      peopleId: "PG_DEMO_ISR_01",
      peopleName: "Jewish Israeli (demo)",
      countryCode: "ISR",
      countryName: "Israel",
      population: 6500000,
      joshuaScale: 2,
      primaryLanguage: "Hebrew",
      bibleTranslationStatus: "COMPLETE",
      jesusFilmAvailable: true,
      audioRecordingsAvailable: true,
      percentChristian: 1.5,
      percentEvangelical: 0.4,
      percentAdherent: 1.5,
      sourceUrl: "https://joshuaproject.net",
    },
  ];
  return seeds.map((s) => ({ ...s, dataHash: hashPayload(s) }));
}

export async function upsertJoshuaRecords(
  records: JoshuaNormalized[],
): Promise<{ upserted: number }> {
  let upserted = 0;
  for (const r of records) {
    await prisma.joshuaProjectData.upsert({
      where: { peopleId: r.peopleId },
      create: {
        peopleId: r.peopleId,
        peopleName: r.peopleName,
        countryCode: r.countryCode,
        countryName: r.countryName,
        population: r.population,
        joshuaScale: r.joshuaScale,
        primaryLanguage: r.primaryLanguage,
        bibleTranslationStatus: r.bibleTranslationStatus,
        jesusFilmAvailable: r.jesusFilmAvailable,
        audioRecordingsAvailable: r.audioRecordingsAvailable,
        percentChristian: r.percentChristian,
        percentEvangelical: r.percentEvangelical,
        percentAdherent: r.percentAdherent,
        sourceUrl: r.sourceUrl,
        dataHash: r.dataHash,
      },
      update: {
        peopleName: r.peopleName,
        countryCode: r.countryCode,
        countryName: r.countryName,
        population: r.population,
        joshuaScale: r.joshuaScale,
        primaryLanguage: r.primaryLanguage,
        bibleTranslationStatus: r.bibleTranslationStatus,
        jesusFilmAvailable: r.jesusFilmAvailable,
        audioRecordingsAvailable: r.audioRecordingsAvailable,
        percentChristian: r.percentChristian,
        percentEvangelical: r.percentEvangelical,
        percentAdherent: r.percentAdherent,
        sourceUrl: r.sourceUrl,
        dataHash: r.dataHash,
        updatedAt: new Date(),
      },
    });
    upserted += 1;
  }
  return { upserted };
}

export async function fetchJoshuaFromApi(apiKey: string): Promise<JoshuaNormalized[]> {
  const base = "https://api.joshuaproject.net/v1/people_groups.json";
  const out: JoshuaNormalized[] = [];
  let page = 1;
  const maxPages = 5;

  while (page <= maxPages) {
    const url = `${base}?api_key=${encodeURIComponent(apiKey)}&limit=100&page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) break;
    const json = (await res.json()) as unknown;
    const rows = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown }).data)
        ? ((json as { data: unknown[] }).data)
        : [];
    if (!rows.length) break;
    for (const row of rows) {
      if (row && typeof row === "object") {
        const n = normalizeJoshuaRecord(row as Record<string, unknown>);
        if (n) out.push(n);
      }
    }
    if (rows.length < 100) break;
    page += 1;
  }
  return out;
}

export async function queryJoshuaData(opts: {
  country?: string;
  scale?: number;
  limit?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const rows = await prisma.joshuaProjectData.findMany({
    where: {
      ...(opts.country ? { countryCode: opts.country.toUpperCase() } : {}),
      ...(opts.scale ? { joshuaScale: opts.scale } : {}),
    },
    orderBy: [{ joshuaScale: "asc" }, { population: "desc" }],
    take: limit,
  });
  return rows.map((r) => ({
    people_id: r.peopleId,
    people_name: r.peopleName,
    country_code: r.countryCode,
    country_name: r.countryName,
    population: r.population,
    joshua_scale: r.joshuaScale,
    primary_language: r.primaryLanguage,
    bible_translation_status: r.bibleTranslationStatus,
    jesus_film_available: r.jesusFilmAvailable,
    audio_recordings_available: r.audioRecordingsAvailable,
    percent_christian: r.percentChristian,
    percent_evangelical: r.percentEvangelical,
    percent_adherent: r.percentAdherent,
    source_url: r.sourceUrl,
    data_hash: r.dataHash,
    updated_at: r.updatedAt.toISOString(),
  }));
}

export async function getJoshuaCountrySummary(countryCode: string) {
  const code = countryCode.toUpperCase();
  const rows = await prisma.joshuaProjectData.findMany({
    where: { countryCode: code },
    take: 100,
  });
  if (!rows.length) return null;
  const scales = rows.map((r) => r.joshuaScale ?? 3);
  const avgScale = scales.reduce((a, b) => a + b, 0) / scales.length;
  const unreached = rows.filter((r) => (r.joshuaScale ?? 5) <= 2).length;
  return {
    country_code: code,
    peoples_count: rows.length,
    avg_joshua_scale: Math.round(avgScale * 10) / 10,
    unreached_count: unreached,
    expansion_hint: avgScale >= 3.5 ? 0.55 : 0.25,
    contraction_hint: avgScale <= 2 ? 0.7 : 0.35,
  };
}
