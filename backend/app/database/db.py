from __future__ import annotations

import logging
from typing import Optional
from neo4j import Driver, GraphDatabase
from app.core.config import settings

logger = logging.getLogger("sentinelx.database.neo4j")

_driver: Optional[Driver] = None


def get_neo4j_driver() -> Driver:
    """
    Get or initialize the shared Neo4j driver with production connection pooling.
    """
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
                max_connection_pool_size=settings.NEO4J_MAX_CONNECTION_POOL_SIZE,
                connection_acquisition_timeout=10.0,
            )
        except Exception as e:
            logger.warning(f"Neo4j driver initialization deferred / failed: {e}")
            raise
    return _driver


class LazyDriverProxy:
    """Proxy object allowing driver usage without breaking existing imports."""
    def __getattr__(self, name):
        return getattr(get_neo4j_driver(), name)


driver = LazyDriverProxy()


def verify_neo4j_connection() -> bool:
    try:
        d = get_neo4j_driver()
        d.verify_connectivity()
        return True
    except Exception as e:
        logger.warning(f"Neo4j connectivity check failed: {e}")
        return False


def close_neo4j_connection() -> None:
    global _driver
    if _driver is not None:
        try:
            _driver.close()
        except Exception as e:
            logger.warning(f"Error closing Neo4j driver: {e}")
        finally:
            _driver = None
