"""
Logique metier de l'authentification.

Responsabilites :
- Inscription (hash bcrypt, unicite email/pseudo)
- Connexion (verification mot de passe, emission JWT)
- Refresh token (rotation, revocation)
"""
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, select

from ..core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    refresh_token_expiry,
    verify_password,
)
from ..models.user import User
from ..models.token import RefreshToken


def register_user(
    pseudo: str,
    password: str,
    session: Session,
) -> User:
    """Cree un nouvel utilisateur. Leve 409 si le pseudo est deja pris."""
    existing = session.exec(
        select(User).where(User.pseudo == pseudo)
    ).first()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce pseudo est deja pris",
        )

    user = User(
        pseudo=pseudo.strip(),
        password_hash=hash_password(password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def login_user(
    pseudo: str,
    password: str,
    session: Session,
) -> tuple[User, str, str]:
    """Authentifie un utilisateur et renvoie (user, access_token, refresh_token_value).

    Leve 401 si les identifiants sont incorrects.
    """
    user = session.exec(
        select(User).where(User.pseudo == pseudo, User.supprime_le.is_(None))  # type: ignore[arg-type]
    ).first()

    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pseudo ou mot de passe incorrect",
        )

    access_token = create_access_token(user.id)
    rt_value = create_refresh_token_value()
    rt = RefreshToken(
        id_user=user.id,
        token=rt_value,
        expired_at=refresh_token_expiry(),
        is_revoke=False,
    )
    session.add(rt)
    session.commit()

    return user, access_token, rt_value


def refresh_tokens(
    refresh_token_value: str,
    session: Session,
) -> tuple[str, str]:
    """Rotation du refresh token : revoque l'ancien, en cree un nouveau.

    Renvoie (new_access_token, new_refresh_token_value).
    Leve 401 si le token est invalide, expire ou revoque.
    """
    rt = session.exec(
        select(RefreshToken).where(RefreshToken.token == refresh_token_value)
    ).first()

    if rt is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide",
        )

    if rt.is_revoke:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoque",
        )

    now = datetime.now(timezone.utc)
    # expired_at peut etre naive ou aware -- on compare en UTC
    expired_at = rt.expired_at
    if expired_at.tzinfo is None:
        expired_at = expired_at.replace(tzinfo=timezone.utc)

    if now > expired_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expire",
        )

    # Revoquer l'ancien
    rt.is_revoke = True
    session.add(rt)

    # Verifier que l'utilisateur existe toujours
    user = session.exec(
        select(User).where(User.id == rt.id_user, User.supprime_le.is_(None))  # type: ignore[arg-type]
    ).first()

    if user is None:
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou supprime",
        )

    # Creer le nouveau couple
    new_access = create_access_token(user.id)
    new_rt_value = create_refresh_token_value()
    new_rt = RefreshToken(
        id_user=user.id,
        token=new_rt_value,
        expired_at=refresh_token_expiry(),
        is_revoke=False,
    )
    session.add(new_rt)
    session.commit()

    return new_access, new_rt_value
