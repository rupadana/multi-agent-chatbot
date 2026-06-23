import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from ..claude_client import stream_chat
from ..database import get_session
from ..models import Document
from ..rag import build_system_prompt, retrieve_context
from ..schemas import ChatRequest
from .agents import get_agent_or_404

router = APIRouter(prefix="/api/agents/{agent_id}/chat", tags=["chat"])


def _sse(event: str, data: dict) -> str:
    """Format satu pesan Server-Sent Events."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("")
def chat(
    agent_id: int, payload: ChatRequest, session: Session = Depends(get_session)
):
    agent = get_agent_or_404(agent_id, session)

    if payload.messages[-1].role != "user":
        raise HTTPException(
            status_code=400, detail="Pesan terakhir harus berasal dari user."
        )

    # Ambil knowledge base lalu cari konteks relevan untuk pertanyaan terakhir.
    documents: list[Document] = session.exec(
        select(Document).where(Document.agent_id == agent_id)
    ).all()
    last_user_message = payload.messages[-1].content
    context = retrieve_context(documents, last_user_message)
    system_prompt = build_system_prompt(agent.system_prompt, context)

    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    sources = [{"title": title, "excerpt": chunk} for title, chunk in context]

    def event_stream():
        # Kirim sumber knowledge base yang dipakai lebih dulu.
        yield _sse("sources", {"sources": sources})
        try:
            for chunk in stream_chat(
                model=agent.model,
                system_prompt=system_prompt,
                messages=messages,
            ):
                yield _sse("delta", {"text": chunk})
            yield _sse("done", {})
        except Exception as exc:  # noqa: BLE001 - kirim error ke klien lewat stream
            yield _sse("error", {"message": str(exc)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
