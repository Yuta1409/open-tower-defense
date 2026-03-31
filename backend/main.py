from fastapi import FastAPI
from contextlib import asynccontextmanager
from database.db import connect_to_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_db()
    yield
    
app = FastAPI(lifespan=lifespan)
        
@app.get("/")
async def root():
    return {"message": "Hello World"}