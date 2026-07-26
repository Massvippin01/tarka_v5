from __future__ import annotations

CONSTRAINTS = [
    """
    CREATE CONSTRAINT person_id
    IF NOT EXISTS
    FOR (p:Person)
    REQUIRE p.id IS UNIQUE
    """,
    """
    CREATE CONSTRAINT case_id
    IF NOT EXISTS
    FOR (c:Case)
    REQUIRE c.id IS UNIQUE
    """,
    """
    CREATE CONSTRAINT evidence_id
    IF NOT EXISTS
    FOR (e:Evidence)
    REQUIRE e.id IS UNIQUE
    """,
]

INDEXES = [
    """
    CREATE INDEX person_name
    IF NOT EXISTS
    FOR (p:Person)
    ON (p.canonical_name)
    """,
    """
    CREATE INDEX vehicle_registration
    IF NOT EXISTS
    FOR (v:Vehicle)
    ON (v.registration_number)
    """,
    """
    CREATE INDEX phone_number
    IF NOT EXISTS
    FOR (p:Phone)
    ON (p.phone_number)
    """,
]
