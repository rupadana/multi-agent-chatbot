"""Integrasi agent ke kanal pesan: WhatsApp (WAHA) & Telegram.

- CRUD integrasi (terotentikasi, ter-scope ke pemilik agent).
- Aksi "connect" untuk mendaftarkan webhook ke provider secara otomatis.
- Endpoint webhook masuk yang diautentikasi lewat token di URL (provider tidak
  membawa JWT). Pesan diproses di background lalu balasan dikirim balik.
"""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlmodel import Session, select

from ..agent_runtime import generate_reply
from ..config import get_settings
from ..database import get_session
from ..deps import get_current_user
from ..models import Agent, Integration, User
from ..providers import telegram, waha
from ..schemas import (
    IntegrationConnectResult,
    IntegrationCreate,
    IntegrationRead,
    IntegrationUpdate,
)
from .agents import get_agent_or_404

settings = get_settings()

router = APIRouter(tags=["integrations"])

WEBHOOK_PREFIX = "/api/integrations/webhook"


def _webhook_path(token: str) -> str:
    return f"{WEBHOOK_PREFIX}/{token}"


def _webhook_url(token: str) -> str | None:
    if not settings.public_base_url:
        return None
    return settings.public_base_url.rstrip("/") + _webhook_path(token)


def _to_read(integration: Integration) -> IntegrationRead:
    return IntegrationRead(
        id=integration.id,
        agent_id=integration.agent_id,
        type=integration.type,
        enabled=integration.enabled,
        provider_url=integration.provider_url,
        session_name=integration.session_name,
        has_api_key=bool(integration.api_key),
        webhook_path=_webhook_path(integration.webhook_token),
        webhook_url=_webhook_url(integration.webhook_token),
        created_at=integration.created_at,
        updated_at=integration.updated_at,
    )


def _get_integration_or_404(
    integration_id: int, session: Session, user: User
) -> Integration:
    integration = session.get(Integration, integration_id)
    if integration is None:
        raise HTTPException(status_code=404, detail="Integrasi tidak ditemukan")
    # Pastikan agent-nya milik user.
    agent = session.get(Agent, integration.agent_id)
    if agent is None or agent.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Integrasi tidak ditemukan")
    return integration


# ---- CRUD ------------------------------------------------------------------


@router.get(
    "/api/agents/{agent_id}/integrations", response_model=list[IntegrationRead]
)
def list_integrations(
    agent_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    get_agent_or_404(agent_id, session, user)
    items = session.exec(
        select(Integration)
        .where(Integration.agent_id == agent_id)
        .order_by(Integration.created_at.desc())
    ).all()
    return [_to_read(i) for i in items]


@router.post(
    "/api/agents/{agent_id}/integrations",
    response_model=IntegrationRead,
    status_code=201,
)
def create_integration(
    agent_id: int,
    payload: IntegrationCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    get_agent_or_404(agent_id, session, user)
    integration = Integration(
        agent_id=agent_id,
        type=payload.type,
        enabled=payload.enabled,
        provider_url=payload.provider_url.strip(),
        api_key=payload.api_key.strip(),
        session_name=payload.session_name.strip() or "default",
        webhook_token=secrets.token_urlsafe(24),
    )
    session.add(integration)
    session.commit()
    session.refresh(integration)
    return _to_read(integration)


@router.put("/api/integrations/{integration_id}", response_model=IntegrationRead)
def update_integration(
    integration_id: int,
    payload: IntegrationUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    integration = _get_integration_or_404(integration_id, session, user)
    data = payload.model_dump(exclude_unset=True)
    # api_key kosong = jangan ubah (jaga kredensial yang sudah ada).
    if "api_key" in data and (data["api_key"] is None or data["api_key"].strip() == ""):
        data.pop("api_key")
    for key, value in data.items():
        setattr(integration, key, value)
    integration.updated_at = datetime.now(timezone.utc)
    session.add(integration)
    session.commit()
    session.refresh(integration)
    return _to_read(integration)


@router.delete("/api/integrations/{integration_id}", status_code=204)
def delete_integration(
    integration_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    integration = _get_integration_or_404(integration_id, session, user)
    session.delete(integration)
    session.commit()


# ---- Connect (daftarkan webhook ke provider) -------------------------------


@router.post(
    "/api/integrations/{integration_id}/connect",
    response_model=IntegrationConnectResult,
)
def connect_integration(
    integration_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    integration = _get_integration_or_404(integration_id, session, user)
    webhook_url = _webhook_url(integration.webhook_token)
    if not webhook_url:
        raise HTTPException(
            status_code=400,
            detail=(
                "PUBLIC_BASE_URL belum diset di server, jadi URL webhook tidak bisa "
                "dibuat otomatis. Set PUBLIC_BASE_URL lalu coba lagi, atau "
                "konfigurasikan webhook secara manual di provider."
            ),
        )
    if not integration.api_key:
        raise HTTPException(status_code=400, detail="Kredensial/token belum diisi.")

    try:
        if integration.type == "telegram":
            me = telegram.get_me(token=integration.api_key)
            if not me.get("ok"):
                raise HTTPException(status_code=400, detail="Bot token tidak valid.")
            telegram.set_webhook(token=integration.api_key, webhook_url=webhook_url)
            name = me.get("result", {}).get("username", "bot")
            return IntegrationConnectResult(
                ok=True, detail=f"Webhook Telegram terpasang untuk @{name}."
            )
        elif integration.type == "whatsapp":
            if not integration.provider_url:
                raise HTTPException(
                    status_code=400, detail="Base URL WAHA belum diisi."
                )
            waha.start_session(
                provider_url=integration.provider_url,
                api_key=integration.api_key,
                session=integration.session_name,
                webhook_url=webhook_url,
            )
            return IntegrationConnectResult(
                ok=True,
                detail=(
                    f"Session WAHA '{integration.session_name}' di-start dengan "
                    "webhook. Scan QR di WAHA bila diminta."
                ),
            )
        else:  # pragma: no cover - dijaga oleh validasi tipe
            raise HTTPException(status_code=400, detail="Tipe integrasi tidak dikenal.")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - sampaikan error provider ke klien
        raise HTTPException(
            status_code=502, detail=f"Gagal menghubungi provider: {exc}"
        )


# ---- Webhook masuk (diautentikasi via token di URL) ------------------------


def _process_inbound(integration_id: int, chat_id, text: str) -> None:
    """Dijalankan di background: buat balasan agent lalu kirim via provider."""
    from ..database import engine  # impor lokal agar mudah di-monkeypatch saat test

    with Session(engine) as session:
        integration = session.get(Integration, integration_id)
        if integration is None or not integration.enabled:
            return
        agent = session.get(Agent, integration.agent_id)
        if agent is None:
            return
        result = generate_reply(session, agent, text)
        reply = result["text"]
        if not reply:
            return
        try:
            if integration.type == "telegram":
                telegram.send_text(
                    token=integration.api_key, chat_id=chat_id, text=reply
                )
            elif integration.type == "whatsapp":
                waha.send_text(
                    provider_url=integration.provider_url,
                    api_key=integration.api_key,
                    session=integration.session_name,
                    chat_id=chat_id,
                    text=reply,
                )
        except Exception:  # noqa: BLE001 - jangan crash background worker
            # Pengiriman gagal (provider down/kredensial salah) — diabaikan agar
            # tidak mengganggu webhook. Bisa ditambah logging di masa depan.
            return


@router.post(WEBHOOK_PREFIX + "/{webhook_token}")
async def receive_webhook(
    webhook_token: str,
    request: Request,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
):
    integration = session.exec(
        select(Integration).where(Integration.webhook_token == webhook_token)
    ).first()
    if integration is None:
        raise HTTPException(status_code=404, detail="Webhook tidak ditemukan")
    if not integration.enabled:
        return {"ok": True, "ignored": "integration disabled"}

    try:
        body = await request.json()
    except Exception:
        body = {}

    if integration.type == "telegram":
        parsed = telegram.parse_incoming(body)
    elif integration.type == "whatsapp":
        parsed = waha.parse_incoming(body)
    else:
        parsed = None

    if parsed:
        background.add_task(
            _process_inbound, integration.id, parsed["chat_id"], parsed["text"]
        )

    # Selalu balas cepat 200 agar provider tidak retry.
    return {"ok": True}
