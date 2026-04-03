"""
Service metier du jeu.

Orchestre les sessions en memoire et les acces BDD (types de tours/ennemis,
sauvegarde du score).
"""
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from ..models.tower import TowerType
from ..models.enemy import EnemyType
from ..models.score import GameScore
from . import session_store
from .session_store import GameSession


def _load_tower_types(db: Session) -> list[dict]:
    """Charge tous les types de tours depuis la BDD."""
    rows = db.exec(select(TowerType)).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "base_damage": t.base_damage,
            "basic_scope": t.basic_scope,
            "basic_attack_speed": t.basic_attack_speed,
            "base_cost": t.base_cost,
            "max_level": t.max_level,
        }
        for t in rows
    ]


def _load_enemy_types(db: Session) -> list[dict]:
    """Charge tous les types d'ennemis depuis la BDD."""
    rows = db.exec(select(EnemyType)).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "life_points": e.life_points,
            "speed": e.speed,
            "armor": e.armor,
            "reward_or": e.reward_or,
            "is_boss": e.is_boss,
        }
        for e in rows
    ]


def start_game(user_id: UUID, db: Session) -> GameSession:
    """Demarre une nouvelle partie. Ecrase toute session precedente."""
    tower_types = _load_tower_types(db)
    enemy_types = _load_enemy_types(db)

    if not tower_types:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Aucun type de tour configure en base",
        )
    if not enemy_types:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Aucun type d'ennemi configure en base",
        )

    return session_store.create_session(user_id, tower_types, enemy_types)


def get_state(user_id: UUID) -> GameSession:
    """Renvoie la session active. Leve 404 si aucune partie en cours."""
    gs = session_store.get_session(user_id)
    if gs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune partie en cours",
        )
    return gs


def place_tower(user_id: UUID, tower_type_id: UUID, x: int, y: int) -> GameSession:
    """Place une tour dans la session active."""
    gs = get_state(user_id)
    try:
        gs.place_tower(tower_type_id, x, y)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    return gs


def remove_tower(user_id: UUID, x: int, y: int) -> GameSession:
    """Retire une tour et rembourse son coût."""
    gs = get_state(user_id)
    try:
        gs.remove_tower(x, y)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    return gs


def next_wave(user_id: UUID) -> dict:
    """Lance la vague suivante et renvoie les resultats."""
    gs = get_state(user_id)
    try:
        result = gs.next_wave()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    return result


def add_income(user_id: UUID) -> GameSession:
    """Ajoute 1 or de revenu passif a la session active."""
    gs = get_state(user_id)
    if not gs.is_over:
        gs.gold += 1
    return gs


def end_game(user_id: UUID, db: Session) -> dict:
    """Termine la partie et sauvegarde le score en BDD.

    Renvoie le score final et la vague atteinte.
    """
    gs = session_store.get_session(user_id)
    if gs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune partie en cours",
        )

    # Sauvegarder le score
    score = GameScore(
        id_user=user_id,
        score=gs.score,
        wave_reached=gs.wave,
    )
    db.add(score)
    db.commit()

    final_score = gs.score
    wave_reached = gs.wave

    # Nettoyer la session
    session_store.remove_session(user_id)

    return {
        "final_score": final_score,
        "wave_reached": wave_reached,
    }
