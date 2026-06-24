"""Test untuk knowledge base dan isolasi kepemilikannya."""


def _make_agent(client, headers, name="KBBot"):
    return client.post("/api/agents", json={"name": name}, headers=headers).json()["id"]


def test_knowledge_requires_auth(client, registered):
    agent_id = _make_agent(client, registered["headers"])
    assert client.get(f"/api/agents/{agent_id}/knowledge").status_code == 401


def test_add_and_list_document(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    res = client.post(
        f"/api/agents/{agent_id}/knowledge",
        json={"title": "Kebijakan", "content": "Isi dokumen"},
        headers=h,
    )
    assert res.status_code == 201, res.text

    docs = client.get(f"/api/agents/{agent_id}/knowledge", headers=h).json()
    assert len(docs) == 1
    assert docs[0]["title"] == "Kebijakan"

    # document_count agent ikut terupdate.
    agent = client.get(f"/api/agents/{agent_id}", headers=h).json()
    assert agent["document_count"] == 1


def test_cannot_touch_other_users_knowledge(client, registered, make_user):
    a = registered["headers"]
    agent_id = _make_agent(client, a)

    b = make_user("b@example.com")["headers"]
    assert client.get(f"/api/agents/{agent_id}/knowledge", headers=b).status_code == 404
    assert (
        client.post(
            f"/api/agents/{agent_id}/knowledge",
            json={"title": "x", "content": "y"},
            headers=b,
        ).status_code
        == 404
    )


def test_delete_document(client, registered):
    h = registered["headers"]
    agent_id = _make_agent(client, h)
    doc_id = client.post(
        f"/api/agents/{agent_id}/knowledge",
        json={"title": "t", "content": "c"},
        headers=h,
    ).json()["id"]

    assert (
        client.delete(
            f"/api/agents/{agent_id}/knowledge/{doc_id}", headers=h
        ).status_code
        == 204
    )
    assert client.get(f"/api/agents/{agent_id}/knowledge", headers=h).json() == []
