from functools import lru_cache

from neo4j import GraphDatabase

from app.core.config import settings
from app.graph.graph_algorithms import GraphAlgorithms
from app.repositories.case_repository import CaseRepository
from app.repositories.person_repository import PersonRepository
from app.repositories.relationship_repository import RelationshipRepository
from app.services.graph_analysis_service import GraphAnalysisService
from app.services.investigation_service import InvestigationService


@lru_cache
def get_driver():
    return GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(
            settings.NEO4J_USERNAME,
            settings.NEO4J_PASSWORD,
        ),
    )


@lru_cache
def person_repository():
    return PersonRepository(get_driver())


@lru_cache
def case_repository():
    return CaseRepository(get_driver())


@lru_cache
def relationship_repository():
    return RelationshipRepository(get_driver())


@lru_cache
def graph_algorithms():
    return GraphAlgorithms(person_repository())


@lru_cache
def graph_service():
    return GraphAnalysisService(graph_algorithms())


@lru_cache
def investigation_service():
    return InvestigationService(
        case_repository=case_repository(),
        person_repository=person_repository(),
        relationship_repository=relationship_repository(),
    )
