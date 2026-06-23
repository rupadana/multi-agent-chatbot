"""Retrieval knowledge base sederhana tanpa dependensi eksternal.

Pendekatan: dokumen dipotong menjadi beberapa chunk, lalu setiap chunk diberi
skor berdasarkan irisan kata (term overlap) dengan pertanyaan pengguna. Chunk
dengan skor tertinggi dipakai sebagai konteks untuk model. Cara ini cukup baik
untuk knowledge base berukuran kecil-menengah dan tidak membutuhkan API embedding.
"""

import math
import re
from collections import Counter

from .models import Document

_WORD_RE = re.compile(r"\w+", re.UNICODE)
# Stopword umum (Indonesia + Inggris) agar skoring tidak bias ke kata fungsi.
_STOPWORDS = {
    "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah",
    "ini", "itu", "atau", "juga", "akan", "dalam", "tidak", "ada", "saya",
    "the", "a", "an", "is", "are", "to", "of", "and", "or", "in", "on",
    "for", "with", "this", "that", "it", "as", "be", "by",
}


def _tokenize(text: str) -> list[str]:
    return [t for t in _WORD_RE.findall(text.lower()) if t not in _STOPWORDS]


def _chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
    """Potong teks per-paragraf, gabungkan hingga mendekati chunk_size."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 1 <= chunk_size:
            current = f"{current}\n{para}".strip()
        else:
            if current:
                chunks.append(current)
            # Paragraf yang lebih panjang dari chunk_size dipotong paksa.
            if len(para) > chunk_size:
                start = 0
                while start < len(para):
                    chunks.append(para[start : start + chunk_size])
                    start += chunk_size - overlap
                current = ""
            else:
                current = para
    if current:
        chunks.append(current)
    return chunks or ([text] if text.strip() else [])


def retrieve_context(
    documents: list[Document], query: str, top_k: int = 4
) -> list[tuple[str, str]]:
    """Kembalikan daftar (judul, potongan teks) paling relevan dengan query.

    Mengembalikan list kosong jika tidak ada knowledge base atau tidak ada irisan
    kata sama sekali.
    """
    query_terms = Counter(_tokenize(query))
    if not query_terms or not documents:
        return []

    scored: list[tuple[float, str, str]] = []
    for doc in documents:
        for chunk in _chunk_text(doc.content):
            chunk_terms = Counter(_tokenize(chunk))
            if not chunk_terms:
                continue
            # Skor = jumlah bobot kata query yang muncul, dinormalisasi panjang chunk.
            overlap = sum(
                min(count, chunk_terms[term]) for term, count in query_terms.items()
            )
            if overlap == 0:
                continue
            score = overlap / math.sqrt(len(chunk_terms))
            scored.append((score, doc.title, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [(title, chunk) for _, title, chunk in scored[:top_k]]


def build_system_prompt(base_prompt: str, context: list[tuple[str, str]]) -> str:
    """Gabungkan system prompt agent dengan konteks knowledge base."""
    if not context:
        return base_prompt

    blocks = []
    for i, (title, chunk) in enumerate(context, start=1):
        blocks.append(f"[Sumber {i} — {title}]\n{chunk}")
    knowledge = "\n\n".join(blocks)

    return (
        f"{base_prompt}\n\n"
        "Gunakan informasi dari knowledge base berikut bila relevan untuk "
        "menjawab pertanyaan pengguna. Jika jawaban tidak ada di knowledge base, "
        "katakan dengan jujur dan jawab sebaik mungkin berdasarkan pengetahuan umum.\n\n"
        "===== KNOWLEDGE BASE =====\n"
        f"{knowledge}\n"
        "==========================="
    )
