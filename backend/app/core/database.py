"""
Engine et session factory partages par toute l'application.
On ne touche PAS a backend/database/db.py -- ce fichier-ci est le point
d'acces pour le code applicatif.
"""
from sqlmodel import Session, create_engine
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def get_session():
    """Dependance FastAPI : fournit une session DB par requete."""
    with Session(engine) as session:
        yield session
