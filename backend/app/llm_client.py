"""Wrapper tipis di atas OpenAI SDK untuk streaming jawaban.

Mendukung semua endpoint yang OpenAI-compatible (OpenAI, OpenRouter, Together,
Ollama, LM Studio, vLLM, dll). Base URL, API key, dan model bisa diatur secara
global lewat environment, atau dioverride per-agent.
"""

from collections.abc import Iterator

from openai import OpenAI

from .config import get_settings

settings = get_settings()


def resolve(base_url: str | None, api_key: str | None, model: str | None):
    """Gabungkan konfigurasi agent dengan default global."""
    return (
        base_url or settings.llm_base_url,
        api_key or settings.llm_api_key,
        model or settings.llm_model,
    )


def stream_chat(
    *,
    base_url: str | None,
    api_key: str | None,
    model: str | None,
    messages: list[dict[str, str]],
) -> Iterator[str]:
    """Stream potongan teks jawaban dari endpoint OpenAI-compatible."""
    url, key, mdl = resolve(base_url, api_key, model)
    if not key:
        raise RuntimeError(
            "API key belum diset. Atur LLM_API_KEY di backend/.env, atau isi "
            "API key pada pengaturan agent."
        )

    client = OpenAI(base_url=url, api_key=key)
    stream = client.chat.completions.create(
        model=mdl,
        messages=messages,
        stream=True,
    )
    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
