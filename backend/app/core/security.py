"""
Utilitaires JWT et hachage de mot de passe.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import jwt

from .config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    JWT_SECRET,
    REFRESH_TOKEN_EXPIRE_DAYS,
)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------

def create_access_token(user_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token_value() -> str:
    """Genere une valeur opaque pour le refresh token (stocke en BDD)."""
    import secrets
    return secrets.token_urlsafe(64)


def decode_access_token(token: str) -> dict:
    """Decode et valide un access token. Leve jwt.PyJWTError en cas de probleme."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
