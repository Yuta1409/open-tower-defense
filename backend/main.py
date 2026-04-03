from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database.session import connect_to_db

from app.auth.router import router as auth_router
from app.game.router import router as game_router
from app.leaderboard.router import router as leaderboard_router
from app.reference.router import router as reference_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_to_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth_router)
app.include_router(game_router)
app.include_router(leaderboard_router)
app.include_router(reference_router)

@app.get("/")
async def root():
    return {"message": "Hello World"}