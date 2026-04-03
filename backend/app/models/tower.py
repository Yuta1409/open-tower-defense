import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import text
import sqlalchemy as sa


# ---------------------------------------------------------------------------
# Base schema
# ---------------------------------------------------------------------------
class TowerTypeBase(SQLModel):
    name: str = Field(max_length=50)
    description: str = ""
    base_damage: int
    basic_scope: Decimal = Field(decimal_places=2, max_digits=5)
    basic_attack_speed: Decimal = Field(decimal_places=2, max_digits=5)
    base_cost: int
    max_level: int = 5


class TowerTypeCreate(TowerTypeBase):
    """Payload for creating a new tower type."""
    pass


# ---------------------------------------------------------------------------
# Table model
# ---------------------------------------------------------------------------
class TowerType(TowerTypeBase, table=True):
    __tablename__ = "tower_type"

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
    base_damage: int = Field(
        sa_column=Column(sa.Integer, nullable=False),
    )
    basic_scope: Decimal = Field(
        sa_column=Column(sa.Numeric(5, 2), nullable=False),
    )
    basic_attack_speed: Decimal = Field(
        sa_column=Column(sa.Numeric(5, 2), nullable=False),
    )
    base_cost: int = Field(
        sa_column=Column(sa.Integer, nullable=False),
    )
    max_level: int = Field(
        default=5,
        sa_column=Column(sa.Integer, nullable=False, server_default=text("5")),
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


# ---------------------------------------------------------------------------
# Read schema
# ---------------------------------------------------------------------------
class TowerTypeRead(TowerTypeBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
