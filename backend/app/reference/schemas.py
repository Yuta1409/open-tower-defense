"""Schemas Pydantic pour les donnees de reference (tours, ennemis)."""
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TowerTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    base_damage: int
    basic_scope: Decimal
    basic_attack_speed: Decimal
    base_cost: int
    max_level: int
    created_at: datetime
    updated_at: datetime


class EnemyTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    life_points: int
    speed: Decimal
    armor: int
    reward_or: int
    is_boss: bool
    created_at: datetime
    updated_at: datetime
