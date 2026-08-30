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

        self.assertIn("4 potentially relevant connections found", res.answer)
        self.assertEqual(res.confidence, 0.89)
        self.assertEqual(res.confidence_level, "INFERRED")
        self.assertTrue(len(res.supporting_records) >= 4)
        self.assertTrue(len(res.evidence_references) > 0)
        self.assertEqual(res.provenance["source"], "SENTINELX_AI_COPILOT")

    def test_100_golden_scenarios_generation(self):
        gen = ScenarioGenerator(self.store)
        scenarios = gen.generate_all_100_scenarios()
        self.assertEqual(len(scenarios), 100)


if __name__ == "__main__":
    unittest.main()
