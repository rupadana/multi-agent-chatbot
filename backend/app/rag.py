"""Retrieval knowledge base sederhana tanpa dependensi eksternal.

Pendekatan: dokumen dipotong menjadi beberapa chunk, lalu setiap chunk diberi
skor berdasarkan irisan kata (term overlap) dengan pertanyaan pengguna. Chunk
dengan skor tertinggi dipakai sebagai konteks untuk model. Cara ini cukup baik
untuk knowledge base berukuran kecil-menengah dan tidak membutuhkan API embedding.
"""

import math
import re
from collections import Counter

from openai import OpenAI

from .llm_client import resolve
from .models import Document

_WORD_RE = re.compile(r"\w+", re.UNICODE)
# Stopword umum (Indonesia + Inggris) agar skoring tidak bias ke kata fungsi.
_STOPWORDS = {
    "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah",
    "ini", "itu", "atau", "juga", "akan", "dalam", "tidak", "ada", "saya",
    "the", "a", "an", "is", "are", "to", "of", "and", "or", "in", "on",
    "for", "with", "this", "that", "it", "as", "be", "by",
    "masih", "mau", "ya", "kok", "gimana", "gmn", "saja", "sih", "dong",
    "kah", "lah", "tapi", "kalau", "kalo", "jika", "ingin", "bisa", "boleh",
    "apakah", "bagaimana", "kenapa", "mengapa", "ada", "adalah", "itu", "ini"
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


def _expand_query(
    query: str,
    base_url: str | None,
    api_key: str | None,
    model: str | None,
) -> str:
    """Gunakan LLM secara sinkron untuk menghasilkan variasi kata kunci dan sinonim pencarian."""
    url, key, mdl = resolve(base_url, api_key, model)
    if not key:
        return query

    clean_words = _tokenize(query)
    if not clean_words:
        return query

    try:
        client = OpenAI(base_url=url, api_key=key)
        prompt = f"tuliskan beberapa kata sinonim dari kata-kata berikut (sebutkan juga kata dasarnya tanpa akhiran/imbuhan): {', '.join(clean_words)}"
        response = client.chat.completions.create(
            model=mdl,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.1,
        )
        expanded = response.choices[0].message.content
        if expanded:
            expanded_cleaned = expanded.strip().strip('"').strip("'")
            return f"{query}, {expanded_cleaned}"
    except Exception as e:
        print(f"Gagal melakukan query expansion: {e}")
    
    return query


def retrieve_context(
    documents: list[Document],
    query: str,
    agent_base_url: str | None = None,
    agent_api_key: str | None = None,
    agent_model: str | None = None,
    top_k: int = 4,
) -> list[tuple[str, str]]:
    """Kembalikan daftar (judul, potongan teks) paling relevan dengan query.

    Menggunakan AI Query Expansion jika agent_api_key disediakan untuk mengatasi gap semantik (sinonim).
    """
    if not documents:
        return []

    # Lakukan ekspansi kueri jika konfigurasi API tersedia
    final_query = query
    if agent_api_key:
        final_query = _expand_query(query, agent_base_url, agent_api_key, agent_model)

    query_terms = Counter(_tokenize(final_query))
    if not query_terms:
        return []

    scored: list[tuple[float, str, str]] = []
    for doc in documents:
        for chunk in _chunk_text(doc.content):
            # Gabungkan judul dan potongan konten agar judul ikut dicocokkan kata kuncinya.
            combined_text = f"{doc.title} {chunk}"
            chunk_terms = Counter(_tokenize(combined_text))
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
