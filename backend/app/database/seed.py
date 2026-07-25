from app.domain.person import Person
from app.repositories.person_repository import PersonRepository

from app.core.dependencies import (
    person_repository,
)


def seed():

    repository: PersonRepository = person_repository()

    repository.create(

        Person(
            first_name="Demo",
            last_name="Officer",
        )

    )


if __name__ == "__main__":
    seed()