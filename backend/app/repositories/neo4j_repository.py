from __future__ import annotations

from neo4j import Driver


class Neo4jRepository:
    """
    Base class for all Neo4j repositories.
    """

    def __init__(self, driver: Driver):
        self.driver = driver

    def execute_read(self, query: str, **params):

        with self.driver.session() as session:
            return session.execute_read(
                lambda tx: tx.run(query, **params).data()
            )

    def execute_write(self, query: str, **params):

        with self.driver.session() as session:
            return session.execute_write(
                lambda tx: tx.run(query, **params).consume()
            )