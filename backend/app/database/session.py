"""
Test de connexion a la base de donnees au demarrage.

Reutilise l'engine defini dans app.core.database pour eviter un doublon.
"""
import logging

from ..core.database import engine

logger = logging.getLogger("uvicorn.error")


def connect_to_db():
    """Verifie la connexion a la BDD au demarrage. Leve l'exception si echec (fail-fast)."""
    try:
        with engine.connect() as connection:
            logger.info("Connection successful!")
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        raise
