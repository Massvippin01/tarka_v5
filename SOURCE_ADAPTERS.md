# SENTINELX NEXUS — Source Adapter Specification

## Source Connector Framework
Every source system adapter implements `BaseSourceAdapter` emitting `CanonicalRecord` payloads.

### Adapters Implemented
1. `CCTNSAdapter`: Police FIRs, complaints, and accused/victim relationships.
2. `ICJSAdapter`: Interoperable Criminal Justice System cross-agency records.
3. `NCRPAdapter`: National Cyber Crime Reporting Portal complaints & financial fraud VPAs.
4. `VAHANAdapter`: Vehicle registration, VIN, and ownership ledger.
5. `CDRAdapter`: Telecom Call Detail Records, cell tower locations, and call durations.
6. `ANPRAdapter`: Automatic Number Plate Recognition toll camera sightings.
7. `FinancialAdapter`: Bank transaction ledgers, UPI VPAs, and money mule flows.
8. `EForensicsAdapter`: Forensic lab digital extraction reports (FSL).

### Standard Record Contract
```python
@dataclass
class CanonicalRecord:
    record_id: str
    source_system: SourceSystem
    source_record_id: str
    entity_type: str
    payload: Dict[str, Any]
    timestamp: datetime
    evidence_reference: str
    confidence: float
```
