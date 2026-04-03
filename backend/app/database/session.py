import os
import logging
from collections.abc import Generator

from dotenv import load_dotenv, find_dotenv
from sqlmodel import Session, create_engine

load_dotenv(find_dotenv())

logger = logging.getLogger("uvicorn.error")

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "tower_defense")

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL, echo=False)

def connect_to_db():
    try:
        with engine.connect() as connection:
            logger.info("Connection successful!")
    except Exception as e:
        logger.error(f"Failed to connect: {e}")

def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency -- yields a SQLModel Session then closes it."""
    with Session(engine) as session:
        yield session
