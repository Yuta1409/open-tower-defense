"""
Service metier du jeu.

Orchestre les sessions (persistees en DB) et les sauvegardes de score.
"""
import time
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session

from ..models.score import GameScore
from . import session_store
from .session_store import GameSession


def start_game(user_id: UUID, db: Session) -> GameSession:
    """Demarre une nouvelle partie. Ecrase toute session precedente."""
    tower_types = session_store._load_tower_types(db)
    enemy_types = session_store._load_enemy_types(db)

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

    return session_store.create_session(user_id, tower_types, enemy_types, db)


def get_state(user_id: UUID, db: Session) -> GameSession:
    """Renvoie la session active. Leve 404 si aucune partie en cours."""
    gs = session_store.get_session(user_id, db)
    if gs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune partie en cours",
        )
    return gs


def place_tower(user_id: UUID, tower_type_id: UUID, x: int, y: int, db: Session) -> GameSession:
    """Place une tour dans la session active."""
    gs = get_state(user_id, db)
    try:
        gs.place_tower(tower_type_id, x, y)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    session_store.save_session(gs, db)
    return gs


def remove_tower(user_id: UUID, x: int, y: int, db: Session) -> GameSession:
    """Retire une tour et rembourse son coût."""
    gs = get_state(user_id, db)
    try:
        gs.remove_tower(x, y)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    session_store.save_session(gs, db)
    return gs


def next_wave(user_id: UUID, db: Session) -> dict:
    """Lance la vague suivante et renvoie les resultats."""
    gs = get_state(user_id, db)
    try:
        result = gs.next_wave()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    session_store.save_session(gs, db)
    return result


def add_income(user_id: UUID, db: Session) -> GameSession:
    """Ajoute 1 or de revenu passif a la session active.

    Impose un cooldown minimum de 10 secondes entre deux appels.
    """
    from .session_store import _INCOME_COOLDOWN_SECONDS

    gs = get_state(user_id, db)
    if gs.is_over:
        return gs

    now = time.time()
    if (now - gs.last_income_at) < _INCOME_COOLDOWN_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Income cooldown: attendez 10 secondes entre chaque appel",
        )

    gs.gold += 1
    gs.last_income_at = now
    session_store.save_session(gs, db)
    return gs


def end_game(user_id: UUID, db: Session) -> dict:
    """Termine la partie et sauvegarde le score en BDD."""
    gs = session_store.get_session(user_id, db)
    if gs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune partie en cours",
        )

    score = GameScore(
        id_user=user_id,
        score=gs.score,
        wave_reached=gs.wave,
    )
    db.add(score)
    db.commit()

    final_score = gs.score
    wave_reached = gs.wave

    session_store.remove_session(user_id, db)

    return {
        "final_score": final_score,
        "wave_reached": wave_reached,
    }
