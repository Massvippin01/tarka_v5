from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.case import router as case_router
from app.api.explorer import router as explorer_router
from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.investigation import router as investigation_router
from app.api.normalization import router as normalization_router
from app.api.person import router as person_router
from app.api.relationships import router as relationship_router
from app.api.resolution import router as resolution_router
from app.database.init_db import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="SENTINELX NEXUS",
    version="2.0.0",
    description="Synthetic National Criminal Intelligence & Cybercrime Platform",
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

app.include_router(
    relationship_router,
    prefix="/api/v1/relationships",
    tags=["Relationships"],
)

app.include_router(
    normalization_router,
    prefix="/api/v1/normalization",
    tags=["Normalization"],
)

app.include_router(
    resolution_router,
    prefix="/api/v1/resolution",
    tags=["Resolution"],
)

app.include_router(
    explorer_router,
    prefix="/api/v1/explorer",
    tags=["Explorer"],
)

app.include_router(
    investigation_router,
    prefix="/api/v1/investigation",
    tags=["Investigation"],
)

from app.api.investigations_api import proof_router, router as investigations_router

app.include_router(
    investigations_router,
    prefix="/api/v1/investigations",
    tags=["Investigations Workspace"],
)

app.include_router(
    proof_router,
    prefix="/api/v1/proof",
    tags=["Live Proof"],
)

from app.api.interaction_api import router as interaction_router

app.include_router(
    interaction_router,
    prefix="/api/v1/interaction",
    tags=["Interaction & Sentinel OS"],
)



@app.get("/")
def root():
    return {
        "application": "SENTINELX NEXUS",
        "status": "running",
        "version": "2.0.0",
        "benchmark": "India Criminal-Justice Information Ecosystem",
    }
