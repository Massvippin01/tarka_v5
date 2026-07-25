// ============================================================
// SENTINELX SYNTHETIC INVESTIGATION DATASET
// All entities, identifiers and incidents are fictional.
// ============================================================


// ============================================================
// 01. CLEAN DATABASE
// ============================================================

MATCH (n)
DETACH DELETE n;


// ============================================================
// 02. CASES
// ============================================================

MERGE (c:Case {id: "C-2026-101"})
SET
    c.title = "Warehouse Entry - Hebbal",
    c.crime_type = "Burglary",
    c.occurred_at = datetime("2026-05-12T01:42:00"),
    c.status = "Open";

MERGE (c:Case {id: "C-2026-102"})
SET
    c.title = "Electronics Store Entry - Yelahanka",
    c.crime_type = "Burglary",
    c.occurred_at = datetime("2026-05-19T02:08:00"),
    c.status = "Open";

MERGE (c:Case {id: "C-2026-103"})
SET
    c.title = "Office Equipment Theft - Whitefield",
    c.crime_type = "Theft",
    c.occurred_at = datetime("2026-06-03T14:35:00"),
    c.status = "Open";

MERGE (c:Case {id: "C-2026-104"})
SET
    c.title = "Distribution Unit Entry - Jakkur",
    c.crime_type = "Burglary",
    c.occurred_at = datetime("2026-06-08T01:57:00"),
    c.status = "Open";


// ============================================================
// 03. LOCATIONS
// ============================================================

MERGE (l:Location {id: "LOC-001"})
SET
    l.name = "Hebbal Industrial Zone",
    l.latitude = 13.0358,
    l.longitude = 77.5970;

MERGE (l:Location {id: "LOC-002"})
SET
    l.name = "Yelahanka Commercial Block",
    l.latitude = 13.1007,
    l.longitude = 77.5963;

MERGE (l:Location {id: "LOC-003"})
SET
    l.name = "Whitefield Technology Zone",
    l.latitude = 12.9698,
    l.longitude = 77.7500;

MERGE (l:Location {id: "LOC-004"})
SET
    l.name = "Jakkur Distribution Zone",
    l.latitude = 13.0781,
    l.longitude = 77.6068;


// ============================================================
// 04. MODUS OPERANDI
// ============================================================

MERGE (mo:ModusOperandi {id: "MO-001"})
SET
    mo.entry_method = "rear_shutter_pry",
    mo.target_type = "commercial",
    mo.time_window = "01:00-03:00",
    mo.power_disabled = true,
    mo.cctv_avoided = true;

MERGE (mo:ModusOperandi {id: "MO-002"})
SET
    mo.entry_method = "credential_misuse",
    mo.target_type = "office",
    mo.time_window = "12:00-16:00",
    mo.power_disabled = false,
    mo.cctv_avoided = false;


// ============================================================
// 05. PERSONS
// ============================================================

MERGE (p:Person {id: "P-001"})
SET p.name = "Arun Dev";

MERGE (p:Person {id: "P-002"})
SET p.name = "Nikhil Rao";

MERGE (p:Person {id: "P-003"})
SET p.name = "Sameer Khanna";


// ============================================================
// 06. VEHICLES
// ============================================================

MERGE (v:Vehicle {id: "V-001"})
SET
    v.registration = "KA51SX4102",
    v.type = "Hatchback";

MERGE (v:Vehicle {id: "V-002"})
SET
    v.registration = "KA03MT8821",
    v.type = "Motorcycle";


// ============================================================
// 07. PHONES
// ============================================================

MERGE (ph:Phone {id: "PH-001"})
SET ph.number = "+91-9000001001";

MERGE (ph:Phone {id: "PH-002"})
SET ph.number = "+91-9000001002";

MERGE (ph:Phone {id: "PH-003"})
SET ph.number = "+91-9000001003";


// ============================================================
// 08. CASE → LOCATION
// ============================================================

MATCH
    (c:Case {id: "C-2026-101"}),
    (l:Location {id: "LOC-001"})
MERGE (c)-[:OCCURRED_AT]->(l);

MATCH
    (c:Case {id: "C-2026-102"}),
    (l:Location {id: "LOC-002"})
MERGE (c)-[:OCCURRED_AT]->(l);

MATCH
    (c:Case {id: "C-2026-103"}),
    (l:Location {id: "LOC-003"})
MERGE (c)-[:OCCURRED_AT]->(l);

MATCH
    (c:Case {id: "C-2026-104"}),
    (l:Location {id: "LOC-004"})
MERGE (c)-[:OCCURRED_AT]->(l);


// ============================================================
// 09. CASE → MODUS OPERANDI
// ============================================================

MATCH
    (c:Case {id: "C-2026-101"}),
    (mo:ModusOperandi {id: "MO-001"})
MERGE (c)-[:HAS_MO]->(mo);

MATCH
    (c:Case {id: "C-2026-102"}),
    (mo:ModusOperandi {id: "MO-001"})
MERGE (c)-[:HAS_MO]->(mo);

MATCH
    (c:Case {id: "C-2026-103"}),
    (mo:ModusOperandi {id: "MO-002"})
MERGE (c)-[:HAS_MO]->(mo);

MATCH
    (c:Case {id: "C-2026-104"}),
    (mo:ModusOperandi {id: "MO-001"})
MERGE (c)-[:HAS_MO]->(mo);


// ============================================================
// 10. PERSON → PHONE
// ============================================================

MATCH
    (p:Person {id: "P-001"}),
    (ph:Phone {id: "PH-001"})
MERGE (p)-[:USES]->(ph);

MATCH
    (p:Person {id: "P-002"}),
    (ph:Phone {id: "PH-002"})
MERGE (p)-[:USES]->(ph);

MATCH
    (p:Person {id: "P-003"}),
    (ph:Phone {id: "PH-003"})
MERGE (p)-[:USES]->(ph);


// ============================================================
// 11. PHONE COMMUNICATION
// ============================================================

MATCH
    (a:Phone {id: "PH-001"}),
    (b:Phone {id: "PH-002"})
MERGE (a)-[r:CONTACTED]->(b)
SET
    r.timestamp = datetime("2026-05-11T22:14:00"),
    r.duration_seconds = 184;

MATCH
    (a:Phone {id: "PH-002"}),
    (b:Phone {id: "PH-003"})
MERGE (a)-[r:CONTACTED]->(b)
SET
    r.timestamp = datetime("2026-06-07T21:48:00"),
    r.duration_seconds = 92;


// ============================================================
// 12. PERSON → VEHICLE
// ============================================================

MATCH
    (p:Person {id: "P-001"}),
    (v:Vehicle {id: "V-001"})
MERGE (p)-[:ASSOCIATED_WITH]->(v);

MATCH
    (p:Person {id: "P-002"}),
    (v:Vehicle {id: "V-001"})
MERGE (p)-[:ASSOCIATED_WITH]->(v);

MATCH
    (p:Person {id: "P-003"}),
    (v:Vehicle {id: "V-002"})
MERGE (p)-[:ASSOCIATED_WITH]->(v);


// ============================================================
// 13. CASE → PERSON
// ============================================================

MATCH
    (c:Case {id: "C-2026-101"}),
    (p:Person {id: "P-001"})
MERGE (c)-[:MENTIONS]->(p);

MATCH
    (c:Case {id: "C-2026-102"}),
    (p:Person {id: "P-002"})
MERGE (c)-[:MENTIONS]->(p);

MATCH
    (c:Case {id: "C-2026-103"}),
    (p:Person {id: "P-003"})
MERGE (c)-[:MENTIONS]->(p);

MATCH
    (c:Case {id: "C-2026-104"}),
    (p:Person {id: "P-002"})
MERGE (c)-[:MENTIONS]->(p);


// ============================================================
// 14. VEHICLE OBSERVATIONS
// ============================================================

MATCH
    (v:Vehicle {id: "V-001"}),
    (l:Location {id: "LOC-001"})
MERGE (v)-[r:OBSERVED_AT {
    observation_id: "OBS-001"
}]->(l)
SET r.timestamp = datetime("2026-05-12T01:21:00");

MATCH
    (v:Vehicle {id: "V-001"}),
    (l:Location {id: "LOC-002"})
MERGE (v)-[r:OBSERVED_AT {
    observation_id: "OBS-002"
}]->(l)
SET r.timestamp = datetime("2026-05-19T01:51:00");

MATCH
    (v:Vehicle {id: "V-001"}),
    (l:Location {id: "LOC-004"})
MERGE (v)-[r:OBSERVED_AT {
    observation_id: "OBS-003"
}]->(l)
SET r.timestamp = datetime("2026-06-08T01:33:00");

MATCH
    (v:Vehicle {id: "V-002"}),
    (l:Location {id: "LOC-003"})
MERGE (v)-[r:OBSERVED_AT {
    observation_id: "OBS-004"
}]->(l)
SET r.timestamp = datetime("2026-06-03T13:58:00");