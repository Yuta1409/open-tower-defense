"""Routes d'authentification."""
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from ..core.database import get_session
from ..core.deps import get_current_user
from ..models.user import User
from . import service
from .schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    user = service.register_user(
        pseudo=body.pseudo,
        password=body.password,
        session=session,
    )
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    _user, access_token, refresh_token = service.login_user(
        pseudo=body.pseudo,
        password=body.password,
        session=session,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, session: Session = Depends(get_session)):
    access_token, refresh_token = service.refresh_tokens(
        refresh_token_value=body.refresh_token,
        session=session,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
