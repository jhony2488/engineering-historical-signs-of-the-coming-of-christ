import type { RankingCandidato } from "./types";

function mar(
  pos: number,
  id: string,
  nome: string,
  pap: number,
  tendencia: number,
  fator: string,
): RankingCandidato {
  return {
    posicao: pos,
    candidato_id: id,
    nome,
    personagem: "besta_mar",
    probabilidade_atual: pap,
    tendencia_24h: tendencia,
    fator_principal: fator,
  };
}

function terra(
  pos: number,
  id: string,
  nome: string,
  pap: number,
  tendencia: number,
  fator: string,
): RankingCandidato {
  return {
    posicao: pos,
    candidato_id: id,
    nome,
    personagem: "besta_terra",
    probabilidade_atual: pap,
    tendencia_24h: tendencia,
    fator_principal: fator,
  };
}

function fl(
  pos: number,
  id: string,
  nome: string,
  pap: number,
  tendencia: number,
  fator: string,
): RankingCandidato {
  return {
    posicao: pos,
    candidato_id: id,
    nome,
    personagem: "falso_lider",
    probabilidade_atual: pap,
    tendencia_24h: tendencia,
    fator_principal: fator,
  };
}

export const MOCK_RANKING_MAR: RankingCandidato[] = [
  mar(1, "cand-mar-001", "Coalizão de Mediação Global", 72.1, 2.1, "Destaque em influencia_unificacao"),
  mar(2, "cand-mar-002", "Líder de Estabilidade Regional", 68.4, -0.5, "Destaque em carisma_global"),
  mar(3, "cand-mar-003", "Fórum de Reconciliação do Oriente Médio", 65.2, 1.3, "Destaque em influencia_unificacao"),
  mar(4, "cand-mar-004", "Bloco de Governança Transnacional", 61.8, 0.4, "Destaque em centralizacao_estrutural"),
  mar(5, "cand-mar-005", "Iniciativa de Paz Unificada", 58.6, -1.1, "Destaque em carisma_global"),
  mar(6, "cand-mar-006", "Conselho de Estabilidade Financeira Global", 55.3, 0.9, "Destaque em centralizacao_estrutural"),
  mar(7, "cand-mar-007", "Arquiteto do Novo Ordem Econômica", 52.7, 1.6, "Destaque em divergencia_valores"),
  mar(8, "cand-mar-008", "Mediador de Crises Multilaterais", 49.1, -0.8, "Destaque em carisma_global"),
  mar(9, "cand-mar-009", "Coalizão de Resposta Humanitária Unificada", 46.4, 0.2, "Destaque em carisma_global"),
  mar(10, "cand-mar-010", "Eixo de Mediação Euro-Asiático", 42.0, -0.3, "Destaque em influencia_unificacao"),
];

export const MOCK_RANKING_TERRA: RankingCandidato[] = [
  terra(1, "cand-terra-001", "Plataforma de Narrativa Unificada", 68.5, 1.2, "Destaque em monopolio_narrativa"),
  terra(2, "cand-terra-002", "Consórcio de IA Global", 64.8, 0.8, "Destaque em prodigios_tecnologicos"),
  terra(3, "cand-terra-003", "Rede de Verificação de Conteúdo Planetária", 61.2, 1.5, "Destaque em monopolio_narrativa"),
  terra(4, "cand-terra-004", "Instituto de Sincronização Ideológica", 57.9, -0.4, "Destaque em validacao_lider"),
  terra(5, "cand-terra-005", "Aliança de Plataformas Digitais Globais", 55.1, 0.6, "Destaque em monopolio_narrativa"),
  terra(6, "cand-terra-006", "Projeto Sentinela de Conformidade Social", 51.4, -1.0, "Destaque em monopolio_narrativa"),
  terra(7, "cand-terra-007", "Laboratório de Experiências Imersivas Sagradas", 48.6, 2.0, "Destaque em prodigios_tecnologicos"),
  terra(8, "cand-terra-008", "Hub de Inteligência Narrativa Central", 45.3, 0.1, "Destaque em validacao_lider"),
  terra(9, "cand-terra-009", "Consórcio de Biometria e Identidade Universal", 41.7, -0.6, "Destaque em prodigios_tecnologicos"),
  terra(10, "cand-terra-010", "Movimento de Unificação Espiritual Sintética", 38.2, 0.3, "Destaque em monopolio_narrativa"),
];

export const MOCK_RANKING_FALSO_LIDER: RankingCandidato[] = [
  fl(1, "cand-fl-001", "Líder Carismático de Reconciliação Global", 71.3, 3.2, "Destaque em expansao_discurso"),
  fl(2, "cand-fl-002", "Movimento de Paz Espiritual Unificada", 67.8, 1.5, "Destaque em incongruencia_estrutural"),
  fl(3, "cand-fl-003", "Rede de Influência Religiosa Transnacional", 63.4, 2.1, "Destaque em expansao_discurso"),
  fl(4, "cand-fl-004", "Consórcio de Liderança Espiritual Digital", 59.9, -0.7, "Destaque em contracao_estrutura"),
  fl(5, "cand-fl-005", "Instituto de Síntese Religiosa Mundial", 56.1, 1.0, "Destaque em expansao_discurso"),
  fl(6, "cand-fl-006", "Plataforma de Unificação Espiritual IA", 52.4, -1.4, "Destaque em incongruencia_estrutural"),
  fl(7, "cand-fl-007", "Aliança de Líderes Espirituais Globais", 48.7, 0.8, "Destaque em contracao_estrutura"),
  fl(8, "cand-fl-008", "Centro de Narrativa Sagrada Unificada", 44.2, 0.4, "Destaque em expansao_discurso"),
  fl(9, "cand-fl-009", "Fórum Interreligioso de Governança Global", 40.6, -0.2, "Destaque em contracao_estrutura"),
  fl(10, "cand-fl-010", "Coalizão de Mediação Espiritual e Política", 36.9, 0.6, "Destaque em incongruencia_estrutural"),
];
