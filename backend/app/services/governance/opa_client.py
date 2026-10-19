"""
SentinelX Phase 6 — Open Policy Agent (OPA) Client Abstraction.
Provides fail-closed remote OPA HTTP evaluations with local fallback.
"""

from __future__ import annotations

import json
import logging
import urllib.request
import urllib.error
from typing import Any, Dict, Optional
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger("sentinelx.governance.opa_client")


class OPAEvaluationResult(BaseModel):
    allowed: bool
    requires_confirmation: bool = False
    decision_source: str  # "OPA_REMOTE" or "LOCAL_FALLBACK"
    reason: str


class OPAClient:
    """
    HTTP Client for Open Policy Agent (OPA) Authorization Service.
    Queries the OPA REST API endpoint for authorization decisions.
    """
    def __init__(self, opa_url: Optional[str] = None):
        self.opa_url = (opa_url or getattr(settings, "OPA_URL", "http://localhost:8181")).rstrip("/")
        self.timeout = 2.0  # 2 second timeout for policy decisions

    def evaluate_policy(
        self,
        policy_path: str,
        input_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Query OPA at /v1/data/{policy_path}.
        Returns raw JSON result dict from OPA if successful, None if unreachable/error.
        """
        url = f"{self.opa_url}/v1/data/{policy_path.lstrip('/')}"
        payload = json.dumps({"input": input_data}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                if response.status == 200:
                    body = json.loads(response.read().decode("utf-8"))
                    return body.get("result")
                else:
                    logger.warning("OPA query returned HTTP %d", response.status)
                    return None
        except Exception as err:
            logger.debug("OPA client query failed: %s", err)
            return None
