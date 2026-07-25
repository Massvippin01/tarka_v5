from typing import Any

from app.database.db import driver


def get_case_context(case_id: str) -> dict[str, Any] | None:
    query = """
    MATCH (case:Case {id: $case_id})

    OPTIONAL MATCH (case)-[:OCCURRED_AT]->(location:Location)
    OPTIONAL MATCH (case)-[:HAS_MO]->(mo:ModusOperandi)
    OPTIONAL MATCH (case)-[:MENTIONS]->(person:Person)
    OPTIONAL MATCH (person)-[:ASSOCIATED_WITH]->(vehicle:Vehicle)
    OPTIONAL MATCH (person)-[:USES]->(phone:Phone)

    RETURN
        properties(case) AS case_data,
        properties(location) AS location,
        properties(mo) AS modus_operandi,

        collect(
            DISTINCT CASE
                WHEN person IS NULL
                THEN NULL
                ELSE properties(person)
            END
        ) AS persons,

        collect(
            DISTINCT CASE
                WHEN vehicle IS NULL
                THEN NULL
                ELSE properties(vehicle)
            END
        ) AS vehicles,

        collect(
            DISTINCT CASE
                WHEN phone IS NULL
                THEN NULL
                ELSE properties(phone)
            END
        ) AS phones
    """

    with driver.session() as session:
        record = session.run(
            query,
            case_id=case_id,
        ).single()

    if record is None:
        return None

    case_data = record["case_data"]

    if case_data is None:
        return None

    return {
        "case": dict(case_data),
        "location": (
            dict(record["location"])
            if record["location"]
            else None
        ),
        "modus_operandi": (
            dict(record["modus_operandi"])
            if record["modus_operandi"]
            else None
        ),
        "persons": [
            dict(person)
            for person in record["persons"]
            if person is not None
        ],
        "vehicles": [
            dict(vehicle)
            for vehicle in record["vehicles"]
            if vehicle is not None
        ],
        "phones": [
            dict(phone)
            for phone in record["phones"]
            if phone is not None
        ],
    }


def has_communication_path(
    case_a_id: str,
    case_b_id: str,
) -> dict[str, Any]:
    query = """
    MATCH
        (case_a:Case {id: $case_a_id})
        -[:MENTIONS]->
        (:Person)
        -[:USES]->
        (phone_a:Phone)

    MATCH
        (case_b:Case {id: $case_b_id})
        -[:MENTIONS]->
        (:Person)
        -[:USES]->
        (phone_b:Phone)

    OPTIONAL MATCH path =
        (phone_a)-[:CONTACTED*1..3]-(phone_b)

    WITH
        path,
        CASE
            WHEN path IS NULL
            THEN NULL
            ELSE length(path)
        END AS path_length

    ORDER BY path_length ASC

    RETURN
        path_length
    LIMIT 1
    """

    with driver.session() as session:
        record = session.run(
            query,
            case_a_id=case_a_id,
            case_b_id=case_b_id,
        ).single()

    if record is None:
        return {
            "exists": False,
            "path_length": None,
        }

    path_length = record["path_length"]

    return {
        "exists": path_length is not None,
        "path_length": path_length,
    }