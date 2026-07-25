PERSON_NETWORK = """
MATCH (p:Person {id:$person_id})-[r*1..2]-(n)
UNWIND r AS rel
RETURN p,rel,n
"""

CASE_NETWORK = """
MATCH (c:Case {id:$case_id})-[r*1..2]-(n)
UNWIND r AS rel
RETURN c,rel,n
"""

COMMON_ASSOCIATES = """
MATCH (a:Person {id:$id1})--(x)--(b:Person {id:$id2})
RETURN DISTINCT x
"""

SHORTEST_PATH = """
MATCH (a {id:$from}),(b {id:$to})
MATCH p=shortestPath((a)-[*..8]-(b))
RETURN p
"""