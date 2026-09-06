from __future__ import annotations

import unittest
from app.domain.enums import ConfidenceLevel, EntityType, SourceSystem
from app.generators.scenario_generator import ScenarioGenerator
from app.graph.graph_algorithms import GraphAlgorithms
from app.repositories.unified_store import UnifiedStore
from app.services.ai_copilot_service import AICopilotService
from app.services.entity_resolution_engine import EntityResolutionEngine, EntityResolutionMatch
from app.services.ingestion_pipeline import IngestionPipeline
from app.adapters.synthetic_adapters import CCTNSAdapter, VAHANAdapter


class TestNexusSuite(unittest.TestCase):
    def setUp(self):
        self.store = UnifiedStore.get_instance()
        self.store.clear()
        self.scenario = ScenarioGenerator.generate_golden_vertical_slice()

    def test_golden_vertical_slice_entities(self):
        # 1. Verify Case C102 & C481
        self.assertIn("C102", self.store.cases)
        self.assertIn("C481", self.store.cases)

        # 2. Verify Person P001 & P044
        self.assertIn("P001", self.store.persons)
        self.assertIn("P044", self.store.persons)

        p1 = self.store.persons["P001"]
        self.assertEqual(p1.full_name, "Vikram Singh")
        self.assertEqual(p1.risk_level, "HIGH")
        self.assertEqual(p1.source, SourceSystem.CCTNS.value)

        # 3. Verify Phone & Vehicle & Accounts
        self.assertIn("PH001", self.store.phones)
        self.assertIn("V188", self.store.vehicles)
        self.assertIn("ACC992", self.store.bank_accounts)
        self.assertIn("ACC481", self.store.bank_accounts)

        # 4. Verify CDR Call & Financial Transaction & ANPR
        self.assertTrue(len(self.store.call_records) > 0)
        self.assertTrue(len(self.store.transactions) > 0)
        self.assertTrue(len(self.store.anpr_observations) > 0)

        # 5. Verify Evidence
        self.assertIn("E101", self.store.evidence)
        ev = self.store.evidence["E101"]
        self.assertEqual(ev.case_id, "C102")
        self.assertTrue(ev.is_verified)

    def test_neo4j_graph_shortest_path(self):
        algorithms = GraphAlgorithms(self.store)
        res = algorithms.find_cross_case_linkages("C102", "C481")

        self.assertTrue(res["connected"])
        self.assertEqual(res["confidence"], 0.89)
        self.assertEqual(res["confidence_level"], "INFERRED")
        self.assertTrue(len(res["connecting_entities"]) > 0)

    def test_entity_resolution_candidates(self):
        er_engine = EntityResolutionEngine(self.store)
        # Create a candidate person with matching DL and alias
        candidate = self.store.persons["P001"]
        matches = er_engine.find_matches_for_person(candidate)

        # Ensure engine produces valid score and explanation without silently merging
        for match in matches:
            self.assertIsInstance(match, EntityResolutionMatch)
            self.assertGreater(match.similarity_score, 0.5)
            self.assertEqual(match.review_status, "PENDING_INVESTIGATOR_APPROVAL")

    def test_ai_copilot_tool_execution(self):
        copilot = AICopilotService(self.store)

        # Query connections between Case C102 and Case C481
        res = copilot.process_query("What connects Case C102 and Case C481?")
        self.assertIn("4 verified connecting entities identified", res.answer)
        self.assertEqual(res.confidence, 0.95)
        self.assertEqual(res.confidence_level, "INFERRED")
        self.assertTrue(len(res.supporting_records) >= 4)
        self.assertTrue(len(res.evidence_references) > 0)
        self.assertEqual(res.provenance["source"], "SENTINELX_AI_COPILOT")

    def test_100_golden_scenarios_generation(self):
        gen = ScenarioGenerator(self.store)
        scenarios = gen.generate_all_100_scenarios()
        self.assertEqual(len(scenarios), 100)

    def test_bounded_graph_projection(self):
        from app.domain.projection import GraphProjectionRequest
        from app.services.graph_projection_service import GraphProjectionService

        service = GraphProjectionService(self.store)
        req = GraphProjectionRequest(case_id="C102", max_nodes=5, max_hops=2)
        res = service.project_bounded_graph(req)

        self.assertIsNotNone(res.query_id)
        self.assertTrue(len(res.nodes) <= 5)
        self.assertTrue(res.truncation.is_truncated)
        self.assertEqual(res.applied_scope["max_nodes"], 5)
        self.assertGreater(res.telemetry.query_duration_ms, 0.0)

    def test_federated_search_golden_queries(self):
        from app.domain.search import FederatedSearchRequest
        from app.services.federated_search_service import FederatedSearchService

        service = FederatedSearchService(self.store)

        for query in ["C102", "P001", "PH001", "V188", "ACC992"]:
            req = FederatedSearchRequest(query=query)
            res = service.execute_search(req)

            self.assertIsNotNone(res.query_id)
            self.assertGreater(res.returned_count, 0)
            top_match = res.results[0]
            self.assertEqual(top_match.relevance_score, 90.0)
            self.assertGreater(res.query_duration_ms, 0.0)

    def test_analytical_engine_signals(self):
        from app.services.analytical_engine import AnalyticalEngine

        engine = AnalyticalEngine(self.store)
        res = engine.analyze_case("C102")

        self.assertEqual(res.case_id, "C102")
        self.assertTrue(len(res.signals) >= 5)
        self.assertTrue(len(res.candidate_networks) > 0)
        self.assertTrue(len(res.mobility_sequences) > 0)
        self.assertTrue(len(res.financial_anomalies) > 0)

        # Verify 21-field signal completeness & non-accusatory epistemic standards
        cross_sig = next(s for s in res.signals if s.signal_type == "CROSS_CASE")
        self.assertIn("C102", cross_sig.related_cases)
        self.assertIn("C481", cross_sig.related_cases)
        self.assertEqual(cross_sig.epistemic_status, "INFERRED")
        self.assertTrue(len(cross_sig.evidence_references) > 0)
        self.assertTrue(len(cross_sig.alternative_explanations) > 0)
        self.assertTrue(len(cross_sig.evidence_gaps) > 0)
        self.assertGreater(res.query_duration_ms, 0.0)

    def test_claim_verifier_and_audit_logging(self):
        from app.domain.copilot import CopilotClaim
        from app.services.audit_service import AuditService
        from app.services.claim_verifier import ClaimVerifier

        verifier = ClaimVerifier(self.store)
        audit = AuditService.get_instance()

        claims = [
            CopilotClaim(claim_type="FACT", subject_entity_id="P001", target_entity_id="P044", text="P001 linked to P044", evidence_reference="EV-2026-101"),
            CopilotClaim(claim_type="FACT", subject_entity_id="P001", target_entity_id="FAKE-999", text="P001 linked to fake entity"),
        ]

        verified, summary = verifier.verify_claims(claims)

        self.assertEqual(summary.total_claims, 2)
        self.assertEqual(summary.verified_claims, 1)
        self.assertEqual(summary.rejected_claims, 1)
        self.assertEqual(verified[1].verification_status, "REJECTED")

        # Test Audit Logging
        entry = audit.log_query_event(
            query="Test Query",
            scope={"case": "C102"},
            tools_invoked=["find_shortest_path"],
            records_accessed=["P001", "P044"],
            response_id="RESP-TEST-01",
            verification_rate=0.5,
        )
        self.assertIsNotNone(entry["audit_id"])
        self.assertTrue(len(audit.get_audit_logs()) >= 1)

    def test_voice_command_interpreter(self):
        from app.domain.voice import VoiceCommandRequest, VoiceStateEnum
        from app.services.voice_interpreter_service import VoiceInterpreterService

        service = VoiceInterpreterService()

        # Test Read/Navigation Command
        req1 = VoiceCommandRequest(transcript="Show connections of P001")
        res1 = service.process_command(req1)
        self.assertEqual(res1.state, VoiceStateEnum.COMPLETED)
        self.assertEqual(res1.interpretation.action, "FOCUS_ENTITY")
        self.assertEqual(res1.interpretation.parameters["entity_id"], "P001")

        # Test High-Risk Action Guardrail
        req2 = VoiceCommandRequest(transcript="Delete evidence EV-2026-101")
        res2 = service.process_command(req2)
        self.assertEqual(res2.state, VoiceStateEnum.CONFIRMATION_REQUIRED)
        self.assertTrue(res2.interpretation.requires_confirmation)
        self.assertEqual(res2.interpretation.risk_level, "HIGH")

    def test_realtime_event_dispatcher(self):
        from app.domain.realtime import EventSubscriptionScope
        from app.services.realtime_dispatcher import RealtimeDispatcher

        dispatcher = RealtimeDispatcher.get_instance()
        ev1 = dispatcher.publish_event("EVIDENCE_ADDED", {"evidence_id": "EV-99"}, case_id="C102")
        self.assertGreater(ev1.sequence_number, 0)

        scope = EventSubscriptionScope(case_id="C102")
        events = dispatcher.get_scoped_events(scope, after_sequence=ev1.sequence_number - 1)
        self.assertTrue(len(events) >= 1)
        self.assertEqual(events[-1].case_id, "C102")

    def test_security_identity_and_case_scope_isolation(self):
        from app.services.auth_service import AuthService

        auth = AuthService.get_instance()
        user_delhi = auth.users["INVESTIGATOR_DELHI"]
        user_gurugram = auth.users["INVESTIGATOR_GURUGRAM"]
        user_supervisor = auth.users["SUPERVISOR_NCR"]

        # Case scope checks
        self.assertTrue(auth.validate_case_scope(user_delhi, "C102"))
        self.assertFalse(auth.validate_case_scope(user_delhi, "C481"))

        self.assertTrue(auth.validate_case_scope(user_gurugram, "C481"))
        self.assertFalse(auth.validate_case_scope(user_gurugram, "C102"))

        self.assertTrue(auth.validate_case_scope(user_supervisor, "C102"))
        self.assertTrue(auth.validate_case_scope(user_supervisor, "C481"))

    def test_audit_hash_chain_integrity(self):
        from app.services.audit_service import AuditService

        audit = AuditService.get_instance()
        entry1 = audit.log_query_event("Query 1", {"case": "C102"}, ["tool1"], ["P001"], "R1", 1.0)
        entry2 = audit.log_query_event("Query 2", {"case": "C102"}, ["tool2"], ["P044"], "R2", 1.0)

        self.assertIsNotNone(entry1["event_hash"])
        self.assertEqual(entry2["previous_hash"], entry1["event_hash"])

        res = audit.verify_integrity()
        self.assertTrue(res["chain_valid"])
        self.assertFalse(res["tamper_detected"])

    def test_provenance_chain_traceability(self):
        from app.services.provenance_service import ProvenanceService

        prov = ProvenanceService.get_instance()
        trace = prov.trace_provenance_chain("EV-2026-101")

        self.assertEqual(trace.record_id, "EV-2026-101")
        self.assertEqual(trace.integrity.integrity_status, "INTEGRITY_VERIFIED")
        self.assertEqual(len(trace.chain), 6)
        self.assertEqual(trace.chain[0].step_type, "SOURCE_RECORD")
        self.assertEqual(trace.chain[-1].step_type, "CLAIM")

    def test_store_indexer_lookups(self):
        from app.services.store_indexer import StoreIndexer

        indexer = StoreIndexer.get_instance()
        persons = indexer.get_nodes_by_type("PERSON")
        self.assertIn("P001", persons)

        node_id = indexer.lookup_by_identifier("Vikram Singh")
        self.assertEqual(node_id, "P001")

    def test_deterministic_dataset_generator(self):
        from app.services.generator_service import DeterministicDatasetGenerator

        gen = DeterministicDatasetGenerator(seed=12345)
        res = gen.generate_tier_dataset("TIER_A")

        self.assertEqual(res["seed"], 12345)
        self.assertGreaterEqual(res["total_nodes"], 100)
        # Golden scenario C102 preserved
        self.assertIn("P001", self.store.nodes)
        self.assertIn("C102", self.store.cases)

    def test_idempotent_ingestion_pipeline(self):
        from app.adapters.synthetic_adapters import CCTNSAdapter
        from app.services.ingestion_pipeline import IngestionPipeline

        pipeline = IngestionPipeline()
        adapter = CCTNSAdapter()

        records = adapter.fetch_records(limit=5)
        res1 = pipeline.ingest_canonical_records("CCTNS", records)
        self.assertEqual(res1["accepted"], 5)

        # Ingest exact same record set again -> Idempotency prevents duplicates
        res2 = pipeline.ingest_canonical_records("CCTNS", records)
        self.assertEqual(res2["duplicate"], 5)

    def test_cluster_projection_service(self):
        from app.services.cluster_projection_service import ClusterProjectionService

        cps = ClusterProjectionService.get_instance()
        res = cps.project_clustered_graph(case_id="C102")

        self.assertIn("nodes", res)
        self.assertIn("edges", res)
        self.assertIn("telemetry", res)
        self.assertFalse(res["telemetry"]["truncated"] and len(res["nodes"]) > 500)

    def test_benchmark_harness_execution(self):
        from app.services.benchmark_service import BenchmarkService

        bench = BenchmarkService.get_instance()
        res = bench.run_suite(concurrency_tier=1, runs=2)

        self.assertIn("operations", res)
        self.assertIn("federated_search", res["operations"])
        self.assertIn("p50_ms", res["operations"]["federated_search"])


if __name__ == "__main__":
    unittest.main()
