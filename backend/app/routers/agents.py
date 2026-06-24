from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_user
from ..models import Agent, Document, User
from ..schemas import AgentCreate, AgentRead, AgentUpdate

router = APIRouter(prefix="/api/agents", tags=["agents"])


def _to_read(session: Session, agent: Agent) -> AgentRead:
    count = len(
        session.exec(select(Document).where(Document.agent_id == agent.id)).all()
    )
    return AgentRead(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        system_prompt=agent.system_prompt,
        model=agent.model,
        base_url=agent.base_url,
        has_api_key=bool(agent.api_key),
        guardrails_enabled=agent.guardrails_enabled,
        guardrail_instructions=agent.guardrail_instructions,
        blocked_keywords=agent.blocked_keywords,
        max_input_chars=agent.max_input_chars,
        refusal_message=agent.refusal_message,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        document_count=count,
    )


def _normalize(data: dict) -> dict:
    """String kosong pada base_url/api_key dianggap 'pakai default global'."""
    for key in ("base_url", "api_key"):
        if key in data and isinstance(data[key], str) and data[key].strip() == "":
            data[key] = None
    return data


def get_agent_or_404(agent_id: int, session: Session, user: User) -> Agent:
    """Ambil agent dan pastikan ia milik `user`."""
    agent = session.get(Agent, agent_id)
    if agent is None or agent.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Agent tidak ditemukan")
    return agent


@router.get("", response_model=list[AgentRead])
def list_agents(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    agents = session.exec(
        select(Agent)
        .where(Agent.owner_id == user.id)
        .order_by(Agent.created_at.desc())
    ).all()
    return [_to_read(session, a) for a in agents]


@router.post("", response_model=AgentRead, status_code=201)
def create_agent(
    payload: AgentCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    agent = Agent(owner_id=user.id, **_normalize(payload.model_dump()))
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_read(session, agent)


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(
    agent_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return _to_read(session, get_agent_or_404(agent_id, session, user))


@router.put("/{agent_id}", response_model=AgentRead)
def update_agent(
    agent_id: int,
    payload: AgentUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    agent = get_agent_or_404(agent_id, session, user)
    data = _normalize(payload.model_dump(exclude_unset=True))
    for key, value in data.items():
        setattr(agent, key, value)
    agent.updated_at = datetime.now(timezone.utc)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_read(session, agent)


@router.delete("/{agent_id}", status_code=204)
def delete_agent(
    agent_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    agent = get_agent_or_404(agent_id, session, user)
    session.delete(agent)
    session.commit()
