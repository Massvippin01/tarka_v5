# SentinelX — AI Criminal Intelligence Operating System

**KSP Datathon 2026 Submission | Team Neural Mesh Dynamics**

SentinelX unifies FIR/case data, evidence, and investigation activity into a single criminal
knowledge graph, then layers AI-driven risk scoring, entity-similarity matching, and
investigative recommendations on top — replacing the information silos that currently exist
across complainant, victim, accused, and case records.

## Problem

Karnataka Police case data today is fragmented across systems — FIRs, complainants, victims,
accused, evidence, and court records are captured separately with no unified view of how a
person, case, or asset connects to others. Investigators lose time manually cross-referencing
records that a graph-native system can surface instantly.

## What's implemented in this repo

**Backend (FastAPI + Neo4j)** — `backend/app`
- REST API for cases, persons, relationships, and graph traversal (`app/api`)
- Neo4j-backed graph layer: schema, Cypher query builder, and graph algorithms (`app/graph`)
- AI intelligence layer (`app/intelligence`) with working engines for:
  - Risk scoring (`engines/risk_engine.py`)
  - Investigative recommendations (`engines/recommendation_engine.py`)
  - Timeline reasoning (`engines/timeline_reasoning_engine.py`)
  - Entity similarity / resolution (`engines/entity_similarity_engine.py`)
  - Signal extraction and confidence scoring (`signal_extractors.py`, `core/confidence.py`)
- Unit tests for the intelligence layer (`app/intelligence/tests`)

**Graph data** — `graph/cypher`
- `seed_sentinelx.cypher`: synthetic case/location/person/vehicle/evidence dataset for demo
  and development (all entities fictional)

**Frontend (React 19 + Vite + TypeScript)** — `frontend/src`
- Interactive graph explorer built on `@xyflow/react` (`features/graph/GraphExplorer.tsx`)
- Additional workspace views (Home, Search, Analytics, Reports) are scaffolded and in progress

**Design references** — `frontend/stitch_sentinelx_operational_intelligence_platform`
- High-fidelity UI concepts for the command center, case workspace, GIS crime map, link
  analysis explorer, and suspect/target dossiers, used as the design target for the remaining
  workspace views

## Tech stack

| Layer | Technology |
|---|---|
| API | FastAPI, Pydantic, Uvicorn |
| Graph database | Neo4j (`neo4j` Python driver) |
| AI / ML | scikit-learn, XGBoost, pandas, Google Generative AI |
| Frontend | React 19, TypeScript, Vite, @xyflow/react, Axios |
| Observability | OpenTelemetry |
| Target deployment | Zoho Catalyst (AppSail, Data Store, QuickML) |

## Getting started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs available at `http://localhost:8000/docs` once running.

> Note: `backend/requirements.txt` is currently saved as UTF-16 — if `pip install` fails to
> parse it, re-save the file as UTF-8 (`iconv -f UTF-16LE -t UTF-8 requirements.txt -o requirements.txt`)
> or regenerate it with `pip freeze > requirements.txt` from an active venv.

### Neo4j
Point the backend at a running Neo4j instance (local, Docker, or Aura) via environment
variables in `backend/app/core/config.py`, then load the seed dataset:
```bash
cypher-shell -u neo4j -p <password> -f graph/cypher/seed_sentinelx.cypher
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project status / roadmap

- ✅ Core graph schema, Cypher query layer, and AI intelligence engines (risk, similarity,
  timeline reasoning, recommendations)
- ✅ Interactive graph explorer UI
- 🔄 Remaining workspace views (Search, Analytics, Reports, unified Home dashboard) — design
  finalized in `stitch_sentinelx_operational_intelligence_platform`, integration in progress
- 🔄 Migration of backend services to Zoho Catalyst (Functions, AppSail, Data Store, QuickML)
  for production deployment
- 🔄 Multi-agent orchestration layer (`agents/`) — scaffolded, planned for the next phase

## Disclaimer

All case, person, and location data in this repository is synthetic and fictional, generated
for demonstration purposes only.