from contextlib import asynccontextmanager
import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.case import router as case_router
from app.api.explorer import router as explorer_router
from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.investigation import router as investigation_router
from app.api.normalization import router as normalization_router
from app.api.person import router as person_router
from app.api.relationships import router as relationship_router
from app.api.resolution import router as resolution_router
from app.api.system_api import router as system_router
from app.core.config import settings
from app.database.init_db import initialize_database

logger = logging.getLogger("sentinelx.nexus")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enforce strict startup configuration validation
    settings.validate_startup_configuration()
    initialize_database()
    try:
        from app.intelligence.local_llm_provider import warmup_model
        warmup_model(timeout_secs=5.0)
    except Exception as e:
        logger.warning(f"Ollama SLM model warmup non-blocking notice: {e}")
    yield


app = FastAPI(
    title="SENTINELX NEXUS",
    version="2.0.0",
    description="Synthetic National Criminal Intelligence & Cybercrime Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_and_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:12]}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_SERVER_ERROR",
    }
    code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
    msg = str(exc.detail) if exc.detail else "An error occurred"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": code,
            "message": msg,
            "detail": msg,
            "request_id": getattr(request.state, "request_id", None),
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_err = errors[0] if errors else {}
    field = ".".join(str(loc) for loc in first_err.get("loc", []))
    msg = first_err.get("msg", "Validation error")
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": f"Validation failed at {field}: {msg}",
            "detail": errors,
            "field": field,
            "request_id": getattr(request.state, "request_id", None),
        },
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

app.include_router(
    system_router,
    prefix="/api/v1/system",
    tags=["System"],
)

from app.api.intelligence import router as intelligence_router

app.include_router(
    intelligence_router,
    prefix="/api/v1/intelligence",
    tags=["Intelligence"],
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

from app.api.voice_api import router as voice_router

app.include_router(
    voice_router,
    prefix="/api/v1/voice",
    tags=["Realtime Voice"],
)

from app.api.context_api import router as context_router

app.include_router(
    context_router,
    prefix="/api/v1/context",
    tags=["Operating Context"],
)

from app.api.command_api import router as command_router

app.include_router(
    command_router,
    tags=["Command Control Plane"],
)

from app.api.agent_api import router as agent_router

app.include_router(
    agent_router,
    prefix="/api/v1",
    tags=["Governed Agent Control Plane"],
)

from app.api.memory_api import router as memory_router

app.include_router(
    memory_router,
    prefix="/api/v1/memory",
    tags=["Governed Investigation Memory"],
)

from app.api.graph_projection_api import router as graph_projection_router

app.include_router(
    graph_projection_router,
    prefix="/api/v1/graph-projection",
    tags=["Graph Authority & Realtime Projection"],
)

from app.api.forensics_api import router as forensics_router

app.include_router(
    forensics_router,
    prefix="/api/v1/forensics",
    tags=["TARKA Digital Forensics"],
)

from app.api.mule_scoring_api import router as analyze_router

app.include_router(
    analyze_router,
    prefix="/api/v1/analyze",
    tags=["Mule Scoring Engine"],
)

from app.api.ingestion_api import router as ingestion_router

app.include_router(
    ingestion_router,
    prefix="/api/v1/ingestion",
    tags=["Massive Evidence Ingestion & Admission"],
)

from tarka.api.server import app as tarka_app

app.mount("/api/v1/forensics/tarka", tarka_app)


@app.get("/")
def root():
    return {
        "application": "SENTINELX NEXUS",
        "status": "running",
        "version": "2.0.0",
        "benchmark": "India Criminal-Justice Information Ecosystem",
    }
