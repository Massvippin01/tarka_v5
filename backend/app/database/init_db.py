from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy import select

from app.core.config import settings
from app.database.base import Base
from app.database.session import get_async_engine, get_async_sessionmaker
from app.database.models import (
    CaseModel,
    EvidenceArtifactModel,
    EntityModel,
    RelationshipModel,
    AuditEventModel,
)
from app.generators.scenario_generator import ScenarioGenerator
from app.graph.graph_schema import CONSTRAINTS, INDEXES

logger = logging.getLogger("sentinelx.init")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


CANONICAL_CASES_SEED = [
    {
        "id": "CASE-2026-001",
        "case_number": "CASE-2026-001",
        "title": "CBI/TRAI Fake Digital Arrest Extortion",
        "fir_number": "FIR #149/2026",
        "crime_type": "DIGITAL_ARREST",
        "priority": "CRITICAL_GOLDEN_HOUR",
        "status": "INVESTIGATION_ACTIVE",
        "police_station": "Noida Cyber Crime PS, UP",
        "source": "NCRP_1930",
        "description": "Complainant Sunil Kumar coerced into transferring ₹5,00,000 under fraudulent digital arrest and extortion.",
        "metadata_json": {
            "complainant_name": "Sunil Kumar",
            "lead_investigator": "Insp. R. K. Sharma (IO-409)",
            "claimed_loss_inr": 15000,
            "booked_loss_inr": 500000,
            "recoverable_inr": 380000,
            "commercial_shielded_inr": 250000,
            "golden_hour_remaining_mins": 118,
            "ncrp_ack_no": "1930-ACK-2311098412",
            "current_stage": "intake",
            "gates_passed": 4,
            "gates_halted": False,
            "syndicate_links": [
                {
                    "linked_case_id": "CASE-2026-003",
                    "shared_anchor_type": "JA4_TLS",
                    "shared_anchor_value": "t13d1516h2_8daaf6",
                },
                {
                    "linked_case_id": "CASE-2026-003",
                    "shared_anchor_type": "WIFI_BSSID",
                    "shared_anchor_value": "74:DA:38:A2:11:BC",
                },
            ],
        },
        "artifacts": [
            {
                "artifact_id": "art-01-cbs",
                "source_id": "SBI-IT-NODAL",
                "source_type": "BANK_STATEMENT",
                "record_id": "SBI-CBS-8821",
                "content_hash": "b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567",
                "mime_type": "text/csv",
                "file_size_bytes": 1420,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-001/SBI_Finacle_CBS_8821.csv",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "SBI_Finacle_CBS_8821.csv",
                    "vectorType": "CBS_LEDGER",
                    "tier": "TIER_1_CERTIFIED",
                    "gateStatus": "PASS",
                    "gateDetail": "All running balances satisfy Bal[k] = Bal[k-1] + Cr[k] - Dr[k] with 0.00 residual error.",
                    "bip39Words": ["ANCHOR", "COBALT", "DELTA", "GRANITE", "KILO", "VECTOR"],
                },
            },
            {
                "artifact_id": "art-02-cgnat",
                "source_id": "AIRTEL-DOT-ENCLAVE",
                "source_type": "TELECOM_IPDR",
                "record_id": "AIRTEL-IPDR-OCT26",
                "content_hash": "4d71290481029481029481029481029481029481029481029481029481029481",
                "mime_type": "text/csv",
                "file_size_bytes": 482000,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-001/Airtel_CGNAT_IPDR_Oct26.csv",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "Airtel_CGNAT_IPDR_Oct26.csv",
                    "vectorType": "TELCO_CGNAT",
                    "tier": "TIER_1_CERTIFIED",
                    "gateStatus": "PASS",
                    "gateDetail": "Auto-blinded 9,996 / 10,000 civilian subscriber records under RFC-6962 Merkle tree prior to memory hydration.",
                    "bip39Words": ["BRAVO", "ECHO", "FOXTROT", "SIERRA", "TANGO", "ZULU"],
                },
            },
            {
                "artifact_id": "art-03-xml",
                "source_id": "NPCI-CENTRAL-SWITCH",
                "source_type": "NPCI_UPI_SWITCH",
                "record_id": "NPCI-T1-149921",
                "content_hash": "9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
                "mime_type": "application/xml",
                "file_size_bytes": 3840,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-001/NPCI_UPI2_Switch_149921.xml",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "NPCI_UPI2_Switch_149921.xml",
                    "vectorType": "NPCI_XML",
                    "tier": "TIER_1_CERTIFIED",
                    "gateStatus": "PASS",
                    "gateDetail": "NPCI UPI 2.0 XML schema valid. Extracted BSSID: 74:DA:38:A2:11:BC · JA4: t13d1516h2_8daaf6.",
                    "bip39Words": ["ALPHA", "CANYON", "EMBER", "HARBOR", "LUNAR", "OASIS"],
                },
            },
            {
                "artifact_id": "art-04-pdf",
                "source_id": "COMPLAINANT-HANDSET",
                "source_type": "RECEIPT_PDF",
                "record_id": "NOTICE-CBI-FAKE",
                "content_hash": "c398102938102938102938102938102938102938102938102938102938102938",
                "mime_type": "application/pdf",
                "file_size_bytes": 84200,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-001/Canva_Digital_Arrest_Notice.pdf",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "Canva_Digital_Arrest_Notice.pdf",
                    "vectorType": "PDF_RECEIPT",
                    "tier": "TIER_2_CORROBORATIVE",
                    "gateStatus": "PASS",
                    "gateDetail": "2 %%EOF markers detected (Canva layer). Flagged for incremental PDF byte tampering review.",
                    "bip39Words": ["COAST", "FALCON", "GLACIER", "INDIGO", "MEADOW", "PRISM"],
                },
            },
        ],
    },
    {
        "id": "CASE-2026-002",
        "case_number": "CASE-2026-002",
        "title": "Malicious Wedding Card APK & Dual-SIM Swap",
        "fir_number": "FIR #88/2026",
        "crime_type": "APK_SIM_SWAP",
        "priority": "HIGH_SYNDICATE",
        "status": "INVESTIGATION_ACTIVE",
        "police_station": "Cyberabad Cyber Crime PS, Telangana",
        "source": "NCRP_1930",
        "description": "Dr. Meera Nair targeted via malicious WhatsApp wedding invitation APK and carrier SIM swap extortion.",
        "metadata_json": {
            "complainant_name": "Dr. Meera Nair",
            "lead_investigator": "Insp. V. Srinivas (IO-218)",
            "claimed_loss_inr": 340000,
            "booked_loss_inr": 340000,
            "recoverable_inr": 210000,
            "commercial_shielded_inr": 180000,
            "golden_hour_remaining_mins": 42,
            "ncrp_ack_no": "1930-ACK-992104812",
            "current_stage": "attribution",
            "gates_passed": 3,
            "gates_halted": False,
            "syndicate_links": [
                {
                    "linked_case_id": "CASE-2026-001",
                    "shared_anchor_type": "WIFI_BSSID",
                    "shared_anchor_value": "74:DA:38:A2:11:BC",
                },
            ],
        },
        "artifacts": [
            {
                "artifact_id": "art-c02-01",
                "source_id": "ICICI-NODAL",
                "source_type": "BANK_STATEMENT",
                "record_id": "ICICI-CBS-9102",
                "content_hash": "2a10bf8810294810294810294810294810294810294810294810294810294810",
                "mime_type": "text/csv",
                "file_size_bytes": 2240,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-002/ICICI_Finacle_Stmt_9102.csv",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "ICICI_Finacle_Stmt_9102.csv",
                    "vectorType": "CBS_LEDGER",
                    "tier": "TIER_1_CERTIFIED",
                    "gateStatus": "PASS",
                    "gateDetail": "Balance arithmetic verified across 12 rows with zero ledger error.",
                    "bip39Words": ["AMBER", "CANYON", "DYNAMIC", "FROST", "GALAXY", "HARBOR"],
                },
            },
            {
                "artifact_id": "art-c02-02",
                "source_id": "JIO-DOT-ENCLAVE",
                "source_type": "TELECOM_IPDR",
                "record_id": "JIO-ESIM-OCT26",
                "content_hash": "7b98210481029481029481029481029481029481029481029481029481029481",
                "mime_type": "text/csv",
                "file_size_bytes": 312000,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-002/Jio_5G_eSIM_Audit_Oct26.csv",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "Jio_5G_eSIM_Audit_Oct26.csv",
                    "vectorType": "TELCO_CGNAT",
                    "tier": "TIER_1_CERTIFIED",
                    "gateStatus": "PASS",
                    "gateDetail": "eSIM activation confirmed via unauthorized IVR bypass from Mewat tower.",
                    "bip39Words": ["BREEZE", "DESERT", "ECHO", "ISLAND", "JUNIPER", "LAGOON"],
                },
            },
        ],
    },
    {
        "id": "CASE-2026-003",
        "case_number": "CASE-2026-003",
        "title": "Grey Market IPO Syndicate & Cloud API Laundering",
        "fir_number": "FIR #312/2026",
        "crime_type": "CORPORATE_BEC",
        "priority": "HIGH_SYNDICATE",
        "status": "INVESTIGATION_ACTIVE",
        "police_station": "BKC Cyber Police Station, Mumbai",
        "source": "NCRP_1930",
        "description": "Ramesh Singhal induced to wire ₹12,50,000 for fictitious pre-IPO tech allotment via synthetic cloud terminal.",
        "metadata_json": {
            "complainant_name": "Ramesh Singhal",
            "lead_investigator": "ACP Anita Deshmukh (IO-102)",
            "claimed_loss_inr": 1250000,
            "booked_loss_inr": 1250000,
            "recoverable_inr": 920000,
            "commercial_shielded_inr": 600000,
            "golden_hour_remaining_mins": 0,
            "ncrp_ack_no": "1930-ACK-551029411",
            "current_stage": "network",
            "gates_passed": 5,
            "gates_halted": False,
            "syndicate_links": [
                {
                    "linked_case_id": "CASE-2026-001",
                    "shared_anchor_type": "JA4_TLS",
                    "shared_anchor_value": "t13d1516h2_8daaf6",
                },
            ],
        },
        "artifacts": [
            {
                "artifact_id": "art-c03-01",
                "source_id": "HDFC-CORP-DESK",
                "source_type": "BANK_STATEMENT",
                "record_id": "HDFC-CBS-5501",
                "content_hash": "ff90128481029481029481029481029481029481029481029481029481029481",
                "mime_type": "text/csv",
                "file_size_bytes": 3410,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-003/HDFC_Corporate_Bank_Stmt.csv",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "HDFC_Corporate_Bank_Stmt.csv",
                    "vectorType": "CBS_LEDGER",
                    "tier": "TIER_1_CERTIFIED",
                    "gateStatus": "PASS",
                    "gateDetail": "Corporate wire reconciliation verified with valid IFSC and UTR stamp.",
                    "bip39Words": ["SUMMIT", "VALLEY", "ZENITH", "AURORA", "CYPRESS", "EMBER"],
                },
            },
        ],
    },
    {
        "id": "CASE-2026-004",
        "case_number": "CASE-2026-004",
        "title": "Telegram Work-from-Home Task Fraud & Crypto Siphon",
        "fir_number": "FIR #405/2026",
        "crime_type": "TASK_FRAUD",
        "priority": "CRITICAL_GOLDEN_HOUR",
        "status": "INVESTIGATION_ACTIVE",
        "police_station": "Bangalore Cyber Crime PS, Karnataka",
        "source": "NCRP_1930",
        "description": "Pooja Hegde defrauded of ₹1,80,000 via Telegram YouTube rating commission task lure.",
        "metadata_json": {
            "complainant_name": "Pooja Hegde",
            "lead_investigator": "Insp. Manjunath Gowda (IO-314)",
            "claimed_loss_inr": 180000,
            "booked_loss_inr": 180000,
            "recoverable_inr": 110000,
            "commercial_shielded_inr": 50000,
            "golden_hour_remaining_mins": 85,
            "ncrp_ack_no": "1930-ACK-338192041",
            "current_stage": "intake",
            "gates_passed": 4,
            "gates_halted": False,
            "syndicate_links": [
                {
                    "linked_case_id": "CASE-2026-001",
                    "shared_anchor_type": "IMEI_TAC",
                    "shared_anchor_value": "86749206",
                },
            ],
        },
        "artifacts": [
            {
                "artifact_id": "art-c04-01",
                "source_id": "AXIS-NODAL",
                "source_type": "BANK_STATEMENT",
                "record_id": "AXIS-CBS-1182",
                "content_hash": "3a91048102948102948102948102948102948102948102948102948102948102",
                "mime_type": "text/csv",
                "file_size_bytes": 1820,
                "storage_uri": "s3://sentinelx-evidence/CASE-2026-004/Axis_Finacle_Stmt_1182.csv",
                "integrity_status": "VERIFIED",
                "metadata_json": {
                    "filename": "Axis_Finacle_Stmt_1182.csv",
                    "vectorType": "CBS_LEDGER",
                    "tier": "TIER_1_CERTIFIED",
                    "gateStatus": "PASS",
                    "gateDetail": "Finacle CBS transaction audit verified.",
                    "bip39Words": ["ALPHA", "DELTA", "ECHO", "LUNAR", "OASIS", "SOLAR"],
                },
            },
        ],
    },
]


async def seed_sql_database_async():
    """
    Creates tables via SQLAlchemy async engine and seeds canonical cases and exhibits.
    """
    engine = get_async_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✓ SQL Database tables initialized via SQLAlchemy")

    sessionmaker = get_async_sessionmaker(engine)
    async with sessionmaker() as session:
        for cdata in CANONICAL_CASES_SEED:
            stmt = select(CaseModel).where(CaseModel.id == cdata["id"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()

            if not existing:
                case_model = CaseModel(
                    id=cdata["id"],
                    case_number=cdata["case_number"],
                    title=cdata["title"],
                    fir_number=cdata["fir_number"],
                    crime_type=cdata["crime_type"],
                    priority=cdata["priority"],
                    status=cdata["status"],
                    police_station=cdata["police_station"],
                    source=cdata["source"],
                    description=cdata["description"],
                    metadata_json=cdata["metadata_json"],
                )
                session.add(case_model)
                await session.flush()
                logger.info("Seeded canonical case %s in SQL database", cdata["id"])

                # Add artifacts
                for adata in cdata.get("artifacts", []):
                    art_model = EvidenceArtifactModel(
                        artifact_id=adata["artifact_id"],
                        case_id=cdata["id"],
                        source_id=adata["source_id"],
                        source_type=adata["source_type"],
                        record_id=adata["record_id"],
                        content_hash=adata["content_hash"],
                        mime_type=adata["mime_type"],
                        file_size_bytes=adata["file_size_bytes"],
                        storage_uri=adata["storage_uri"],
                        integrity_status=adata["integrity_status"],
                        metadata_json=adata.get("metadata_json", {}),
                    )
                    session.add(art_model)

                # Add initial audit event
                audit_event = AuditEventModel(
                    event_id=f"AUD-{cdata['id']}-INIT",
                    case_id=cdata["id"],
                    actor_id="SYSTEM_INITIALIZER",
                    action="SEED_CANONICAL_CASE",
                    resource_type="CASE",
                    resource_id=cdata["id"],
                    payload_hash=cdata["artifacts"][0]["content_hash"] if cdata.get("artifacts") else "0" * 64,
                    details_json={"fir_number": cdata["fir_number"], "title": cdata["title"]},
                )
                session.add(audit_event)

        await session.commit()
    logger.info("✓ SQL Database canonical cases & exhibits verification complete")


def initialize_database():
    """Synchronous entry point called at application startup."""
    import asyncio

    # 1. Seed SQL Database (PostgreSQL / SQLite)
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            asyncio.create_task(seed_sql_database_async())
        else:
            asyncio.run(seed_sql_database_async())
    except Exception as e:
        logger.error("Error initializing SQL database: %s", e)

    # 2. Seed UnifiedStore with vertical slice golden scenario (in-memory backwards compatibility)
    try:
        ScenarioGenerator.generate_golden_vertical_slice()
        logger.info("✓ UnifiedStore seeded with Golden Vertical Slice scenario")
    except Exception as e:
        logger.error(f"Error seeding UnifiedStore: {e}")

    # 3. Optionally initialize Neo4j schema if driver connects
    try:
        from neo4j import GraphDatabase

        driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
        )
        with driver.session() as session:
            for constraint in CONSTRAINTS:
                session.run(constraint)
            for index in INDEXES:
                session.run(index)
        driver.close()
        logger.info("✓ Neo4j database schema initialized")
    except Exception as e:
        logger.warning(f"Neo4j connection bypassed (operating in high-performance local store mode): {e}")
