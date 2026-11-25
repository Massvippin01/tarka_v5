# TARKA PHASE 14.2 — NEXT ACTIONS & STRATEGIC ROADMAP
**Authority:** Principal Forensic Systems Architect, Product Engineering Lead
**Date:** 2026-11-25

---

## 1. Immediate Next Engineering Priorities

Having certified Phase 14.2 with all 6 validation gates passing, the platform is ready for the following targeted advancements:

### Priority 1: Multi-Volume Storage Partitioning for Scale
- **Current Baseline:** Host environment provides ~9.47 GB free on volume `C:\`. While 2.0 GB datasets execute safely with 100% bitstream verification, running 5 GB and 10 GB corpora locally violates the mandatory 1.5x disk safety rule on this host.
- **Action Item:** Introduce external volume mounting or object-storage offload (S3/MinIO backend adapter) for evidence CAS stores exceeding 5 GB.

### Priority 2: Vision-Language Model Fine-Tuning for Vernacular Receipts
- **Current Baseline:** Tesseract/EasyOCR delivers high accuracy on printed receipts and standard mobile screenshots (e.g., Google Pay ₹1,495), but handwritten carbon-copy receipts require human examiner adjudication.
- **Action Item:** Integrate a fine-tuned lightweight vision-language model (e.g., PaliGemma-Forensics or TrOCR-Handwritten) specifically calibrated on Indian retail handwritten receipts (Tamil, Hindi, Telugu, English shorthand).

### Priority 3: Automated NPCI ISO 8583 Journal Ingestion
- **Current Baseline:** AEGIS automatically drafts Section 94 BNSS statutory requisitions for central switch settlement logs.
- **Action Item:** Build an automated ISO 8583 parser and reconciliation adapter that can directly ingest and parse NPCI switch dumps when produced by institutions.

---

## 2. Institutional Pilot Deployment Timeline

- **Phase 14.2:** Founder-Led Real Evidence Validation — **COMPLETE**.
- **Phase 15:** Institutional Pilot Deployment with Academic / Law Enforcement Forensic Labs (NFSU, IIT Kanpur C3iHub).
- **Phase 15.1:** Supervised Live Case Re-investigation using real-world disputed transaction dockets.
