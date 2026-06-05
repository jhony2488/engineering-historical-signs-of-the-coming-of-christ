from __future__ import annotations

import json
from typing import Any

import structlog
from groq import Groq

from motor.config import get_settings

logger = structlog.get_logger()


class GroqClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.groq_api_key
        self._client = Groq(api_key=self._api_key) if self._api_key else None

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def complete(
        self,
        model: str,
        messages: list[dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.2,
    ) -> str:
        settings = get_settings()
        if settings.llm_dry_run or not self._client:
            return self._dry_run_response(messages, json_mode)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = self._client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    def _dry_run_response(self, messages: list[dict[str, str]], json_mode: bool) -> str:
        user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        if json_mode:
            if "evento" in user.lower() or "extraia" in user.lower():
                return json.dumps(
                    {
                        "evento": "conflito_militar",
                        "regiao": "oriente_medio",
                        "grau_tensao": 0.72,
                        "impacto_global": 0.65,
                        "energia": "contracao",
                        "dimensao": "macro",
                        "descricao": "Simulação dry-run",
                    }
                )
            if "linha_temporal" in user.lower() or "cronologia" in user.lower():
                return json.dumps(
                    {
                        "linha_temporal": {
                            "periodo": "24h",
                            "eventos_chave": ["tensao_oriente_medio"],
                        },
                        "comparacao_7d": "Aumento gradual de tensão geopolítica.",
                    }
                )
            if "fase" in user.lower() or "raciocinio" in user.lower():
                return json.dumps(
                    {
                        "pontuacao_logica": 0.68,
                        "fase_sugerida": "FASE_II",
                        "raciocinio": "Convergência parcial de sinais macro e micro.",
                    }
                )
            if "padrões" in user.lower() or "padroes" in user.lower() or "variação" in user.lower():
                return json.dumps(
                    {
                        "padroes": ["Aceleração gradual na Fase II"],
                        "aceleracao_fase": True,
                        "resumo": "Deriva positiva do índice global na janela analisada.",
                    }
                )
            if "híbrida" in user.lower() or "hibrida" in user.lower() or "panorama" in user.lower():
                return json.dumps(
                    {
                        "panorama": "Panorama híbrido simulado: convergência multi-janela sugere transição cautelosa.",
                        "aceleracao_transicao": True,
                        "fase_emergente": "FASE_II",
                        "conviccao_panorama": 0.62,
                        "padroes_cruzados": ["Semanal alinha com mensal"],
                        "conexoes_janelas": [],
                        "alertas": [],
                        "citacoes_rag": ["Mt 24:6-7"],
                        "marco_zero_deslocamento": 0.18,
                        "aderencia_profetica": 0.58,
                    }
                )
            return json.dumps(
                {
                    "aderencia_profetica": 0.55,
                    "similaridades": ["Aumento de conflitos regionais"],
                    "divergencias": ["Sem sinais astronômicos definitivos"],
                    "citacoes": ["Mt 24:6-7"],
                }
            )
        return "Resposta simulada (LLM_DRY_RUN=true)."


class GroqError(Exception):
    pass
