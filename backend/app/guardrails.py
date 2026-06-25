"""Guardrails sederhana yang bisa dikonfigurasi per-agent.

Tiga lapis proteksi, semuanya berjalan lokal tanpa panggilan LLM tambahan:

1. Cek input pengguna  -> blokir kata/frasa terlarang & batas panjang.
2. Penguatan system prompt -> suntik aturan tambahan (mis. batasan topik).
3. Cek output model -> hentikan & ganti jawaban bila mengandung kata terlarang.
"""

import re


def parse_keywords(raw: str) -> list[str]:
    """Pecah daftar kata terlarang (dipisah baris baru atau koma)."""
    if not raw:
        return []
    parts = re.split(r"[\n,]+", raw)
    return [p.strip().lower() for p in parts if p.strip()]


def _contains(text: str, keywords: list[str]) -> str | None:
    """Kembalikan kata terlarang pertama yang ditemukan (sebagai kata utuh), atau None."""
    lowered = text.lower()
    for kw in keywords:
        if kw:
            pattern = re.compile(rf"\b{re.escape(kw.lower())}\b")
            if pattern.search(lowered):
                return kw
    return None


def check_input(
    text: str, *, keywords: list[str], max_input_chars: int
) -> str | None:
    """Validasi pesan pengguna. Kembalikan alasan blokir, atau None bila aman."""
    if max_input_chars and len(text) > max_input_chars:
        return f"Pesan melebihi batas {max_input_chars} karakter."
    kw = _contains(text, keywords)
    if kw:
        return f"Mengandung kata/frasa terlarang: \"{kw}\"."
    return None


def first_blocked_keyword(text: str, keywords: list[str]) -> str | None:
    """Untuk pengecekan output: cari kata terlarang pertama di teks."""
    return _contains(text, keywords)


def augment_system_prompt(base_prompt: str, instructions: str) -> str:
    """Tambahkan aturan guardrail ke system prompt agent."""
    if not instructions.strip():
        return base_prompt
    return (
        f"{base_prompt}\n\n"
        "===== ATURAN & BATASAN (WAJIB DIPATUHI) =====\n"
        f"{instructions.strip()}\n"
        "Jika pengguna meminta sesuatu di luar aturan ini, tolak dengan sopan.\n"
        "============================================="
    )
