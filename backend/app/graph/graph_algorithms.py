from __future__ import annotations

from app.repositories.neo4j_repository import Neo4jRepository


class GraphAlgorithms:

    def __init__(self, repository: Neo4jRepository):
        self.repository = repository

    def shortest_path(self, source: str, target: str):

        query = """
        MATCH (a {id:$source})
        MATCH (b {id:$target})
        MATCH p = shortestPath((a)-[*]-(b))
        RETURN p
        """

        return self.repository.execute_read(
            query,
            source=source,
            target=target,
        )

    def node_similarity(self):

        query = """
        CALL gds.nodeSimilarity.stream('sentinel')
        YIELD node1,node2,similarity
        RETURN node1,node2,similarity
        """

        return self.repository.execute_read(query)

    def page_rank(self):

        query = """
        CALL gds.pageRank.stream('sentinel')
        YIELD nodeId,score
        RETURN nodeId,score
        ORDER BY score DESC
        """

        return self.repository.execute_read(query)
