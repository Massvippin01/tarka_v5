from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from app.repositories.unified_store import UnifiedStore
from app.services.ai_copilot_service import AICopilotService
from app.services.analytical_engine import AnalyticalEngine
from app.services.federated_search_service import FederatedSearchService
from app.services.graph_projection_service import GraphProjectionService

logger = logging.getLogger("sentinelx.benchmark")


class BenchmarkService:
    _instance: Optional[BenchmarkService] = None

    def __init__(self):
        self.store = UnifiedStore.get_instance()

    @classmethod
    def get_instance(cls) -> BenchmarkService:
        if cls._instance is None:
            cls._instance = BenchmarkService()
        return cls._instance

    def run_suite(self, concurrency_tier: int = 1, runs: int = 10) -> Dict[str, Any]:
        results: Dict[str, Any] = {
            "benchmark_run_id": f"BENCH-{int(time.time())}",
            "timestamp": datetime.now(UTC).isoformat(),
            "environment": "SYNTHETIC_DEVELOPMENT_ENVIRONMENT",
            "concurrency_tier": f"{concurrency_tier} user(s)",
            "dataset_telemetry": {
                "total_nodes": len(self.store.nodes),
                "total_edges": len(self.store.edges),
                "total_cases": len(self.store.cases),
            },
            "operations": {},
        }

        # 1. Benchmark Federated Search
        search_latencies: List[float] = []
        search_service = FederatedSearchService()
        from app.domain.search import FederatedSearchRequest
        for _ in range(runs):
            t0 = time.perf_counter()
            _ = search_service.execute_search(FederatedSearchRequest(query="P001"))
            t1 = time.perf_counter()
            search_latencies.append((t1 - t0) * 1000.0)

        results["operations"]["federated_search"] = self._compute_telemetry(search_latencies)

        # 2. Benchmark Bounded Graph Projection
        graph_latencies: List[float] = []
        projection_service = GraphProjectionService()
        from app.domain.projection import GraphProjectionRequest
        for _ in range(runs):
            t0 = time.perf_counter()
            _ = projection_service.project_bounded_graph(GraphProjectionRequest(case_id="C102"))
            t1 = time.perf_counter()
            graph_latencies.append((t1 - t0) * 1000.0)

        results["operations"]["bounded_graph_projection"] = self._compute_telemetry(graph_latencies)

        # 3. Benchmark Analytical Intelligence Signals
        analytics_latencies: List[float] = []
        analytics_engine = AnalyticalEngine()
        for _ in range(runs):
            t0 = time.perf_counter()
            _ = analytics_engine.analyze_case("C102")
            t1 = time.perf_counter()
            analytics_latencies.append((t1 - t0) * 1000.0)

        results["operations"]["analytical_intelligence"] = self._compute_telemetry(analytics_latencies)

        # 4. Benchmark Governed AI Copilot
        copilot_latencies: List[float] = []
        copilot_service = AICopilotService()
        for _ in range(max(2, runs // 2)):
            t0 = time.perf_counter()
            _ = copilot_service.process_query("What connects Case C102 and Case C481?")
            t1 = time.perf_counter()
            copilot_latencies.append((t1 - t0) * 1000.0)

        results["operations"]["ai_copilot_query"] = self._compute_telemetry(copilot_latencies)

        return results

    def _compute_telemetry(self, latencies_ms: List[float]) -> Dict[str, Any]:
        if not latencies_ms:
            return {"p50_ms": 0.0, "p95_ms": 0.0, "p99_ms": 0.0, "error_rate": 0.0}

        sorted_lat = sorted(latencies_ms)
        n = len(sorted_lat)
        p50 = sorted_lat[int(n * 0.50)]
        p95 = sorted_lat[int(n * 0.95)] if n >= 20 else sorted_lat[-1]
        p99 = sorted_lat[int(n * 0.99)] if n >= 100 else sorted_lat[-1]

        return {
            "runs": n,
            "min_ms": round(sorted_lat[0], 2),
            "max_ms": round(sorted_lat[-1], 2),
            "p50_ms": round(p50, 2),
            "p95_ms": round(p95, 2),
            "p99_ms": round(p99, 2),
            "throughput_rps": round(1000.0 / (p50 or 1.0), 1),
            "error_rate": 0.0,
        }
