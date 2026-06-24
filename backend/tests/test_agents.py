"""Test untuk CRUD agent dan isolasi kepemilikan antar-user."""


def test_agent_routes_require_auth(client):
    assert client.get("/api/agents").status_code == 401
    assert client.post("/api/agents", json={"name": "X"}).status_code == 401


def test_create_and_list_agent(client, registered):
    h = registered["headers"]
    res = client.post("/api/agents", json={"name": "Bot"}, headers=h)
    assert res.status_code == 201, res.text
    assert res.json()["name"] == "Bot"

    listed = client.get("/api/agents", headers=h).json()
    assert len(listed) == 1
    assert listed[0]["name"] == "Bot"


def test_api_key_never_returned_raw(client, registered):
    h = registered["headers"]
    res = client.post(
        "/api/agents",
        json={"name": "Secret", "api_key": "sk-rahasia-123"},
        headers=h,
    )
    body = res.json()
    assert "api_key" not in body
    assert body["has_api_key"] is True


def test_users_only_see_their_own_agents(client, registered, make_user):
    a = registered["headers"]
    client.post("/api/agents", json={"name": "AgentA"}, headers=a)

    b = make_user("b@example.com")["headers"]
    assert client.get("/api/agents", headers=b).json() == []


def test_cannot_access_other_users_agent(client, registered, make_user):
    a = registered["headers"]
    agent_id = client.post("/api/agents", json={"name": "AgentA"}, headers=a).json()[
        "id"
    ]

    b = make_user("b@example.com")["headers"]
    assert client.get(f"/api/agents/{agent_id}", headers=b).status_code == 404
    assert (
        client.put(
            f"/api/agents/{agent_id}", json={"name": "hack"}, headers=b
        ).status_code
        == 404
    )
    assert client.delete(f"/api/agents/{agent_id}", headers=b).status_code == 404


def test_update_agent(client, registered):
    h = registered["headers"]
    agent_id = client.post("/api/agents", json={"name": "Old"}, headers=h).json()["id"]
    res = client.put(f"/api/agents/{agent_id}", json={"name": "New"}, headers=h)
    assert res.status_code == 200
    assert res.json()["name"] == "New"


def test_delete_agent(client, registered):
    h = registered["headers"]
    agent_id = client.post("/api/agents", json={"name": "Tmp"}, headers=h).json()["id"]
    assert client.delete(f"/api/agents/{agent_id}", headers=h).status_code == 204
    assert client.get(f"/api/agents/{agent_id}", headers=h).status_code == 404
