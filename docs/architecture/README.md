# SentinelX Architecture

## Purpose

This directory contains the authoritative engineering specification for SentinelX.

These documents define the business domain, ontology, knowledge graph, APIs, system architecture, and engineering decisions.

Every implementation inside the backend, frontend, AI modules, and Neo4j graph must derive from these specifications.

---

## Architecture Documents

| Document | Purpose |
|-----------|---------|
|01_Domain_Model.md|Business concepts and investigation universe|
|02_Domain_Ontology.md|Formal semantic specification|
|03_Knowledge_Graph.md|Neo4j schema and graph model|
|04_System_Architecture.md|Backend, AI, deployment and infrastructure|
|05_API_Architecture.md|REST APIs and contracts|
|decisions.md|Architecture Decision Records (ADR)|

---

## Engineering Principles

- Domain First
- Graph Native
- AI Assisted
- Explainable Intelligence
- Security by Design
- Event Driven
- Offline-first compatible
- Production Ready
- Extensible