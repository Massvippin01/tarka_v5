from __future__ import annotations

import logging
from app.core.config import settings
from app.generators.scenario_generator import ScenarioGenerator
from app.graph.graph_schema import CONSTRAINTS, INDEXES

logger = logging.getLogger("sentinelx.init")


def initialize_database():
    # Seed UnifiedStore with vertical slice golden scenario
    try:
        ScenarioGenerator.generate_golden_vertical_slice()
        logger.info("✓ UnifiedStore seeded with Golden Vertical Slice scenario")
    except Exception as e:
        logger.error(f"Error seeding UnifiedStore: {e}")

    # Optionally initialize Neo4j schema if driver connects
    try:
        from neo4j import GraphDatabase

        driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
        )
        with driver.session() as session:
            for constraint in CONSTRAINTS:
                session.run(constraint)
            for index in INDEXES:
                session.run(index)
        driver.close()
        logger.info("✓ Neo4j database schema initialized")
    except Exception as e:
        logger.warning(f"Neo4j connection bypassed (operating in high-performance local store mode): {e}")
