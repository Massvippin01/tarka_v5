# SENTINELX NEXUS — Evidence Model & Chain of Custody

## Evidence Repository Schema
Every evidence item maintains:
- `evidence_number`: Unique identifier (e.g. `EV-2026-101`)
- `evidence_type`: Digital Extraction, Physical Item, CDR Log, Bank Ledger
- `description`: Forensic description
- `collected_by`: Investigating Officer name
- `storage_location`: Secure Vault / Lab location
- `chain_of_custody`: Array of timestamped custody transfers
- `case_id`: Associated Case FIR ID
- `is_verified`: Forensic verification status
- `source`: Originating system (e.g. `EFORENSICS`)
