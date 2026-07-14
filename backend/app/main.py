from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.graph import router as graph_router
from app.database.db import (
    close_neo4j_connection,
    verify_neo4j_connection,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_neo4j_connection()
    yield
    close_neo4j_connection()


app = FastAPI(
    title="SentinelX API",
    description="Graph-powered intelligence platform API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    graph_router,
    prefix="/graph",
    tags=["Graph"],
)


@app.get("/")
def root():
    return {
        "service": "SentinelX API",
        "status": "running",
        "version": "0.1.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }