from __future__ import annotations

from app.domain.case import Case
from app.domain.person import Person
from app.repositories.case_repository import CaseRepository
from app.repositories.person_repository import PersonRepository


class InvestigationService:

    def __init__(
        self,
        case_repository,
        person_repository,
        relationship_repository,
    ):

        self.case_repository = case_repository
        self.person_repository = person_repository
        self.relationship_repository = relationship_repository

    def create_case(self, case: Case) -> Case:
        return self.case_repository.create(case)

    def register_person(self, person: Person) -> Person:
        return self.person_repository.create(person)

    def assign_person_to_case(
        self,
        person_id: str,
        case_id: str,
    ):
        self.relationship_repository.assign_suspect(
            person_id,
            case_id,
        )
    def get_person(self, person_id: str):
        return self.person_repository.get(person_id)


    def list_persons(self):
        return self.person_repository.list_all()


    def delete_person(self, person_id: str):
        return self.person_repository.delete(person_id)
    def get_case(self, case_id: str):
        return self.case_repository.get(case_id)


    def list_cases(self):
        return self.case_repository.list_all()


    def update_case(self, case: Case):
        return self.case_repository.update(case)


    def delete_case(self, case_id: str):
        return self.case_repository.delete(case_id)
    def assign_victim(
        self,
        person_id,
        case_id,
    ):
        self.relationship_repository.assign_victim(
            person_id,
            case_id,
        )


    def assign_witness(
        self,
        person_id,
        case_id,
    ):
        self.relationship_repository.assign_witness(
            person_id,
            case_id,
        )


    def assign_phone(
        self,
        person_id,
        phone_id,
    ):
        self.relationship_repository.assign_phone(
            person_id,
            phone_id,
        )


    def assign_vehicle(
        self,
        person_id,
        vehicle_id,
    ):
        self.relationship_repository.assign_vehicle(
            person_id,
            vehicle_id,
        )
    def assign_person_to_case(
        self,
        person_id: str,
        case_id: str,
    ):
        self.relationship_repository.assign_suspect(
            person_id,
            case_id,
        )


    def assign_victim(
        self,
        person_id: str,
        case_id: str,
    ):
        self.relationship_repository.assign_victim(
            person_id,
            case_id,
        )


    def assign_witness(
        self,
        person_id: str,
        case_id: str,
    ):
        self.relationship_repository.assign_witness(
            person_id,
            case_id,
        )


    def assign_phone(
        self,
        person_id: str,
        phone_id: str,
    ):
        self.relationship_repository.assign_phone(
            person_id,
            phone_id,
        )


    def assign_vehicle(
        self,
        person_id: str,
        vehicle_id: str,
    ):
        self.relationship_repository.assign_vehicle(
            person_id,
            vehicle_id,
        )