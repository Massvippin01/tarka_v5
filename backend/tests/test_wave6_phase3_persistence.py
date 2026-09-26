from __future__ import annotations

import os
import tempfile
import pytest
import pytest_asyncio
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.base import Base
from app.database.models import (
    AuditEventModel,
    CaseModel,
    EntityModel,
    EvidenceArtifactModel,
    EvidenceClaimModel,
    EvidenceContradictionModel,
    EvidenceCustodyRecordModel,
    EvidenceFactModel,
    EvidenceGapModel,
    EvidenceObservationModel,
    RelationshipModel,
)
from app.domain.canonical_evidence_ir import (
    ClaimStatus,
    EpistemicStatus,
    EvidenceArtifact,
    EvidenceClaim,
    EvidenceCustodyEvent,
    EvidenceFact,
    EvidenceProvenance,
    EvidenceSourceType,
    SourceProvenanceType,
    IntegrityStatus,
)
from app.domain.case import Case
from app.repositories.persistence_gateway import PersistenceGateway
from app.repositories.postgres_repository import (
    PostgresAuditRepository,
    PostgresCaseRepository,
    PostgresEntityRepository,
    PostgresEpistemicRepository,
    PostgresEvidenceRepository,
)
from app.repositories.unified_store import UnifiedStore
from app.repositories.unit_of_work import UnitOfWork


@pytest_asyncio.fixture
async def async_test_engine():
    """Create an isolated in-memory SQLite database via aiosqlite for deterministic tests."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(async_test_engine):
    return async_sessionmaker(
        bind=async_test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


@pytest_asyncio.fixture
async def db_session(session_factory):
    async with session_factory() as session:
        yield session


# ==============================================================================
# 1. CASE REPOSITORY TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_case_repository_create_and_get(db_session: AsyncSession):
    repo = PostgresCaseRepository(db_session)
    case = CaseModel(
        id="CASE-2026-001",
        case_number="CR/2026/0889",
        title="Operation Triad Nexus",
        fir_number="FIR-402/2026",
        crime_type="CYBER_FRAUD_TRANSNATIONAL",
        priority="CRITICAL",
        status="ACTIVE_INVESTIGATION",
        police_station="Cyber Crime PS, Bengaluru",
        source="CCTNS_INTEGRATION",
        description="Complex transnational cyber-syndicate operation.",
        metadata_json={"jurisdiction": "Karnataka", "lead_officer": "Insp. Rao"},
    )
    created = await repo.create(case)
    await db_session.commit()

    assert created.id == "CASE-2026-001"

    fetched = await repo.get("CASE-2026-001")
    assert fetched is not None
    assert fetched.case_number == "CR/2026/0889"
    assert fetched.priority == "CRITICAL"
    assert fetched.metadata_json["jurisdiction"] == "Karnataka"


@pytest.mark.asyncio
async def test_case_unique_constraint_violation(db_session: AsyncSession):
    repo = PostgresCaseRepository(db_session)
    c1 = CaseModel(
        id="CASE-001",
        case_number="CASE-NUM-UNIQUE",
        title="First Case",
        crime_type="FINANCIAL",
    )
    await repo.create(c1)
    await db_session.commit()

    c2 = CaseModel(
        id="CASE-002",
        case_number="CASE-NUM-UNIQUE",  # duplicate case_number
        title="Second Case",
        crime_type="FINANCIAL",
    )
    with pytest.raises(IntegrityError):
        await repo.create(c2)
        await db_session.commit()
    await db_session.rollback()


# ==============================================================================
# 2. EVIDENCE METADATA & ARTIFACT INVARIANTS
# ==============================================================================

@pytest.mark.asyncio
async def test_evidence_artifact_preserves_uuidv7_and_sha256(db_session: AsyncSession):
    case_repo = PostgresCaseRepository(db_session)
    evidence_repo = PostgresEvidenceRepository(db_session)

    await case_repo.create(
        CaseModel(id="CASE-100", case_number="CN-100", title="Evidence Case", crime_type="NARCOTICS")
    )
    await db_session.commit()

    sha256_hash = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0"
    art = EvidenceArtifactModel(
        artifact_id="018e3a2b-7c45-7123-8abc-def012345678",  # UUIDv7 format
        case_id="CASE-100",
        source_id="SRC-CDR-01",
        source_type="CDR_TELECOM",
        record_id="REC-9921",
        content_hash=sha256_hash,
        mime_type="application/json",
        file_size_bytes=1048576,
        storage_uri="data/storage/artifacts/sha256/a1/b2/test.json",
        integrity_status="VERIFIED",
        provenance_type="LIVE_INTEGRATION",
        collector_agent_id="AGENT-FORENSIC-01",
        source_institution="State Telecom Authority",
        metadata_json={"call_records_count": 450},
    )
    await evidence_repo.save_artifact(art)
    await db_session.commit()

    # Query by artifact_id
    saved = await evidence_repo.get_artifact("018e3a2b-7c45-7123-8abc-def012345678")
    assert saved is not None
    assert saved.content_hash == sha256_hash
    assert saved.file_size_bytes == 1048576
    assert saved.provenance_type == "LIVE_INTEGRATION"

    # Query by content_hash
    by_hash = await evidence_repo.get_artifact_by_hash(sha256_hash)
    assert by_hash is not None
    assert by_hash.artifact_id == "018e3a2b-7c45-7123-8abc-def012345678"


# ==============================================================================
# 3. EVIDENCE CUSTODY APPEND-ONLY INVARIANT
# ==============================================================================

@pytest.mark.asyncio
async def test_custody_records_append_only_ordering(db_session: AsyncSession):
    case_repo = PostgresCaseRepository(db_session)
    evidence_repo = PostgresEvidenceRepository(db_session)

    await case_repo.create(CaseModel(id="CASE-CUSTODY", case_number="CN-CUSTODY", title="Custody Case", crime_type="THEFT"))
    art_id = "018e3a2b-custody-test-artifact"
    await evidence_repo.save_artifact(
        EvidenceArtifactModel(
            artifact_id=art_id,
            case_id="CASE-CUSTODY",
            source_id="SRC-1",
            source_type="CCTV_ANPR",
            record_id="REC-1",
            content_hash="hash-123",
            mime_type="video/mp4",
            file_size_bytes=2048,
            storage_uri="s3://evidence/vid1.mp4",
            integrity_status="VERIFIED",
        )
    )
    await db_session.commit()

    # Event 1: Acquisition
    e1 = EvidenceCustodyRecordModel(
        custody_event_id="CUST-001",
        artifact_id=art_id,
        timestamp=datetime(2026, 9, 26, 10, 0, 0, tzinfo=timezone.utc),
        acting_agent_id="OFFICER-SHARMA",
        action="ACQUIRED",
        previous_custody_event_id=None,
        verification_hash="hash-123",
        notes="Seized from toll booth CCTV storage",
    )
    await evidence_repo.append_custody_record(e1)

    # Event 2: Lab Transfer
    e2 = EvidenceCustodyRecordModel(
        custody_event_id="CUST-002",
        artifact_id=art_id,
        timestamp=datetime(2026, 9, 26, 11, 30, 0, tzinfo=timezone.utc),
        acting_agent_id="FORENSIC-ANALYST-PATEL",
        action="TRANSFERRED_TO_LAB",
        previous_custody_event_id="CUST-001",
        verification_hash="hash-123",
        notes="Received intact in digital forensic laboratory",
    )
    await evidence_repo.append_custody_record(e2)
    await db_session.commit()

    history = await evidence_repo.get_custody_events(art_id)
    assert len(history) == 2
    assert history[0].custody_event_id == "CUST-001"
    assert history[1].custody_event_id == "CUST-002"
    assert history[1].previous_custody_event_id == "CUST-001"


# ==============================================================================
# 4. EPISTEMIC STATE & CLAIM PRESERVATION
# ==============================================================================

@pytest.mark.asyncio
async def test_epistemic_claims_reject_boolean_guilt(db_session: AsyncSession):
    case_repo = PostgresCaseRepository(db_session)
    epistemic_repo = PostgresEpistemicRepository(db_session)

    await case_repo.create(CaseModel(id="CASE-EPISTEMIC", case_number="CN-EP", title="Epistemic Case", crime_type="CORRUPTION"))
    await db_session.commit()

    # Create claims across distinct epistemic lifecycle states
    statuses = ["PROPOSED", "SUPPORTED", "CORROBORATED", "CONTRADICTED", "UNVERIFIED", "RESOLVED", "SUPERSEDED"]
    for idx, st in enumerate(statuses):
        claim = EvidenceClaimModel(
            claim_id=f"CLAIM-{idx:03d}",
            case_id="CASE-EPISTEMIC",
            statement=f"Investigative hypothesis claim in state {st}",
            status=st,
            confidence=0.85 if st in ("SUPPORTED", "CORROBORATED") else 0.40,
            supporting_fact_ids=[f"FACT-{idx:03d}"],
            contradicting_fact_ids=[],
        )
        await epistemic_repo.save_claim(claim)
    await db_session.commit()

    saved_claims = await epistemic_repo.list_claims_by_case("CASE-EPISTEMIC")
    assert len(saved_claims) == len(statuses)
    saved_statuses = {c.status for c in saved_claims}
    assert saved_statuses == set(statuses)
    # Ensure binary guilt values are nowhere present
    assert "GUILTY" not in saved_statuses
    assert "INNOCENT" not in saved_statuses


@pytest.mark.asyncio
async def test_evidence_contradictions_and_gaps_persistence(db_session: AsyncSession):
    case_repo = PostgresCaseRepository(db_session)
    epistemic_repo = PostgresEpistemicRepository(db_session)

    await case_repo.create(CaseModel(id="CASE-TRIAD", case_number="CN-TRIAD", title="Operation Triad", crime_type="CYBER"))
    await db_session.commit()

    # Preserve kinematic contradiction (364 km/h impossible speed)
    contradiction = EvidenceContradictionModel(
        contradiction_id="CONTRA-001",
        case_id="CASE-TRIAD",
        claim_id=None,
        contradiction_type="KINEMATIC",
        severity="CRITICAL",
        description="Physical kinematic transit impossibility: 364 km/h required between Hosur toll and Electronic City",
        first_observation_id="OBS-ANPR-01",
        second_observation_id="OBS-CDR-02",
        details_json={"distance_km": 42.5, "delta_time_minutes": 7.0, "computed_speed_kmh": 364.28},
    )
    await epistemic_repo.save_contradiction(contradiction)

    # Preserve deductive gap (missing CAF for burner phone)
    gap = EvidenceGapModel(
        gap_id="GAP-001",
        case_id="CASE-TRIAD",
        hypothesis_id="HYP-001",
        description="Missing subscriber Customer Acquisition Form (CAF) for burner phone +919876543210",
        missing_evidence_type="TELECOM_SUBSCRIBER_CAF",
        required_for="Establish subscriber legal identity",
        statutory_action="Section 91 CrPC / Section 94 BNSS requisition to Telco nodal officer",
    )
    await epistemic_repo.save_gap(gap)
    await db_session.commit()

    c_list = await epistemic_repo.list_contradictions_by_case("CASE-TRIAD")
    assert len(c_list) == 1
    assert c_list[0].details_json["computed_speed_kmh"] == 364.28

    g_list = await epistemic_repo.list_gaps_by_case("CASE-TRIAD")
    assert len(g_list) == 1
    assert "Section 91 CrPC" in g_list[0].statutory_action


# ==============================================================================
# 5. UNIT OF WORK ATOMIC TRANSACTION & ROLLBACK
# ==============================================================================

@pytest.mark.asyncio
async def test_unit_of_work_commits_atomically(session_factory):
    async with session_factory() as session:
        async with UnitOfWork(session) as uow:
            await uow.cases.create(CaseModel(id="CASE-ATOMIC", case_number="CN-ATOMIC", title="Atomic Case", crime_type="THEFT"))
            await uow.entities.save_entity(
                EntityModel(
                    entity_id="ENT-001",
                    entity_type="Person",
                    name_or_title="Vikram Malhotra",
                    canonical_identifier="AADHAAR-XXXX-1234",
                )
            )
            await uow.audit.append_event(
                AuditEventModel(
                    event_id="AUD-001",
                    case_id="CASE-ATOMIC",
                    actor_id="INVESTIGATOR-1",
                    action="CASE_CREATED",
                    resource_type="Case",
                    resource_id="CASE-ATOMIC",
                    details_json={"priority": "NORMAL"},
                )
            )
            await uow.commit()

    # Reopen fresh session and verify all 3 were committed
    async with session_factory() as session:
        case = await PostgresCaseRepository(session).get("CASE-ATOMIC")
        assert case is not None
        ent = await PostgresEntityRepository(session).get_entity("ENT-001")
        assert ent is not None
        aud = await PostgresAuditRepository(session).get_event("AUD-001")
        assert aud is not None


@pytest.mark.asyncio
async def test_unit_of_work_rolls_back_on_error(session_factory):
    try:
        async with session_factory() as session:
            async with UnitOfWork(session) as uow:
                await uow.cases.create(CaseModel(id="CASE-ROLLBACK", case_number="CN-RB", title="Rollback Case", crime_type="FRAUD"))
                # Trigger error intentionally
                raise RuntimeError("Intentional investigative transaction abortion")
    except RuntimeError:
        pass

    # Verify CASE-ROLLBACK was never written
    async with session_factory() as session:
        case = await PostgresCaseRepository(session).get("CASE-ROLLBACK")
        assert case is None


# ==============================================================================
# 6. RESTART PERSISTENCE SIMULATION
# ==============================================================================

@pytest.mark.asyncio
async def test_restart_persistence_write_close_reopen():
    """Simulate a server restart: write to disk database, close engine, recreate engine, verify data."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        db_path = tmp_file.name

    db_url = f"sqlite+aiosqlite:///{db_path}"
    try:
        # Phase 1: Write and commit
        engine1 = create_async_engine(db_url, echo=False)
        async with engine1.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        factory1 = async_sessionmaker(bind=engine1, class_=AsyncSession, expire_on_commit=False)
        async with factory1() as session:
            repo = PostgresCaseRepository(session)
            await repo.create(
                CaseModel(id="CASE-RESTART-001", case_number="CN-RESTART", title="Survives Restart", crime_type="TERROR")
            )
            await session.commit()

        # Simulate complete shutdown & process termination
        await engine1.dispose()

        # Phase 2: Start fresh engine pointing to the same file
        engine2 = create_async_engine(db_url, echo=False)
        factory2 = async_sessionmaker(bind=engine2, class_=AsyncSession, expire_on_commit=False)
        async with factory2() as session:
            repo2 = PostgresCaseRepository(session)
            persisted_case = await repo2.get("CASE-RESTART-001")
            assert persisted_case is not None
            assert persisted_case.case_number == "CN-RESTART"
            assert persisted_case.title == "Survives Restart"

        await engine2.dispose()
    finally:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass


# ==============================================================================
# 7. UNIFIED STORE BIDIRECTIONAL SYNCHRONIZATION
# ==============================================================================

@pytest.mark.asyncio
async def test_unified_store_persist_and_hydrate(session_factory):
    # Initialize in-memory UnifiedStore
    store = UnifiedStore()
    store.clear()

    case = Case(
        id="CASE-SYNC-001",
        case_number="CN-SYNC-001",
        title="Sync Verification Case",
        fir_number="FIR-SYNC-99",
        crime_type="MONEY_LAUNDERING",
        priority="HIGH",
        investigation_status="OPEN",
        police_station="ED Zonal Office",
        source="FINANCIAL_INTEL",
    )
    store.save_case(case)

    art = EvidenceArtifact(
        artifact_id="ART-SYNC-001",
        case_id="CASE-SYNC-001",
        source_id="SRC-BANK-01",
        source_type=EvidenceSourceType.FINANCIAL_TRANSACTION,
        provenance_type=SourceProvenanceType.SIMULATED_AUTHORIZED_SOURCE,
        record_id="TXN-BANK-100",
        artifact_type="FINANCIAL_PAYLOAD",
        content_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        mime_type="application/json",
        file_size_bytes=4096,
        storage_uri="data/storage/artifacts/sha256/e3/b0/test.json",
        integrity_status=IntegrityStatus.VERIFIED,
        operator_id="FIN-AGENT-01",
    )
    store.save_artifact(art)

    # Persist UnifiedStore to DB via UnitOfWork
    async with session_factory() as session:
        async with UnitOfWork(session) as uow:
            persisted_count = await store.persist_to_postgres(uow)
            await uow.commit()
            assert persisted_count >= 2

    # Clear memory store
    store.clear()
    assert store.cases == {}
    assert store.artifacts == {}

    # Hydrate memory store back from DB
    async with session_factory() as session:
        async with UnitOfWork(session) as uow:
            hydrated_count = await store.hydrate_from_postgres(uow, case_id="CASE-SYNC-001")
            assert hydrated_count >= 2

    assert "CASE-SYNC-001" in store.cases
    assert store.cases["CASE-SYNC-001"].case_number == "CN-SYNC-001"
    assert "ART-SYNC-001" in store.artifacts
    assert store.artifacts["ART-SYNC-001"].content_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


# ==============================================================================
# 8. ENGINE LIFECYCLE & DISPOSAL
# ==============================================================================

@pytest.mark.asyncio
async def test_database_engine_lifecycle_and_disposal():
    from app.database.session import close_db_engine, get_async_engine, get_async_sessionmaker

    engine = get_async_engine("sqlite+aiosqlite:///:memory:")
    assert engine is not None
    factory = get_async_sessionmaker(engine)
    assert factory is not None

    from sqlalchemy import text
    async with factory() as session:
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1

    await engine.dispose()
    await close_db_engine()


# ==============================================================================
# 9. FACTS AND OBSERVATIONS PERSISTENCE
# ==============================================================================

@pytest.mark.asyncio
async def test_facts_and_observations_persistence(db_session: AsyncSession):
    case_repo = PostgresCaseRepository(db_session)
    evidence_repo = PostgresEvidenceRepository(db_session)

    await case_repo.create(CaseModel(id="CASE-FACTS", case_number="CN-FACTS", title="Facts Case", crime_type="EXTORTION"))
    await evidence_repo.save_artifact(
        EvidenceArtifactModel(
            artifact_id="ART-FACTS-01",
            case_id="CASE-FACTS",
            source_id="SRC-DOC-01",
            source_type="FORENSIC_DOCUMENT",
            record_id="DOC-99",
            content_hash="hash-facts-99",
            mime_type="application/pdf",
            file_size_bytes=8192,
            storage_uri="s3://evidence/doc99.pdf",
            integrity_status="VERIFIED",
        )
    )
    await db_session.commit()

    obs = EvidenceObservationModel(
        observation_id="OBS-001",
        artifact_id="ART-FACTS-01",
        case_id="CASE-FACTS",
        observed_at=datetime(2026, 9, 26, 10, 0, 0, tzinfo=timezone.utc),
        source_location="Page 3, Paragraph 2",
        extracted_fields={"sender_name": "Vikram", "amount": 500000},
        confidence=0.95,
    )
    await evidence_repo.save_observation(obs)

    fact = EvidenceFactModel(
        fact_id="FACT-001",
        source_artifact_id="ART-FACTS-01",
        source_location="Page 3, Line 12",
        subject="P001",
        predicate="DEMANDED_RANSOM",
        object="V001",
        extraction_confidence=0.98,
        epistemic_status="CONFIRMED",
        supporting_evidence_ids=["ART-FACTS-01"],
        contradicting_evidence_ids=[],
    )
    await evidence_repo.save_fact(fact)
    await db_session.commit()

    saved_obs = await evidence_repo.get_observation("OBS-001")
    assert saved_obs is not None
    assert saved_obs.extracted_fields["amount"] == 500000

    saved_facts = await evidence_repo.list_facts_by_subject("P001")
    assert len(saved_facts) == 1
    assert saved_facts[0].predicate == "DEMANDED_RANSOM"
    assert saved_facts[0].object == "V001"


# ==============================================================================
# 10. ENTITIES AND RELATIONSHIPS PERSISTENCE
# ==============================================================================

@pytest.mark.asyncio
async def test_entities_and_relationships_persistence(db_session: AsyncSession):
    ent_repo = PostgresEntityRepository(db_session)

    e1 = EntityModel(
        entity_id="ENT-VIKRAM",
        entity_type="Person",
        name_or_title="Vikram Malhotra",
        canonical_identifier="PAN-ABCDE1234F",
        risk_level="HIGH",
        source="CCTNS",
        properties_json={"alias": "Bikram", "prior_records": 3},
    )
    e2 = EntityModel(
        entity_id="ENT-PHONE",
        entity_type="Phone",
        name_or_title="+919876543210",
        canonical_identifier="+919876543210",
        risk_level="MEDIUM",
        source="CDR",
        properties_json={"carrier": "Airtel", "imei": "864201234567890"},
    )
    await ent_repo.save_entity(e1)
    await ent_repo.save_entity(e2)

    rel = RelationshipModel(
        relationship_id="REL-001",
        source_entity_id="ENT-VIKRAM",
        target_entity_id="ENT-PHONE",
        relationship_type="USES",
        confidence=0.90,
        confidence_level="DOCUMENTED",
        evidence_references=["ART-FACTS-01"],
        source="SYSTEM",
        reason="Subscriber call logs corroborate continuous possession",
        review_status="APPROVED",
    )
    await ent_repo.save_relationship(rel)
    await db_session.commit()

    by_canon = await ent_repo.get_by_canonical_identifier("PAN-ABCDE1234F")
    assert by_canon is not None
    assert by_canon.entity_id == "ENT-VIKRAM"
    assert by_canon.properties_json["alias"] == "Bikram"

    rels = await ent_repo.list_relationships_for_entity("ENT-VIKRAM")
    assert len(rels) == 1
    assert rels[0].relationship_type == "USES"


# ==============================================================================
# 11. AUDIT EVENT LEDGER (APPEND-ONLY)
# ==============================================================================

@pytest.mark.asyncio
async def test_audit_event_ledger_persistence(db_session: AsyncSession):
    audit_repo = PostgresAuditRepository(db_session)

    ev1 = AuditEventModel(
        event_id="AUDIT-EVT-001",
        case_id="CASE-AUDIT-1",
        actor_id="INVESTIGATOR-RAO",
        action="EVIDENCE_EXPORT_REQUESTED",
        resource_type="EvidenceArtifact",
        resource_id="ART-101",
        policy_decision_id="POL-DEC-998",
        payload_hash="sha256-payload-audit-hash",
        details_json={"justification": "Court requisition Section 65B"},
    )
    await audit_repo.append_event(ev1)
    await db_session.commit()

    fetched = await audit_repo.get_event("AUDIT-EVT-001")
    assert fetched is not None
    assert fetched.actor_id == "INVESTIGATOR-RAO"
    assert fetched.policy_decision_id == "POL-DEC-998"
    assert fetched.details_json["justification"] == "Court requisition Section 65B"


# ==============================================================================
# 12. ALEMBIC MIGRATION DISCOVERY & OFFLINE VERIFICATION
# ==============================================================================

def test_alembic_migration_metadata_and_offline_sql():
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
    except ImportError:
        pytest.skip("alembic.config module unavailable in dev environment")

    config = Config("backend/alembic.ini")
    script = ScriptDirectory.from_config(config)

    heads = script.get_heads()
    assert len(heads) == 1
    assert heads[0] == "0001_initial_schema"

    rev = script.get_revision("0001_initial_schema")
    assert rev is not None
    assert rev.down_revision is None

