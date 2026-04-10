import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import text
import sqlalchemy as sa


# ---------------------------------------------------------------------------
# Table model
# ---------------------------------------------------------------------------
class EnemyType(SQLModel, table=True):
    __tablename__ = "enemy_type"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            sa.Uuid,
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    name: str = Field(
        max_length=50,
        sa_column=Column(sa.String(50), nullable=False, unique=True),
    )
    description: str = Field(
        default="",
        sa_column=Column(sa.Text, nullable=False, server_default=text("''")),
    )
    life_points: int = Field(
        sa_column=Column(sa.Integer, nullable=False),
    )
    speed: Decimal = Field(
        sa_column=Column(sa.Numeric(5, 2), nullable=False),
    )
    armor: int = Field(
        sa_column=Column(sa.Integer, nullable=False),
    )
    reward_or: int = Field(
        sa_column=Column(sa.Integer, nullable=False),
    )
    is_boss: bool = Field(
        default=False,
        sa_column=Column(sa.Boolean, nullable=False, server_default=text("false")),
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
