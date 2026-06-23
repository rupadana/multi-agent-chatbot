from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Agent(SQLModel, table=True):
    """Sebuah agent yang bisa dikonfigurasi pengguna."""

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str = ""
    system_prompt: str = "Kamu adalah asisten AI yang ramah dan membantu."
    model: str = "claude-opus-4-8"
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    documents: list["Document"] = Relationship(
        back_populates="agent",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Document(SQLModel, table=True):
    """Dokumen knowledge base yang dimiliki sebuah agent."""

    id: int | None = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id", index=True)
    title: str
    content: str
    created_at: datetime = Field(default_factory=_now)

    agent: Agent | None = Relationship(back_populates="documents")
