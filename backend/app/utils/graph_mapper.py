from neo4j.graph import Node, Relationship


class GraphMapper:

    @staticmethod
    def to_graph(records):

        nodes = {}
        edges = []

        for record in records:

            for value in record.values():

                if isinstance(value, Node):

                    node_id = value.get("id")

                    if node_id not in nodes:

                        labels = list(value.labels)

                        nodes[node_id] = {
                            "id": node_id,
                            "label": labels[0] if labels else "Node",
                            "properties": dict(value),
                        }

                elif isinstance(value, Relationship):

                    edges.append(
                        {
                            "id": value.element_id,
                            "source": value.start_node.get("id"),
                            "target": value.end_node.get("id"),
                            "type": value.type,
                            "properties": dict(value),
                        }
                    )

        return {
            "nodes": list(nodes.values()),
            "edges": edges,
        }