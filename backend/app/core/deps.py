"""
Dependances FastAPI reutilisables (auth, session DB).
"""
from uuid import UUID

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session, select

from .database import get_session
from .security import decode_access_token
from ..models.user import User


def get_current_user(
    access_token: str | None = Cookie(default=None),
    session: Session = Depends(get_session),
) -> User:
    """Valide le JWT dans le cookie HttpOnly et renvoie l'utilisateur.

    Leve 401 si le cookie est absent, invalide, expire ou que l'utilisateur
    n'existe pas.
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifie",
        )

    try:
        payload = decode_access_token(access_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expire",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    user = session.exec(
        select(User).where(User.id == user_id, User.supprime_le.is_(None))  # type: ignore[arg-type]
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou supprime",
        )

    return user
