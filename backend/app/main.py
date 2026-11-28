from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.api.case import router as case_router
from app.api.explorer import router as explorer_router
from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.investigation import router as investigation_router
from app.api.normalization import router as normalization_router
from app.api.person import router as person_router
from app.api.relationships import router as relationship_router
from app.api.resolution import router as resolution_router
from app.core.config import settings
from app.database.init_db import initialize_database


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Hardened security response headers for production deployment."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enforce strict startup configuration validation
    settings.validate_startup_configuration()
    initialize_database()
    yield


app = FastAPI(
    title="SENTINELX NEXUS",
    version="2.0.0",
    description="Synthetic National Criminal Intelligence & Cybercrime Platform",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

from app.api.auth import router as auth_router

app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication & Google 2-Account"],
)

# Root-level health & readiness endpoints for platform health probes (Render, ALB, k8s)
app.include_router(
    health_router,
    tags=["Health Probes"],
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

from app.api.validation_lab_api import router as validation_lab_router

app.include_router(
    validation_lab_router,
    prefix="/api/v1/validation-lab",
    tags=["Founder Validation Lab"],
)

from app.api.projects_api import networks_router, router as projects_router
from app.api.ingestion_api import router as ingestion_router
from app.api.auth import router as auth_router
from app.api.whatsapp_api import router as whatsapp_router

app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication & Google OIDC"],
)

app.include_router(
    whatsapp_router,
    prefix="/api/v1/connectors/whatsapp",
    tags=["WhatsApp Business Cloud API"],
)

app.include_router(
    whatsapp_router,
    prefix="/api/v1/whatsapp",
    tags=["WhatsApp Business Cloud API (Direct)"],
)

app.include_router(
    projects_router,
    prefix="/api/v1/projects",
    tags=["Projects & Triage Operations"],
)

app.include_router(
    networks_router,
    prefix="/api/v1/cases",
    tags=["Fraud Networks & Inter-Tool Exports"],
)

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
