from contextlib import asynccontextmanager
from app.api.relationships import router as relationship_router
from app.api.explorer import router as explorer_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.explorer import router as explorer_router
from app.database.init_db import initialize_database

from app.api.health import router as health_router
from app.api.person import router as person_router
from app.api.case import router as case_router
from app.api.graph import router as graph_router


@asynccontextmanager
async def lifespan(app: FastAPI):

    initialize_database()

    yield


app = FastAPI(
    title="SentinelX",
    version="1.0.0",
    description="AI Criminal Intelligence Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    health_router,
    prefix="/api/v1",
    tags=["Health"],
)

app.include_router(
    person_router,
    prefix="/api/v1/persons",
    tags=["Persons"],
)

app.include_router(
    case_router,
    prefix="/api/v1/cases",
    tags=["Cases"],
)

app.include_router(
    graph_router,
    prefix="/api/v1/graph",
    tags=["Graph"],
)


@app.get("/")
def root():
    return {
        "application": "SentinelX",
        "status": "running",
        "version": "1.0.0",
    }

app.include_router(
    relationship_router,
    prefix="/api/v1/relationships",
    tags=["Relationships"],
)
app.include_router(
    explorer_router,
    prefix="/api/v1/explorer",
    tags=["Explorer"],
)
