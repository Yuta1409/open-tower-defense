import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
import sqlalchemy as sa


class GameSessionRow(SQLModel, table=True):
    __tablename__ = "game_session"

    user_id: uuid.UUID = Field(
        sa_column=Column(
            sa.Uuid,
            ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
            primary_key=True,
        ),
    )
    data: dict = Field(
        sa_column=Column(JSONB, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )
