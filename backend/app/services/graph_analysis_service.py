from __future__ import annotations

from app.graph.graph_algorithms import GraphAlgorithms


class GraphAnalysisService:

    def __init__(
        self,
        algorithms: GraphAlgorithms,
    ):
        self.algorithms = algorithms

    def shortest_path(
        self,
        source: str,
        target: str,
    ):
        return self.algorithms.shortest_path(
            source,
            target,
        )

    def page_rank(self):
        return self.algorithms.page_rank()

    def similarity(self):
        return self.algorithms.node_similarity()
