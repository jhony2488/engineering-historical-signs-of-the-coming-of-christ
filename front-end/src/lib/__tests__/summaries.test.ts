import { describe, expect, it } from "vitest";

import {
  explicaCandidatoPrompt,
  hashOutputKey,
  perguntaPrompt,
  resumeEventosPrompt,
  resumoDiaPrompt,
} from "@/lib/local-ai/summaries";
import type { EventoEstruturado, RankingCandidato, ResultadoEscatologico } from "@/lib/types";

const RESULTADO = {
  schema_version: "1",
  data_referencia: "2026-10-02",
  fase_atual: "FASE_II",
  probabilidade_fase: 0.6,
  indice_global: 0.412,
  confianca: 0.8,
  correlacao: {},
  eventos_analisados: [],
  metricas: {},
  ranking_mar: [
    {
      posicao: 1,
      candidato_id: "c1",
      nome: "Candidato X",
      personagem: "besta_mar",
      probabilidade_atual: 23.4,
      tendencia_24h: 1.2,
      fator_principal: "discurso de controle",
    },
  ],
  ranking_terra: [],
} as unknown as ResultadoEscatologico;

const CANDIDATO = RESULTADO.ranking_mar[0] as RankingCandidato;
const EVENTOS: EventoEstruturado[] = [
  {
    evento: "conflito_armado",
    regiao: "Oriente Médio",
    grau_tensao: 0.8,
    impacto_global: 0.6,
    energia: "contracao",
    dimensao: "macro",
  },
];

describe("prompts de síntese", () => {
  it("resumoDiaPrompt inclui fase, índice e candidato", () => {
    const msgs = resumoDiaPrompt(RESULTADO);
    const user = msgs.find((m) => m.role === "user")!.content;
    expect(user).toContain("2026-10-02");
    expect(user).toContain("Candidato X");
    expect(msgs[0].role).toBe("system");
  });

  it("explicaCandidatoPrompt cita probabilidade e fator", () => {
    const user = explicaCandidatoPrompt(CANDIDATO).find((m) => m.role === "user")!.content;
    expect(user).toContain("Candidato X");
    expect(user).toContain("23.4%");
    expect(user).toContain("discurso de controle");
  });

  it("resumeEventosPrompt lista eventos", () => {
    const user = resumeEventosPrompt(EVENTOS).find((m) => m.role === "user")!.content;
    expect(user).toContain("conflito armado");
    expect(user).toContain("Oriente Médio");
  });

  it("perguntaPrompt injeta contexto + pergunta", () => {
    const user = perguntaPrompt(RESULTADO, "o que é a fase II?").find(
      (m) => m.role === "user",
    )!.content;
    expect(user).toContain("fase II");
    expect(user).toContain("o que é a fase II?");
  });

  it("system prompt proíbe datas e predição", () => {
    const sys = resumoDiaPrompt(RESULTADO)[0].content;
    expect(sys).toContain("nunca preveja datas");
  });
});

describe("hashOutputKey", () => {
  it("é estável e distingue inputs", async () => {
    const a = await hashOutputKey("resumo-dia", "x");
    const a2 = await hashOutputKey("resumo-dia", "x");
    const b = await hashOutputKey("resumo-dia", "y");
    const c = await hashOutputKey("outro", "x");
    expect(a).toBe(a2);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
