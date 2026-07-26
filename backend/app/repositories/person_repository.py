from __future__ import annotations

from app.domain.person import Person

from .neo4j_repository import Neo4jRepository


class PersonRepository(Neo4jRepository):

    def create(self, person: Person) -> Person:

        query = """
        CREATE (p:Person {
            id: $id,
            first_name: $first_name,
            middle_name: $middle_name,
            last_name: $last_name,
            full_name: $full_name,
            gender: $gender,
            nationality: $nationality,
            occupation: $occupation,
            risk_level: $risk_level,
            threat_score: $threat_score
        })
        """

        self.execute_write(
            query,
            id=person.id,
            first_name=person.first_name,
            middle_name=person.middle_name,
            last_name=person.last_name,
            full_name=person.full_name,
            gender=person.gender,
            nationality=person.nationality,
            occupation=person.occupation,
            risk_level=person.risk_level,
            threat_score=person.threat_score,
        )

        return person

    def get(self, person_id: str):

        query = """
        MATCH (p:Person {id:$id})
        RETURN p
        """

        result = self.execute_read(query, id=person_id)

        if not result:
            return None

        node = result[0]["p"]

        return Person(
            id=node["id"],
            first_name=node.get("first_name", ""),
            middle_name=node.get("middle_name", ""),
            last_name=node.get("last_name", ""),
            gender=node.get("gender", ""),
            nationality=node.get("nationality", ""),
            occupation=node.get("occupation", ""),
            risk_level=node.get("risk_level", "LOW"),
            threat_score=node.get("threat_score", 0.0),
        )

    def list_all(self):

        query = """
        MATCH (p:Person)
        RETURN p
        ORDER BY p.full_name
        """

        result = self.execute_read(query)

        persons = []

        for record in result:

            node = record["p"]

            persons.append(
                Person(
                    id=node["id"],
                    first_name=node.get("first_name", ""),
                    middle_name=node.get("middle_name", ""),
                    last_name=node.get("last_name", ""),
                    gender=node.get("gender", ""),
                    nationality=node.get("nationality", ""),
                    occupation=node.get("occupation", ""),
                    risk_level=node.get("risk_level", "LOW"),
                    threat_score=node.get("threat_score", 0.0),
                )
            )

        return persons

    def delete(self, person_id: str):

        query = """
        MATCH (p:Person {id:$id})
        DETACH DELETE p
        """

        self.execute_write(query, id=person_id)

        return True
