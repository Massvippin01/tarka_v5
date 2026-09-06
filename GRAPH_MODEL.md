# SENTINELX NEXUS — Graph Model & Analytics Specification

## Node Schema
- `Person`: `id`, `name`, `aadhaar`, `driving_license`, `aliases`, `jurisdiction`
- `Case`: `id`, `fir_number`, `police_station`, `crime_type`, `status`
- `Phone`: `id`, `phone_number`, `imei`, `carrier`
- `Vehicle`: `id`, `registration_number`, `chassis_number`, `make_model`
- `BankAccount`: `id`, `account_number`, `ifsc`, `vpa`, `bank_name`
- `Evidence`: `id`, `evidence_number`, `evidence_type`, `chain_of_custody`

## Edge Schema & Analytical Features
- `ACCUSED_IN`: Role relationship connecting Person to Case.
- `VICTIM_IN`: Role relationship connecting Person to Case.
- `USED_PHONE`: Link connecting Person to Phone.
- `OWNED_VEHICLE`: Link connecting Person to Vehicle.
- `TRANSFERRED_TO`: Link connecting BankAccounts.
- `EXCHANGED_CALL`: Link connecting Phones (CDR).
- `SIGHTED_AT`: Link connecting Vehicle to ANPR camera/location.

## Bounded Analytics Metrics
- **Degree Centrality**: Calculated server-side over projected 2-hop subgraphs.
- **PageRank**: Normalized page rank over bounded graph projections.
- **Candidate Community Discovery**: Groups entity clusters sharing >3 common identifiers, vehicle trails, or financial links without assigning unverified legal labels.
