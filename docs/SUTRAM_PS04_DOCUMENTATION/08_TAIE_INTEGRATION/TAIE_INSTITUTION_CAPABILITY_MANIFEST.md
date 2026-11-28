# TAIE INSTITUTION CAPABILITY MANIFEST
## Statutory Scope, Rate Governance, and Consent Boundaries

**Package:** `backend/tarka/taie/manifest.py`  
**Class:** `InstitutionCapabilityManifest`  
**Status:** IMPLEMENTED & TESTED  

---

# 1. PURPOSE & PRINCIPLES

In Indian cyber-fraud investigations, financial data cannot be queried or ingested arbitrarily without legal authority and statutory compliance. 

The `InstitutionCapabilityManifest` is the formal, machine-readable declaration of an institution's:
1. **Statutory Authority Scope:** Which Indian legislative acts govern data disclosure (e.g. Section 91 CrPC, Section 50 PMLA 2002, Section 69A IT Act 2000, RBI Master Directions on Fraud Monitoring).
2. **Transport & Schema Support:** Permitted communication protocols and payload formats.
3. **Operational Thresholds:** Rate limits and maximum batch sizes to prevent institutional denial-of-service.
4. **Data Handling & Consent Policy:** Warrant requirements, evidence tier classifications, encryption standards, and retention schedules.

---

# 2. MANIFEST SCHEMA DEFINITION

```python
class InstitutionCapabilityManifest(BaseModel):
    institution_id: str
    institution_name: str
    institution_type: str  # BANK, TELCO, PAYMENT_GATEWAY, LAW_ENFORCEMENT
    supported_protocols: List[str]  # REST, BATCH_FILE, LEGACY_CBS, GRPC
    supported_schemas: List[str]    # CANONICAL_V1, CBS_8583, UPI_SWITCH_V2
    rate_limits: Dict[str, Any]     # requests_per_minute, max_batch_size, burst_limit
    concurrency_limits: Dict[str, Any]
    statutory_scopes: List[str]     # PMLA_2002, IT_ACT_69A, CRPC_91, RBI_MASTER_DIRECTION
    data_classification_policy: Dict[str, Any]
    consent_framework_policy: Dict[str, Any]
    schema_version: str = "v1.0.0"
```

---

# 3. STATUTORY COMPLIANCE CHECKS

The manifest enforces statutory access controls before any query or ingest operation executes:

```python
manifest = adapter.manifest

# Check if institution supports CrPC Section 91 police summons
if not manifest.check_statutory_scope("CRPC_91"):
    raise PermissionError("Connector lacks CrPC §91 statutory authorization.")

# Check if batch size exceeds institutional rate limit
if not manifest.validate_batch_size(requested_batch_size):
    raise ValueError(f"Batch size {requested_batch_size} exceeds institutional limit.")
```

---

# 4. DEFAULT MOCK MANIFEST PROFILES

| Institution ID | Type | Protocols | Supported Schemas | Statutory Scopes | Max Batch |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HDFC_BANK_MOCK` | BANK | REST, HTTPS | CANONICAL_V1, REST_JSON_V1 | PMLA_2002, IT_ACT_69A, CRPC_91, RBI | 5,000 |
| `SBI_BANK_BATCH_MOCK` | BANK | BATCH_FILE, SFTP | CANONICAL_V1, CSV_BATCH_V1 | PMLA_2002, CRPC_91, RBI | 20,000 |
| `PNB_LEGACY_CBS_MOCK` | BANK | LEGACY_CBS, TCP | CANONICAL_V1, CBS_8583_LEGACY | PMLA_2002, CRPC_91 | 1,000 |

