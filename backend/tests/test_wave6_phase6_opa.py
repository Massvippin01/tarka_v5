"""
SentinelX Phase 6 — Open Policy Agent (OPA) Integration & Policy Enforcement Tests.
Verifies OPA client, Rego policy structure, and PolicyGateway 7-factor integration.
"""

import pytest
from unittest.mock import MagicMock, patch
from app.domain.interaction import ActionRiskClass, ToolDefinition
from app.services.governance.opa_client import OPAClient
from app.services.governance.policy_gateway import PolicyGateway


@pytest.fixture
def mock_tool():
    return ToolDefinition(
        name="SEARCH_CDR_TELECOM",
        description="Search telecom call detail records",
        required_role="INVESTIGATOR",
        required_clearance="CONFIDENTIAL",
        risk_class=ActionRiskClass.ANALYZE,
        case_scope_required=True,
        statutory_power_code="BNSS_94",
        input_schema={},
        output_schema={},
    )


class TestWave6Phase6OPA:

    def test_opa_client_initialization(self):
        client = OPAClient()
        assert client.opa_url.startswith("http")
        assert client.timeout == 2.0

    @patch("urllib.request.urlopen")
    def test_opa_client_evaluate_policy_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b'{"result": {"allow": true, "requires_confirmation": false}}'
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        client = OPAClient(opa_url="http://localhost:8181")
        res = client.evaluate_policy("sentinelx/authz", {"test": "data"})
        assert res is not None
        assert res["allow"] is True

    @patch("urllib.request.urlopen")
    def test_opa_client_evaluate_policy_failure_graceful_fallback(self, mock_urlopen):
        mock_urlopen.side_effect = Exception("Connection refused")

        client = OPAClient(opa_url="http://localhost:8181")
        res = client.evaluate_policy("sentinelx/authz", {"test": "data"})
        assert res is None

    def test_policy_gateway_evaluates_local_7_factors(self, mock_tool):
        gateway = PolicyGateway()
        decision = gateway.evaluate(
            tool_def=mock_tool,
            officer_role="INVESTIGATOR",
            officer_clearance="CONFIDENTIAL",
            case_id="CASE-2026-001",
            allowed_cases=["CASE-2026-001"],
            jurisdiction="Delhi NCR",
            allowed_jurisdictions=["Delhi NCR"],
            operational_purpose="Investigating burner SIM linkage",
        )
        assert decision.allowed is True
        assert "AUTHORIZED" in decision.reason

    def test_policy_gateway_denies_insufficient_clearance(self, mock_tool):
        gateway = PolicyGateway()
        decision = gateway.evaluate(
            tool_def=mock_tool,
            officer_role="ANALYST",
            officer_clearance="UNCLASSIFIED",  # Lower than CONFIDENTIAL
            case_id="CASE-2026-001",
            allowed_cases=["CASE-2026-001"],
            jurisdiction="Delhi NCR",
            allowed_jurisdictions=["Delhi NCR"],
            operational_purpose="Investigating burner SIM linkage",
        )
        assert decision.allowed is False
        assert "INSUFFICIENT_CLEARANCE" in decision.reason
