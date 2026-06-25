"""Klien WAHA (WhatsApp HTTP API) — https://waha.devlike.pro.

Autentikasi memakai header `X-Api-Key`. Hanya fungsi yang kita butuhkan:
mengirim teks, memulai/upsert session dengan webhook, dan cek info session.
"""

import httpx

_TIMEOUT = 30.0


def _headers(api_key: str) -> dict:
    return {"X-Api-Key": api_key} if api_key else {}


def _base(provider_url: str) -> str:
    return provider_url.rstrip("/")


def send_text(*, provider_url: str, api_key: str, session: str, chat_id: str, text: str) -> dict:
    """Kirim pesan teks. POST /api/sendText."""
    url = f"{_base(provider_url)}/api/sendText"
    body = {"session": session, "chatId": chat_id, "text": text}
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(url, json=body, headers=_headers(api_key))
        resp.raise_for_status()
        return resp.json() if resp.content else {}


def start_session(*, provider_url: str, api_key: str, session: str, webhook_url: str) -> dict:
    """Upsert & start session WAHA dengan webhook event `message`.

    POST /api/sessions/start — body { name, config: { webhooks: [...] } }.
    """
    url = f"{_base(provider_url)}/api/sessions/start"
    body = {
        "name": session,
        "config": {
            "webhooks": [
                {"url": webhook_url, "events": ["message", "session.status"]}
            ]
        },
    }
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(url, json=body, headers=_headers(api_key))
        resp.raise_for_status()
        return resp.json() if resp.content else {}


def session_info(*, provider_url: str, api_key: str, session: str) -> dict:
    """GET /api/sessions/{session} — info & status session."""
    url = f"{_base(provider_url)}/api/sessions/{session}"
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.get(url, headers=_headers(api_key))
        resp.raise_for_status()
        return resp.json() if resp.content else {}


def parse_incoming(body: dict) -> dict | None:
    """Ekstrak pesan masuk dari payload webhook WAHA.

    Kembalikan {"chat_id", "text"} untuk event `message` dari orang lain, atau
    None bila bukan pesan teks yang relevan (mis. fromMe, event lain, tanpa teks).
    """
    if body.get("event") != "message":
        return None
    payload = body.get("payload") or {}
    if payload.get("fromMe"):
        return None
    text = (payload.get("body") or "").strip()
    chat_id = payload.get("from")
    if not text or not chat_id:
        return None
    return {"chat_id": chat_id, "text": text}
