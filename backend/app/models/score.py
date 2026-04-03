import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import text, ForeignKey
import sqlalchemy as sa


# ---------------------------------------------------------------------------
# Create schema
# ---------------------------------------------------------------------------
class GameScoreCreate(SQLModel):
    """Payload for recording a new game score."""
    id_user: uuid.UUID
    score: int
    wave_reached: int


# ---------------------------------------------------------------------------
# Table model
# ---------------------------------------------------------------------------
class GameScore(SQLModel, table=True):
    __tablename__ = "game_score"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            sa.Uuid,
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    id_user: uuid.UUID = Field(
        sa_column=Column(
            sa.Uuid,
            ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    score: int = Field(
        sa_column=Column(sa.BigInteger, nullable=False),
    )
    wave_reached: int = Field(
        sa_column=Column(sa.Integer, nullable=False),
    )
    play_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )


# ---------------------------------------------------------------------------
# Read schema
# ---------------------------------------------------------------------------
class GameScoreRead(SQLModel):
    id: uuid.UUID
    id_user: uuid.UUID
    score: int
    wave_reached: int
    play_at: datetime
