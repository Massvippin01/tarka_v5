from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class StatutoryAuthority:
    """
    Descriptive specification of a legal/statutory authority.
    CRITICAL RULE: This registry DESCRIBES statutory requirements.
    It NEVER itself grants authority. Authority is evaluated by PolicyGateway.
    """
    code: str
    act_name: str
    section: str
    title: str
    description: str
    permitted_roles: List[str]
    minimum_clearance: str
    required_form_template: str
    threshold_evidentiary_standard: str
    audit_requirement: str = "STATUTORY_LOG_REQUIRED"


class LegalAuthorityRegistry:
    """
    Extensible descriptive registry for statutory authorities and procedural requisitions.
    """
    _instance: Optional[LegalAuthorityRegistry] = None

    def __init__(self) -> None:
        self._authorities: Dict[str, StatutoryAuthority] = {
            "BNSS_94": StatutoryAuthority(
                code="BNSS_94",
                act_name="Bharatiya Nagarik Suraksha Sanhita, 2023",
                section="Section 94",
                title="Summons / Order to Produce Document or Thing",
                description="Statutory order issued by an Investigating Officer or Court for production of digital or physical records.",
                permitted_roles=["INVESTIGATOR", "SUPERVISOR", "CASE_ADMINISTRATOR"],
                minimum_clearance="RESTRICTED",
                required_form_template="FORM_BNSS_94_PRODUCTION_ORDER",
                threshold_evidentiary_standard="PRIMA_FACIE_RELEVANCE",
            ),
            "CRPC_91": StatutoryAuthority(
                code="CRPC_91",
                act_name="Code of Criminal Procedure, 1973",
                section="Section 91",
                title="Summons to produce document or other thing",
                description="Procedural requisition under CrPC for production of documents or digital data necessary for investigation.",
                permitted_roles=["INVESTIGATOR", "SUPERVISOR", "CASE_ADMINISTRATOR"],
                minimum_clearance="RESTRICTED",
                required_form_template="FORM_CRPC_91_SUMMONS",
                threshold_evidentiary_standard="PRIMA_FACIE_RELEVANCE",
            ),
            "BSA_63": StatutoryAuthority(
                code="BSA_63",
                act_name="Bharatiya Sakshya Adhiniyam, 2023",
                section="Section 63",
                title="Admissibility of Electronic Records Certificate",
                description="Statutory certification of electronic evidence hash integrity and computer custody.",
                permitted_roles=["INVESTIGATOR", "FORENSIC_ANALYST", "ANALYST"],
                minimum_clearance="RESTRICTED",
                required_form_template="FORM_BSA_63_CERTIFICATE",
                threshold_evidentiary_standard="CONTENT_HASH_VERIFIED",
            ),
            "IEA_65B": StatutoryAuthority(
                code="IEA_65B",
                act_name="Indian Evidence Act, 1872",
                section="Section 65B",
                title="Admissibility of Electronic Records",
                description="Certificate verifying cryptographic integrity and computer condition at time of extraction.",
                permitted_roles=["INVESTIGATOR", "FORENSIC_ANALYST", "ANALYST"],
                minimum_clearance="RESTRICTED",
                required_form_template="FORM_IEA_65B_CERTIFICATE",
                threshold_evidentiary_standard="CONTENT_HASH_VERIFIED",
            ),
            "TELECOM_TRAI_CDR": StatutoryAuthority(
                code="TELECOM_TRAI_CDR",
                act_name="Indian Telegraph Act / DOT Guidelines",
                section="Lawful Requisition Rule 419A",
                title="Requisition for Call Detail Records and Subscriber Identity (CAF)",
                description="Authorized requisition to telecom operators for cell tower dumps, IMEI history, and subscriber forms.",
                permitted_roles=["SUPERVISOR", "INVESTIGATOR"],
                minimum_clearance="SECRET",
                required_form_template="FORM_DOT_CDR_REQUISITION",
                threshold_evidentiary_standard="REASONABLE_SUSPICION_GROUNDED_IN_FIR",
            ),
            "IT_ACT_69": StatutoryAuthority(
                code="IT_ACT_69",
                act_name="Information Technology Act, 2000",
                section="Section 69",
                title="Directions for Interception, Monitoring or Decryption",
                description="Government-authorized directive issued by designated Competent Authority (Home Secretary).",
                permitted_roles=["CASE_ADMINISTRATOR"],
                minimum_clearance="SECRET",
                required_form_template="FORM_MHA_IT69_DIRECTIVE",
                threshold_evidentiary_standard="SOVEREIGN_AUTHORIZATION_REQUIRED",
            ),
        }

    @classmethod
    def get_instance(cls) -> LegalAuthorityRegistry:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_authority(self, code: str) -> Optional[StatutoryAuthority]:
        return self._authorities.get(code)

    def list_authorities(self) -> List[StatutoryAuthority]:
        return list(self._authorities.values())

    def format_statutory_notice(self, code: str, case_id: str, officer_id: str, target: str, scope: str) -> Dict[str, Any]:
        auth = self.get_authority(code)
        if not auth:
            raise ValueError(f"Unknown statutory authority code '{code}'.")

        return {
            "authority_code": auth.code,
            "statutory_basis": f"{auth.section}, {auth.act_name}",
            "title": auth.title,
            "case_id": case_id,
            "issuing_officer": officer_id,
            "target": target,
            "required_production_scope": scope,
            "evidentiary_threshold": auth.threshold_evidentiary_standard,
            "notice_format": auth.required_form_template,
            "governing_policy": "Section 91 CrPC / Section 94 BNSS Legal Authority Architecture",
        }
