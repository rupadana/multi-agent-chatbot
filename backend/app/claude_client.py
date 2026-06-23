"""Wrapper tipis di atas Anthropic SDK untuk streaming jawaban Claude."""

from collections.abc import Iterator

import anthropic

from .config import get_settings

settings = get_settings()

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY belum diset. Salin backend/.env.example menjadi "
                "backend/.env lalu isi API key kamu."
            )
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def stream_chat(
    *,
    model: str,
    system_prompt: str,
    messages: list[dict[str, str]],
) -> Iterator[str]:
    """Stream potongan teks jawaban dari Claude.

    Menggunakan adaptive thinking sesuai rekomendasi untuk model Claude 4.6+ dan
    streaming agar tidak terkena timeout pada jawaban panjang.
    """
    client = get_client()
    with client.messages.stream(
        model=model or settings.claude_model,
        max_tokens=4096,
        system=system_prompt,
        thinking={"type": "adaptive"},
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text
