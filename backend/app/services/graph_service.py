from app.database.db import driver


def get_graph():
    query = """
    MATCH (source)-[relationship]->(target)
    RETURN source, relationship, target
    """

    nodes = {}
    edges = []

    with driver.session() as session:
        result = session.run(query)

        for record in result:
            source = record["source"]
            relationship = record["relationship"]
            target = record["target"]

            source_id = str(source.element_id)
            target_id = str(target.element_id)

            nodes[source_id] = {
                "id": source_id,
                "labels": list(source.labels),
                "properties": dict(source),
            }

            nodes[target_id] = {
                "id": target_id,
                "labels": list(target.labels),
                "properties": dict(target),
            }

            edges.append(
                {
                    "id": str(relationship.element_id),
                    "source": source_id,
                    "target": target_id,
                    "type": relationship.type,
                    "properties": dict(relationship),
                }
            )

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
    }