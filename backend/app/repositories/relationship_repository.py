from __future__ import annotations

from .neo4j_repository import Neo4jRepository


class RelationshipRepository(Neo4jRepository):

    def assign_suspect(self, person_id: str, case_id: str):

        query = """
        MATCH (p:Person {id:$person_id})
        MATCH (c:Case {id:$case_id})
        MERGE (p)-[:SUSPECT_IN]->(c)
        """

        self.execute_write(
            query,
            person_id=person_id,
            case_id=case_id,
        )

    def assign_victim(self, person_id: str, case_id: str):

        query = """
        MATCH (p:Person {id:$person_id})
        MATCH (c:Case {id:$case_id})
        MERGE (p)-[:VICTIM_IN]->(c)
        """

        self.execute_write(
            query,
            person_id=person_id,
            case_id=case_id,
        )

    def assign_witness(self, person_id: str, case_id: str):

        query = """
        MATCH (p:Person {id:$person_id})
        MATCH (c:Case {id:$case_id})
        MERGE (p)-[:WITNESS_IN]->(c)
        """

        self.execute_write(
            query,
            person_id=person_id,
            case_id=case_id,
        )

    def assign_phone(self, person_id: str, phone_id: str):

        query = """
        MATCH (p:Person {id:$person_id})
        MATCH (ph:Phone {id:$phone_id})
        MERGE (p)-[:USES_PHONE]->(ph)
        """

        self.execute_write(
            query,
            person_id=person_id,
            phone_id=phone_id,
        )

    def assign_vehicle(self, person_id: str, vehicle_id: str):

        query = """
        MATCH (p:Person {id:$person_id})
        MATCH (v:Vehicle {id:$vehicle_id})
        MERGE (p)-[:USES_VEHICLE]->(v)
        """

        self.execute_write(
            query,
            person_id=person_id,
            vehicle_id=vehicle_id,
        )

    def assign_location(self, person_id: str, location_id: str):

        query = """
        MATCH (p:Person {id:$person_id})
        MATCH (l:Location {id:$location_id})
        MERGE (p)-[:VISITED]->(l)
        """

        self.execute_write(
            query,
            person_id=person_id,
            location_id=location_id,
        )

    def assign_evidence(self, case_id: str, evidence_id: str):

        query = """
        MATCH (c:Case {id:$case_id})
        MATCH (e:Evidence {id:$evidence_id})
        MERGE (e)-[:BELONGS_TO]->(c)
        """

        self.execute_write(
            query,
            case_id=case_id,
            evidence_id=evidence_id,
        )
