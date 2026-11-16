# TARKA | Known Limitations & Operational Boundaries

## Overview

In alignment with the TARKA doctrine:
```
AI PROPOSES.
EVIDENCE VERIFIES.
HUMAN DECIDES.
```

This document explicitly identifies known technical boundaries, dependencies, and operational constraints within the current workbench release.

---

## 1. Voice & Audio Processing Boundaries

1. **Microphone Permission Gate**:
   - In accordance with modern browser security policies, Web Audio capture cannot start without an explicit user gesture (clicking "Initialize Forensic Audio" or pressing `Spacebar`).
   - If a user denies microphone permissions, the system seamlessly falls back to the typed command prompt (`/`).

2. **Offline Speech-to-Text (STT) Quality**:
   - Offline voice recognition relies on local browser Web Speech recognition or typed input. In air-gapped environments without local Whisper binaries installed, typed command execution is the primary input modality.
   - Offline spoken audio synthesis is deliberately disabled (**Zero-TTS policy**) to avoid deploying unvetted or low-quality synthesis models in judicial settings.

3. **Background Acoustic Noise**:
   - While the VAD algorithm uses dynamic RMS energy and silence auto-commit, high ambient background noise ($> 65\text{ dB}$) in crowded operational rooms may require holding the Spacebar (push-to-talk) to enforce clean speech bounds.

---

## 2. Graph & Data Scale Boundaries

1. **In-Browser Interactive Graph Rendering**:
   - The interactive SVG/Canvas graph in `FraudNetworkScreen` can smoothly render up to 5,000 active nodes and 20,000 edges.
   - For ultra-large enterprise datasets ($> 50,000$ entities), the system enables Louvain community aggregation, clustering dense subgraphs into single composite nodes to prevent DOM choking.

2. **Live Backend Dependency**:
   - When the backend FastAPI daemon is offline, the frontend operates in mock-cached mode, providing simulated synthetic transaction telemetry.
   - Real bank API integrations (CBS direct push) require mutual TLS (mTLS) credentials configured in sovereign agency deployments.

---

## 3. Legal & Statutory Boundaries

1. **Advisory Role Only**:
   - The AI Assistant generates investigative hypotheses, attribution scores, and draft freeze notices.
   - Under no circumstances does the software auto-dispatch seizure notices or judicial summonses without human investigator digital signature (e-Sign/DSC).
