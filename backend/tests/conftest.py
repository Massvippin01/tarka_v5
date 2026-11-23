"""
Shared Pytest Fixtures for SentinelX × TARKA Backend Test Suites.

Adheres strictly to the SentinelX Wave 6 Engineering Constitution:
- Fail-closed security architecture
- Proper 7-factor RBAC authentication
- Explicit distinction between authenticated and unauthenticated test clients
"""

import os
import sys
import pytest
from starlette.testclient import TestClient

# Ensure backend directory is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.auth_service import AuthService


@pytest.fixture
def auth_service():
    return AuthService.get_instance()


@pytest.fixture
def valid_auth_token(auth_service):
    return auth_service.create_jwt_token("INVESTIGATOR_DELHI")


@pytest.fixture
def auth_headers(valid_auth_token):
    return {"Authorization": f"Bearer {valid_auth_token}"}


@pytest.fixture
def client(auth_headers):
    """
    Standard TestClient pre-configured with authorized investigator headers.
    Enforces that tests operate under proper 7-factor RBAC session context.
    """
    return TestClient(app, headers=auth_headers)


@pytest.fixture
def unauthenticated_client():
    """Explicitly unauthenticated TestClient for security boundary verification."""
    return TestClient(app)
