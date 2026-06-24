from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """Akun pengguna yang memiliki agent-agent miliknya sendiri."""

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str = ""
    password_hash: str = ""
    created_at: datetime = Field(default_factory=_now)

    agents: list["Agent"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Agent(SQLModel, table=True):
    """Sebuah agent yang bisa dikonfigurasi pengguna."""

    id: int | None = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    name: str = Field(index=True)
    description: str = ""
    system_prompt: str = "Kamu adalah asisten AI yang ramah dan membantu."

    # Konfigurasi LLM. base_url/api_key kosong = pakai default global dari env.
    model: str = "gpt-4o-mini"
    base_url: str | None = None
    api_key: str | None = None

    # Guardrails (bisa dikonfigurasi user dari UI).
    guardrails_enabled: bool = False
    guardrail_instructions: str = ""
    blocked_keywords: str = ""  # dipisah baris baru atau koma
    max_input_chars: int = 0  # 0 = tanpa batas
    refusal_message: str = "Maaf, saya tidak dapat membantu permintaan tersebut."

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    owner: User | None = Relationship(back_populates="agents")
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
