from __future__ import annotations

from app.services.entity_resolution_service import (
    EntityResolutionService,
)
from app.services.graph_analysis_service import (
    GraphAnalysisService,
)
from app.services.timeline_service import TimelineService


class IntelligenceService:

    def __init__(
        self,
        graph: GraphAnalysisService,
        resolver: EntityResolutionService,
        timeline: TimelineService,
    ):
        self.graph = graph
        self.resolver = resolver
        self.timeline = timeline

    def build_case_summary(
        self,
        case_id: str,
    ):
        """
        Placeholder.

        Future:

        - summarize entities
        - rank suspects
        - detect communities
        - explain reasoning
        """

        return {
            "case": case_id,
            "status": "pending",
        }
