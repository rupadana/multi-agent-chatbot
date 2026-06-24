import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from .. import guardrails
from ..database import get_session
from ..deps import get_current_user
from ..llm_client import stream_chat
from ..models import Document, User
from ..rag import build_system_prompt, retrieve_context
from ..schemas import ChatRequest
from .agents import get_agent_or_404

router = APIRouter(prefix="/api/agents/{agent_id}/chat", tags=["chat"])


def _sse(event: str, data: dict) -> str:
    """Format satu pesan Server-Sent Events."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("")
def chat(
    agent_id: int,
    payload: ChatRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    agent = get_agent_or_404(agent_id, session, user)

    if payload.messages[-1].role != "user":
        raise HTTPException(
            status_code=400, detail="Pesan terakhir harus berasal dari user."
        )

    last_user_message = payload.messages[-1].content

    # ---- Guardrails: konfigurasi ----
    g_enabled = agent.guardrails_enabled
    keywords = guardrails.parse_keywords(agent.blocked_keywords) if g_enabled else []
    refusal = agent.refusal_message or "Maaf, saya tidak dapat membantu permintaan tersebut."

    # ---- Guardrails: cek input sebelum memanggil LLM ----
    if g_enabled:
        reason = guardrails.check_input(
            last_user_message,
            keywords=keywords,
            max_input_chars=agent.max_input_chars,
        )
        if reason:
            def blocked_stream():
                yield _sse("sources", {"sources": []})
                yield _sse(
                    "guardrail",
                    {"stage": "input", "reason": reason, "message": refusal},
                )
                yield _sse("done", {})

            return StreamingResponse(blocked_stream(), media_type="text/event-stream")

    # Ambil knowledge base lalu cari konteks relevan untuk pertanyaan terakhir.
    documents: list[Document] = session.exec(
        select(Document).where(Document.agent_id == agent_id)
    ).all()
    context = retrieve_context(documents, last_user_message)
    system_prompt = build_system_prompt(agent.system_prompt, context)

    # Guardrails: suntik aturan tambahan ke system prompt.
    if g_enabled:
        system_prompt = guardrails.augment_system_prompt(
            system_prompt, agent.guardrail_instructions
        )

    # Format OpenAI: system prompt menjadi pesan pertama dalam daftar messages.
    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in payload.messages]
    sources = [{"title": title, "excerpt": chunk} for title, chunk in context]

    def event_stream():
        # Kirim sumber knowledge base yang dipakai lebih dulu.
        yield _sse("sources", {"sources": sources})

        # Hold-back buffer agar kata terlarang tak sempat ter-stream walau
        # terpotong antar-chunk. `keep` = panjang kata terlarang terpanjang.
        keep = max((len(k) for k in keywords), default=0)
        full = ""
        pending = ""
        blocked = False
        try:
            for chunk in stream_chat(
                base_url=agent.base_url,
                api_key=agent.api_key,
                model=agent.model,
                messages=messages,
            ):
                if not keywords:
                    yield _sse("delta", {"text": chunk})
                    continue

                full += chunk
                hit = guardrails.first_blocked_keyword(full, keywords)
                if hit:
                    blocked = True
                    yield _sse(
                        "guardrail",
                        {
                            "stage": "output",
                            "reason": f"Output mengandung kata terlarang: \"{hit}\".",
                            "message": refusal,
                        },
                    )
                    break

                pending += chunk
                if len(pending) > keep:
                    safe = pending[:-keep] if keep else pending
                    pending = pending[-keep:] if keep else ""
                    if safe:
                        yield _sse("delta", {"text": safe})

            if not blocked and keywords and pending:
                yield _sse("delta", {"text": pending})
            yield _sse("done", {})
        except Exception as exc:  # noqa: BLE001 - kirim error ke klien lewat stream
            yield _sse("error", {"message": str(exc)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
