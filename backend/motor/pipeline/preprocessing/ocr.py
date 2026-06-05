from __future__ import annotations

from pathlib import Path


def extract_text_from_pdf(path: Path) -> str:
    """OCR/extração de PDF via PyMuPDF (opcional — extra pdf)."""
    try:
        import fitz  # pymupdf
    except ImportError:
        return ""
    try:
        doc = fitz.open(path)
        parts = [page.get_text() for page in doc]
        doc.close()
        return "\n".join(parts).strip()
    except Exception:
        return ""


def extract_text_from_image(path: Path) -> str:
    """OCR de imagem via pytesseract (opcional)."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return ""
    try:
        return pytesseract.image_to_string(Image.open(path), lang="por+eng").strip()
    except Exception:
        return ""
