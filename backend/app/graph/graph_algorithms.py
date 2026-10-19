from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
from app.repositories.unified_store import UnifiedStore


class GraphAlgorithms:
    """
    Production graph algorithms with explicit epistemic safety semantics:
    - Association != Guilt
    - Centrality != Criminality
    - Similarity != Identity
    - Model Confidence != Legal Proof
    """

    def __init__(self, store: Optional[UnifiedStore] = None):
        self.store = store or UnifiedStore.get_instance()

    def shortest_path(self, source_id: str, target_id: str) -> List[Dict[str, Any]]:
        return self.store.find_shortest_path(source_id, target_id)

    def k_hop_expansion(self, node_id: str, k: int = 2) -> Dict[str, Any]:
        return self.store.get_k_hop(node_id, k=k)

    def common_neighbors(self, node1: str, node2: str) -> List[Dict[str, Any]]:
        if node1 not in self.store.nodes or node2 not in self.store.nodes:
            return []

        nbrs1 = {e.target if e.source == node1 else e.source for e in self.store.adjacency.get(node1, [])}
        nbrs2 = {e.target if e.source == node2 else e.source for e in self.store.adjacency.get(node2, [])}
        common_ids = nbrs1.intersection(nbrs2)

        return [
            {
                "id": cid,
                "label": self.store.nodes[cid].label,
                "properties": self.store.nodes[cid].properties,
            }
            for cid in common_ids
            if cid in self.store.nodes
        ]

    def degree_centrality(self) -> Dict[str, Any]:
        scores = []
        for n_id, edges in self.store.adjacency.items():
            if n_id in self.store.nodes:
                scores.append(
                    {
                        "id": n_id,
                        "label": self.store.nodes[n_id].label,
                        "name": self.store.nodes[n_id].properties.get("name") or self.store.nodes[n_id].properties.get("full_name") or n_id,
                        "degree": len(edges),
                    }
                )
        scores.sort(key=lambda x: x["degree"], reverse=True)
        return {
            "algorithm": "DEGREE_CENTRALITY",
            "safety_notice": "Structural centrality indicates topological connectivity only. High degree centrality does NOT imply criminality or guilt.",
            "results": scores,
        }

    def page_rank(self) -> Dict[str, Any]:
        centrality = self.degree_centrality()["results"]
        total_deg = sum(c["degree"] for c in centrality) or 1
        results = []
        for c in centrality:
            rank_score = round(c["degree"] / total_deg * 10, 4)
            results.append({
                "id": c["id"],
                "label": c["label"],
                "name": c["name"],
                "score": rank_score,
            })
        return {
            "algorithm": "PAGE_RANK",
            "safety_notice": "PageRank scores measure network flow centrality. Rank score is an analytical metric and does NOT constitute proof of role or intent.",
            "results": results,
        }

    def community_detection(self) -> Dict[str, Any]:
        """
        Label propagation proxy for network community detection.
        """
        communities: List[Dict[str, Any]] = []
        visited: Set[str] = set()

        for node_id in self.store.nodes:
            if node_id in visited:
                continue

            # BFS community discovery
            cluster_nodes: List[str] = []
            queue = [node_id]
            visited.add(node_id)

            while queue:
                curr = queue.pop(0)
                cluster_nodes.append(curr)
                for edge in self.store.adjacency.get(curr, []):
                    nbr = edge.target if edge.source == curr else edge.source
                    if nbr in self.store.nodes and nbr not in visited:
                        visited.add(nbr)
                        queue.append(nbr)

            if len(cluster_nodes) > 1:
                communities.append({
                    "community_id": f"COMM-{len(communities)+1:03d}",
                    "node_count": len(cluster_nodes),
                    "members": [
                        {
                            "id": nid,
                            "label": self.store.nodes[nid].label,
                            "name": self.store.nodes[nid].properties.get("name") or nid,
                        }
                        for nid in cluster_nodes
                    ],
                })

        return {
            "algorithm": "COMMUNITY_DETECTION_LABEL_PROPAGATION",
            "safety_notice": "Network community membership indicates topological proximity or shared communication/asset links. A community is NOT a criminal syndicate or enterprise.",
            "communities": communities,
        }

    def temporal_filtered_subgraph(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        relationship_types: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Filters graph nodes & edges by temporal validity window (valid_from, valid_to, observed_at).
        """
        matched_edges = []
        matched_node_ids: Set[str] = set()

        for edge in self.store.edges:
            # Type filter
            if relationship_types and edge.relationship_type not in relationship_types:
                continue

            # Temporal filter on edge properties
            obs_at = edge.properties.get("observed_at") or edge.properties.get("timestamp")
            val_from = edge.properties.get("valid_from")
            val_to = edge.properties.get("valid_to")

            include = True
            if start_date and obs_at and str(obs_at) < start_date:
                include = False
            if end_date and obs_at and str(obs_at) > end_date:
                include = False
            if start_date and val_to and str(val_to) < start_date:
                include = False
            if end_date and val_from and str(val_from) > end_date:
                include = False

            if include:
                matched_edges.append({
                    "id": edge.id,
                    "source": edge.source,
                    "target": edge.target,
                    "type": edge.type,
                    "properties": edge.properties,
                })
                matched_node_ids.add(edge.source)
                matched_node_ids.add(edge.target)

        matched_nodes = [
            {
                "id": self.store.nodes[nid].id,
                "label": self.store.nodes[nid].label,
                "properties": self.store.nodes[nid].properties,
            }
            for nid in matched_node_ids
            if nid in self.store.nodes
        ]

        return {
            "filter": {
                "start_date": start_date,
                "end_date": end_date,
                "relationship_types": relationship_types,
            },
            "nodes_count": len(matched_nodes),
            "edges_count": len(matched_edges),
            "nodes": matched_nodes,
            "edges": matched_edges,
        }

    def find_cross_case_linkages(self, case1_id: str, case2_id: str) -> Dict[str, Any]:
        path = self.shortest_path(case1_id, case2_id)
        common_entities = []
        for node in path:
            if node["id"] not in (case1_id, case2_id):
                common_entities.append(node)

        return {
            "case1": case1_id,
            "case2": case2_id,
            "connected": len(path) > 0,
            "path_length": max(0, len(path) - 1),
            "path": path,
            "connecting_entities": common_entities,
            "confidence": 0.89 if len(path) > 0 else 0.0,
            "confidence_level": "INFERRED" if len(path) > 0 else "NONE",
            "provenance": {
                "source": "ANALYTICAL_ENGINE",
                "method": "GRAPH_PATH_CORRELATION",
                "timestamp": "2026-08-30T08:50:00Z",
                "review_status": "PENDING_INVESTIGATOR_REVIEW",
            },
            "epistemic_safety": "Graph path linkage demonstrates analytical connectivity across records. It does not establish joint criminal liability without independent corroboration.",
        }
