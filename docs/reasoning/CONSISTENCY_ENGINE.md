# SentinelX 2026 — Temporal & Spatial Consistency Engine
**Document ID**: `docs/reasoning/CONSISTENCY_ENGINE.md`  
**Milestone**: Wave 3 (Evidence Reasoning Core)  
**Status**: `VERIFIED & ARCHITECTURALLY FROZEN`  

---

## 1. Physical Kinematics vs Hardcoded Heuristics

A common architectural antipattern in forensic software is hardcoding heuristic rules (e.g. `if distance > 10km and time < 5min: flag_impossible()`). Such hardcoded heuristics fail when evaluated against different transport modes (walking, drone, vehicle, commuter rail, helicopter), urban congestion conditions, or sensor timestamp uncertainties.

The SentinelX **TemporalSpatialConsistencyEngine** evaluates spatiotemporal consistency using physical kinematics, geodesic distances, and configurable transport models:
$$d_{\text{geodesic}} = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
$$d_{\text{road}} = d_{\text{geodesic}} \times \text{congestion\_tortuosity\_factor}$$
$$v_{\text{required}} = \frac{d_{\text{road}}}{\Delta t_{\text{effective}}}$$
where $\Delta t_{\text{effective}} = \Delta t_{\text{raw}} + \delta t_{\text{uncertainty}}$.

---

## 2. Configurable Travel Models

Defined in [`backend/app/services/temporal_spatial_consistency_engine.py`](file:///c:/PROJECTS/SentinelX/backend/app/services/temporal_spatial_consistency_engine.py):

| Model Name | Nominal Speed | Max Feasible Speed | Impossibility Threshold | Tortuosity Factor | Minimum Transit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `URBAN_GROUND_VEHICLE` (Default) | 40 km/h | 90 km/h | 120 km/h | 1.3 | 60 s |
| `HIGHWAY_EXPRESSWAY` | 80 km/h | 130 km/h | 160 km/h | 1.1 | 30 s |
| `PEDESTRIAN_URBAN` | 4.5 km/h | 10.0 km/h | 18.0 km/h | 1.4 | 15 s |
| `ROTARY_WING_AERIAL` | 180 km/h | 280 km/h | 350 km/h | 1.02 | 120 s |

---

## 3. Evaluation Verdicts

The engine outputs four discrete verdicts:
1. `CONSISTENT`: Traversal speed and time delta fall well within nominal vehicle limits.
2. `POSSIBLY_CONSISTENT`: Speed exceeds nominal urban flow (e.g., 90–120 km/h) but remains within physical extreme limits (e.g., high-speed expressway run with sirens/green corridor).
3. `INCONSISTENT`: Required speed exceeds the physical impossibility threshold ($>120\text{ km/h}$ for urban ground vehicle). Flags a kinematic impossibility without silently discarding either record.
4. `INSUFFICIENT_INFORMATION`: Missing geospatial coordinates or timestamps for one or both observations.

---

## 4. Operation Triad Nexus (CASE-2026-001) Inconsistency Proof

In `CASE-2026-001`, two legitimate records are captured:
1. **CDR Cell Tower Ping**:
   - Location: South Delhi Sector 4 Tower (`28.5355`, `77.2189`)
   - Timestamp: `09:38:00 UTC`
2. **ANPR Camera Sighting**:
   - Location: DND Toll Plaza Flyway (`28.5772`, `77.2917`)
   - Timestamp: `09:41:00 UTC`

### Kinematic Calculation:
- Geodesic Distance: $\approx 8.5 \text{ km}$
- Estimated Urban Road Distance ($1.3 \times$ tortuosity): $11.1 \text{ km}$
- Elapsed Time: $180 \text{ s}$ ($3 \text{ minutes}$)
- Effective Transit Speed: $222.0 \text{ km/h}$
- Engine Verdict: **`INCONSISTENT`**
- Engine Explanation: *"Physically implausible transit: requires 222.0 km/h to cover 11.1 km in 3.0 minutes (max threshold: 120.0 km/h under URBAN_GROUND_VEHICLE)."*

Verified deterministically in `test_temporal_spatial_consistency_kinematics` and `test_golden_case_wave3_full_reasoning_pipeline`.
