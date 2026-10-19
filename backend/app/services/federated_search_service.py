from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
from app.domain.search import (
    ERCandidateSummary,
    FederatedSearchRequest,
    FederatedSearchResponse,
    FederatedSearchResultItem,
    SourceCoverageStatus,
)
from app.repositories.unified_store import UnifiedStore
from app.services.entity_resolution_engine import EntityResolutionEngine


class FederatedSearchService:
    def __init__(self, store: Optional[UnifiedStore] = None):
        self.store = store or UnifiedStore.get_instance()
        self.er_engine = EntityResolutionEngine(self.store)

    def execute_search(self, req: FederatedSearchRequest) -> FederatedSearchResponse:
        t0 = time.perf_counter()
        query_str = req.query.strip()
        q_lower = query_str.lower()

        results_dict: Dict[str, FederatedSearchResultItem] = {}

        # 1. Search Nodes in Store (Persons, Cases, Phones, Vehicles, Accounts, Evidence, Events)
        for node_id, node in self.store.nodes.items():
            props = node.properties
            name = str(props.get("name") or props.get("title") or props.get("registration_number") or props.get("phone_number") or props.get("account_number") or node_id)
            name_lower = name.lower()
            
            # Extract identifier strings
            case_num = str(props.get("case_number", "")).lower()
            fir_num = str(props.get("fir_number", "")).lower()
            phone_num = str(props.get("phone_number", "")).lower()
            reg_num = str(props.get("registration_number", "")).lower()
            aadhaar = str(props.get("aadhaar", "")).lower()
            dl = str(props.get("driving_license", "")).lower()
            ev_num = str(props.get("evidence_number", "")).lower()
            vpa = str(props.get("vpa", "")).lower()
            n_id_lower = node_id.lower()

            relevance = 0.0
            snippet = ""

            # Deterministic 5-Tier Ranking
            if q_lower in (fir_num, phone_num, reg_num, aadhaar, dl, ev_num, vpa) and len(q_lower) > 2:
                relevance = 100.0
                snippet = f"Exact identifier match on {q_lower.upper()}"
            elif q_lower == n_id_lower:
                relevance = 90.0
                snippet = f"Exact canonical ID match '{node_id}'"
            elif q_lower == name_lower:
                relevance = 80.0
                snippet = f"Exact name/title match '{name}'"
            elif q_lower in name_lower or q_lower in n_id_lower or q_lower in fir_num or q_lower in case_num or q_lower in phone_num or q_lower in reg_num:
                relevance = 60.0
                snippet = f"Partial match on '{name}'"

            if relevance > 0.0:
                # Entity Type filter
                if req.entity_types and node.label not in req.entity_types:
                    continue

                # Related Cases lookup
                related_cases = []
                if node.label == "Case":
                    related_cases.append(node.id)
                elif node.label == "Person":
                    person_obj = self.store.persons.get(node.id)
                    if person_obj:
                        related_cases = person_obj.case_ids

                item = FederatedSearchResultItem(
                    id=node.id,
                    entity_type=node.label.upper(),
                    name=name,
                    title=props.get("title") or props.get("crime_type") or node.label,
                    aliases=[str(a) for a in props.get("aliases", [])],
                    jurisdiction=props.get("jurisdiction") or props.get("police_station") or "Delhi NCR",
                    related_cases=related_cases,
                    source_systems=[props.get("source", "SYNTHETIC_ENGINE")],
                    confidence=float(props.get("confidence", 1.0) if isinstance(props.get("confidence"), (int, float)) else 1.0),
                    snippet=snippet,
                    relevance_score=relevance,
                )
                results_dict[node.id] = item

        # 2. Attach Non-Destructive ER Candidates for Person results
        for res_id, res_item in results_dict.items():
            if res_item.entity_type == "PERSON" and res_id in self.store.persons:
                p_obj = self.store.persons[res_id]
                er_matches = self.er_engine.find_matches_for_person(p_obj)
                er_summaries = []
                for match in er_matches:
                    er_summaries.append(
                        ERCandidateSummary(
                            candidate_id=match.candidate_id,
                            match_score=match.similarity_score,
                            matched_fields=match.matching_fields,
                            status="POSSIBLE_MATCH",
                        )
                    )
                res_item.er_candidates = er_summaries

        # Sort results by deterministic relevance score descending
        sorted_results = sorted(list(results_dict.values()), key=lambda x: x.relevance_score, reverse=True)

        # Apply Pagination (Cursor / Page Size)
        total_available = len(sorted_results)
        page_size = req.page_size
        
        start_idx = 0
        if req.cursor:
            try:
                start_idx = int(req.cursor)
            except ValueError:
                start_idx = 0

        paged_results = sorted_results[start_idx : start_idx + page_size]
        next_cursor = str(start_idx + page_size) if (start_idx + page_size) < total_available else None

        # Build Source Coverage Telemetry
        coverage = [
            SourceCoverageStatus(source_system="CCTNS", status="AVAILABLE", record_count=len(self.store.cases)),
            SourceCoverageStatus(source_system="NCRP", status="AVAILABLE", record_count=len(self.store.upi_accounts)),
            SourceCoverageStatus(source_system="VAHAN", status="AVAILABLE", record_count=len(self.store.vehicles)),
            SourceCoverageStatus(source_system="CDR", status="AVAILABLE", record_count=len(self.store.call_records)),
            SourceCoverageStatus(source_system="ANPR", status="AVAILABLE", record_count=len(self.store.anpr_observations)),
            SourceCoverageStatus(source_system="FINANCIAL", status="AVAILABLE", record_count=len(self.store.transactions)),
        ]

        t_end = time.perf_counter()
        duration_ms = round((t_end - t0) * 1000.0, 2)

        return FederatedSearchResponse(
            results=paged_results,
            total_available=total_available,
            returned_count=len(paged_results),
            next_cursor=next_cursor,
            applied_filters={
                "query": req.query,
                "page_size": req.page_size,
                "entity_types": req.entity_types,
            },
            is_truncated=total_available > len(paged_results),
            truncation_reason=f"Showing {len(paged_results)} of {total_available} matching items" if total_available > len(paged_results) else None,
            source_coverage=coverage,
            query_duration_ms=duration_ms,
        )
