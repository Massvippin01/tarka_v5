# SENTINELX 2026 — Source Adapter Fabric Specification
**Document ID**: `docs/adapters/SOURCE_ADAPTER_SPEC.md`  
**Status**: APPROVED & IMPLEMENTED (Wave 2)  
**Standard**: Canonical Evidence IR Plugin Contract  

---

## 1. Architectural Role & Boundary

The **Source Adapter Fabric** transforms heterogeneous law-enforcement exports, digital forensic dumps, and investigative streams into the **Canonical Evidence IR** without ever writing directly to the knowledge graph or bypassing the **Evidence Ingestion Gateway**.

```
[ Authorized Export / Stream ]
              ↓
  Evidence Ingestion Gateway (Owns Acquisition, Hashing, Custody, Storage, UUIDv7)
              ↓
        EvidenceArtifact (Immutable File Reference + SHA-256)
              ↓
      Source Adapter Fabric (Owns Parsing, Normalization, Observation/Fact Extraction)
              ↓
      AdapterResult (Observations, Facts, Events, Schema Metadata)
              ↓
      Evidence Integrity Validator (Guarantees Non-Orphan Invariant)
              ↓
        UnifiedStore (Append-Only Canonical Evidence IR)
```

### Strict Ownership Boundaries
| Capability | Owner | Adapter Allowed? |
| :--- | :--- | :--- |
| **SHA-256 Content Hashing** | Evidence Ingestion Gateway | ❌ NEVER |
| **Object Storage Sharding** | Evidence Ingestion Gateway | ❌ NEVER |
| **Chain of Custody Events** | Evidence Ingestion Gateway | ❌ NEVER |
| **UUIDv7 Artifact Identity** | Evidence Ingestion Gateway | ❌ NEVER |
| **Raw Evidence Byte Mutation**| Forbidden (Immutable) | ❌ NEVER |
| **Schema Validation & Parsing**| Source Adapter | ✅ YES |
| **Attribute Normalization** | NormalizationService via Adapter | ✅ YES |
| **Atomic Observations Extraction**| Source Adapter | ✅ YES |
| **Derived Facts & Locations** | Source Adapter | ✅ YES |

---

## 2. Source Adapter Plugin Contract

Every source adapter implements the `SourceAdapter` abstract base class (`app/adapters/source_adapter.py`):

```python
class SourceAdapter(ABC):
    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool: ...
    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]: ...
    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]: ...
    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]: ...
    def extract_observations(self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]) -> List[EvidenceObservation]: ...
    def extract_facts(self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]) -> List[EvidenceFact]: ...
    def extract_events(self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]) -> List[Dict[str, Any]]: ...
    def execute(self, context: AdapterContext, data: bytes) -> AdapterResult: ...
    def health(self) -> Dict[str, Any]: ...
    def schema(self) -> Dict[str, Any]: ...
    def capabilities(self) -> List[str]: ...
```

---

## 3. The 11 Planned Adapter Families

SentinelX registers exactly 11 adapter families in `SourceAdapterRegistry`:

| Family ID | Adapter Class | Target Data & Forensic Protocol | Key Extracted Entities & Normalizations |
| :--- | :--- | :--- | :--- |
| `CCTNS_FIR` | `CCTNSFIRAdapter` | CCTNS State Police FIR exports (JSON/XML) | Accused, Complainant, Offense Sections, Police Station; Name titlecasing |
| `ICJS_RECORD` | `ICJSRecordAdapter` | Inter-operable Criminal Justice System court dockets | Case Nos, Undertrial/Convict status, Bail hearings, Judicial dispositions |
| `EFSL_REPORT` | `EFSLReportAdapter` | e-FSL Forensic Science Laboratory official reports | Chemical, ballistic, digital examination conclusive findings & SHA-256 hashes |
| `CDR_TELECOM` | `CDRTelecomAdapter` | Telecom operator Call Detail Records & Tower telemetry | E.164 phone normalization, call duration, cell tower pings, geo-coordinates |
| `FINANCIAL_TRANSACTION` | `FinancialTransactionAdapter`| Bank ledgers, UPI transaction logs, IMPS/NEFT | Remitter, Beneficiary, UPI VPAs, Amount ₹, Mule velocity flags |
| `MOBILE_FORENSIC_EXPORT` | `MobileForensicAdapter` | Cellebrite UFED / XRY physical smartphone dumps | Hardware IMEI, WhatsApp/Signal chats, extracted contact books |
| `COMPUTER_FORENSIC_EXPORT`| `ComputerForensicAdapter` | Disk triage images (Autopsy / FTK / EnCase) | Hostname, OS user, browser navigation history, USB artifacts |
| `CLOUD_AUDIT_LOG` | `CloudAuditAdapter` | AWS CloudTrail, GCP Audit, Azure Entra ID | IAM username, Action API call, Source IP address, Cloud Region |
| `CCTV_ANPR` | `CCTVANPRAdapter` | CCTV camera detections & ANPR toll plaza captures | Upper-cased vehicle registration plates, camera locations, lane speeds |
| `NETWORK_PCAP_LOG` | `NetworkPCAPAdapter` | Zeek network logs, NetFlow, DNS telemetry | Source IP, Dest IP, Port, DNS C2 queries, TLS handshake indicators |
| `FORENSIC_DOCUMENT` | `ForensicDocumentAdapter` | Seizure memos, panchnamas, CrPC 161 statements | Witness statements, alibi assertions, page/paragraph anchors |

---

## 4. Evidence Integrity Invariant

All derived Evidence IR objects (`EvidenceObservation`, `EvidenceFact`, `EvidenceEvent`, `EntityRelationship`) are governed by the `EvidenceIntegrityValidator`:
- **Artifact Existence**: The referenced `artifact_id` must resolve in the store.
- **Hash Resolution**: The artifact's `content_hash` must be valid and verified.
- **Provenance Link**: Provenance records must exist for the root artifact.
- **Source Location Anchor**: Every fact and observation must anchor its byte range, line number, page, or JSON key path.
- **Orphan Prohibition**: Any unanchored or orphan derived object is rejected and quarantined.
