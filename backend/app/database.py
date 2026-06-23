from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

settings = get_settings()

# `check_same_thread` hanya diperlukan untuk SQLite agar bisa dipakai lintas thread.
connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


def init_db() -> None:
    # Import models agar tabel terdaftar di metadata sebelum create_all.
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
