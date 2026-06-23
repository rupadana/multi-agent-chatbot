from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Agent, Document
from ..schemas import DocumentCreate, DocumentRead
from .agents import get_agent_or_404

router = APIRouter(prefix="/api/agents/{agent_id}/knowledge", tags=["knowledge"])


@router.get("", response_model=list[DocumentRead])
def list_documents(agent_id: int, session: Session = Depends(get_session)):
    get_agent_or_404(agent_id, session)
    docs = session.exec(
        select(Document)
        .where(Document.agent_id == agent_id)
        .order_by(Document.created_at.desc())
    ).all()
    return docs


@router.post("", response_model=DocumentRead, status_code=201)
def add_document(
    agent_id: int, payload: DocumentCreate, session: Session = Depends(get_session)
):
    agent: Agent = get_agent_or_404(agent_id, session)
    doc = Document(agent_id=agent.id, title=payload.title, content=payload.content)
    session.add(doc)
    # Sentuh updated_at agent agar urutan tetap relevan.
    agent.updated_at = datetime.now(timezone.utc)
    session.add(agent)
    session.commit()
    session.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=204)
def delete_document(
    agent_id: int, document_id: int, session: Session = Depends(get_session)
):
    get_agent_or_404(agent_id, session)
    doc = session.get(Document, document_id)
    if doc is None or doc.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    session.delete(doc)
    session.commit()
