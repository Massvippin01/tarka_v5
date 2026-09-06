from __future__ import annotations


class InvestigationQueries:

    FIND_ENTITY = """
    MATCH (n {id:$id})
    RETURN n
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
    MATCH (p:Person {id:$id})-[:ASSOCIATED_WITH|OWNED_BY]->(v:Vehicle)
    RETURN v
    """

    CASE_EVIDENCE = """
    MATCH (c:Case {id:$id})-[:SUPPORTED_BY|RELATED_TO]->(e:Evidence)
    RETURN e
    """

    CASE_TIMELINE = """
    MATCH (c:Case {id:$id})-[:OCCURRED_AT|RELATED_TO]->(ev:Event)
    RETURN ev
    ORDER BY ev.observed_at ASC
    """

    SHARED_PHONES = """
    MATCH (p1:Person)-[:USES]->(ph:Phone)<-[:USES]-(p2:Person)
    WHERE p1.id <> p2.id
    RETURN p1, p2, ph
    """

    SHARED_VEHICLES = """
    MATCH (p1:Person)-[:ASSOCIATED_WITH|OWNED_BY]->(v:Vehicle)<-[:ASSOCIATED_WITH|OWNED_BY]-(p2:Person)
    WHERE p1.id <> p2.id
    RETURN p1, p2, v
    """

    COMMON_LOCATIONS = """
    MATCH (p1:Person)-[:LOCATED_AT]->(l:Location)<-[:LOCATED_AT]-(p2:Person)
    WHERE p1.id <> p2.id
    RETURN p1, p2, l
    """

    TEMPORAL_WINDOW_RELATIONSHIPS = """
    MATCH (a {id:$node_id})-[r]-(b)
    WHERE (r.observed_at >= $start_time AND r.observed_at <= $end_time)
       OR (r.valid_from <= $end_time AND (r.valid_to IS NULL OR r.valid_to >= $start_time))
    RETURN a, r, b
    ORDER BY r.observed_at ASC
    """

    SHORTEST_PATH_EVIDENCE_BACKED = """
    MATCH (a {id:$source}), (b {id:$target})
    MATCH p = shortestPath((a)-[*..8]-(b))
    RETURN p
    """

    COMMON_CONNECTIONS = """
    MATCH (a {id:$id1})-[r1]-(c)-[r2]-(b {id:$id2})
    WHERE a.id <> b.id AND c.id <> a.id AND c.id <> b.id
    RETURN DISTINCT c AS common_entity, r1, r2
    """
