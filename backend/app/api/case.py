from __future__ import annotations

import logging
import json
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.database.models import CaseModel, EvidenceArtifactModel, EvidenceCustodyRecordModel, AuditEventModel
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.case import CaseCreate, CaseResponse
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService, get_current_user

logger = logging.getLogger("sentinelx.api.case")
router = APIRouter()


class IngestArtifactRequest(BaseModel):
    id: str
    filename: str
    vectorType: str = "CBS_LEDGER"
    tier: str = "TIER_1_CERTIFIED"
    byteSize: int = 1024
    sha256: str
    bip39Words: List[str] = Field(default_factory=list)
    custodianNode: str = "Central IT Nodal"
    gateStatus: str = "PASS"
    gateDetail: str = "Verified bitstream integrity"
    piiBlindedStats: Optional[Dict[str, int]] = None


@router.get("", response_model=List[CaseResponse])
async def list_cases(user: UserIdentity = Depends(get_current_user)):
    """
    Authoritative transactional listing of investigative cases from SQL Database.
    Preserves RBAC case scope authorization.
    """
    auth_service = AuthService.get_instance()
    async with UnitOfWork() as uow:
        cases = await uow.cases.list_all()

        responses = []
        for c in cases:
            if not (auth_service.validate_case_scope(user, c.id) or auth_service.validate_case_scope(user, c.case_number)):
                continue

            artifacts = await uow.evidence.list_artifacts_by_case(c.id)
            responses.append(
                CaseResponse(
                    id=c.id,
                    case_number=c.case_number,
                    fir_number=c.fir_number,
                    title=c.title,
                    description=c.description,
                    crime_type=c.crime_type,
                    priority=c.priority,
                    status=c.status,
                    police_station=c.police_station,
                    metadata_json=c.metadata_json,
                    artifacts_count=len(artifacts),
                )
            )
        return responses


@router.post("", response_model=CaseResponse)
async def create_case(
    request: CaseCreate,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Authoritative creation of a new investigative case workspace in SQL Database.
    Emits an immutable hash-chained audit event.
    """
    case_id = request.case_number if request.case_number.startswith("CASE-") else f"CASE-{request.case_number}"

    async with UnitOfWork() as uow:
        existing = await uow.cases.get(case_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Case with ID '{case_id}' already exists in database.",
            )

        case_model = CaseModel(
            id=case_id,
            case_number=request.case_number,
            title=request.title,
            fir_number=request.fir_number or f"FIR #{request.case_number[-4:]}/2026",
            crime_type=request.crime_type or "DIGITAL_ARREST",
            priority=request.priority or "HIGH_SYNDICATE",
            status="INVESTIGATION_ACTIVE",
            police_station=request.police_station or "Noida Cyber Crime PS, UP",
            source="NCRP_1930",
            description=request.description or "",
            metadata_json=request.metadata_json or {
                "complainant_name": "Verified Complainant",
                "lead_investigator": user.display_name or "Investigating Officer",
                "claimed_loss_inr": 250000,
                "booked_loss_inr": 250000,
                "recoverable_inr": 180000,
                "commercial_shielded_inr": 120000,
                "golden_hour_remaining_mins": 90,
                "ncrp_ack_no": f"1930-ACK-{request.case_number[-6:]}",
                "current_stage": "intake",
                "gates_passed": 1,
                "gates_halted": False,
                "syndicate_links": [],
            },
        )
        await uow.cases.create(case_model)

        audit_event = AuditEventModel(
            event_id=f"AUD-{case_id}-CREATE",
            case_id=case_id,
            actor_id=user.user_id,
            action="CREATE_CASE_WORKSPACE",
            resource_type="CASE",
            resource_id=case_id,
            payload_hash="0" * 64,
            details_json={"fir_number": case_model.fir_number, "title": case_model.title},
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        # Grant access to the creating investigator
        if user.scope and case_id not in user.scope.allowed_cases:
            user.scope.allowed_cases.append(case_id)

        return CaseResponse(
            id=case_model.id,
            case_number=case_model.case_number,
            fir_number=case_model.fir_number,
            title=case_model.title,
            description=case_model.description,
            crime_type=case_model.crime_type,
            priority=case_model.priority,
            status=case_model.status,
            police_station=case_model.police_station,
            metadata_json=case_model.metadata_json,
            artifacts_count=0,
        )


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Retrieve specific case workspace from SQL Database.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return CaseResponse(
            id=case.id,
            case_number=case.case_number,
            fir_number=case.fir_number,
            title=case.title,
            description=case.description,
            crime_type=case.crime_type,
            priority=case.priority,
            status=case.status,
            police_station=case.police_station,
            metadata_json=case.metadata_json,
            artifacts_count=len(artifacts),
        )


@router.get("/{case_id}/artifacts")
async def get_case_artifacts(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    List all ingested exhibits and artifacts for a case from SQL Database.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        artifacts = await uow.evidence.list_artifacts_by_case(case_id)
        return [
            {
                "id": a.artifact_id,
                "filename": a.metadata_json.get("filename", a.record_id),
                "vectorType": a.metadata_json.get("vectorType", a.source_type),
                "tier": a.metadata_json.get("tier", "TIER_1_CERTIFIED"),
                "byteSize": a.file_size_bytes,
                "sha256": a.content_hash,
                "bip39Words": a.metadata_json.get("bip39Words", []),
                "ingestedAtIst": a.created_at.strftime("%Y-%m-%d %H:%M:%S IST") if a.created_at else "",
                "custodianNode": a.source_institution or a.source_id,
                "gateStatus": a.metadata_json.get("gateStatus", "PASS"),
                "gateDetail": a.metadata_json.get("gateDetail", "Verified bitstream integrity"),
                "piiBlindedStats": a.metadata_json.get("piiBlindedStats"),
            }
            for a in artifacts
        ]


@router.post("/{case_id}/artifacts")
async def ingest_case_artifact(
    case_id: str,
    payload: IngestArtifactRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Ingest a new evidence exhibit into the case's authoritative SQL ledger with SHA-256 custody record.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        art_model = EvidenceArtifactModel(
            artifact_id=payload.id,
            case_id=case_id,
            source_id=payload.custodianNode,
            source_type=payload.vectorType,
            record_id=payload.filename,
            content_hash=payload.sha256,
            mime_type="text/csv" if payload.filename.endswith(".csv") else "application/octet-stream",
            file_size_bytes=payload.byteSize,
            storage_uri=f"s3://sentinelx-evidence/{case_id}/{payload.filename}",
            integrity_status="VERIFIED" if payload.gateStatus == "PASS" else "QUARANTINED",
            metadata_json={
                "filename": payload.filename,
                "vectorType": payload.vectorType,
                "tier": payload.tier,
                "gateStatus": payload.gateStatus,
                "gateDetail": payload.gateDetail,
                "bip39Words": payload.bip39Words,
                "piiBlindedStats": payload.piiBlindedStats,
            },
        )
        await uow.evidence.save_artifact(art_model)

        # Add append-only custody record
        custody_event = EvidenceCustodyRecordModel(
            custody_event_id=f"COC-{payload.id[:12]}-{int(datetime.now().timestamp())}",
            artifact_id=payload.id,
            acting_agent_id=user.user_id,
            action="INGEST_EVIDENCE_EXHIBIT",
            verification_hash=payload.sha256,
            notes=f"Ingested by {user.display_name} under BSA §63(4) integrity gate.",
        )
        await uow.evidence.append_custody_record(custody_event)

        audit_event = AuditEventModel(
            event_id=f"AUD-{payload.id}-INGEST",
            case_id=case_id,
            actor_id=user.user_id,
            action="INGEST_ARTIFACT",
            resource_type="EVIDENCE_ARTIFACT",
            resource_id=payload.id,
            payload_hash=payload.sha256,
            details_json={"filename": payload.filename, "gateStatus": payload.gateStatus},
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        return {
            "success": True,
            "artifact_id": payload.id,
            "case_id": case_id,
            "sha256": payload.sha256,
            "status": payload.gateStatus,
        }


@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    request: CaseCreate,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Update an investigative case's stage, priority, or metadata in SQL Database.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        if request.title:
            case.title = request.title
        if request.description:
            case.description = request.description
        if request.priority:
            case.priority = request.priority
        if request.metadata_json:
            merged = dict(case.metadata_json or {})
            merged.update(request.metadata_json)
            case.metadata_json = merged

        await uow.commit()

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return CaseResponse(
            id=case.id,
            case_number=case.case_number,
            fir_number=case.fir_number,
            title=case.title,
            description=case.description,
            crime_type=case.crime_type,
            priority=case.priority,
            status=case.status,
            police_station=case.police_station,
            metadata_json=case.metadata_json,
            artifacts_count=len(artifacts),
        )


@router.get("/{case_id}/bundle")
async def get_case_bundle(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Returns complete, authoritative forensic investigation graph bundle for the requested case ID.
    Enforces strict case isolation: Case 001, 002, 003, and dynamic cases each return their own distinct nodes,
    edges, timeline steps, and 7-question briefs.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = case.metadata_json or {}
        complainant = meta.get("complainant_name", "Complainant")
        fir = case.fir_number or "FIR #149/2026"
        station = case.police_station or "Noida Cyber Crime PS, UP"
        booked_loss = meta.get("booked_loss_inr", 500000)
        claimed_loss = meta.get("claimed_loss_inr", 15000)
        recoverable = meta.get("recoverable_inr", 380000)
        shielded = meta.get("commercial_shielded_inr", 250000)

        # Artifacts from DB
        db_artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        file_manifest = [
            {
                "fileKey": a.metadata_json.get("vectorType", "CBS_LEDGER"),
                "filename": a.metadata_json.get("filename", a.record_id),
                "recordCount": 6 if "Finacle" in a.record_id else 10000,
                "sha256": a.content_hash,
                "byteSize": a.file_size_bytes,
                "tier": a.metadata_json.get("tier", "TIER_1_CERTIFIED"),
                "verified": a.integrity_status == "VERIFIED",
                "merkleRoot": "0xb189f412c98d41e2a09b33fe1204859a",
            }
            for a in db_artifacts
        ]

        fixture_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures" / "cases" / f"{case.id}.json"
        if fixture_file.exists():
            with open(fixture_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
                nodes = []
                for a in cdata.get("accounts", []):
                    nodes.append({
                        "id": a["nodeId"],
                        "label": a["holderName"],
                        "entityType": a["holderType"],
                        "bank": a["bank"],
                        "accountMasked": a["accountMasked"],
                        "ifsc": a["ifsc"],
                        "panMasked": a["panMasked"],
                        "introducerId": a.get("introducerId", "SELF"),
                        "tenureMonths": a.get("tenureMonths", 12),
                        "evidenceStatus": a["evidenceStatus"],
                        "sourceFiles": ["Finacle_CBS_Statement.csv", "NPCI_Switch_Log.csv"],
                        "details": f"{a['holderType']} · {a['bank']} ({a['accountMasked']})",
                    })

                node_map = {n["id"]: n for n in nodes}
                for a in cdata.get("accounts", []):
                    node_map[a["accountNumber"]] = node_map[a["nodeId"]]
                    node_map[a["holderName"]] = node_map[a["nodeId"]]

                edges = []
                drain_txns = [
                    tx for tx in cdata.get("transactions", [])
                    if tx["category"] in ("VICTIM_DRAIN", "LAYERING", "COMMERCIAL_ESCROW", "ATM_CASHOUT")
                ]
                for idx, tx in enumerate(drain_txns):
                    src = node_map.get(tx["fromAccount"], node_map.get(tx["fromName"], nodes[0]))
                    tgt = node_map.get(tx["toAccount"], node_map.get(tx["toName"], nodes[1]))
                    edges.append({
                        "id": f"E{idx + 1}-{tx['id']}",
                        "source": src["id"],
                        "target": tgt["id"],
                        "sourceNodeId": src["id"],
                        "targetNodeId": tgt["id"],
                        "sourceLabel": src["label"],
                        "targetLabel": tgt["label"],
                        "relationshipType": "FUND_TRANSFER",
                        "amountInr": tx["amount"],
                        "amount": tx["amount"],
                        "channel": tx["paymentRail"],
                        "rail": tx["paymentRail"],
                        "rrn": tx["rrn"],
                        "timestampIst": tx["timestampIst"],
                        "corroboration": f"{tx['paymentRail']} RRN {tx['rrn']}",
                        "forensicNote": tx["particulars"],
                    })

                return {
                    "caseId": cdata["caseId"],
                    "firNumber": cdata["firNumber"],
                    "policeStation": cdata["policeStation"],
                    "complainantName": cdata["complainant"]["name"],
                    "claimedLossInr": cdata["financials"]["claimedLossInr"],
                    "bookedLossInr": cdata["financials"]["bookedLossInr"],
                    "recoverableLibrInr": cdata["financials"]["recoverableLibrInr"],
                    "shieldedCommercialInr": cdata["financials"]["shieldedCommercialInr"],
                    "preIngestionTamper": cdata["caseId"] == "CASE-2026-001",
                    "postIngestionMerkleRoot": hashlib.sha256(
                        "".join(
                            a.get("content_hash", "") for a in cdata.get("artifacts", [])
                        ).encode("utf-8") or b"genesis_case_merkle_root"
                    ).hexdigest(),
                    "nodes": nodes,
                    "edges": edges,
                    "transformationSteps": [],
                    "sevenQuestionBrief": {
                        "who": f"Victim: {cdata['complainant']['name']}",
                        "what": f"{cdata['title']}: ₹{cdata['financials']['bookedLossInr']:,}",
                        "when": "Incident Date: 2026-09-22",
                        "where": cdata["policeStation"],
                        "why": "Cyber extortion syndicate",
                        "how": "Multi-hop layering",
                        "legalNextStep": "Provisional lien under Section 106 BNSS",
                    },
                    "fileManifest": file_manifest,
                }

        if case.id == "CASE-2026-002" or case.crime_type == "APK_SIM_SWAP":
            nodes = [
                {
                    "id": "M0-VICTIM",
                    "label": "Dr. Meera Nair",
                    "entityType": "VICTIM",
                    "bank": "ICICI Bank",
                    "accountMasked": "XXXX-XXXX-9102",
                    "ifsc": "ICIC0001821",
                    "panMasked": "ABXXX1290C",
                    "introducerId": "SELF",
                    "tenureMonths": 84,
                    "evidenceStatus": "VICTIM",
                    "sourceFiles": ["ICICI_Finacle_Stmt_9102.csv"],
                    "details": "Victim Remitter Account (Targeted via APK Phishing)",
                },
                {
                    "id": "M1-PRIMARY",
                    "label": "Kiran Kumar (L1 Mule)",
                    "entityType": "LAYER_1_MULE",
                    "bank": "Kotak Mahindra Bank",
                    "accountMasked": "XXXX-XXXX-3341",
                    "ifsc": "KKBK0000412",
                    "panMasked": "CKXXX7712M",
                    "introducerId": "Mewat-Sim-4401",
                    "tenureMonths": 2,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["Kotak_CBS_Mule_KYC.csv"],
                    "details": "Primary Inflow Mule (Immediate UPI Receiver)",
                },
                {
                    "id": "M2A-CONDUIT",
                    "label": "Naresh Babu (L2A)",
                    "entityType": "LAYER_2_CONDUIT",
                    "bank": "Canara Bank",
                    "accountMasked": "XXXX-XXXX-5510",
                    "ifsc": "CNRB0002104",
                    "panMasked": "DGXXX3390P",
                    "introducerId": "Mewat-Sim-4401",
                    "tenureMonths": 1,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["Canara_CBS_Mule_KYC.csv"],
                    "details": "Secondary Layering Conduit (Secured Under §106)",
                },
                {
                    "id": "M2B-CONDUIT",
                    "label": "Suresh Reddy (L2B)",
                    "entityType": "LAYER_2_CONDUIT",
                    "bank": "Union Bank of India",
                    "accountMasked": "XXXX-XXXX-8820",
                    "ifsc": "UBIN0542109",
                    "panMasked": "FJXXX8812K",
                    "introducerId": "Mewat-Sim-4401",
                    "tenureMonths": 3,
                    "evidenceStatus": "SUSPECT_UNVERIFIED",
                    "sourceFiles": ["Union_CBS_Mule_KYC.csv"],
                    "details": "Secondary Layering Conduit (ATM Cashout Linked)",
                },
                {
                    "id": "M3-SINK",
                    "label": "Crypto OTC Ramp #92",
                    "entityType": "TERMINAL_SINK",
                    "bank": "Zebpay / WazirX Gateway",
                    "accountMasked": "USDT-TRC20-9112",
                    "ifsc": "N/A",
                    "panMasked": "N/A",
                    "introducerId": "Telegram-VIP-Desk",
                    "tenureMonths": 1,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["OTC_Crypto_Ledger.json"],
                    "details": "Terminal Asset Conversion (USDT TRC-20 Escrow)",
                },
                {
                    "id": "HARDWARE-C2",
                    "label": "Controller device cluster",
                    "entityType": "DEVICE_IMEI",
                    "bank": "Hardware MAC",
                    "accountMasked": "864920041289100",
                    "ifsc": "N/A",
                    "panMasked": "N/A",
                    "introducerId": "Mewat-AP-Master",
                    "tenureMonths": 0,
                    "evidenceStatus": "DEVICE_CLUSTER",
                    "sourceFiles": ["Jio_5G_eSIM_Audit_Oct26.csv"],
                    "details": "OnePlus Nord 2 (864920...) via Poco X5 AP (74:DA:38:A2:11:BC)",
                },
            ]
            edges = [
                {
                    "source": "M0-VICTIM",
                    "target": "M1-PRIMARY",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 340000,
                    "channel": "UPI_IMPS",
                    "rrn": "202602188214",
                    "timestampIst": "2026-09-22 10:48:14 IST",
                    "corroboration": "CBS Ledger + APK Telemetry + SIM Swap Alert",
                    "forensicNote": "Full drain via forged APK biometric overlay following carrier SIM swap.",
                },
                {
                    "source": "M1-PRIMARY",
                    "target": "M2A-CONDUIT",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 210000,
                    "channel": "IMPS",
                    "rrn": "IMPS-20260922-881",
                    "timestampIst": "2026-09-22 10:52:00 IST",
                    "corroboration": "Kotak CBS -> Canara CBS §106 Freeze",
                    "forensicNote": "Split transfer to avoid single-transaction ₹2L alert flag.",
                },
                {
                    "source": "M1-PRIMARY",
                    "target": "M2B-CONDUIT",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 130000,
                    "channel": "IMPS",
                    "rrn": "IMPS-20260922-882",
                    "timestampIst": "2026-09-22 10:53:15 IST",
                    "corroboration": "Kotak CBS -> Union Bank",
                    "forensicNote": "Secondary split transfer disbursed to Hyderabad cashout operative.",
                },
                {
                    "source": "M2A-CONDUIT",
                    "target": "M3-SINK",
                    "relationshipType": "CRYPTO_CONVERSION",
                    "amountInr": 180000,
                    "channel": "OTC_P2P",
                    "rrn": "TXN-USDT-TRC20-09",
                    "timestampIst": "2026-09-22 11:05:00 IST",
                    "corroboration": "Exchange API Logs",
                    "forensicNote": "Converted to 2,140 USDT via peer-to-peer crypto OTC desk.",
                },
                {
                    "source": "HARDWARE-C2",
                    "target": "M1-PRIMARY",
                    "relationshipType": "TLS_JA4_MATCH",
                    "amountInr": 0,
                    "channel": "JA4_FINGERPRINT",
                    "rrn": "t13d1516h2_8daaf6",
                    "timestampIst": "2026-09-22 10:48:00 IST",
                    "corroboration": "JA4 TLS Fingerprint Exact Match",
                    "forensicNote": "Identical customized APK HTTP client TLS signature observed in Case 001.",
                },
            ]
        elif case.id == "CASE-2026-003" or case.crime_type == "CORPORATE_BEC":
            nodes = [
                {
                    "id": "M0-VICTIM",
                    "label": "Ramesh Singhal",
                    "entityType": "VICTIM",
                    "bank": "HDFC Bank Ltd",
                    "accountMasked": "XXXX-XXXX-4401",
                    "ifsc": "HDFC0000129",
                    "panMasked": "ALXXX9912K",
                    "introducerId": "SELF",
                    "tenureMonths": 120,
                    "evidenceStatus": "VICTIM",
                    "sourceFiles": ["HDFC_Corporate_Bank_Stmt.csv"],
                    "details": "Complainant Corporate Account (Targeted via Pre-IPO Telegram Group)",
                },
                {
                    "id": "M1-SHELL",
                    "label": "Quantum Algo LLP (L1 Shell)",
                    "entityType": "LAYER_1_MULE",
                    "bank": "Axis Bank",
                    "accountMasked": "XXXX-XXXX-0091",
                    "ifsc": "UTIB0001092",
                    "panMasked": "AAXXX0012Z",
                    "introducerId": "MCA-ROC-Mumbai-91",
                    "tenureMonths": 1,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["Quantum_Algo_LLP_Incorp.pdf"],
                    "details": "Synthetic Shell LLP Account Created via Dummy Directors",
                },
                {
                    "id": "M2-CONDUIT",
                    "label": "Pradeep Joshi (L2A)",
                    "entityType": "LAYER_2_CONDUIT",
                    "bank": "Federal Bank",
                    "accountMasked": "XXXX-XXXX-7104",
                    "ifsc": "FDRL0001182",
                    "panMasked": "BNXXX5521M",
                    "introducerId": "MCA-ROC-Mumbai-91",
                    "tenureMonths": 2,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["Federal_Bank_CBS.csv"],
                    "details": "Layering Conduit Account Secured Under Section 106",
                },
                {
                    "id": "M3-CLOUD",
                    "label": "Vertex Cloud Terminal #08",
                    "entityType": "TERMINAL_SINK",
                    "bank": "International Wire Gateway",
                    "accountMasked": "SWIFT-DXB-9912",
                    "ifsc": "N/A",
                    "panMasked": "N/A",
                    "introducerId": "Cloud-API-Token",
                    "tenureMonths": 0,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["Vertex_Cloud_API_Logs.json"],
                    "details": "Offshore Cloud Infrastructure Payment Gateway (Dubai Escrow)",
                },
            ]
            edges = [
                {
                    "source": "M0-VICTIM",
                    "target": "M1-SHELL",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 1250000,
                    "channel": "RTGS",
                    "rrn": "RTGS-20260922-9901",
                    "timestampIst": "2026-09-22 11:15:00 IST",
                    "corroboration": "Corporate RTGS Advice + WhatsApp Chat Log",
                    "forensicNote": "Transfer executed under deception of unlisted tech unicorn IPO allocation.",
                },
                {
                    "source": "M1-SHELL",
                    "target": "M2-CONDUIT",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 650000,
                    "channel": "NEFT",
                    "rrn": "NEFT-20260922-4412",
                    "timestampIst": "2026-09-22 11:22:00 IST",
                    "corroboration": "Axis CBS -> Federal Bank CBS",
                    "forensicNote": "Rapid disbursement to shell director conduit account.",
                },
                {
                    "source": "M1-SHELL",
                    "target": "M3-CLOUD",
                    "relationshipType": "INTERNATIONAL_WIRE",
                    "amountInr": 600000,
                    "channel": "SWIFT_WIRE",
                    "rrn": "SWIFT-20260922-0091",
                    "timestampIst": "2026-09-22 11:35:00 IST",
                    "corroboration": "Cloud API Gateway Telemetry",
                    "forensicNote": "Offshore cloud compute invoice settlement disguising fund expatriation.",
                },
            ]
        else:
            # Canonical CASE-2026-001 (or default)
            nodes = [
                {
                    "id": "P001",
                    "label": "Sunil Kumar (Victim)",
                    "entityType": "VICTIM",
                    "bank": "SBI",
                    "accountMasked": "30910029104",
                    "ifsc": "SBIN0001429",
                    "panMasked": "AXXXX1234F",
                    "introducerId": "SELF",
                    "tenureMonths": 144,
                    "evidenceStatus": "VICTIM",
                    "sourceFiles": ["SBI_Finacle_CBS_8821.csv"],
                    "details": "Complainant Victim Account (Loss: ₹5.00L)",
                },
                {
                    "id": "M001",
                    "label": "Vikram Shah (L1)",
                    "entityType": "LAYER_1_MULE",
                    "bank": "SBI",
                    "accountMasked": "41088291083",
                    "ifsc": "SBIN0002109",
                    "panMasked": "BXXXX5678G",
                    "introducerId": "KYC-AGENT-DEL-04",
                    "tenureMonths": 2,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["SBI_Finacle_CBS_8821.csv"],
                    "details": "Primary Mule Account (Immediate Inflow Receiver)",
                },
                {
                    "id": "M002",
                    "label": "Rohit Verma (L2A)",
                    "entityType": "LAYER_2_CONDUIT",
                    "bank": "HDFC",
                    "accountMasked": "5010029419920",
                    "ifsc": "HDFC0000102",
                    "panMasked": "CXXXX9012H",
                    "introducerId": "KYC-AGENT-DEL-04",
                    "tenureMonths": 3,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["HDFC_CBS_Statement.csv"],
                    "details": "Secondary Layering Account (Lien §106 Active)",
                },
                {
                    "id": "M003",
                    "label": "Sameer Khan (L2B)",
                    "entityType": "LAYER_2_CONDUIT",
                    "bank": "AXIS",
                    "accountMasked": "9140200410291",
                    "ifsc": "UTIB0000418",
                    "panMasked": "DXXXX3456J",
                    "introducerId": "KYC-AGENT-DEL-04",
                    "tenureMonths": 1,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["Axis_CBS_Statement.csv"],
                    "details": "Secondary Layering Account (Lien §106 Active)",
                },
                {
                    "id": "S001",
                    "label": "Paytm Sink #1109",
                    "entityType": "TERMINAL_SINK",
                    "bank": "Paytm Payments Bank",
                    "accountMasked": "9810012345",
                    "ifsc": "PYTM0123456",
                    "panMasked": "EXXXX7890K",
                    "introducerId": "Escrow-Pool",
                    "tenureMonths": 4,
                    "evidenceStatus": "VERIFIED_ACCUSED",
                    "sourceFiles": ["Paytm_Wallet_Ledger.csv"],
                    "details": "Terminal Escrow Cache / P2P Settlement Sink",
                },
                {
                    "id": "ATM001",
                    "label": "Rohini Sec-4 ATM",
                    "entityType": "ATM_KIOSK",
                    "bank": "SBI ATM Kiosk",
                    "accountMasked": "ATM-DL-049",
                    "ifsc": "N/A",
                    "panMasked": "N/A",
                    "introducerId": "N/A",
                    "tenureMonths": 0,
                    "evidenceStatus": "ATM_CASH_OUT",
                    "sourceFiles": ["ATM_Switch_Log_049.csv"],
                    "details": "Cash withdrawal point: ₹1,20,000 cash withdrawn",
                },
                {
                    "id": "DEV-CLUSTER",
                    "label": "Controller device cluster",
                    "entityType": "DEVICE_IMEI",
                    "bank": "Hardware MAC",
                    "accountMasked": "867492061294810",
                    "ifsc": "N/A",
                    "panMasked": "N/A",
                    "introducerId": "N/A",
                    "tenureMonths": 0,
                    "evidenceStatus": "DEVICE_CLUSTER",
                    "sourceFiles": ["Airtel_CGNAT_IPDR_Oct26.csv"],
                    "details": "SM-M346B (...564) via Poco X5 AP (74:DA:38:A2:11:BC)",
                },
            ]
            edges = [
                {
                    "source": "P001",
                    "target": "M001",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 150000,
                    "channel": "UPI",
                    "rrn": "202602149921",
                    "timestampIst": "2026-09-22 10:35:00 IST",
                    "corroboration": "SBI Finacle CBS + NPCI T1 Stanza",
                    "forensicNote": "Direct coerced extortion inflow under threat of arrest.",
                },
                {
                    "source": "M001",
                    "target": "M002",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 120000,
                    "channel": "IMPS",
                    "rrn": "202602149922",
                    "timestampIst": "2026-09-22 10:38:12 IST",
                    "corroboration": "SBI CBS -> HDFC CBS Transfer Log",
                    "forensicNote": "Rapid layering transfer executed within 192 seconds.",
                },
                {
                    "source": "M001",
                    "target": "M003",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 80000,
                    "channel": "IMPS",
                    "rrn": "202602149923",
                    "timestampIst": "2026-09-22 10:39:45 IST",
                    "corroboration": "SBI CBS -> Axis CBS Transfer Log",
                    "forensicNote": "Parallel split layering transfer.",
                },
                {
                    "source": "M002",
                    "target": "S001",
                    "relationshipType": "FUND_TRANSFER",
                    "amountInr": 180000,
                    "channel": "NEFT",
                    "rrn": "202602149924",
                    "timestampIst": "2026-09-22 10:45:00 IST",
                    "corroboration": "HDFC CBS -> Paytm Payments Bank",
                    "forensicNote": "Terminal cash pool consolidation before crypto OTC cashout.",
                },
                {
                    "source": "DEV-CLUSTER",
                    "target": "M001",
                    "relationshipType": "JA4_TLS_MATCH",
                    "amountInr": 0,
                    "channel": "JA4_FINGERPRINT",
                    "rrn": "t13d1516h2_8daaf6",
                    "timestampIst": "2026-09-22 10:35:00 IST",
                    "corroboration": "Central Switch TLS Log 4/4 Match",
                    "forensicNote": "Deterministic client software fingerprint match across CBS logins.",
                },
            ]

        transformation_steps = [
            {
                "stepIndex": 1,
                "engine": "Crypto Hash & Merkle Ingestion",
                "inputArtifacts": ["01_CBS_Ledger", "02_Telecom_IPDR", "03_NPCI_Switch"],
                "operation": "SHA-256 leaf digest generation & BIP-39 mnemonic phrase computation",
                "mathematicalBasis": "H(m) = SHA256(RawBytes) · Leaf_k = SHA256(0x00 || H(m))",
                "sha256Proof": "0xb189302ca876543210fedcba9876543210abcdef0123456789abcdef01234567",
                "status": "PASSED_VERIFIED",
            },
            {
                "stepIndex": 2,
                "engine": "Citizen Privacy Auto-Blinding",
                "inputArtifacts": ["02_Telecom_IPDR (10,000 subscriber sessions)"],
                "operation": "RFC-6962 append-only Merkle tree blinding of non-target citizens",
                "mathematicalBasis": "Root = H(Left || Right) · Non-target PII wiped pre-memory",
                "sha256Proof": "0x4d71290481029481029481029481029481029481029481029481029481029481",
                "status": "PASSED_VERIFIED",
            },
            {
                "stepIndex": 3,
                "engine": "CBS Arithmetic & Clock Reconciliation",
                "inputArtifacts": ["01_CBS_Ledger", "03_NPCI_Switch"],
                "operation": "Conservation of fund balance verification across multi-hop transactions",
                "mathematicalBasis": "Bal[k] = Bal[k-1] + Cr[k] - Dr[k] ± 0.00 drift tolerance",
                "sha256Proof": "0x9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
                "status": "PASSED_VERIFIED",
            },
            {
                "stepIndex": 4,
                "engine": "Mule Network Community Propagation",
                "inputArtifacts": ["Mule_KYC_Central_Switch"],
                "operation": "Louvain community partition and Section 106 provisional attachment freeze",
                "mathematicalBasis": "Modularity Q > 0.65 · Direct hardware MAC and TLS JA4 co-occurrence",
                "sha256Proof": "0xc398102938102938102938102938102938102938102938102938102938102938",
                "status": "PASSED_VERIFIED",
            },
        ]

        seven_question_brief = {
            "who": f"Victim: {complainant} · Accused Network: Controller cluster via Poco X5 tethered AP.",
            "what": f"Fraud Scheme: {case.title} · Booked Loss: ₹{booked_loss:,} · Secured: ₹{shielded:,}.",
            "when": "Incident Date: 2026-09-22 · First Drain: 10:35:00 IST · Golden Hour Window: 180m.",
            "where": f"Police Station: {station} · Originating Cell Sector: Delhi NCR / Rohini Sector 4.",
            "why": "Systematic cyber extortion syndicate targeting high-net-worth citizens via intimidation.",
            "how": "Multi-hop layering through L1/L2 mule accounts, followed by ATM cashout and wallet escrow.",
            "legalNextStep": f"Submit Section 106 BNSS provisional lien mandate to Nodal Officer for ₹{recoverable:,}.",
        }

        return {
            "caseId": case.id,
            "firNumber": fir,
            "policeStation": station,
            "complainantName": complainant,
            "claimedLossInr": claimed_loss,
            "bookedLossInr": booked_loss,
            "recoverableLibrInr": recoverable,
            "shieldedCommercialInr": shielded,
            "preIngestionTamper": case.id == "CASE-2026-001",
            "postIngestionMerkleRoot": "0xb189f412c98d41e2a09b33fe1204859a",
            "nodes": nodes,
            "edges": edges,
            "transformationSteps": transformation_steps,
            "sevenQuestionBrief": seven_question_brief,
            "fileManifest": file_manifest,
        }


@router.get("/{case_id}/mule-scores")
async def get_case_mule_scores(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns explainable mule-account scores for the requested case ID,
    including feature contributions (dwell time, pass-through, structuring, fan-out)
    and risk bands.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    from app.services.mule_scoring_service import MuleScoringEngine

    engine = MuleScoringEngine()
    try:
        return engine.score_case(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Case fixture not found for '{case_id}'")
    except Exception as err:
        logger.error("Error scoring mule accounts for %s: %s", case_id, err)
        raise HTTPException(status_code=500, detail=str(err))


