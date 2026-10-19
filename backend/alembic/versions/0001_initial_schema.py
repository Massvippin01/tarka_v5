"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-26 10:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Cross-dialect JSON type
json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    # 1. Cases Table
    op.create_table(
        'cases',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('case_number', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('fir_number', sa.String(length=64), nullable=True),
        sa.Column('crime_type', sa.String(length=128), nullable=False),
        sa.Column('priority', sa.String(length=32), server_default='MEDIUM', nullable=False),
        sa.Column('status', sa.String(length=32), server_default='OPEN', nullable=False),
        sa.Column('police_station', sa.String(length=128), nullable=True),
        sa.Column('source', sa.String(length=64), server_default='MANUAL_ENTRY', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata_json', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_cases_id', 'cases', ['id'])
    op.create_index('ix_cases_case_number', 'cases', ['case_number'], unique=True)
    op.create_index('ix_cases_fir_number', 'cases', ['fir_number'])

    # 2. Evidence Artifacts Table
    op.create_table(
        'evidence_artifacts',
        sa.Column('artifact_id', sa.String(length=64), primary_key=True),
        sa.Column('case_id', sa.String(length=64), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_id', sa.String(length=64), nullable=False),
        sa.Column('source_type', sa.String(length=64), nullable=False),
        sa.Column('record_id', sa.String(length=128), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('mime_type', sa.String(length=128), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('storage_uri', sa.String(length=512), nullable=False),
        sa.Column('integrity_status', sa.String(length=32), server_default='VERIFIED', nullable=False),
        sa.Column('provenance_type', sa.String(length=64), server_default='SYNTHETIC_DATA', nullable=False),
        sa.Column('collector_agent_id', sa.String(length=64), nullable=True),
        sa.Column('source_institution', sa.String(length=128), nullable=True),
        sa.Column('acquisition_method', sa.String(length=128), nullable=True),
        sa.Column('legal_basis', sa.String(length=128), nullable=True),
        sa.Column('metadata_json', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_artifacts_id', 'evidence_artifacts', ['artifact_id'])
    op.create_index('ix_artifacts_case_id', 'evidence_artifacts', ['case_id'])
    op.create_index('ix_artifacts_source_type', 'evidence_artifacts', ['source_type'])
    op.create_index('ix_artifacts_content_hash', 'evidence_artifacts', ['content_hash'])
    op.create_index('ix_artifacts_created_at', 'evidence_artifacts', ['created_at'])

    # 3. Evidence Observations Table
    op.create_table(
        'evidence_observations',
        sa.Column('observation_id', sa.String(length=64), primary_key=True),
        sa.Column('artifact_id', sa.String(length=64), sa.ForeignKey('evidence_artifacts.artifact_id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_id', sa.String(length=64), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('source_location', sa.String(length=255), nullable=True),
        sa.Column('extracted_fields', json_type, nullable=False),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_observations_id', 'evidence_observations', ['observation_id'])
    op.create_index('ix_observations_artifact_id', 'evidence_observations', ['artifact_id'])
    op.create_index('ix_observations_case_id', 'evidence_observations', ['case_id'])
    op.create_index('ix_observations_observed_at', 'evidence_observations', ['observed_at'])

    # 4. Evidence Facts Table
    op.create_table(
        'evidence_facts',
        sa.Column('fact_id', sa.String(length=64), primary_key=True),
        sa.Column('source_artifact_id', sa.String(length=64), sa.ForeignKey('evidence_artifacts.artifact_id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_location', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=128), nullable=False),
        sa.Column('predicate', sa.String(length=128), nullable=False),
        sa.Column('object', sa.String(length=128), nullable=False),
        sa.Column('extraction_confidence', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('epistemic_status', sa.String(length=32), server_default='CONFIRMED', nullable=False),
        sa.Column('supporting_evidence_ids', json_type, nullable=False),
        sa.Column('contradicting_evidence_ids', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_facts_id', 'evidence_facts', ['fact_id'])
    op.create_index('ix_facts_artifact_id', 'evidence_facts', ['source_artifact_id'])
    op.create_index('ix_facts_subject', 'evidence_facts', ['subject'])
    op.create_index('ix_facts_predicate', 'evidence_facts', ['predicate'])
    op.create_index('ix_facts_object', 'evidence_facts', ['object'])

    # 5. Evidence Custody Records Table (Append-Only)
    op.create_table(
        'evidence_custody_records',
        sa.Column('custody_event_id', sa.String(length=64), primary_key=True),
        sa.Column('artifact_id', sa.String(length=64), sa.ForeignKey('evidence_artifacts.artifact_id', ondelete='RESTRICT'), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('acting_agent_id', sa.String(length=128), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('previous_custody_event_id', sa.String(length=64), nullable=True),
        sa.Column('verification_hash', sa.String(length=64), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
    )
    op.create_index('ix_custody_id', 'evidence_custody_records', ['custody_event_id'])
    op.create_index('ix_custody_artifact_id', 'evidence_custody_records', ['artifact_id'])
    op.create_index('ix_custody_timestamp', 'evidence_custody_records', ['timestamp'])

    # 6. Evidence Claims Table
    op.create_table(
        'evidence_claims',
        sa.Column('claim_id', sa.String(length=64), primary_key=True),
        sa.Column('case_id', sa.String(length=64), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('statement', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=32), server_default='PROPOSED', nullable=False),
        sa.Column('confidence', sa.Float(), server_default='0.5', nullable=False),
        sa.Column('source_node', sa.String(length=128), nullable=True),
        sa.Column('target_node', sa.String(length=128), nullable=True),
        sa.Column('relationship_type', sa.String(length=64), nullable=True),
        sa.Column('supporting_fact_ids', json_type, nullable=False),
        sa.Column('contradicting_fact_ids', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_claims_id', 'evidence_claims', ['claim_id'])
    op.create_index('ix_claims_case_id', 'evidence_claims', ['case_id'])

    # 7. Evidence Contradictions Table
    op.create_table(
        'evidence_contradictions',
        sa.Column('contradiction_id', sa.String(length=64), primary_key=True),
        sa.Column('case_id', sa.String(length=64), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('claim_id', sa.String(length=64), nullable=True),
        sa.Column('contradiction_type', sa.String(length=64), nullable=False),
        sa.Column('severity', sa.String(length=32), server_default='HIGH', nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('first_observation_id', sa.String(length=64), nullable=True),
        sa.Column('second_observation_id', sa.String(length=64), nullable=True),
        sa.Column('details_json', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_contradictions_id', 'evidence_contradictions', ['contradiction_id'])
    op.create_index('ix_contradictions_case_id', 'evidence_contradictions', ['case_id'])
    op.create_index('ix_contradictions_claim_id', 'evidence_contradictions', ['claim_id'])

    # 8. Evidence Gaps Table
    op.create_table(
        'evidence_gaps',
        sa.Column('gap_id', sa.String(length=64), primary_key=True),
        sa.Column('case_id', sa.String(length=64), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hypothesis_id', sa.String(length=64), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('missing_evidence_type', sa.String(length=64), nullable=False),
        sa.Column('required_for', sa.Text(), nullable=True),
        sa.Column('statutory_action', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_gaps_id', 'evidence_gaps', ['gap_id'])
    op.create_index('ix_gaps_case_id', 'evidence_gaps', ['case_id'])
    op.create_index('ix_gaps_hypothesis_id', 'evidence_gaps', ['hypothesis_id'])

    # 9. Entities Table
    op.create_table(
        'entities',
        sa.Column('entity_id', sa.String(length=64), primary_key=True),
        sa.Column('entity_type', sa.String(length=32), nullable=False),
        sa.Column('name_or_title', sa.String(length=255), nullable=False),
        sa.Column('canonical_identifier', sa.String(length=128), nullable=True),
        sa.Column('risk_level', sa.String(length=32), server_default='UNKNOWN', nullable=False),
        sa.Column('source', sa.String(length=64), server_default='SYSTEM', nullable=False),
        sa.Column('properties_json', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_entities_id', 'entities', ['entity_id'])
    op.create_index('ix_entities_type', 'entities', ['entity_type'])
    op.create_index('ix_entities_canonical_identifier', 'entities', ['canonical_identifier'])

    # 10. Relationships Table
    op.create_table(
        'relationships',
        sa.Column('relationship_id', sa.String(length=64), primary_key=True),
        sa.Column('source_entity_id', sa.String(length=64), nullable=False),
        sa.Column('target_entity_id', sa.String(length=64), nullable=False),
        sa.Column('relationship_type', sa.String(length=64), nullable=False),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('confidence_level', sa.String(length=32), server_default='DOCUMENTED', nullable=False),
        sa.Column('evidence_references', json_type, nullable=False),
        sa.Column('source', sa.String(length=64), server_default='SYSTEM', nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('review_status', sa.String(length=32), server_default='APPROVED', nullable=False),
        sa.Column('metadata_json', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_relationships_id', 'relationships', ['relationship_id'])
    op.create_index('ix_relationships_source', 'relationships', ['source_entity_id'])
    op.create_index('ix_relationships_target', 'relationships', ['target_entity_id'])
    op.create_index('ix_relationships_type', 'relationships', ['relationship_type'])
    op.create_index('ix_rel_src_tgt_type', 'relationships', ['source_entity_id', 'target_entity_id', 'relationship_type'])

    # 11. Audit Events Table
    op.create_table(
        'audit_events',
        sa.Column('event_id', sa.String(length=64), primary_key=True),
        sa.Column('case_id', sa.String(length=64), nullable=True),
        sa.Column('actor_id', sa.String(length=128), nullable=False),
        sa.Column('action', sa.String(length=128), nullable=False),
        sa.Column('resource_type', sa.String(length=64), nullable=False),
        sa.Column('resource_id', sa.String(length=64), nullable=False),
        sa.Column('policy_decision_id', sa.String(length=64), nullable=True),
        sa.Column('payload_hash', sa.String(length=64), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('details_json', json_type, nullable=False),
    )
    op.create_index('ix_audit_id', 'audit_events', ['event_id'])
    op.create_index('ix_audit_case_id', 'audit_events', ['case_id'])
    op.create_index('ix_audit_actor_id', 'audit_events', ['actor_id'])
    op.create_index('ix_audit_timestamp', 'audit_events', ['timestamp'])


def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_table('relationships')
    op.drop_table('entities')
    op.drop_table('evidence_gaps')
    op.drop_table('evidence_contradictions')
    op.drop_table('evidence_claims')
    op.drop_table('evidence_custody_records')
    op.drop_table('evidence_facts')
    op.drop_table('evidence_observations')
    op.drop_table('evidence_artifacts')
    op.drop_table('cases')
