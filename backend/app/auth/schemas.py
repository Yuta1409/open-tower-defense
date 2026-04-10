"""Schemas Pydantic pour l'authentification."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    pseudo: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    pseudo: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    pseudo: str
    created_at: datetime
    updated_at: datetime
