from neo4j import GraphDatabase

from app.core.config import settings

from app.graph.graph_schema import (
    CONSTRAINTS,
    INDEXES,
)


def initialize_database():

    driver = GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(
            settings.NEO4J_USERNAME,
            settings.NEO4J_PASSWORD,
        ),
    )

    with driver.session() as session:

        for constraint in CONSTRAINTS:
            session.run(constraint)

        for index in INDEXES:
            session.run(index)

    driver.close()

    print("✓ Neo4j initialized")