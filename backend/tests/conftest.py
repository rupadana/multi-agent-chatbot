"""Konfigurasi & fixture bersama untuk test suite backend.

Memakai database SQLite sementara (dibuat ulang per-test agar terisolasi) dan
menambal `stream_chat` agar test tidak pernah memanggil LLM sungguhan.
"""

import os
import tempfile

# Env harus diset SEBELUM mengimpor modul app, karena Settings di-cache (lru_cache)
# dan engine database dibuat saat import.
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["JWT_SECRET"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

import app.routers.chat as chat_module  # noqa: E402
from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402


def default_fake_stream(*, base_url, api_key, model, messages):
    """Pengganti stream_chat: balas teks tetap, tanpa memanggil LLM."""
    yield "Halo "
    yield "dunia"


@pytest.fixture(autouse=True)
def _isolate(monkeypatch):
    # DB bersih untuk tiap test.
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    # Default: jangan pernah panggil LLM nyata.
    monkeypatch.setattr(chat_module, "stream_chat", default_fake_stream)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def _register(client, email="user@example.com", password="secret1", name="User"):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest.fixture
def registered(client):
    """Satu user terdaftar + header Authorization siap pakai."""
    data = _register(client)
    token = data["access_token"]
    return {
        "token": token,
        "user": data["user"],
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def make_user(client):
    """Factory untuk membuat user lain (mis. untuk uji isolasi antar-pemilik)."""

    def _make(email, password="secret1", name="Other"):
        data = _register(client, email=email, password=password, name=name)
        return {
            "token": data["access_token"],
            "user": data["user"],
            "headers": {"Authorization": f"Bearer {data['access_token']}"},
        }

    return _make


def pytest_sessionfinish(session, exitstatus):
    try:
        os.close(_db_fd)
    except OSError:
        pass
    if os.path.exists(_db_path):
        os.remove(_db_path)
