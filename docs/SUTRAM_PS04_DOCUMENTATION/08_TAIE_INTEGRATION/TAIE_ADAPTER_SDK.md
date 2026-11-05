# TAIE ADAPTER SDK
## Developer Guide and Institutional Connector Specification

**Package:** `backend/tarka/taie/sdk.py`  
**Base Class:** `BaseInstitutionalAdapter`  
**Status:** IMPLEMENTED & TESTED  

---

# 1. OVERVIEW

The **TAIE Adapter SDK** establishes the contract for adding new external banking, telecom, or judicial data sources to TARKA. Any organization or protocol adapter extending `BaseInstitutionalAdapter` automatically inherits:
- Standardized health monitoring and circuit breaking.
- Deterministic SHA-256 raw exhibit hashing.
- Cryptographic provenance tracking compliant with BSA §63.
- Automatic quarantine isolation for malformed or corrupted records.

---

# 2. BASE ADAPTER CONTRACT

```python
class BaseInstitutionalAdapter(abc.ABC):
    def __init__(self, manifest: InstitutionCapabilityManifest, adapter_version: str = "1.0.0"):
        self.manifest = manifest
        self.institution_id = manifest.institution_id
        self.adapter_version = adapter_version
        self.connected = False

    @abc.abstractmethod
    def connect(self) -> bool:
        """Establish connection or session to external or simulated source."""

    @abc.abstractmethod
    def disconnect(self) -> bool:
        """Safely terminate session and clean up resources."""

    @abc.abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Perform active diagnostic check and return standardized status dict."""

    @abc.abstractmethod
    def fetch_raw(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch raw unnormalized exhibit payload from the institutional source."""

    @abc.abstractmethod
    def transform(self, raw_payload: Dict[str, Any]) -> Any:
        """Normalize raw payload into Canonical v1 domain objects."""

    @abc.abstractmethod
    def emit_provenance(self, raw_payload: Dict[str, Any], canonical_records: List[Any]) -> Dict[str, Any]:
        """Generate tamper-evident provenance record connecting raw exhibit to canonical records."""
```

---

# 3. IMPLEMENTATION GUIDE: CREATING A NEW ADAPTER

### Step 1: Define the Capability Manifest
```python
from tarka.taie.manifest import InstitutionCapabilityManifest

manifest = InstitutionCapabilityManifest(
    institution_id="AIRTEL_IND_IPDR",
    institution_name="Bharti Airtel CGNAT & IPDR Gateway",
    institution_type="TELCO",
    supported_protocols=["REST", "HTTPS"],
    supported_schemas=["CANONICAL_V1", "IPDR_RADIUS_V2"],
    rate_limits={"requests_per_minute": 300, "max_batch_size": 50000},
    statutory_scopes=["IT_ACT_69A", "CRPC_91", "DOT_COMPLIANCE_2021"],
    data_classification_policy={"allowed_tiers": ["T1"], "encryption": "TLS_1_3"}
)
```

### Step 2: Implement the Adapter Class
```python
from tarka.taie.sdk import BaseInstitutionalAdapter
from tarka.taie.mapping import CanonicalSchemaMappingEngine
from tarka.taie.provenance import TransformationProvenanceTracker

class AirtelIPDRAdapter(BaseInstitutionalAdapter):
    def __init__(self):
        super().__init__(manifest, adapter_version="1.0.0")

    def connect(self) -> bool:
        self.connected = True
        return True

    def disconnect(self) -> bool:
        self.connected = False
        return True

    def health_check(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "circuit_state": "CLOSED"}

    def fetch_raw(self, query: Dict[str, Any]) -> Dict[str, Any]:
        # Connect to telco API or read exhibit dump
        return {"logs": [...], "status": 200}

    def transform(self, raw_payload: Dict[str, Any]):
        return CanonicalSchemaMappingEngine.map_transaction_payload(
            raw_items=raw_payload.get("logs", []),
            case_id="CASE_2026_01",
            source_evidence_id="EVID_AIRTEL_001",
            mapping_profile="IPDR_RADIUS_V2"
        )

    def emit_provenance(self, raw_payload: Dict[str, Any], canonical_records: List[Any]):
        prov = TransformationProvenanceTracker.create_provenance_record(
            institution_id=self.institution_id,
            adapter_name="AirtelIPDRAdapter",
            adapter_version=self.adapter_version,
            mapping_profile="IPDR_RADIUS_V2",
            raw_payload=raw_payload,
            canonical_records=canonical_records
        )
        return prov.model_dump()
```

### Step 3: Register in Connector Registry
```python
from tarka.taie import default_connector_registry

adapter = AirtelIPDRAdapter()
default_connector_registry.register(adapter, is_active=True)
```

