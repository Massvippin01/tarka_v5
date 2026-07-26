from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():

    return {
        "status": "healthy",
        "application": "SentinelX",
    }


@router.get("/ready")
def ready():

    return {"ready": True}
