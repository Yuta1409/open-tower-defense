import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import text
import sqlalchemy as sa


# ---------------------------------------------------------------------------
# Table model (source of truth for DDL)
# ---------------------------------------------------------------------------
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            sa.Uuid,
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    password_hash: str = Field(
        max_length=255,
        sa_column=Column(sa.String(255), nullable=False),
    )
    pseudo: str = Field(
        max_length=30,
        sa_column=Column(sa.String(30), nullable=False, unique=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )
    supprime_le: Optional[datetime] = Field(
        default=None,
        sa_column=Column(sa.DateTime(timezone=True), nullable=True),
    )
