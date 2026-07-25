---
document-id: SX-ARCH-003
title: SentinelX Knowledge Graph Specification
version: 1.0.0
status: ACTIVE
owner: SentinelX Architecture
---

# 1. Purpose

The SentinelX Knowledge Graph is the system of record for all investigative relationships.

The graph stores entities, relationships, events, evidence, timelines and intelligence to enable explainable investigation.

---

# 2. Design Principles

- Graph Native
- Explainable
- Temporal
- Immutable Evidence
- Versioned Relationships
- High Performance
- AI Ready

---

# 3. Node Labels

## Investigation

:Case

:FIR

:Complaint

:Investigation

:Timeline

:Officer

---

## Identity

:Person

:Vehicle

:Phone

:SIM

:IMEI

:Email

:Address

:Location

:Organization

:Weapon

:BankAccount

:Passport

:DrivingLicense

---

## Evidence

:Evidence

:Image

:Video

:Audio

:Document

:Fingerprint

:DNA

:FinancialRecord

:DigitalArtifact

---

## Intelligence

:Alert

:Recommendation

:Finding

:Hypothesis

:Lead

:Pattern

:Risk

:Similarity

:Prediction

---

## Infrastructure

:User

:Role

:Permission

:AuditLog

---

# 4. Relationship Types

OWNS

USES

KNOWS

CONTACTED

WORKS_FOR

LIVES_AT

VISITED

LOCATED_AT

REGISTERED_TO

PART_OF

ASSIGNED_TO

HAS_EVIDENCE

HAS_EVENT

HAS_TIMELINE

GENERATED

OBSERVED_IN

IDENTIFIED_BY

RELATED_TO

ASSOCIATED_WITH

TRANSFERRED_TO

LINKED_TO

---

# 5. Node Properties

Mandatory

id

entityType

createdAt

updatedAt

status

confidence

sourceSystem

version

Optional

tags

description

metadata

externalIds

---

# 6. Relationship Properties

relationshipId

relationshipType

confidence

weight

validFrom

validTo

createdAt

createdBy

source

evidenceIds

reason

---

# 7. Constraints

Every node SHALL have a UUID.

Every relationship SHALL have a source node.

Every relationship SHALL have a target node.

Evidence SHALL NOT be deleted.

Case numbers SHALL be unique.

Phone numbers SHALL be normalized.

Vehicle registrations SHALL be unique.

---

# 8. Indexes

Person.id

Case.caseNumber

Evidence.id

Phone.number

Vehicle.registration

Organization.name

Location.id

Timeline.id

Recommendation.id

---

# 9. Graph Traversals

Person

↓

Known Associates

↓

Vehicles

↓

Phones

↓

Locations

↓

Cases

↓

Evidence

↓

Timeline

↓

Recommendations

---

Case

↓

Persons

↓

Evidence

↓

Events

↓

Timeline

↓

Recommendations

↓

Alerts

---

Evidence

↓

Person

↓

Location

↓

Event

↓

Case

---

# 10. Graph Algorithms

Shortest Path

PageRank

Node Similarity

Community Detection

Weakly Connected Components

Centrality

Degree

Betweenness

Triangle Count

Link Prediction

---

# 11. Intelligence Queries

Find hidden associates

Find shared vehicles

Find common phone numbers

Find common addresses

Find evidence clusters

Find criminal communities

Find shortest criminal path

Find suspicious financial links

Find investigation timeline

Find cross-case similarities

---

# 12. Explainability

Every graph result SHALL expose

Supporting Nodes

Supporting Relationships

Traversal Path

Confidence

Reasoning Chain

Evidence References

---

# 13. Cypher Assets

graph/

schema.cypher

constraints.cypher

indexes.cypher

seed.cypher

algorithms.cypher

queries.cypher

---

# 14. Implementation Mapping

Knowledge Graph

↓

Neo4j

↓

Repository Layer

↓

Graph Service

↓

FastAPI

↓

React Graph Explorer

↓

AI Investigation Engine