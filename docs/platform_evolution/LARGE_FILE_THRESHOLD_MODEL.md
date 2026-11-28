# TARKA | LARGE-FILE THRESHOLD MODEL
## Workload Classification, Memory Amplification, and Dynamic Budgeting

**Implementation:** `backend/app/services/ingestion/large_evidence_engine.py`  
**Governing Rule:** Never make unmeasured claims of "unlimited file size". Derive operational limits from host hardware telemetry.

---

## 1. Operational Workload Tiers

Files submitted to TARKA are categorized into 5 mathematical workload classes based on uncompressed byte size:

| Operational Class | File Size Range | Processing Strategy | Memory Ceiling | Concurrency Limit |
| :--- | :--- | :--- | :--- | :--- |
| **`SMALL`** | $< 5\text{ MB}$ | Direct Synchronous Pipeline | $\le 32\text{ MB}$ | 4 concurrent |
| **`MEDIUM`** | $5\text{ MB} - 50\text{ MB}$ | Streaming Background Worker | $\le 128\text{ MB}$ | 2 concurrent |
| **`LARGE`** | $50\text{ MB} - 500\text{ MB}$ | Chunked Task with Checkpoints | $\le 256\text{ MB}$ | 1 active worker |
| **`VERY_LARGE`** | $500\text{ MB} - 5\text{ GB}$ | Partitioned Columnar Disk Stream | $\le 512\text{ MB}$ | Queue serialization |
| **`BULK_DATASET`** | $> 5\text{ GB}$ | Multi-Partition Ingestion Queue | $\le 512\text{ MB}$ | Rate-limited batching |

---

## 2. Format-Specific Memory Amplification Multipliers

Raw file bytes expand significantly in memory depending on the parser and in-memory representation:

$$\text{estimated\_job\_memory} = \text{input\_bytes} \times (M_{\text{parser}} + M_{\text{expansion}}) + \text{buffer\_overhead}$$

| File Format | Parser Multiplier ($M_{\text{parser}}$) | Expansion Multiplier ($M_{\text{expansion}}$) | Rationale |
| :--- | :--- | :--- | :--- |
| **CSV / TSV** | 2.5x | 1.2x | String tokenization, row index arrays, and typed ledger structures |
| **Excel (XLSX)** | 4.0x | 3.5x | OpenXML DOM tree expansion and shared string tables |
| **PDF** | 3.0x | 1.5x | PDF object stream decompression and layout font extraction |
| **JSON / XML** | 3.5x | 1.0x | Nested dict / AST allocation overhead |
| **Images (PNG/JPG)**| 1.8x | 1.0x | Raw uncompressed bitmap buffers for OCR inspection |
| **Generic Binary** | 1.5x | 1.0x | Bounded 64KB chunk buffer streams |

---

## 3. Bounded Streaming Buffers

To prevent Out-Of-Memory (OOM) failures when ingesting massive datasets:
- Streaming chunks are processed in bounded **64 KB memory blocks**.
- Chunks are appended directly to the staging disk file.
- The incremental SHA-256 hasher consumes chunks sequentially without keeping the entire payload in RAM.
- For `VERY_LARGE` and `BULK_DATASET` tiers, parser memory is capped at a strict **512 MB ceiling** by enforcing partitioned row-group processing.

