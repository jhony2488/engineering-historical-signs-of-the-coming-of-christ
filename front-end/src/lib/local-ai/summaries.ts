import type { EventoEstruturado, RankingCandidato, ResultadoEscatologico } from "@/lib/types";

/** Bump quando os templates mudarem — invalida resumos cacheados no IDB. */
export const LOCAL_AI_PROMPT_VERSION = "1";

export const LOCAL_AI_DISCLAIMER =
  "Síntese gerada por IA — não é a saída oficial do motor.";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM =
  "Você resume dados de um painel analítico de sinais históricos. " +
  "Escreva em português claro, 2 a 4 frases. Regras: nunca preveja datas; " +
  "nunca afirme cumprimento de profecia; trate tudo como análise probabilística. " +
  "Responda apenas com o resumo, sem títulos nem listas.";

export function resumoDiaPrompt(r: ResultadoEscatologico): Msg[] {
  const fase = r.fase_atual.replace("FASE_", "");
  const top = [
    ...r.ranking_mar.slice(0, 3).map((c) => `${c.nome} (mar, ${c.probabilidade_atual.toFixed(1)}%)`),
    ...r.ranking_terra.slice(0, 3).map((c) => `${c.nome} (terra, ${c.probabilidade_atual.toFixed(1)}%)`),
  ].join("; ");
  const eventos = r.eventos_analisados
    .slice(0, 5)
    .map((e) => `${e.evento.replace(/_/g, " ")} em ${e.regiao}`)
    .join("; ");
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `Resuma o resultado do dia ${r.data_referencia}: fase ${fase}, ` +
        `índice global ${(r.indice_global * 100).toFixed(1)}%, ` +
        `confiança ${(r.confianca * 100).toFixed(0)}%. ` +
        (top ? `Candidatos em destaque: ${top}. ` : "") +
        (eventos ? `Eventos: ${eventos}.` : ""),
    },
  ];
}

export function explicaCandidatoPrompt(c: RankingCandidato): Msg[] {
  const personagem = c.personagem.replace(/_/g, " ");
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `Explique em linguagem simples por que ${c.nome} está em ${c.posicao}º ` +
        `no ranking de "${personagem}" com probabilidade ${c.probabilidade_atual.toFixed(1)}% ` +
        `e tendência de ${c.tendencia_24h >= 0 ? "+" : ""}${c.tendencia_24h.toFixed(1)}% em 24h. ` +
        `Fator principal: ${c.fator_principal}.`,
    },
  ];
}

export function resumeEventosPrompt(eventos: EventoEstruturado[]): Msg[] {
  const lista = eventos
    .slice(0, 10)
    .map(
      (e) =>
        `- ${e.evento.replace(/_/g, " ")} (${e.regiao}, ${e.dimensao}, ` +
        `tensão ${(e.grau_tensao * 100).toFixed(0)}%)`,
    )
    .join("\n");
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Sintetize os eventos das últimas 24h em um parágrafo:\n${lista}`,
    },
  ];
}

export function perguntaPrompt(contexto: ResultadoEscatologico, pergunta: string): Msg[] {
  const topMar = contexto.ranking_mar
    .slice(0, 3)
    .map((c) => `${c.posicao}º ${c.nome} (${c.probabilidade_atual.toFixed(1)}%)`)
    .join(", ");
  const topTerra = contexto.ranking_terra
    .slice(0, 3)
    .map((c) => `${c.posicao}º ${c.nome} (${c.probabilidade_atual.toFixed(1)}%)`)
    .join(", ");
  const eventos = contexto.eventos_analisados
    .slice(0, 8)
    .map((e) => `${e.evento.replace(/_/g, " ")} em ${e.regiao}`)
    .join("; ");
  return [
    {
      role: "system",
      content:
        SYSTEM +
        " Responda somente com base nos dados fornecidos; se não houver dados, diga isso.",
    },
    {
      role: "user",
      content:
        `Dados do painel (dia ${contexto.data_referencia}): fase ` +
        `${contexto.fase_atual.replace("FASE_", "")}, índice ` +
        `${(contexto.indice_global * 100).toFixed(1)}%, confiança ` +
        `${(contexto.confianca * 100).toFixed(0)}%. ` +
        (topMar ? `Ranking mar: ${topMar}. ` : "") +
        (topTerra ? `Ranking terra: ${topTerra}. ` : "") +
        (eventos ? `Eventos: ${eventos}. ` : "") +
        `\nPergunta: ${pergunta.slice(0, 400)}`,
    },
  ];
}

/** Chave de cache estável para outputs gerados (sha256 → hex). */
export async function hashOutputKey(kind: string, input: string): Promise<string> {
  const raw = `${LOCAL_AI_PROMPT_VERSION}|${kind}|${input}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw),
    );
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
  return `djb2-${(h >>> 0).toString(16)}`;
}
