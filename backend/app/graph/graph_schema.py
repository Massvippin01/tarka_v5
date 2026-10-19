from __future__ import annotations

CONSTRAINTS = [
    "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT case_id IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE",
    "CREATE CONSTRAINT fir_id IF NOT EXISTS FOR (f:FIR) REQUIRE f.id IS UNIQUE",
    "CREATE CONSTRAINT phone_id IF NOT EXISTS FOR (p:Phone) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT device_id IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE",
    "CREATE CONSTRAINT vehicle_id IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.id IS UNIQUE",
    "CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE",
    "CREATE CONSTRAINT organization_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE",
    "CREATE CONSTRAINT account_id IF NOT EXISTS FOR (a:Account) REQUIRE a.id IS UNIQUE",
    "CREATE CONSTRAINT transaction_id IF NOT EXISTS FOR (t:Transaction) REQUIRE t.id IS UNIQUE",
    "CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE",
    "CREATE CONSTRAINT evidence_id IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE",
    "CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE",
]

INDEXES = [
    "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.display_name)",
    "CREATE INDEX person_aadhaar IF NOT EXISTS FOR (p:Person) ON (p.aadhaar)",
    "CREATE INDEX vehicle_registration IF NOT EXISTS FOR (v:Vehicle) ON (v.registration_number)",
    "CREATE INDEX phone_number IF NOT EXISTS FOR (p:Phone) ON (p.phone_number)",
    "CREATE INDEX device_imei IF NOT EXISTS FOR (d:Device) ON (d.imei)",
    "CREATE INDEX account_number IF NOT EXISTS FOR (a:Account) ON (a.account_number)",
    "CREATE INDEX fir_number IF NOT EXISTS FOR (f:FIR) ON (f.fir_number)",
    "CREATE INDEX case_number IF NOT EXISTS FOR (c:Case) ON (c.case_number)",
]
