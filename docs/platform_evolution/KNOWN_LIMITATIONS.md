# TARKA | KNOWN LIMITATIONS & OPERATIONAL BOUNDARIES
## Truthful Technical Disclosures & Future Hardening Roadmap

**Governing Doctrine:** Never fabricate capability or misrepresent readiness. State boundaries honestly.  

---

## 1. Documented Technical Limitations

1. **Optical Character Recognition (OCR) for Scanned Handwriting**:
   - The current ingestion engine extracts machine-printed digital text from PDFs and scanned banking forms reliably.
   - Low-resolution, handwritten vernacular police station diary notes (e.g., Urdu or cursive Hindi) require secondary human examiner transcription or a specialized handwriting OCR model.
2. **Offline Indic Language Speech Recognition Coverage**:
   - The bundled local model (`faster-whisper-tiny` int8) excels in Indian English, Hindi, and code-mixed vocabulary.
   - For regional vernacular dialects (e.g., colloquial rural Odia or Kashmiri), the cloud-based **Sarvam Enhanced** mode provides higher phonetic transcription accuracy when network policy permits.
3. **Hardware-Constrained Bulk Ingestion (> 50 GB)**:
   - On hosts with $< 8\text{ GB}$ of physical RAM, single ingestion archives exceeding 50 GB are serialized into row-partitioned batches. While system stability is guaranteed by the Resource Admission Controller, overall job completion time scales linearly with disk I/O throughput.
4. **Browser Hardware Acceleration Requirements**:
   - The 6,800-particle Fibonacci sphere runs at 60 FPS on modern WebGL/Canvas2D hardware.
   - On legacy virtualized remote desktop environments lacking hardware GPU acceleration, the engine automatically falls back to 1,800 particles with reduced rotational frequency.

