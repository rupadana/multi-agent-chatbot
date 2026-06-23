from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ---- Agent ----
class GuardrailConfig(BaseModel):
    guardrails_enabled: bool = False
    guardrail_instructions: str = ""
    blocked_keywords: str = ""
    max_input_chars: int = Field(default=0, ge=0)
    refusal_message: str = "Maaf, saya tidak dapat membantu permintaan tersebut."


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    system_prompt: str = "Kamu adalah asisten AI yang ramah dan membantu."
    model: str = "gpt-4o-mini"
    base_url: str | None = None
    api_key: str | None = None
    # Guardrails (opsional)
    guardrails_enabled: bool = False
    guardrail_instructions: str = ""
    blocked_keywords: str = ""
    max_input_chars: int = Field(default=0, ge=0)
    refusal_message: str = "Maaf, saya tidak dapat membantu permintaan tersebut."


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    system_prompt: str | None = None
    model: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    guardrails_enabled: bool | None = None
    guardrail_instructions: str | None = None
    blocked_keywords: str | None = None
    max_input_chars: int | None = Field(default=None, ge=0)
    refusal_message: str | None = None


class AgentRead(BaseModel):
    id: int
    name: str
    description: str
    system_prompt: str
    model: str
    base_url: str | None = None
    # API key tidak pernah dikembalikan mentah; cukup tahu sudah diset atau belum.
    has_api_key: bool = False
    guardrails_enabled: bool = False
    guardrail_instructions: str = ""
    blocked_keywords: str = ""
    max_input_chars: int = 0
    refusal_message: str = ""
    created_at: datetime
    updated_at: datetime
    document_count: int = 0


# ---- Document / Knowledge base ----
class DocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class DocumentRead(BaseModel):
    id: int
    agent_id: int
    title: str
    content: str
    created_at: datetime


# ---- Chat / Playground ----
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
