"""Routes du leaderboard."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..core.database import get_session
from ..core.deps import get_current_user
from ..models.user import User
from . import service
from .schemas import LeaderboardResponse, ScoreResponse

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=LeaderboardResponse)
def get_leaderboard(db: Session = Depends(get_session)):
    scores = service.get_top_scores(db, limit=10)
    return LeaderboardResponse(
        leaderboard=[ScoreResponse(**s) for s in scores],
    )


@router.get("/me", response_model=LeaderboardResponse)
def get_my_scores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    scores = service.get_user_scores(current_user.id, db, limit=10)
    return LeaderboardResponse(
        leaderboard=[ScoreResponse(**s) for s in scores],
    )
