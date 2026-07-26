from __future__ import annotations


class InvestigationQueries:

    FIND_PERSON = """
    MATCH (p:Person {id:$id})
    RETURN p
    """

    PERSON_CASES = """
    MATCH (p:Person {id:$id})-[:INVOLVED_IN]->(c:Case)
    RETURN c
    """

    PERSON_PHONES = """
    MATCH (p:Person {id:$id})-[:USES]->(ph:Phone)
    RETURN ph
    """

    PERSON_VEHICLES = """
    MATCH (p:Person {id:$id})-[:OWNS]->(v:Vehicle)
    RETURN v
    """

    CASE_EVIDENCE = """
    MATCH (c:Case {id:$id})-[:HAS_EVIDENCE]->(e)
    RETURN e
    """

    CASE_TIMELINE = """
    MATCH (c:Case {id:$id})-[:HAS_EVENT]->(e)
    RETURN e
    ORDER BY e.occurred_at
    """

    SHARED_PHONES = """
    MATCH (p1:Person)-[:USES]->(ph:Phone)<-[:USES]-(p2:Person)
    WHERE p1.id <> p2.id
    RETURN p1,p2,ph
    """

    SHARED_VEHICLES = """
    MATCH (p1:Person)-[:OWNS]->(v:Vehicle)<-[:OWNS]-(p2:Person)
    WHERE p1.id <> p2.id
    RETURN p1,p2,v
    """

    COMMON_ADDRESS = """
    MATCH (p1:Person)-[:LIVES_AT]->(l:Location)<-[:LIVES_AT]-(p2:Person)
    WHERE p1.id <> p2.id
    RETURN p1,p2,l
    """
