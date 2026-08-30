# SENTINELX NEXUS — Graph Model & Cypher Ontology

## Graph Schema Overview
The SENTINELX NEXUS knowledge graph is modeled in Neo4j and synchronized with the transactional domain store.

### Node Labels
- `(:Person)`: Human entities (Canonical name, Aadhaar, DL, Passport, Risk level)
- `(:Case)`: Police FIRs & Cases (Case number, FIR number, Crime type, Status)
- `(:Phone)`: MSISDN lines & IMEI devices (Phone number, IMEI, Carrier)
- `(:Vehicle)`: Motor vehicles (Registration number, VIN, Make, Model, Color)
- `(:BankAccount)`: Bank accounts (Account number, IFSC, Bank name)
- `(:UPIAccount)`: UPI Virtual Payment Addresses (VPA, Provider)
- `(:Evidence)`: Physical & digital evidence items (Evidence number, Hash, Vault location)
- `(:Event)`: Chronological occurrences (Call events, Sighting events, Court hearings)
- `(:ANPRObservation)`: Toll & surveillance camera plate sightings
- `(:AnalyticalSignal)`: Derived multi-hop intelligence inferences

### Relationship Types
- `(:Person)-[:ACCUSED_IN]->(:Case)`
- `(:Person)-[:VICTIM_IN]->(:Case)`
- `(:Person)-[:WITNESS_IN]->(:Case)`
- `(:Person)-[:USES]->(:Phone)`
- `(:Person)-[:OWNS]->(:Vehicle)`
- `(:Person)-[:OWNS]->(:BankAccount)`
- `(:Person)-[:CO_ACCUSED_WITH {confidence: 0.89}]->(:Person)`
- `(:Phone)-[:CALLED {duration: 340}]->(:Phone)`
- `(:BankAccount)-[:TRANSFERRED_TO {amount: 125000}]->(:BankAccount)`
- `(:Vehicle)-[:SIGHTED_AT]->(:Location)`
- `(:Evidence)-[:EVIDENCE_IN]->(:Case)`

### Graph Algorithms Supported
- Shortest Path with relationship type & confidence constraints
- K-Hop Graph Expansion
- Common Neighbors Analysis
- PageRank & Degree Centrality Scoring
- Cross-Case Linkage & Cluster Detection
