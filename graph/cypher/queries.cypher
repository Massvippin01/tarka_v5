MATCH (n)
RETURN n;

MATCH (n)-[r]->(m)
RETURN n,r,m;

MATCH (p:Person)-[:COMMITTED]->(c:Crime)-[:AT]->(l:Location)
RETURN p,c,l;

MATCH (p:Person)-[:USED]->(v:Vehicle)
RETURN p,v;