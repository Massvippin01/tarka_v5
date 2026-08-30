from __future__ import annotations

CONSTRAINTS = [
    "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT case_id IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE",
    "CREATE CONSTRAINT phone_id IF NOT EXISTS FOR (p:Phone) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT vehicle_id IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.id IS UNIQUE",
    "CREATE CONSTRAINT bank_account_id IF NOT EXISTS FOR (b:BankAccount) REQUIRE b.id IS UNIQUE",
    "CREATE CONSTRAINT upi_account_id IF NOT EXISTS FOR (u:UPIAccount) REQUIRE u.id IS UNIQUE",
    "CREATE CONSTRAINT evidence_id IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE",
    "CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE",
    "CREATE CONSTRAINT organization_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE",
]

INDEXES = [
    "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.canonical_name)",
    "CREATE INDEX person_aadhaar IF NOT EXISTS FOR (p:Person) ON (p.aadhaar)",
    "CREATE INDEX vehicle_registration IF NOT EXISTS FOR (v:Vehicle) ON (v.registration_number)",
    "CREATE INDEX phone_number IF NOT EXISTS FOR (p:Phone) ON (p.phone_number)",
    "CREATE INDEX bank_account_number IF NOT EXISTS FOR (b:BankAccount) ON (b.account_number)",
    "CREATE INDEX upi_vpa IF NOT EXISTS FOR (u:UPIAccount) ON (u.vpa)",
    "CREATE INDEX case_number IF NOT EXISTS FOR (c:Case) ON (c.case_number)",
    "CREATE INDEX fir_number IF NOT EXISTS FOR (c:Case) ON (c.fir_number)",
]
