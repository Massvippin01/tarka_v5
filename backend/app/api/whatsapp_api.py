"""
TARKA Official WhatsApp Business Platform / Cloud API Webhook Endpoints.

Handles:
- Verification handshake (hub.mode, hub.verify_token, hub.challenge)
- Secure signature verification via X-Hub-Signature-256
- Non-blocking inbound message processing & SHA-256 provenance logging
- Strict safety disablement if credentials are not configured
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response, status

from app.core.config import settings
from app.services.whatsapp.cloud_api_service import WhatsAppCloudApiService

logger = logging.getLogger("tarka.api.whatsapp")
router = APIRouter(prefix="", tags=["WhatsApp Business Cloud API"])


@router.get("/webhook")
async def verify_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta Webhook Verification Handshake.
    Meta sends GET request when subscribing the webhook URL.
    """
    expected_token = settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN

    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("WhatsApp Cloud API webhook successfully verified by Meta challenge")
        return Response(content=hub_challenge or "", media_type="text/plain")

    logger.warning(f"WhatsApp webhook verification failed. Received token: '{hub_verify_token}'")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/webhook")
async def receive_inbound_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
):
    """
    Receives inbound citizen messages and media notifications from Meta WhatsApp Cloud API.
    Fails closed if signature is invalid or integration is disabled.
    """
    service = WhatsAppCloudApiService.get_instance()
    raw_body = await request.body()

    # If integration is disabled in config, gracefully reject or return disabled state
    if not settings.WHATSAPP_ENABLED:
        logger.info("WhatsApp webhook received while WHATSAPP_ENABLED is False; ignoring payload")
        return {
            "status": "disabled",
            "message": "WhatsApp Cloud API integration is disabled in configuration. Enable via WHATSAPP_ENABLED=true",
        }

    # Verify HMAC-SHA256 signature
    is_valid = service.verify_webhook_signature(raw_body, x_hub_signature_256)
    if not is_valid:
        logger.error("WhatsApp webhook rejected: Invalid or missing X-Hub-Signature-256")
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Webhook signature verification failed",
        )

    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Malformed JSON payload: {e}")

    records = service.process_inbound_payload(payload)
    return {
        "status": "success",
        "processed_count": len(records),
        "records": records,
    }


@router.get("/status")
async def get_whatsapp_status() -> Dict[str, Any]:
    """
    Returns current configuration and operational status of the WhatsApp integration.
    Never reveals access tokens or secret keys.
    """
    service = WhatsAppCloudApiService.get_instance()
    return {
        "enabled": settings.WHATSAPP_ENABLED,
        "phone_number_id_configured": bool(settings.WHATSAPP_PHONE_NUMBER_ID),
        "app_secret_configured": bool(settings.WHATSAPP_APP_SECRET),
        "access_token_configured": bool(settings.WHATSAPP_ACCESS_TOKEN),
        "webhook_verify_token_configured": bool(settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
        "processed_messages_count": len(service.processed_wamids),
        "statutory_compliance": "Section 63 BSA 2023 & DPDPA 2023 Non-Inference Enforced",
    }
