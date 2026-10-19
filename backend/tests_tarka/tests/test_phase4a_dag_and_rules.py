"""Phase 4A Tests: Provenance Dependency DAG and Declarative Rule Registry.

Verifies:
1. Declarative Rule Registry enforces strict safe operators (exact_match, not_equal,
   within_time_window, before, after, exists, missing) and rejects any unsupported/unsafe operator.
2. Migrated correlation rules retain exact behavioral outcomes, IDs, and outputs.
3. Provenance Dependency DAG is provably acyclic (Kahn's topological sort).
4. Every finding in the DAG has at least one directed ancestry path back to a source artifact.
5. Screenshot counterfactual challenge deactivates only dependent nodes (screenshot, fact,
   contradiction, finding) while independent bank and payment-flow nodes remain active/surviving.
6. Baseline and challenge DAGs are strictly deterministic: repeat runs produce identical fingerprints.
7. Investigation Graph correctly represents case entities (phone, VPA, txn, claim) and linkages.
"""

import pytest
from pydantic import ValidationError

from tarka.core.rule_registry import (
    SafeOperator,
    DeclarativeRule,
    DeclarativeRuleRegistry,
    DEFAULT_RULE_REGISTRY,
)
from tarka.core.provenance_dag import (
    DAGNodeType,
    DAGEdgeType,
    DAGNodeStatus,
    DAGNode,
    DAGEdge,
    ProvenanceDAG,
    ProvenanceDAGBuilder,
)
from tarka.core.investigation_graph import (
    EntityNodeType,
    EntityEdgeType,
    InvestigationGraph,
    InvestigationGraphBuilder,
)
from tarka.core.evidence_dna import CaseStore, TrustTier
from tarka.core.correlations import CorrelationEngine, CorrelationStatus
from tarka.core.analysis_run import CounterfactualEngine


@pytest.fixture
def case_store() -> CaseStore:
    return CaseStore(base_dir="data/cases")


# =============================================================================
# 1. Declarative Rule Registry Tests
# =============================================================================

def test_rule_registry_contains_all_migrated_rules():
    """All 9 TARKA correlation rules plus direct observation rule must be registered."""
    rules = DEFAULT_RULE_REGISTRY.list_rules()
    rule_ids = {r.rule_id for r in rules}

    expected_rules = {
        "RULE_TXN_REF_EXACT",
        "RULE_VPA_EXACT",
        "RULE_PHONE_EXACT",
        "RULE_PAYMENT_FLOW_CAUSAL",
        "RULE_AMOUNT_WINDOW",
        "RULE_CALL_PROXIMITY",
        "RULE_MEDIA_TXN_MISMATCH",
        "RULE_MEDIA_TXN_MATCH",
        "RULE_EVIDENCE_GAP_MISSING_TXN",
        "SUPPLIED_BANK_STATEMENT_RECORD",
    }
    assert expected_rules.issubset(rule_ids)


def test_rule_registry_rejects_unsupported_operators():
    """Unsupported or unsafe operators (e.g. eval, custom_lambda) must be rejected with validation error."""
    # Valid safe operator succeeds
    valid_rule = DeclarativeRule(
        rule_id="RULE_TEST_VALID",
        display_name="Valid Test Rule",
        purpose="Testing operator validation",
        input_fact_types=["bank_transaction"],
        join_key="rrn",
        field_paths=["identifiers.rrn"],
        operator=SafeOperator.EXACT_MATCH,
        output_type="CORRELATION",
        rationale_template="Valid test {join_val}",
    )
    assert valid_rule.operator == SafeOperator.EXACT_MATCH

    # Unsafe / unsupported operator must raise ValidationError
    with pytest.raises(ValidationError) as excinfo:
        DeclarativeRule(
            rule_id="RULE_TEST_UNSAFE",
            display_name="Unsafe Rule",
            purpose="Testing injection rejection",
            input_fact_types=["bank_transaction"],
            join_key="rrn",
            field_paths=["identifiers.rrn"],
            operator="eval",  # UNSAFE!
            output_type="CORRELATION",
            rationale_template="Unsafe test",
        )
    assert "Unsupported or unsafe operator 'eval'" in str(excinfo.value)

    with pytest.raises(ValidationError):
        DeclarativeRule(
            rule_id="RULE_TEST_LAMBDA",
            display_name="Unsafe Lambda Rule",
            purpose="Testing lambda rejection",
            input_fact_types=["bank_transaction"],
            join_key="rrn",
            field_paths=["identifiers.rrn"],
            operator="custom_lambda_expression",  # UNSAFE!
            output_type="CORRELATION",
            rationale_template="Unsafe test",
        )


def test_migrated_rules_retain_existing_behavior(case_store: CaseStore):
    """The correlation engine evaluating against case facts must preserve exact expected correlations."""
    facts = case_store.list_canonical_facts("upi_payment_discrepancy")
    corr_engine = CorrelationEngine()
    correlations, gaps = corr_engine.correlate_case(facts)

    rule_ids = {c.rule_id for c in correlations}
    assert "RULE_TXN_REF_EXACT" in rule_ids
    assert "RULE_VPA_EXACT" in rule_ids
    assert "RULE_PHONE_EXACT" in rule_ids
    assert "RULE_PAYMENT_FLOW_CAUSAL" in rule_ids
    assert "RULE_AMOUNT_WINDOW" in rule_ids
    assert "RULE_CALL_PROXIMITY" in rule_ids
    assert "RULE_MEDIA_TXN_MISMATCH" in rule_ids
    assert "RULE_EVIDENCE_GAP_MISSING_TXN" in rule_ids

    # Verify contradiction and evidence gap properties
    contradictions = [c for c in correlations if c.is_contradiction]
    assert len(contradictions) >= 1
    assert contradictions[0].rule_id == "RULE_MEDIA_TXN_MISMATCH"
    assert contradictions[0].status == CorrelationStatus.REJECTED

    assert len(gaps) >= 1
    assert gaps[0].rule_id == "RULE_EVIDENCE_GAP_MISSING_TXN"


# =============================================================================
# 2. Provenance Dependency DAG Tests
# =============================================================================

def test_provenance_dag_is_acyclic(case_store: CaseStore):
    """Every generated Provenance DAG must be strictly acyclic."""
    baseline_run = case_store.get_or_create_baseline_run("upi_payment_discrepancy")
    artifacts = case_store.list_artifacts("upi_payment_discrepancy")
    dna_items = case_store.list_evidence_dna("upi_payment_discrepancy")

    dag = ProvenanceDAGBuilder.build_run_dag(baseline_run, artifacts, dna_items)
    assert dag.is_acyclic() is True, "Provenance DAG contains cycles!"


def test_all_findings_have_source_artifact_ancestry(case_store: CaseStore):
    """Every finding node in the DAG must have at least one ancestry path to an Artifact node."""
    baseline_run = case_store.get_or_create_baseline_run("upi_payment_discrepancy")
    artifacts = case_store.list_artifacts("upi_payment_discrepancy")
    dna_items = case_store.list_evidence_dna("upi_payment_discrepancy")

    dag = ProvenanceDAGBuilder.build_run_dag(baseline_run, artifacts, dna_items)

    finding_nodes = [n for n in dag.nodes if n.node_type == DAGNodeType.FINDING]
    assert len(finding_nodes) >= 4, "Expected at least 4 synthesized findings"

    for f_node in finding_nodes:
        has_ancestry = dag.has_source_artifact_ancestry(f_node.node_id)
        assert has_ancestry is True, f"Finding '{f_node.node_id}' has no path to a preserved source artifact!"

        ancestors = dag.get_ancestors(f_node.node_id)
        # Verify ancestry passes through extracted facts or rules
        has_rule_or_fact = any(
            any(n.node_id == a and n.node_type in [DAGNodeType.EXTRACTED_FACT, DAGNodeType.CORRELATION_RULE] for n in dag.nodes)
            for a in ancestors
        )
        assert has_rule_or_fact is True


def test_dag_fingerprint_is_deterministic(case_store: CaseStore):
    """Repeat runs on identical case data must produce the exact same DAG fingerprint."""
    baseline_run = case_store.get_or_create_baseline_run("upi_payment_discrepancy")
    artifacts = case_store.list_artifacts("upi_payment_discrepancy")
    dna_items = case_store.list_evidence_dna("upi_payment_discrepancy")

    dag1 = ProvenanceDAGBuilder.build_run_dag(baseline_run, artifacts, dna_items)
    dag2 = ProvenanceDAGBuilder.build_run_dag(baseline_run, artifacts, dna_items)

    assert dag1.fingerprint != ""
    assert dag1.fingerprint == dag2.fingerprint
    assert len(dag1.nodes) == len(dag2.nodes)
    assert len(dag1.edges) == len(dag2.edges)


# =============================================================================
# 3. Counterfactual Challenge Impact DAG Tests
# =============================================================================

def test_screenshot_challenge_deactivates_only_dependent_nodes(case_store: CaseStore):
    """Challenging screenshot claim ART-004-BCCD4200 must deactivate only dependent nodes.
    
    Specifically:
    - Screenshot artifact becomes INACTIVE.
    - Screenshot derived facts become INACTIVE.
    - Amount-mismatch contradiction becomes INACTIVE.
    - Screenshot finding (FINDING-02) becomes INACTIVE.
    - Bank transaction, CDR call, chat request, and FINDING-04 / FINDING-01 remain SURVIVING.
    """
    baseline_run = case_store.get_or_create_baseline_run("upi_payment_discrepancy")
    challenge_run, _ = case_store.challenge_analysis_run(
        case_id="upi_payment_discrepancy",
        baseline_run_id=baseline_run.run_id,
        excluded_artifact_ids=["ART-004-BCCD4200"],
        investigator_note="Excluding screenshot claim for challenge impact test",
    )
    artifacts = case_store.list_artifacts("upi_payment_discrepancy")
    dna_items = case_store.list_evidence_dna("upi_payment_discrepancy")

    impact_dag = ProvenanceDAGBuilder.build_challenge_impact_dag(
        baseline_run=baseline_run,
        challenge_run=challenge_run,
        artifacts=artifacts,
        evidence_dna_items=dna_items,
    )

    assert impact_dag.is_acyclic() is True

    # 1. Screenshot artifact node must be INACTIVE
    screenshot_art_node = next((n for n in impact_dag.nodes if n.node_id == "art:ART-004-BCCD4200"), None)
    assert screenshot_art_node is not None
    assert screenshot_art_node.status == DAGNodeStatus.INACTIVE

    # 2. Amount-mismatch contradiction node must be INACTIVE
    mismatch_node = next(
        (n for n in impact_dag.nodes if n.rule_id == "RULE_MEDIA_TXN_MISMATCH" and n.node_type == DAGNodeType.CONTRADICTION),
        None,
    )
    assert mismatch_node is not None
    assert mismatch_node.status == DAGNodeStatus.INACTIVE

    # 3. Screenshot finding node (FINDING-02) must be INACTIVE
    finding2_node = next((n for n in impact_dag.nodes if n.node_id == "finding:FINDING-02"), None)
    assert finding2_node is not None
    assert finding2_node.status == DAGNodeStatus.INACTIVE

    # 4. Bank transaction artifact (ART-001) and finding (FINDING-04) must remain SURVIVING
    bank_art_node = next((n for n in impact_dag.nodes if "ART-001" in n.node_id and n.node_type == DAGNodeType.ARTIFACT), None)
    assert bank_art_node is not None
    assert bank_art_node.status == DAGNodeStatus.SURVIVING

    finding4_node = next((n for n in impact_dag.nodes if n.node_id == "finding:FINDING-04"), None)
    assert finding4_node is not None
    assert finding4_node.status == DAGNodeStatus.SURVIVING

    # 5. Causal payment flow finding (FINDING-01) must remain SURVIVING
    finding1_node = next((n for n in impact_dag.nodes if n.node_id == "finding:FINDING-01"), None)
    assert finding1_node is not None
    assert finding1_node.status == DAGNodeStatus.SURVIVING

    # 6. Verify edge from excluded artifact has EXCLUDED_FROM_ACTIVE_RUN type
    excluded_edges = [e for e in impact_dag.edges if e.edge_type == DAGEdgeType.EXCLUDED_FROM_ACTIVE_RUN]
    assert len(excluded_edges) >= 1
    assert any(e.source_id == "art:ART-004-BCCD4200" for e in excluded_edges)


def test_artifact_scoped_derivation_dag(case_store: CaseStore):
    """An artifact-scoped derivation DAG must strictly contain only descendants of that artifact."""
    baseline_run = case_store.get_or_create_baseline_run("upi_payment_discrepancy")
    artifacts = case_store.list_artifacts("upi_payment_discrepancy")
    dna_items = case_store.list_evidence_dna("upi_payment_discrepancy")

    scoped_dag = ProvenanceDAGBuilder.build_artifact_derivation_dag(
        artifact_id="ART-004-BCCD4200",
        run=baseline_run,
        artifacts=artifacts,
        evidence_dna_items=dna_items,
    )

    assert scoped_dag.is_acyclic() is True
    # Root artifact node must be present
    assert any(n.node_id == "art:ART-004-BCCD4200" for n in scoped_dag.nodes)
    # Bank-only artifact must NOT be in the scoped DAG root nodes
    assert not any(n.node_id == "art:ART-001-AABB1100" and n.node_type == DAGNodeType.ARTIFACT for n in scoped_dag.nodes)
    # The contradiction and finding depending on ART-004 must be present in the downstream path
    assert any(n.node_id == "finding:FINDING-02" for n in scoped_dag.nodes)


# =============================================================================
# 4. Investigation Graph Tests
# =============================================================================

def test_investigation_graph_model(case_store: CaseStore):
    """Investigation Graph must connect entities across phone, VPA, bank transaction, and claims."""
    artifacts = case_store.list_artifacts("upi_payment_discrepancy")
    facts = case_store.list_canonical_facts("upi_payment_discrepancy")
    correlations, _ = CorrelationEngine().correlate_case(facts)

    graph = InvestigationGraphBuilder.build_case_graph("upi_payment_discrepancy", artifacts, facts, correlations)

    assert graph.graph_id == "inv_graph_upi_payment_discrepancy"
    assert len(graph.nodes) > 0
    assert len(graph.edges) > 0

    node_types = {n.node_type for n in graph.nodes}
    assert EntityNodeType.PHONE_NUMBER in node_types
    assert EntityNodeType.UPI_VPA in node_types
    assert EntityNodeType.BANK_TRANSACTION in node_types
    assert EntityNodeType.CLAIM_RECEIPT in node_types
    assert EntityNodeType.ARTIFACT in node_types

    edge_types = {e.edge_type for e in graph.edges}
    assert EntityEdgeType.RECORDED_IN in edge_types
    assert EntityEdgeType.DEBITS_TO in edge_types or EntityEdgeType.REQUESTS_PAYMENT_TO in edge_types
    assert EntityEdgeType.REFERENCES_TRANSACTION in edge_types

    # Discrepancy edge should be flagged
    contradiction_edges = [e for e in graph.edges if e.is_contradiction]
    assert len(contradiction_edges) >= 1
    assert "Discrepancy" in contradiction_edges[0].label
