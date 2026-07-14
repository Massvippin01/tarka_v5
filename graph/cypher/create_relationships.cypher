MATCH (p:Person {id:1})
MATCH (c:Crime {id:101})
CREATE (p)-[:COMMITTED]->(c);

MATCH (c:Crime {id:101})
MATCH (l:Location {id:201})
CREATE (c)-[:AT]->(l);

MATCH (p:Person {id:1})
MATCH (v:Vehicle {id:301})
CREATE (p)-[:USED]->(v);