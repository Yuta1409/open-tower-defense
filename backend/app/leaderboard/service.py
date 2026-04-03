"""Service metier du leaderboard."""
from uuid import UUID

from sqlmodel import Session, select, col

from ..models.score import GameScore
from ..models.user import User


def get_top_scores(db: Session, limit: int = 10) -> list[dict]:
    """Renvoie les N meilleurs scores avec le pseudo du joueur."""
    statement = (
        select(GameScore, User.pseudo)
        .join(User, GameScore.id_user == User.id)  # type: ignore[arg-type]
        .order_by(col(GameScore.score).desc())
        .limit(limit)
    )
    results = db.exec(statement).all()

    return [
        {
            "id": score.id,
            "pseudo": pseudo,
            "score": score.score,
            "wave_reached": score.wave_reached,
            "play_at": score.play_at,
        }
        for score, pseudo in results
    ]


def get_user_scores(user_id: UUID, db: Session, limit: int = 10) -> list[dict]:
    """Renvoie les meilleurs scores d'un utilisateur."""
    statement = (
        select(GameScore, User.pseudo)
        .join(User, GameScore.id_user == User.id)  # type: ignore[arg-type]
        .where(GameScore.id_user == user_id)
        .order_by(col(GameScore.score).desc())
        .limit(limit)
    )
    results = db.exec(statement).all()

    return [
        {
            "id": score.id,
            "pseudo": pseudo,
            "score": score.score,
            "wave_reached": score.wave_reached,
            "play_at": score.play_at,
        }
        for score, pseudo in results
    ]
