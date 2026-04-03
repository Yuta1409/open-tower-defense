"""Routes pour les donnees de reference (tours, ennemis)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..core.database import get_session
from . import service
from .schemas import EnemyTypeResponse, TowerTypeResponse

router = APIRouter(prefix="/reference", tags=["Reference"])


@router.get("/towers", response_model=list[TowerTypeResponse])
def get_towers(db: Session = Depends(get_session)):
    return service.get_all_tower_types(db)


@router.get("/enemies", response_model=list[EnemyTypeResponse])
def get_enemies(db: Session = Depends(get_session)):
    return service.get_all_enemy_types(db)
