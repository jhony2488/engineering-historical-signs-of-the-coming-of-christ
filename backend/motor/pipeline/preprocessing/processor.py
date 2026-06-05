from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from bs4 import BeautifulSoup

from motor.pipeline.preprocessing.nlp_enrich import enrich_topics

try:
    from langdetect import detect
except ImportError:
    detect = None


@dataclass
class ProcessedChunk:
    documento_id: str
    indice: int
    texto: str
    idioma: str
    topicos: list[str]


class Preprocessor:
    CHUNK_SIZE = 800
    OVERLAP = 80

    def clean_text(self, text: str) -> str:
        if "<" in text and ">" in text:
            text = BeautifulSoup(text, "html.parser").get_text(" ")
        text = unicodedata.normalize("NFKC", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def detect_language(self, text: str) -> str:
        if not detect or len(text) < 20:
            return "unknown"
        try:
            return detect(text)
        except Exception:
            return "unknown"

    def infer_topics(self, text: str) -> list[str]:
        lower = text.lower()
        topics = []
        mapping = {
            "oriente_medio": ["middle east", "oriente", "israel", "gaza", "iran"],
            "tecnologia": ["cbdc", "digital", "biometr", "surveillance", "ai"],
            "religiao": ["church", "igreja", "faith", "fe", "gospel", "apostasia"],
            "conflito": ["war", "guerra", "conflict", "military"],
        }
        for topic, keywords in mapping.items():
            if any(k in lower for k in keywords):
                topics.append(topic)
        return topics or ["geral"]

    def chunk(self, text: str) -> list[str]:
        if len(text) <= self.CHUNK_SIZE:
            return [text]
        chunks = []
        start = 0
        while start < len(text):
            end = min(len(text), start + self.CHUNK_SIZE)
            chunks.append(text[start:end])
            if end >= len(text):
                break
            start = end - self.OVERLAP
        return chunks

    def process_document(self, documento_id: str, raw_text: str) -> list[ProcessedChunk]:
        cleaned = self.clean_text(raw_text)
        lang = self.detect_language(cleaned)
        topics = enrich_topics(cleaned, self.infer_topics(cleaned))
        return [
            ProcessedChunk(
                documento_id=documento_id,
                indice=i,
                texto=chunk,
                idioma=lang,
                topicos=topics,
            )
            for i, chunk in enumerate(self.chunk(cleaned))
        ]

    def persist(self, db, chunks: list[ProcessedChunk]) -> list[dict]:
        rows = []
        for chunk in chunks:
            row = db.insert(
                "trechos_processados",
                {
                    "documento_id": chunk.documento_id,
                    "indice": chunk.indice,
                    "texto": chunk.texto,
                    "idioma": chunk.idioma,
                    "topicos": chunk.topicos,
                },
            )
            rows.append(row)
        return rows
