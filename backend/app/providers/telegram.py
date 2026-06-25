"""Klien Telegram Bot API — https://core.telegram.org/bots/api.

`api_key` integrasi = bot token. Endpoint: https://api.telegram.org/bot<token>/...
"""

import httpx

_TIMEOUT = 30.0
_API = "https://api.telegram.org"


def _url(token: str, method: str) -> str:
    return f"{_API}/bot{token}/{method}"


def send_text(*, token: str, chat_id: str | int, text: str) -> dict:
    """sendMessage."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            _url(token, "sendMessage"), json={"chat_id": chat_id, "text": text}
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {}


def set_webhook(*, token: str, webhook_url: str) -> dict:
    """setWebhook — daftarkan URL webhook kita ke Telegram."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(_url(token, "setWebhook"), json={"url": webhook_url})
        resp.raise_for_status()
        return resp.json() if resp.content else {}


def get_me(*, token: str) -> dict:
    """getMe — verifikasi token bot valid."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.get(_url(token, "getMe"))
        resp.raise_for_status()
        return resp.json() if resp.content else {}


def parse_incoming(body: dict) -> dict | None:
    """Ekstrak pesan masuk dari update Telegram.

    Kembalikan {"chat_id", "text"} atau None bila bukan pesan teks.
    """
    message = body.get("message") or body.get("edited_message")
    if not message:
        return None
    text = (message.get("text") or "").strip()
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    if not text or chat_id is None:
        return None
    return {"chat_id": chat_id, "text": text}
