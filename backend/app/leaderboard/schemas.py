"""Schemas Pydantic pour le leaderboard."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ScoreResponse(BaseModel):
    id: UUID
    pseudo: str
    score: int
    wave_reached: int
    play_at: datetime


class LeaderboardResponse(BaseModel):
    leaderboard: list[ScoreResponse]
