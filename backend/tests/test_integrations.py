"""Test untuk modul integrasi (WhatsApp/WAHA & Telegram).

Pengiriman ke provider dan pemanggilan LLM selalu ditambal — tidak ada HTTP/LLM
nyata.
"""

import app.agent_runtime as agent_runtime
import app.providers.telegram as telegram
import app.providers.waha as waha
import app.routers.integrations as integrations_module


def _make_agent(client, headers, name="IntBot"):
    return client.post("/api/agents", json={"name": name}, headers=headers).json()["id"]


def _make_integration(client, headers, agent_id, **fields):
    payload = {"type": "telegram", "api_key": "bot-token", **fields}
    res = client.post(
        f"/api/agents/{agent_id}/integrations", json=payload, headers=headers
    )
    return res


# ---- CRUD & scoping --------------------------------------------------------


def test_integration_routes_require_auth(client, registered):
    agent_id = _make_agent(client, registered["headers"])
    assert client.get(f"/api/agents/{agent_id}/integrations").status_code == 401
    assert (
        client.post(
            f"/api/agents/{agent_id}/integrations", json={"type": "telegram"}
        ).status_code
        == 401
    )


def test_create_integration_returns_webhook_path(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    res = _make_integration(client, h, agent_id, type="telegram", api_key="tok")
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["type"] == "telegram"
    assert body["webhook_path"].startswith("/api/integrations/webhook/")
    # Token muncul di path tapi api_key tidak pernah mentah.
    assert "api_key" not in body
    assert body["has_api_key"] is True


def test_api_key_not_returned_raw(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    body = _make_integration(client, h, agent_id, api_key="super-secret").json()
    assert "super-secret" not in str(body)


def test_list_integrations(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    _make_integration(client, h, agent_id, type="telegram", api_key="t1")
    _make_integration(
        client, h, agent_id, type="whatsapp", api_key="w1", provider_url="http://waha"
    )
    items = client.get(f"/api/agents/{agent_id}/integrations", headers=h).json()
    assert len(items) == 2
    assert {i["type"] for i in items} == {"telegram", "whatsapp"}


def test_cannot_manage_other_users_integration(client, registered, make_user):
    a = registered["headers"]
    agent_id = _make_agent(client, a)
    integration_id = _make_integration(client, a, agent_id).json()["id"]

    b = make_user("b@example.com")["headers"]
    assert client.get(f"/api/agents/{agent_id}/integrations", headers=b).status_code == 404
    assert (
        client.put(
            f"/api/integrations/{integration_id}", json={"enabled": False}, headers=b
        ).status_code
        == 404
    )
    assert client.delete(f"/api/integrations/{integration_id}", headers=b).status_code == 404


def test_update_integration_enable_disable(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    integration_id = _make_integration(client, h, agent_id).json()["id"]
    res = client.put(
        f"/api/integrations/{integration_id}", json={"enabled": False}, headers=h
    )
    assert res.status_code == 200
    assert res.json()["enabled"] is False


def test_update_empty_api_key_keeps_existing(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    integration_id = _make_integration(client, h, agent_id, api_key="keep-me").json()["id"]
    # Kirim api_key kosong → tidak mengubah; has_api_key tetap True.
    res = client.put(
        f"/api/integrations/{integration_id}",
        json={"api_key": "", "session_name": "s2"},
        headers=h,
    )
    assert res.json()["has_api_key"] is True
    assert res.json()["session_name"] == "s2"


def test_delete_integration(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    integration_id = _make_integration(client, h, agent_id).json()["id"]
    assert client.delete(f"/api/integrations/{integration_id}", headers=h).status_code == 204
    assert client.get(f"/api/agents/{agent_id}/integrations", headers=h).json() == []


# ---- Connect ---------------------------------------------------------------


def test_connect_fails_without_public_base_url(client, registered):
    # Di test, PUBLIC_BASE_URL kosong → connect harus 400.
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    integration_id = _make_integration(client, h, agent_id).json()["id"]
    res = client.post(f"/api/integrations/{integration_id}/connect", headers=h)
    assert res.status_code == 400
    assert "PUBLIC_BASE_URL" in res.json()["detail"]


def test_connect_telegram_sets_webhook(client, registered, monkeypatch):
    monkeypatch.setattr(
        integrations_module.settings, "public_base_url", "https://test.example"
    )
    calls = {}
    monkeypatch.setattr(
        telegram, "get_me", lambda *, token: {"ok": True, "result": {"username": "mybot"}}
    )
    monkeypatch.setattr(
        telegram,
        "set_webhook",
        lambda *, token, webhook_url: calls.update(url=webhook_url) or {"ok": True},
    )

    h = registered["headers"]
    agent_id = _make_agent(client, h)
    integration_id = _make_integration(client, h, agent_id, api_key="tok").json()["id"]
    res = client.post(f"/api/integrations/{integration_id}/connect", headers=h)
    assert res.status_code == 200, res.text
    assert res.json()["ok"] is True
    assert calls["url"].startswith("https://test.example/api/integrations/webhook/")


# ---- Inbound webhook -------------------------------------------------------


def test_webhook_unknown_token_404(client):
    res = client.post("/api/integrations/webhook/does-not-exist", json={})
    assert res.status_code == 404


def test_telegram_webhook_triggers_reply(client, registered, monkeypatch):
    # LLM ditambal pada agent_runtime (modul yang dipakai generate_reply).
    monkeypatch.setattr(
        agent_runtime,
        "stream_chat",
        lambda **kw: iter(["Halo ", "dunia"]),
    )
    sent = {}
    monkeypatch.setattr(
        telegram,
        "send_text",
        lambda *, token, chat_id, text: sent.update(chat_id=chat_id, text=text),
    )

    h = registered["headers"]
    agent_id = _make_agent(client, h)
    token = _make_integration(client, h, agent_id, type="telegram", api_key="tok").json()[
        "webhook_path"
    ].rsplit("/", 1)[-1]

    res = client.post(
        f"/api/integrations/webhook/{token}",
        json={"message": {"chat": {"id": 555}, "text": "halo bot"}},
    )
    assert res.status_code == 200
    assert sent["chat_id"] == 555
    assert sent["text"] == "Halo dunia"


def test_whatsapp_webhook_triggers_reply(client, registered, monkeypatch):
    monkeypatch.setattr(
        agent_runtime, "stream_chat", lambda **kw: iter(["Balasan"])
    )
    sent = {}
    monkeypatch.setattr(
        waha,
        "send_text",
        lambda *, provider_url, api_key, session, chat_id, text: sent.update(
            chat_id=chat_id, text=text
        ),
    )

    h = registered["headers"]
    agent_id = _make_agent(client, h)
    token = _make_integration(
        client, h, agent_id, type="whatsapp", api_key="k", provider_url="http://waha"
    ).json()["webhook_path"].rsplit("/", 1)[-1]

    res = client.post(
        f"/api/integrations/webhook/{token}",
        json={
            "event": "message",
            "payload": {"from": "628111@c.us", "body": "halo", "fromMe": False},
        },
    )
    assert res.status_code == 200
    assert sent["chat_id"] == "628111@c.us"
    assert sent["text"] == "Balasan"


def test_webhook_ignores_from_me(client, registered, monkeypatch):
    sent = {"called": False}
    monkeypatch.setattr(
        waha,
        "send_text",
        lambda **kw: sent.update(called=True),
    )
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    token = _make_integration(
        client, h, agent_id, type="whatsapp", api_key="k", provider_url="http://waha"
    ).json()["webhook_path"].rsplit("/", 1)[-1]

    res = client.post(
        f"/api/integrations/webhook/{token}",
        json={"event": "message", "payload": {"from": "x@c.us", "body": "hi", "fromMe": True}},
    )
    assert res.status_code == 200
    assert sent["called"] is False


def test_webhook_ignores_when_disabled(client, registered, monkeypatch):
    sent = {"called": False}
    monkeypatch.setattr(
        telegram, "send_text", lambda **kw: sent.update(called=True)
    )
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    created = _make_integration(client, h, agent_id, type="telegram", api_key="tok").json()
    token = created["webhook_path"].rsplit("/", 1)[-1]
    client.put(f"/api/integrations/{created['id']}", json={"enabled": False}, headers=h)

    res = client.post(
        f"/api/integrations/webhook/{token}",
        json={"message": {"chat": {"id": 1}, "text": "halo"}},
    )
    assert res.status_code == 200
    assert sent["called"] is False
