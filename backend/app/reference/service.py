"""Service de lecture des donnees de reference."""
from sqlmodel import Session, select

from ..models.tower import TowerType
from ..models.enemy import EnemyType


def get_all_tower_types(db: Session) -> list[TowerType]:
    return list(db.exec(select(TowerType)).all())


def get_all_enemy_types(db: Session) -> list[EnemyType]:
    return list(db.exec(select(EnemyType)).all())
