"""Routes d'authentification."""
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlmodel import Session

from ..core.config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from ..core.database import get_session
from ..core.deps import get_current_user
from ..models.user import User
from . import service
from .schemas import LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

_ACCESS_MAX_AGE = ACCESS_TOKEN_EXPIRE_MINUTES * 60
_REFRESH_MAX_AGE = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,        # passer a True en production (HTTPS)
        max_age=_ACCESS_MAX_AGE,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=_REFRESH_MAX_AGE,
        path="/",
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    """Cree un compte. Ne connecte pas automatiquement (appeler /login ensuite)."""
    user = service.register_user(
        pseudo=body.pseudo,
        password=body.password,
        session=session,
    )
    return user


@router.post("/login", response_model=UserResponse)
def login(body: LoginRequest, response: Response, session: Session = Depends(get_session)):
    """Authentifie et pose les cookies HttpOnly access_token + refresh_token."""
    user, access_token, refresh_token = service.login_user(
        pseudo=body.pseudo,
        password=body.password,
        session=session,
    )
    _set_auth_cookies(response, access_token, refresh_token)
    return user


@router.post("/refresh")
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    session: Session = Depends(get_session),
):
    """Rotation des tokens via cookie. Pose de nouveaux cookies."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token manquant",
        )
    access_token, new_refresh_token = service.refresh_tokens(
        refresh_token_value=refresh_token,
        session=session,
    )
    _set_auth_cookies(response, access_token, new_refresh_token)
    return {"ok": True}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    session: Session = Depends(get_session),
):
    """Efface les cookies d'authentification et revoque le refresh token en BDD."""
    if refresh_token:
        service.revoke_refresh_token(refresh_token, session)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
