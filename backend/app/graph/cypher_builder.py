from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


class CypherBuilder:
    """
    Utility class for constructing parameterized Cypher queries for Neo4j.
    """

    @staticmethod
    def create_node(label: str, properties: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        assignments = ", ".join(f"{k}: ${k}" for k in properties)
        query = f"CREATE (n:{label} {{ {assignments} }}) RETURN n"
        return query, properties

    @staticmethod
    def match_node(label: str, key: str = "id") -> str:
        return f"MATCH (n:{label} {{{key}: ${key}}}) RETURN n"

    @staticmethod
    def delete_node(label: str, key: str = "id") -> str:
        return f"MATCH (n:{label} {{{key}: ${key}}}) DETACH DELETE n"

    @staticmethod
    def create_relationship(
        source_label: str,
        target_label: str,
        relationship_type: str,
        source_key: str = "id",
        target_key: str = "id",
        rel_properties: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        props_str = ""
        params: Dict[str, Any] = {"source": "$source", "target": "$target"}
        if rel_properties:
            assignments = ", ".join(f"{k}: $rel_{k}" for k in rel_properties)
            props_str = f" {{ {assignments} }}"
            for k, v in rel_properties.items():
                params[f"rel_{k}"] = v

        query = f"""
        MATCH (a:{source_label} {{{source_key}: $source}})
        MATCH (b:{target_label} {{{target_key}: $target}})
        MERGE (a)-[r:{relationship_type}{props_str}]->(b)
        RETURN r
        """
        return query, params

    @staticmethod
    def shortest_path(
        source_id: str,
        target_id: str,
        max_depth: int = 6,
        relationship_types: Optional[List[str]] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        rel_pattern = ":" + "|:".join(relationship_types) if relationship_types else ""
        query = f"""
        MATCH (a {{id: $source}}), (b {{id: $target}})
        MATCH p = shortestPath((a)-[{rel_pattern}*..{max_depth}]-(b))
        RETURN p
        """
        return query, {"source": source_id, "target": target_id}

    @staticmethod
    def common_connections(node1_id: str, node2_id: str) -> Tuple[str, Dict[str, Any]]:
        query = """
        MATCH (a {id: $node1_id})-[r1]-(common)-[r2]-(b {id: $node2_id})
        WHERE a.id <> b.id AND common.id <> a.id AND common.id <> b.id
        RETURN DISTINCT common, r1, r2
        """
        return query, {"node1_id": node1_id, "node2_id": node2_id}

    @staticmethod
    def temporal_filtered_neighborhood(
        node_id: str,
        start_time: str,
        end_time: str,
        max_hops: int = 2,
    ) -> Tuple[str, Dict[str, Any]]:
        query = f"""
        MATCH (n {{id: $node_id}})-[r*1..{max_hops}]-(neighbor)
        WHERE ALL(rel IN r WHERE (rel.observed_at >= $start_time AND rel.observed_at <= $end_time)
                             OR (rel.valid_from <= $end_time AND (rel.valid_to IS NULL OR rel.valid_to >= $start_time)))
        RETURN n, r, neighbor
        """
        return query, {"node_id": node_id, "start_time": start_time, "end_time": end_time}

    @staticmethod
    def node_expansion(node_id: str, k_hops: int = 2) -> Tuple[str, Dict[str, Any]]:
        query = f"""
        MATCH (n {{id: $node_id}})-[r*1..{k_hops}]-(neighbor)
        RETURN n, r, neighbor
        """
        return query, {"node_id": node_id}

    @staticmethod
    def degree_centrality() -> str:
        return """
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-()
        RETURN n.id AS node_id, labels(n)[0] AS label, n.display_name AS name, count(r) AS degree
        ORDER BY degree DESC
        """

    @staticmethod
    def community_detection() -> str:
        return """
        MATCH (n)-[r]-(m)
        WITH n, collect(DISTINCT m) AS neighbors
        RETURN n.id AS node_id, labels(n)[0] AS label, size(neighbors) AS community_size,
               [x IN neighbors | x.id] AS neighbor_ids
        """
