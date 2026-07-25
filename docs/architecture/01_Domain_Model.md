---
document-id: SX-ARCH-001
title: SentinelX Domain Model
version: 1.0.0
status: ACTIVE
owner: SentinelX Architecture
---

# 1. Domain Scope

SentinelX is a graph-native Criminal Intelligence Operating System that enables investigators to collect, connect, analyze, and reason over criminal investigation data through explainable AI and knowledge graphs.

---

# 2. Core Objectives

- Unified Criminal Intelligence
- Graph-based Investigation
- Explainable AI
- Investigation Timeline Reconstruction
- Link Analysis
- Entity Resolution
- Pattern Detection
- Secure Evidence Management

---

# 3. Bounded Contexts

## Investigation

Responsible for criminal investigations.

Entities

- Case
- FIR
- Complaint
- Investigation
- Officer
- Team

---

## Identity

Responsible for every identifiable entity.

Entities

- Person
- Organization
- Vehicle
- Phone
- SIM
- Email
- Device
- Address

---

## Intelligence

Responsible for AI reasoning.

Entities

- Alert
- Recommendation
- Pattern
- Similarity
- RiskAssessment
- InvestigationLead
- Prediction

---

## Evidence

Responsible for evidence lifecycle.

Entities

- Evidence
- Image
- Video
- Audio
- Document
- Fingerprint
- DNA
- FinancialRecord
- DigitalArtifact

---

## Graph

Responsible for relationships.

Entities

- Node
- Relationship
- Path
- Community
- Cluster

---

## Security

Responsible for authorization.

Entities

- User
- Role
- Permission
- AuditLog
- Session

---

# 4. Core Domain Entities

## Investigation

Case

Complaint

FIR

Officer

Witness

Victim

Suspect

Evidence

Timeline

InvestigationAction

---

## Identity

Person

Vehicle

Phone

SIM

IMEI

Email

BankAccount

Passport

DrivingLicense

Organization

Address

Location

Weapon

---

## Digital

IP Address

MAC Address

Social Account

Chat Account

Cloud Account

Device

---

## Intelligence

Alert

Lead

Hypothesis

Finding

Recommendation

Risk

Similarity

Pattern

Prediction

Cluster

---

# 5. Value Objects

Name

Phone Number

Email Address

GPS Coordinate

Money

Timestamp

GeoPoint

Identity Number

Confidence Score

Risk Score

Address

---

# 6. Domain Events

CaseCreated

FIRRegistered

EvidenceCollected

EvidenceVerified

PersonIdentified

RelationshipCreated

RelationshipUpdated

AlertGenerated

RecommendationGenerated

OfficerAssigned

InvestigationClosed

---

# 7. Domain Services

Entity Resolution

Link Analysis

Timeline Reconstruction

Case Similarity

Evidence Verification

Risk Scoring

Community Detection

Path Discovery

Recommendation Engine

Search Engine

---

# 8. Aggregates

Case Aggregate

Root

Case

Children

Evidence

Timeline

Assignments

Events

---

Person Aggregate

Root

Person

Children

Phones

Vehicles

Addresses

Relationships

---

Organization Aggregate

Root

Organization

Children

Employees

Addresses

Assets

---

# 9. Repositories

CaseRepository

PersonRepository

EvidenceRepository

VehicleRepository

OrganizationRepository

GraphRepository

SearchRepository

IntelligenceRepository

---

# 10. Invariants

Every Entity owns a UUID.

Every Entity has CreatedAt.

Every Entity has UpdatedAt.

Every Entity has Status.

Every Relationship has Source.

Every Relationship has Target.

Every Relationship has Confidence.

Evidence is immutable after verification.

Cases are never physically deleted.

All intelligence outputs must reference supporting evidence.

---

# 11. Ubiquitous Language

Case

FIR

Complaint

Investigation

Person

Entity

Evidence

Relationship

Observation

Finding

Lead

Hypothesis

Alert

Recommendation

Risk

Timeline

Cluster

Similarity

Confidence

Path

Community

---

# 12. Implementation Mapping

Domain

↓

backend/app/domain

Schemas

↓

backend/app/schemas

Persistence

↓

backend/app/models

Repositories

↓

backend/app/repositories

Business Logic

↓

backend/app/services

API

↓

backend/app/api

Knowledge Graph

↓

graph/

Frontend

↓

frontend/src/types

AI

↓

backend/app/intelligence