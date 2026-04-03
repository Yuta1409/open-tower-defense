"""Routes du jeu."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..core.database import get_session
from ..core.deps import get_current_user
from ..models.user import User
from . import service
from .schemas import (
    GameEndResponse,
    GameStartResponse,
    GameStateResponse,
    PlaceTowerRequest,
    WaveResultResponse,
    PlacedTowerSchema,
    ActiveEnemySchema,
    EnemyKillDetail,
)

router = APIRouter(prefix="/game", tags=["Game"])


def _session_to_state(gs) -> GameStateResponse:
    """Convertit une GameSession en schema de reponse."""
    return GameStateResponse(
        wave=gs.wave,
        gold=gs.gold,
        score=gs.score,
        lives=gs.lives,
        towers=[
            PlacedTowerSchema(
                tower_type_id=t.tower_type_id,
                tower_name=t.tower_name,
                x=t.x,
                y=t.y,
                damage=t.damage,
                scope=t.scope,
                attack_speed=t.attack_speed,
                level=t.level,
            )
            for t in gs.towers
        ],
        enemies=[
            ActiveEnemySchema(
                enemy_type_id=e.enemy_type_id,
                enemy_name=e.enemy_name,
                current_hp=e.current_hp,
                max_hp=e.max_hp,
                speed=e.speed,
                armor=e.armor,
                reward_or=e.reward_or,
                is_boss=e.is_boss,
                alive=e.alive,
            )
            for e in gs.enemies
        ],
        is_over=gs.is_over,
    )


@router.post("/start", response_model=GameStartResponse)
def start_game(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    gs = service.start_game(current_user.id, db)
    return GameStartResponse(
        message="Partie demarree",
        state=_session_to_state(gs),
    )


@router.post("/place-tower", response_model=GameStateResponse)
def place_tower(
    body: PlaceTowerRequest,
    current_user: User = Depends(get_current_user),
):
    gs = service.place_tower(
        user_id=current_user.id,
        tower_type_id=body.tower_type_id,
        x=body.x,
        y=body.y,
    )
    return _session_to_state(gs)


@router.post("/next-wave", response_model=WaveResultResponse)
def next_wave(
    current_user: User = Depends(get_current_user),
):
    result = service.next_wave(current_user.id)
    gs = service.get_state(current_user.id)
    return WaveResultResponse(
        wave_number=result["wave_number"],
        enemies_spawned=result["enemies_spawned"],
        enemies_killed=result["enemies_killed"],
        enemies_passed=result["enemies_passed"],
        kills=[
            EnemyKillDetail(
                enemy_name=k["enemy_name"],
                reward_or=k["reward_or"],
                score_gained=k["score_gained"],
            )
            for k in result["kills"]
        ],
        gold_earned=result["gold_earned"],
        score_earned=result["score_earned"],
        lives_remaining=result["lives_remaining"],
        is_game_over=result["is_game_over"],
        state=_session_to_state(gs),
    )


@router.post("/end", response_model=GameEndResponse)
def end_game(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    result = service.end_game(current_user.id, db)
    return GameEndResponse(
        message="Partie terminee, score sauvegarde",
        final_score=result["final_score"],
        wave_reached=result["wave_reached"],
    )


@router.get("/state", response_model=GameStateResponse)
def get_state(
    current_user: User = Depends(get_current_user),
):
    gs = service.get_state(current_user.id)
    return _session_to_state(gs)
