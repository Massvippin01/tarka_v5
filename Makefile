.PHONY: dev dev-backend dev-frontend test test-backend test-frontend build lint clean help

help:
	@echo "TARKA - AI-Powered Cyber Fraud Investigation & Attribution Platform"
	@echo "  make dev          - Start both backend (FastAPI :8000) and frontend (Vite :5173) concurrently"
	@echo "  make dev-backend  - Start FastAPI backend on port 8000"
	@echo "  make dev-frontend - Start Vite frontend on port 5173"
	@echo "  make test         - Run full test suite (pytest + vitest)"
	@echo "  make test-backend - Run backend pytest suite"
	@echo "  make test-frontend- Run frontend vitest suite"
	@echo "  make build        - Build frontend production bundle"
	@echo "  make lint         - Run frontend ESLint check"

dev:
	npm --prefix frontend run dev:all

dev-backend:
	python -m uvicorn app.main:app --app-dir backend --port 8000

dev-frontend:
	npm --prefix frontend run dev

test: test-backend test-frontend

test-backend:
	ENABLE_DEMO_AUTH=false python -m pytest backend/tests -q --ignore=backend/tests/test_sarvam_live_smoke.py

test-frontend:
	cd frontend && npx vitest run

build:
	cd frontend && npm run build

lint:
	cd frontend && npm run lint

