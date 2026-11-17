# TARKA — AI-Powered Cyber Fraud Investigation & Attribution

Tool for Indian cyber-crime investigators (NCRP / 1930 complaints): UPI fraud, mule accounts,
SIM swap, phishing, investment scams. Deliverables: fraud attribution engine, entity resolution,
financial evidence correlation dashboard, fraud-network visualisation, investigative reports.
The roadmap lives in `PLAN.md` — read it before starting a phase.

## Run locally (Windows, no Docker / Postgres / Neo4j needed)
- Backend: `venv\Scripts\python -m uvicorn app.main:app --app-dir backend --port 8000`
  with env `PYTHONPATH=backend`, `ENABLE_DEMO_AUTH=true`,
  `DATABASE_URL=sqlite+aiosqlite:///E:/new_tarka/tarka_v5/local_dev.db`.
  Neo4j/Postgres connection errors at startup are expected and harmless locally.
- Frontend: `cd frontend && npm run dev` → http://localhost:5173 (Vite proxies `/api` → :8000).
- Deep link: `?view=<view>&case=CASE-2026-00X` (views listed in `frontend/src/v6/shell/V6AppShell.tsx`).

## Tests
- Backend: `PYTHONPATH=backend venv/Scripts/python -m pytest backend/tests/test_tarka_sentinelx_integration.py -q`
- Frontend: `cd frontend && npx tsc -b && npx vitest run` ; build: `npm run build`

## Layout
- `frontend/src/v6/` — current UI (shell, screens, assistant). `?legacy=1` shows the old shell; don't extend legacy.
- `frontend/src/fixtures/cases/CASE-2026-00{1..4}.json` + `index.ts` — canonical per-case data
  (complainant, financials, accounts, transactions, timelineEvents, syndicateLinks).
- `frontend/src/store/` — zustand stores (`useCaseStore` holds the active case).
- `backend/app/api/case.py` — case CRUD + `GET /api/v1/cases/{id}/bundle`.
- `backend/app/services/ingestion/large_evidence_engine.py` — chunked resumable upload (stages 6–9 are stubs).
- `backend/tarka/parsers/` — real parsers: bank_upi, cdr, whatsapp, exif_triage.
- `generate_blind_100k.py` — synthetic 100k-row dataset with a ground-truth answer key.

## Non-negotiable rules
1. **Case isolation.** A screen may only show data from the active case's bundle. Never hard-code a
   person, account, amount or case-specific sentence in a screen. Switching case must change everything.
2. **One source of truth for numbers.** Totals (loss, recoverable, frozen, cash-out, shielded) are derived in
   one selector module from the case bundle; screens never recompute or invent their own figures.
   Money must reconcile: recoverable + unrecoverable cash-out (+ unknown) = booked loss.
3. **Plain language first.** Investigator-facing labels in plain English; legal/technical terms go in tooltips.
4. **Indian number formatting** everywhere (₹12,50,000 / ₹12.5 L / ₹1.2 Cr) via one shared formatter.
5. **UI quality bar:** every change must look better than before. Glass surfaces (subtle blur, 1px light
   borders, soft depth), one accent colour, generous spacing, Framer Motion for meaningful motion only,
   skeleton loaders, real empty/error states, no clipped text (truncate with tooltip), works at 1280px+.
   Use the existing stack: Tailwind 4, Radix/shadcn, Framer Motion, lucide, TanStack Table/Query, cmdk,
   sonner, ECharts, @xyflow/react, @number-flow/react.
6. Keep `npx tsc -b` and existing tests green.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.
On this machine run it as `python -m graphify ...` (Windows Application Control blocks the `graphify.exe` launcher).

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
