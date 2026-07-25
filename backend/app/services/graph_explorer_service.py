from app.core.dependencies import get_driver
from app.utils.graph_mapper import GraphMapper


class GraphExplorerService:

    def __init__(self):
        self.driver = get_driver()

    def execute(self, query: str, **params):

        with self.driver.session() as session:

            result = session.run(query, **params)

            return GraphMapper.to_graph(result)

    def person_network(self, person_id: str):

        query = """
        MATCH (p:Person {id:$person_id})-[r*1..2]-(n)
        UNWIND r AS rel
        RETURN p,rel,n
        """

        return self.execute(
            query,
            person_id=person_id,
        )

    def case_network(self, case_id: str):

        query = """
        MATCH (c:Case {id:$case_id})-[r*1..2]-(n)
        UNWIND r AS rel
        RETURN c,rel,n
        """

        return self.execute(
            query,
            case_id=case_id,
        )

    def neighbors(self, entity_id: str):

        query = """
        MATCH (n {id:$id})-[r]-(m)
        RETURN n,r,m
        """

        return self.execute(
            query,
            id=entity_id,
        )