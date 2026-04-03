"""Schemas Pydantic pour le jeu."""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Requetes
# ---------------------------------------------------------------------------

class PlaceTowerRequest(BaseModel):
    tower_type_id: UUID
    x: int = Field(ge=0, description="Colonne sur la grille")
    y: int = Field(ge=0, description="Ligne sur la grille")


class RemoveTowerRequest(BaseModel):
    x: int = Field(ge=0, description="Colonne sur la grille")
    y: int = Field(ge=0, description="Ligne sur la grille")


# ---------------------------------------------------------------------------
# Representations internes exposees en reponse
# ---------------------------------------------------------------------------

class PlacedTowerSchema(BaseModel):
    tower_type_id: UUID
    tower_name: str
    x: int
    y: int
    damage: int
    scope: float
    attack_speed: float
    level: int


class ActiveEnemySchema(BaseModel):
    enemy_type_id: UUID
    enemy_name: str
    current_hp: float
    max_hp: float
    speed: float
    armor: int
    reward_or: int
    is_boss: bool
    alive: bool


class GameStateResponse(BaseModel):
    wave: int
    gold: int
    score: int
    lives: int
    towers: list[PlacedTowerSchema]
    enemies: list[ActiveEnemySchema]
    is_over: bool


class EnemyKillDetail(BaseModel):
    enemy_name: str
    reward_or: int
    score_gained: int


class WaveResultResponse(BaseModel):
    wave_number: int
    enemies_spawned: int
    enemies_killed: int
    enemies_passed: int
    kills: list[EnemyKillDetail]
    gold_earned: int
    score_earned: int
    lives_remaining: int
    is_game_over: bool
    state: GameStateResponse


class GameStartResponse(BaseModel):
    message: str
    state: GameStateResponse


class GameEndResponse(BaseModel):
    message: str
    final_score: int
    wave_reached: int
