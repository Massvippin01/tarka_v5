from __future__ import annotations

from app.domain.case import Case

from .neo4j_repository import Neo4jRepository


class CaseRepository(Neo4jRepository):

    def create(self, case: Case) -> Case:

        query = """
        CREATE (c:Case {
            id: $id,
            case_number: $case_number,
            fir_number: $fir_number,
            title: $title,
            description: $description,
            police_station: $police_station,
            crime_type: $crime_type,
            priority: $priority,
            investigation_status: $investigation_status,
            opened_at: datetime($opened_at)
        })
        """

        self.execute_write(
            query,
            id=case.id,
            case_number=case.case_number,
            fir_number=case.fir_number,
            title=case.title,
            description=case.description,
            police_station=case.police_station,
            crime_type=case.crime_type,
            priority=case.priority,
            investigation_status=case.investigation_status,
            opened_at=case.opened_at.isoformat(),
        )

        return case

    def get(self, case_id: str):

        query = """
        MATCH (c:Case {id:$id})
        RETURN c
        """

        result = self.execute_read(query, id=case_id)

        if not result:
            return None

        node = result[0]["c"]

        return Case(
            id=node["id"],
            case_number=node.get("case_number", ""),
            fir_number=node.get("fir_number", ""),
            title=node.get("title", ""),
            description=node.get("description", ""),
            police_station=node.get("police_station", ""),
            crime_type=node.get("crime_type", ""),
            priority=node.get("priority", "MEDIUM"),
            investigation_status=node.get("investigation_status", "OPEN"),
        )

    def list_all(self):

        query = """
        MATCH (c:Case)
        RETURN c
        ORDER BY c.case_number
        """

        result = self.execute_read(query)

        cases = []

        for record in result:

            node = record["c"]

            cases.append(
                Case(
                    id=node["id"],
                    case_number=node.get("case_number", ""),
                    fir_number=node.get("fir_number", ""),
                    title=node.get("title", ""),
                    description=node.get("description", ""),
                    police_station=node.get("police_station", ""),
                    crime_type=node.get("crime_type", ""),
                    priority=node.get("priority", "MEDIUM"),
                    investigation_status=node.get("investigation_status", "OPEN"),
                )
            )

        return cases

    def update(self, case: Case):

        query = """
        MATCH (c:Case {id:$id})
        SET
            c.title=$title,
            c.description=$description,
            c.priority=$priority,
            c.investigation_status=$investigation_status
        """

        self.execute_write(
            query,
            id=case.id,
            title=case.title,
            description=case.description,
            priority=case.priority,
            investigation_status=case.investigation_status,
        )

        return case

    def delete(self, case_id: str):

        query = """
        MATCH (c:Case {id:$id})
        DETACH DELETE c
        """

        self.execute_write(query, id=case_id)

        return True
