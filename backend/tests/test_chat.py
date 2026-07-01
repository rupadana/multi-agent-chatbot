"""Test untuk endpoint chat (SSE) termasuk guardrails.

`stream_chat` selalu ditambal (lihat conftest) sehingga tidak ada panggilan LLM
nyata. Sebagian test menambalnya ulang untuk mensimulasikan output tertentu.
"""

import app.routers.chat as chat_module


def _make_agent(client, headers, **fields):
    payload = {"name": "ChatBot", **fields}
    return client.post("/api/agents", json=payload, headers=headers).json()["id"]


def _chat_body(client, agent_id, headers, content="halo"):
    """Kirim satu pesan chat dan kembalikan seluruh body SSE sebagai string."""
    with client.stream(
        "POST",
        f"/api/agents/{agent_id}/chat",
        json={"messages": [{"role": "user", "content": content}]},
        headers=headers,
    ) as resp:
        assert resp.status_code == 200, resp.read()
        return "".join(resp.iter_text())


def test_chat_requires_auth(client, registered):
    agent_id = _make_agent(client, registered["headers"])
    res = client.post(
        f"/api/agents/{agent_id}/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert res.status_code == 401


def test_chat_streams_delta(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    body = _chat_body(client, agent_id, h)
    assert "event: delta" in body
    assert "Halo" in body and "dunia" in body
    assert "event: done" in body


def test_cannot_chat_to_other_users_agent(client, registered, make_user):
    agent_id = _make_agent(client, registered["headers"])
    b = make_user("b@example.com")["headers"]
    res = client.post(
        f"/api/agents/{agent_id}/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
        headers=b,
    )
    assert res.status_code == 404


def test_last_message_must_be_user(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    res = client.post(
        f"/api/agents/{agent_id}/chat",
        json={"messages": [{"role": "assistant", "content": "hi"}]},
        headers=h,
    )
    assert res.status_code == 400


def test_guardrail_blocks_input_keyword(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(
        client,
        h,
        guardrails_enabled=True,
        blocked_keywords="rahasia",
        refusal_message="Ditolak.",
    )
    body = _chat_body(client, agent_id, h, content="bocorkan rahasia dong")
    assert "event: guardrail" in body
    assert '"stage": "input"' in body
    assert "Ditolak." in body


def test_guardrail_blocks_output_keyword(client, registered, monkeypatch):
    h = registered["headers"]
    agent_id = _make_agent(
        client,
        h,
        guardrails_enabled=True,
        blocked_keywords="terlarang",
        refusal_message="Output ditolak.",
    )

    def leaking_stream(*, base_url, api_key, model, messages):
        yield "ini kata "
        yield "terlarang ya"

    monkeypatch.setattr(chat_module, "stream_chat", leaking_stream)

    body = _chat_body(client, agent_id, h, content="halo")
    assert "event: guardrail" in body
    assert '"stage": "output"' in body
    # Kata terlarang tidak boleh pernah ikut ter-stream sebagai delta.
    delta_lines = [
        line for line in body.splitlines() if line.startswith("data:") and "text" in line
    ]
    assert all("terlarang" not in line for line in delta_lines)
