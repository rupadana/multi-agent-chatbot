from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Agent, Document
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
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        document_count=count,
    )


def get_agent_or_404(agent_id: int, session: Session) -> Agent:
    agent = session.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent tidak ditemukan")
    return agent


@router.get("", response_model=list[AgentRead])
def list_agents(session: Session = Depends(get_session)):
    agents = session.exec(select(Agent).order_by(Agent.created_at.desc())).all()
    return [_to_read(session, a) for a in agents]


@router.post("", response_model=AgentRead, status_code=201)
def create_agent(payload: AgentCreate, session: Session = Depends(get_session)):
    agent = Agent(**payload.model_dump())
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_read(session, agent)


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: int, session: Session = Depends(get_session)):
    return _to_read(session, get_agent_or_404(agent_id, session))


@router.put("/{agent_id}", response_model=AgentRead)
def update_agent(
    agent_id: int, payload: AgentUpdate, session: Session = Depends(get_session)
):
    agent = get_agent_or_404(agent_id, session)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(agent, key, value)
    agent.updated_at = datetime.now(timezone.utc)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_read(session, agent)


@router.delete("/{agent_id}", status_code=204)
def delete_agent(agent_id: int, session: Session = Depends(get_session)):
    agent = get_agent_or_404(agent_id, session)
    session.delete(agent)
    session.commit()
