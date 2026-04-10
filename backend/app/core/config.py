"""
Configuration centralisee -- toutes les variables d'environnement sont lues ici.
Aucun autre fichier ne doit lire os.getenv directement.
"""
import logging
import os
import secrets

from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

logger = logging.getLogger("uvicorn.error")

# --- Database ---
DB_USER: str = os.getenv("DB_USER", "postgres")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
DB_HOST: str = os.getenv("DB_HOST", "localhost")
DB_PORT: str = os.getenv("DB_PORT", "5432")
DB_NAME: str = os.getenv("DB_NAME", "postgres")

DATABASE_URL: str = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    "?sslmode=require"
)

# --- JWT ---
_jwt_secret_env: str | None = os.getenv("JWT_SECRET")
if _jwt_secret_env:
    JWT_SECRET: str = _jwt_secret_env
else:
    JWT_SECRET = secrets.token_urlsafe(32)
    logger.warning(
        "JWT_SECRET is not set! Using a random secret -- all tokens will be "
        "invalidated on restart. Set JWT_SECRET in your environment for production."
    )
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
REFRESH_TOKEN_EXPIRE_DAYS: int = 7

# --- Game defaults ---
STARTING_GOLD: int = 100
MAP_WIDTH: int = 20
MAP_HEIGHT: int = 15
