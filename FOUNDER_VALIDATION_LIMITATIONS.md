# TARKA × SENTINELX — FOUNDER VALIDATION LIMITATIONS & EPISTEMIC BOUNDARIES
## Honest Technical Limitations, Edge Cases, and Boundary Conditions

**Document Version:** 2.0  
**Authority:** Principal Forensic Systems Architect & Digital Forensics Lead  
**Governing Standard:** SentinelX Engineering Constitution (Rule 1: Repository Truth; Rule 5: Investigative Reasoning; Rule 9: Production Readiness)  

---

## 1. Controlled Calibration vs. Real-World Population Generalization

The **100% accuracy** recorded across the 49 scenarios in `FOUNDER_VALIDATION_RESULTS.md` demonstrates **controlled calibration**, NOT proof of universal generalization across arbitrary real-world populations.

> [!WARNING]
> A machine learning or computer vision system calibrated to a 49-scenario benchmark will inevitably encounter real-world distributions that exhibit unexpected compression, unusual visual themes, or adversarial evasion techniques. 
> **Never declare the system legally infallible or universally production-validated based on controlled fixtures.**

---

## 2. Technical Limitations of Visual Examination Sub-Engines

### 2.1. Error Level Analysis (ELA) Limitations
- **JPEG Quality Sensitivity:** ELA relies on saving an image at a known quality factor ($Q=90$) and calculating pixel difference magnitudes. If an original image was saved at very low quality ($Q < 50$), the entire canvas exhibits high error rates, producing false alarms if uncalibrated.
- **Uniform Lossy Compression (Social Media):** Messaging platforms (WhatsApp, Instagram, Telegram) recompress images canvas-wide. While TARKA implements canvas-wide Z-score normalization, heavy recompression washes out subtle local splicing signatures.
- **Flat Color Regions:** Solid background cards (common in payment apps like Google Pay or PhonePe) naturally yield near-zero error levels, potentially masking low-opacity splices in flat white or grey regions.

### 2.2. Pixel Discontinuity & Radon Resampling Limitations
- **High-Contrast Dark Modes:** Modern mobile dark mode UIs present extreme contrast boundaries (e.g. pure white `#FFFFFF` text on pure black `#000000` backgrounds). High-pass filtering naturally registers sharp edge discontinuities that can mimic resampling artifacts if typography boundaries are not respected.
- **Display Scaling & Sub-Pixel Anti-Aliasing:** Android devices utilize non-integer display density multipliers (e.g. $1.75\times$, $2.625\times$, $3.5\times$). Sub-pixel font rasterization across these scalings can introduce mild periodic interpolation lattices that do not indicate fraudulent manipulation.

### 2.3. Typography & Kerning Inspection Limitations
- **Custom System Fonts:** Android users can customize system-wide display fonts (e.g. Samsung One, OnePlus Sans, custom TTF themes). Typography baselines calibrated against standard Google Roboto will flag false kerning irregularities if system font overrides are active.
- **Dynamic Font Resizing:** Mobile accessibility features (large text modes) alter text baseline shifts and line wrapping dynamically.

### 2.4. Metadata & EXIF Fallacy
- **Privacy Stripping by Mobile OS:** Chat applications and mobile operating systems automatically strip EXIF metadata from screenshots by design.
- **Forensic Rule:** The absence of EXIF metadata is standard mobile operating behavior and **must never be interpreted as evidence of fraudulent tampering**.

---

## 3. Financial Reconciliation & Banking Record Limitations

1. **Clock Domain Drift & Settlement Delays:** Transactions cleared at 23:59 IST on Friday may not settle in Core Banking until Monday morning. While TARKA tolerates configured clock skew windows, multi-day weekend clearing drifts require explicit investigator verification.
2. **Narration Truncation:** Core Banking systems frequently truncate payment narration strings to 20 or 30 characters, truncating 12-digit UTR numbers or merchant VPAs.
3. **Mule Account Layering:** Reconciling a single receipt against a single statement cannot independently reveal complex multi-hop layering through unrelated shell accounts without subpoenaing central NPCI switch logs.

---

## 4. Statutory & Admissibility Boundaries

1. **Section 63 BSA / Section 65B IEA Digital Evidence Standard:** Under Indian law, computer outputs are admissible only when accompanied by an official certificate signed by a person occupying an official position responsible for the operation of the device.
2. **Non-Promotability:** An algorithm cannot sign a statutory certificate. TARKA generates drafts with `human_verified = False`, requiring an authorized forensic officer to physically verify the output hash and evidence custody chain before court submission.
3. **No Automatic Guilt Attribution:** In strict accordance with the SentinelX Engineering Constitution, TARKA **NEVER classifies any person as GUILTY or INNOCENT**. It reports objective digital observations and competing epistemic hypotheses. The human investigator and judiciary decide guilt.
