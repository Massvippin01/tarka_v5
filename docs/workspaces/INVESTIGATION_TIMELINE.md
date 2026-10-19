# Investigation Timeline Projection

## 1. Overview & Forensic Temporal Rigor

The Investigation Timeline projects chronological events, movements, communications, and financial transactions across the case lifecycle. 

Unlike conventional timelines that assume exact timestamps and point locations, SentinelX explicitly captures and projects **temporal and spatial uncertainty bounds**.

API Endpoint:
`GET /api/v1/investigations/{case_id}/timeline`

---

## 2. Uncertainty Intervals & Multi-Source Synthesis

Every entry in the timeline is characterized by:
- `timestamp`: Central observed ISO-8601 UTC timestamp.
- `timestamp_uncertainty_seconds`: Window $[\tau - \Delta t, \tau + \Delta t]$ reflecting clock drift, tower sampling granularity, or manual entry error.
- `location`: Human-readable geographic anchor or cell tower azimuth.
- `location_uncertainty_meters`: Spatial radius $r$ reflecting GPS precision, tower coverage radius (e.g., $1500\text{ m}$ in urban sectors), or toll lane width.

### Visual and Semantic Separation:
- **Phone Calls & SMS**: Rendered as directional communication events with cell tower azimuth.
- **Physical Detections (ANPR/CCTV)**: Rendered as discrete spatial sightings with optical confidence scores.
- **Financial Transactions**: Rendered as monetary movements with clearing timestamps and counterparty metadata.

---

## 3. Timeline Anomaly Highlighting

When two events cannot be reconciled within their combined uncertainty intervals without violating physical laws (e.g., velocity $> 140\text{ km/h}$), the timeline directly draws an **Anomaly Warning Callout** pointing to the active contradiction record in the Contradiction Center.
