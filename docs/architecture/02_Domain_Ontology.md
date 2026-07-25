---
document-id: SX-ARCH-002
title: SentinelX Domain Ontology
version: 1.0.0
status: ACTIVE
owner: SentinelX Architecture
---

# 1. Ontology Principles

- Domain First
- Graph Native
- AI Explainability
- Immutable Evidence
- Temporal Relationships
- Security by Design
- Extensible by Default

---

# 2. Universal Entity Specification

Every Entity SHALL contain

## Identity

- id
- entityType
- canonicalName

## Metadata

- createdAt
- updatedAt
- createdBy
- updatedBy
- version

## State

- status
- lifecycleState
- isActive

## Intelligence

- confidence
- trustScore
- riskScore

## Provenance

- sourceSystem
- sourceReference
- verificationStatus

## Graph

- labels
- tags

---

# 3. Universal Relationship Specification

Every Relationship SHALL contain

- relationshipId
- relationshipType
- sourceEntity
- targetEntity
- direction
- confidence
- weight
- evidenceReferences
- validFrom
- validTo
- createdAt

---

# 4. Entity Definitions

## Person

Purpose

Represents every human involved in an investigation.

Roles

- Victim
- Suspect
- Accused
- Witness
- Officer
- Informant
- Unknown

Mandatory

- Name
- Status

Relationships

- KNOWS
- OWNS
- USES
- LIVES_AT
- WORKS_FOR
- APPEARS_IN
- RELATED_TO

---

## Case

Purpose

Represents an investigation.

Mandatory

- Case Number
- FIR
- Status

Relationships

- HAS_EVIDENCE
- HAS_PERSON
- HAS_EVENT
- HAS_LOCATION
- ASSIGNED_TO

---

## Evidence

Purpose

Represents any admissible investigative evidence.

Types

- Digital
- Physical
- Biological
- Financial
- Documentary

Lifecycle

Collected

↓

Verified

↓

Stored

↓

Presented

↓

Archived

Rule

Evidence SHALL NOT be modified after verification.

---

## Vehicle

Relationships

- OWNED_BY
- USED_IN
- LOCATED_AT

---

## Organization

Relationships

- EMPLOYS
- OWNS
- INVESTIGATED_BY

---

## Phone

Relationships

- BELONGS_TO
- CONTACTED
- REGISTERED_TO

---

## Location

Relationships

- OCCURRED_AT
- VISITED_BY
- LOCATED_IN

---

## Event

Relationships

- INVOLVES
- OCCURRED_AT
- GENERATED_EVIDENCE

---

# 5. Relationship Ontology

Core Relationships

OWNS

USES

KNOWS

WORKS_FOR

LIVES_AT

VISITED

CONTACTED

TRANSFERRED_TO

ASSOCIATED_WITH

PART_OF

LOCATED_AT

INVOLVED_IN

HAS_EVIDENCE

GENERATED

IDENTIFIED_BY

OBSERVED_IN

---

# 6. Lifecycle Ontology

Draft

↓

Created

↓

Verified

↓

Active

↓

Archived

↓

Deleted (Logical Only)

---

# 7. Security Classification

PUBLIC

↓

INTERNAL

↓

CONFIDENTIAL

↓

RESTRICTED

↓

SECRET

---

# 8. Business Rules

Every Entity SHALL possess exactly one UUID.

Every Relationship SHALL reference valid entities.

Every Case SHALL contain at least one Investigation.

Every Evidence SHALL belong to exactly one Case.

Every Recommendation SHALL reference supporting evidence.

Every Alert SHALL have an explanation.

Every Prediction SHALL expose confidence.

---

# 9. Ontology Inheritance

UniversalEntity

↓

Person

↓

Officer

↓

Witness

↓

Victim

↓

Suspect

---

UniversalEntity

↓

Evidence

↓

DigitalEvidence

↓

Image

↓

Video

↓

Document

---

UniversalEntity

↓

Location

↓

Address

↓

CrimeScene

↓

PoliceStation

---

# 10. AI Semantic Objects

Observation

↓

Evidence

↓

Fact

↓

Finding

↓

Hypothesis

↓

Lead

↓

Recommendation

↓

Decision

---

# 11. Mapping

Ontology

↓

Python Domain Classes

↓

Pydantic Schemas

↓

Neo4j Labels

↓

Cypher Schema

↓

REST APIs

↓

Frontend Types

↓

AI Memory