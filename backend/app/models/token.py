import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import text, ForeignKey
import sqlalchemy as sa


# ---------------------------------------------------------------------------
# Create schema
# ---------------------------------------------------------------------------
class RefreshTokenCreate(SQLModel):
    """Payload used when issuing a new refresh token."""
    id_user: uuid.UUID
    token: str = Field(max_length=512)
    expired_at: datetime


# ---------------------------------------------------------------------------
# Table model
# ---------------------------------------------------------------------------
class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_token"

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
    token: str = Field(
        max_length=512,
        sa_column=Column(sa.String(512), nullable=False, unique=True),
    )
    expired_at: datetime = Field(
        sa_column=Column(sa.DateTime(timezone=True), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )
    is_revoke: bool = Field(
        default=False,
        sa_column=Column(sa.Boolean, nullable=False, server_default=text("false")),
    )


# ---------------------------------------------------------------------------
# Read schema
# ---------------------------------------------------------------------------
class RefreshTokenRead(SQLModel):
    id: uuid.UUID
    id_user: uuid.UUID
    token: str
    expired_at: datetime
    created_at: datetime
    is_revoke: bool
