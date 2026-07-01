"""Menghasilkan jawaban agent secara non-streaming.

Dipakai oleh integrasi (WhatsApp/Telegram) yang butuh teks balasan utuh, bukan
stream SSE. Logikanya konsisten dengan endpoint chat: guardrail input, retrieval
knowledge base, augmentasi system prompt, lalu cek guardrail output.
"""

from sqlmodel import Session, select

from . import guardrails
from .llm_client import stream_chat
from .models import Agent, Document
from .rag import build_system_prompt, retrieve_context


def generate_reply(session: Session, agent: Agent, user_text: str) -> dict:
    """Kembalikan {"text", "blocked", "reason"} untuk satu pesan pengguna."""
    g_enabled = agent.guardrails_enabled
    keywords = guardrails.parse_keywords(agent.blocked_keywords) if g_enabled else []
    refusal = (
        agent.refusal_message
        or "Maaf, saya tidak dapat membantu permintaan tersebut."
    )

    # Guardrail input.
    if g_enabled:
        reason = guardrails.check_input(
            user_text, keywords=keywords, max_input_chars=agent.max_input_chars
        )
        if reason:
            return {"text": refusal, "blocked": True, "reason": reason}

    # Retrieval knowledge base.
    documents = session.exec(
        select(Document).where(Document.agent_id == agent.id)
    ).all()
    context = retrieve_context(documents, user_text)
    system_prompt = build_system_prompt(agent.system_prompt, context)
    if g_enabled:
        system_prompt = guardrails.augment_system_prompt(
            system_prompt, agent.guardrail_instructions
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text},
    ]

    full = ""
    for chunk in stream_chat(
        base_url=agent.base_url,
        api_key=agent.api_key,
        model=agent.model,
        messages=messages,
    ):
        full += chunk

    # Guardrail output.
    if g_enabled and keywords:
        hit = guardrails.first_blocked_keyword(full, keywords)
        if hit:
            return {
                "text": refusal,
                "blocked": True,
                "reason": f'Output mengandung kata terlarang: "{hit}".',
            }

    return {"text": full or refusal, "blocked": False, "reason": None}
