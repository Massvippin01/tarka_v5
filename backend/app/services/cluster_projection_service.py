from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional
from app.repositories.unified_store import UnifiedStore


class ClusterProjectionService:
    _instance: Optional[ClusterProjectionService] = None

    def __init__(self):
        self.store = UnifiedStore.get_instance()

    @classmethod
    def get_instance(cls) -> ClusterProjectionService:
        if cls._instance is None:
            cls._instance = ClusterProjectionService()
        return cls._instance

    def project_clustered_graph(
        self,
        case_id: Optional[str] = "C102",
        max_raw_nodes: int = 200,
        cluster_threshold: int = 15,
    ) -> Dict[str, Any]:
        # Group nodes by label
        nodes_by_type: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for n in self.store.nodes.values():
            c_scope = n.properties.get("case_id")
            if case_id and c_scope and c_scope != case_id:
                continue
            nodes_by_type[n.label.upper()].append({
                "id": n.id,
                "label": n.label,
                "properties": n.properties,
            })

        projected_nodes: List[Dict[str, Any]] = []
        clusters: List[Dict[str, Any]] = []
        total_matching = sum(len(v) for v in nodes_by_type.values())

        for label, items in nodes_by_type.items():
            if len(items) > cluster_threshold:
                # Aggregate into a cluster summary node
                cid = f"CLUSTER-{label}-{case_id or 'GLOBAL'}"
                cluster_node = {
                    "id": cid,
                    "label": "CLUSTER",
                    "properties": {
                        "cluster_id": cid,
                        "entity_type": label,
                        "member_count": len(items),
                        "visible_member_count": min(5, len(items)),
                        "representative_label": f"{label} CLUSTER ({len(items)} items)",
                        "cluster_type": label,
                        "expanded": False,
                    },
                }
                projected_nodes.append(cluster_node)
                clusters.append({
                    "cluster_id": cid,
                    "entity_type": label,
                    "total_members": len(items),
                })
                # Add top 3 representative raw nodes
                for rep in items[:3]:
                    projected_nodes.append(rep)
            else:
                projected_nodes.extend(items[:max_raw_nodes])

        # Extract bounded edges
        valid_ids = {n["id"] for n in projected_nodes}
        projected_edges = []
        for e in self.store.edges:
            if e.source in valid_ids and e.target in valid_ids:
                projected_edges.append({
                    "id": e.id,
                    "source": e.source,
                    "target": e.target,
                    "type": e.type,
                    "properties": e.properties,
                })

        return {
            "query_scope": {"case_id": case_id, "max_raw_nodes": max_raw_nodes},
            "telemetry": {
                "total_matching_entities": total_matching,
                "projected_nodes_count": len(projected_nodes),
                "projected_edges_count": len(projected_edges),
                "cluster_nodes_count": len(clusters),
                "truncated": total_matching > len(projected_nodes),
                "truncation_message": f"SHOWING {len(projected_nodes)} BOUNDED NODES (OF {total_matching} AVAILABLE ENTITIES)",
            },
            "nodes": projected_nodes,
            "edges": projected_edges,
            "clusters": clusters,
        }
