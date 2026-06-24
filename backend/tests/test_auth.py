"""Test untuk endpoint autentikasi."""


def test_register_returns_token_and_user(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "a@example.com", "password": "secret1", "name": "Alice"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "a@example.com"
    assert body["user"]["name"] == "Alice"


def test_register_normalizes_email(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "MixedCase@Example.com", "password": "secret1"},
    )
    assert res.status_code == 201, res.text
    assert res.json()["user"]["email"] == "mixedcase@example.com"


def test_register_duplicate_email_conflicts(client):
    payload = {"email": "dup@example.com", "password": "secret1"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 409


def test_register_rejects_short_password(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "x@example.com", "password": "123"},
    )
    assert res.status_code == 422


def test_register_rejects_invalid_email(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "secret1"},
    )
    assert res.status_code == 422


def test_login_success(client, registered):
    res = client.post(
        "/api/auth/login",
        json={"email": registered["user"]["email"], "password": "secret1"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["access_token"]


def test_login_wrong_password(client, registered):
    res = client.post(
        "/api/auth/login",
        json={"email": registered["user"]["email"], "password": "wrong"},
    )
    assert res.status_code == 401


def test_login_unknown_user(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "ghost@example.com", "password": "secret1"},
    )
    assert res.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client, registered):
    res = client.get("/api/auth/me", headers=registered["headers"])
    assert res.status_code == 200
    assert res.json()["email"] == registered["user"]["email"]


def test_me_rejects_garbage_token(client):
    res = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not.a.real.token"}
    )
    assert res.status_code == 401
