from __future__ import annotations

from typing import Iterable


class CypherBuilder:
    """
    Utility class for constructing parameterized Cypher queries.
    """

    @staticmethod
    def create_node(label: str, properties: dict[str, object]) -> tuple[str, dict]:
        assignments = ", ".join(f"{k}: ${k}" for k in properties.keys())

        query = f"""
        CREATE (n:{label} {{
            {assignments}
        }})
        RETURN n
        """

        return query, properties

    @staticmethod
    def match_node(label: str, key: str):
        return f"""
        MATCH (n:{label} {{{key}: ${key}}})
        RETURN n
        """

    @staticmethod
    def delete_node(label: str, key: str):
        return f"""
        MATCH (n:{label} {{{key}: ${key}}})
        DETACH DELETE n
        """

    @staticmethod
    def create_relationship(
        source_label: str,
        target_label: str,
        relationship: str,
        source_key: str = "id",
        target_key: str = "id",
    ):

        return f"""
        MATCH (a:{source_label} {{{source_key}: $source}})
        MATCH (b:{target_label} {{{target_key}: $target}})
        MERGE (a)-[:{relationship}]->(b)
        """

    @staticmethod
    def shortest_path(
        source_label: str,
        target_label: str,
        relationship: str = "*",
    ):

        return f"""
        MATCH (a:{source_label} {{id:$source}})
        MATCH (b:{target_label} {{id:$target}})
        MATCH p = shortestPath((a)-[:{relationship}]-(b))
        RETURN p
        """

    @staticmethod
    def node_exists(label: str):

        return f"""
        MATCH (n:{label} {{id:$id}})
        RETURN COUNT(n) > 0 AS exists
        """