from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "application": "SentinelX",
        "system": "TARKA Forensic Intelligence Platform",
        "version": "2.0.0",
        "forensics": "operational",
    }


@router.get("/ready")
def ready():
    return {
        "ready": True,
        "status": "ready",
        "application": "SentinelX",
        "system": "TARKA Forensic Intelligence Platform",
    }

