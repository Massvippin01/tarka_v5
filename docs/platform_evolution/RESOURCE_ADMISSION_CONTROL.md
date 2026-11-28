# TARKA | RESOURCE ADMISSION CONTROL
## Dynamic Admission Decisions, Headroom Budgeting, and Crash Prevention

**Implementation:** `backend/app/services/ingestion/large_evidence_engine.py`  
**Endpoint:** `POST /api/v1/ingestion/estimate-resources` & `GET /api/v1/ingestion/system-capacity`  

---

## 1. Dynamic Mathematical Admission Formula

TARKA executes an explicit mathematical admission check before permitting any evidence upload:

$$\text{available\_memory} = \text{total\_memory} - \text{reserved\_os\_memory} - \text{current\_memory\_usage}$$
$$\text{safe\_worker\_memory} = \frac{\text{available\_memory}}{\text{permitted\_concurrent\_workers}}$$
$$\text{estimated\_job\_memory} = \text{file\_size} \times (M_{\text{parser}} + M_{\text{expansion}}) + \text{buffer\_overhead}$$

```
                Incoming Ingestion Request (Size, Filename)
                                   │
                                   ▼
                   Evaluate Host Memory Headroom
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   estimated > available?                    estimated > safe_worker?
              │                                         │
        [YES] │                                   [YES] │
              ▼                                         ▼
      REJECT_UNSAFE                             QUEUE_CONSTRAINED
(Halt to prevent OOM crash)               (Serialize in job queue)
                                                        │ [NO]
                                                        ▼
                                                 ADMIT_IMMEDIATE
                                           (Launch pipeline immediately)
```

---

## 2. Decision Logic Taxonomy

1. **`ADMIT_IMMEDIATE`**:
   - Condition: $\text{estimated\_job\_memory} \le \text{safe\_worker\_memory}$ and active workers $< \text{max\_workers}$.
   - Result: HTTP 200 with job handle; execution begins without queuing.
2. **`QUEUE_CONSTRAINED`**:
   - Condition: Active workers $\ge \text{max\_workers}$ or $\text{estimated\_job\_memory} > \text{safe\_worker\_memory}$, but within overall host headroom.
   - Result: HTTP 200 with queue position; worker waits for running jobs to release memory.
3. **`REJECT_UNSAFE`**:
   - Condition: $\text{estimated\_job\_memory} > \text{available\_memory}$.
   - Result: HTTP 413 Payload Too Large with a structured diagnostic reason stating exact memory shortfall and recommended chunk partitioning.

---

## 3. Resumability & Checkpointing

If an upload stream or background worker is interrupted:
- Bytes successfully received up to the last 64KB boundary are preserved on disk.
- When resuming, the client issues `PUT /api/v1/ingestion/jobs/{job_id}/chunk?offset={bytes_uploaded}`.
- If the byte offset does not match the server's checkpoint digest, an HTTP 409 Conflict is returned to prevent corrupted concatenations.

