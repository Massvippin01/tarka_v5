/**
 * TARKA v5.5 Statutory Directives & Court Requisitions Generator
 * Implements legal text templates under BNSS 2023, BSA 2023, and DoT Mandates.
 */

export function getBnss94CbsDirective(): string {
  return `STATUTORY REQUISITION UNDER SECTION 94 BNSS, 2023 / SEC 91 CrPC
From: Investigating Officer (Cyber Crime Police Station, Noida)
To: Nodal Officer, State Bank of India (Core Banking Operations)
Case Ref: FIR #149/2026 · Noida Cyber Crime PS (Complainant: Sunil Kumar)
Date/Time: 2026-09-22 10:30:00 IST

SUBJECT: MANDATORY CBS INVARIANT & LOG PRODUCTION FOR DISPUTED UTR #626510149921

1. Reference is made to transaction sequence #14 dated 22-09-2026 10:00:14 IST:
   - Disputed Beneficiary: VIKRAM_MULE (Account #41088291083)
   - Disputed CBS Debit: ₹2,15,000.00 (Tranche 1 of ₹5,00,000.00 total fraud outflow)
   - Claimant Purported Receipt Amount: ₹15,000.00 (Tier-3 Canva-generated artifact)
   - Suppression Delta / Deficit: ₹2,00,000.00 (14.3x Value Overwrite)
   - Document Forensics: Dual %%EOF trailers detected; incremental xref appended at byte offset 0x00014209..0x00015080.

2. In exercise of powers conferred under Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, you are hereby directed to produce the following within TWENTY-FOUR (24) HOURS:
   (a) Certified Finacle 10.x database commit transaction log & HSM cryptographic signature for UTR #626510149921.
   (b) Statutory Certificate under Section 63(4) of Bharatiya Sakshya Adhiniyam, 2023 (Part-A Custodian Certification).
   (c) IP ingress logs and MAC/IMEI binding for UPI Switch request received at 10:00:14 IST.
   (d) Immediate debit freeze / administrative lien under Section 106 BNSS on beneficiary account #41088291083.

Failure to comply with this statutory directive shall invite penal consequences under Section 223 of Bharatiya Nyaya Sanhita (BNS), 2023.

Issued under seal of Investigating Officer, Noida Cyber Crime PS.`;
}

export function getBnss94EntityResolutionDirective(): string {
  return `STATUTORY REQUISITION UNDER SECTION 94 BNSS, 2023 / SEC 91 CrPC
From: Investigating Officer (Cyber Crime Police Station, Noida)
To: Nodal Officers — State Bank of India, HDFC Bank, Axis Bank, ICICI Bank & Bharti Airtel Ltd.
Case Ref: FIR #149/2026 · Noida Cyber Crime PS (Complainant: Sunil Kumar)
Date/Time: 2026-09-22 11:30:00 IST

SUBJECT: MANDATORY CROSS-BANK ENTITY RESOLUTION, KYC & CDR CORRELATION FOR 5 RESOLVED TARGETS

1. Based on multi-source forensic ingestion (NPCI Switch Logs, CBS Finacle Narration, and IPDRs), TARKA has resolved 18 raw identifiers into 5 canonical entities:
   - ENT-01 (Victim Origin): Sunil Kumar (SBI A/c 30910029101, MSISDN +91-9810044210)
   - ENT-02 (Layer-1 Conduit): Vikram Shah (SBI A/c 41088291083, MSISDN +91-9871123941, IMEI 867492061234564)
   - ENT-03 & ENT-04 (Syndicate Layer-2): Rohit Verma (HDFC A/c 5010029419920) & Sameer Khan (Axis A/c 9140200410291)
     * SYNDICATE LINK: Shared TLS JA4 Fingerprint (t13d1516h2_8daaf6) & Hotspot BSSID (74:DA:38:A2:11:BC)
   - ENT-05 (Bona-Fide Commercial Merchant): Apex Electronics Pvt Ltd (GSTIN 07AAACA1234F1Z8, ICICI A/c 001405008129)
     * HARD VETO APPLIED: Zero shared hardware tokens; active commercial POS history.

2. In exercise of powers under Section 94 BNSS, you are hereby directed to produce within 24 HOURS:
   (a) Certified Account Opening Forms (AOF), biometric e-KYC records, and registered MSISDN for ENT-02, ENT-03, and ENT-04.
   (b) Device binding MAC/IMEI and IP ingress session history for mobile banking logins.
   (c) Confirmation of Section 106(1) Specific Debit Lien on ₹1,80,000 for ENT-05 while keeping remaining commercial operational capital active.

Failure to comply invites penal proceedings under Section 223 BNS, 2023.

Issued under seal of Investigating Officer, Noida Cyber Crime PS.`;
}


export function getDot3920PortBlockDirective(): string {
  return `STATUTORY REQUISITION UNDER DOT CLAUSE 39.20 & SEC 94 BNSS
From: Investigating Officer (Cyber Crime Police Station, Noida)
To: Nodal Officer / Law Enforcement Liaison, Bharti Airtel Ltd.
Case Ref: FIR #149/2026 · Noida Cyber Crime PS
Date/Time: 2026-09-22 11:00:00 IST

SUBJECT: MANDATORY CARRIER-GRADE NAT (CGNAT) PORT TRANSLATION & RADIUS IPDR PRODUCTION

1. Reference is made to 4 independent bank login sessions associated with beneficiary Vikram Shah (SBI, HDFC, Axis, Paytm):
   - Public NAT IPv4 Address: 103.21.144.92
   - Source Port Allocation Block: Ports 44000–44511 (340 Tower Subscribers Pool)
   - Cell Tower Identifier: DL-TWR-891 (Sector 4 Rohini, Delhi / Azimuth 120°)
   - Session Timestamps: 2026-09-22 09:15:02 IST to 10:28:45 IST

2. Pursuant to Department of Telecommunications (DoT) License Mandate Clause 39.20 and Section 94 BNSS, you are hereby directed to produce:
   (a) Dynamic NAT binding translation table (IPDR) resolving public IP 103.21.144.92 and allocated source ports to internal private subscriber IP (10.x.x.x).
   (b) Radius accounting logs containing MSISDN, IMSI, and device IMEI (15-digit TAC + Serial + Luhn check digit).
   (c) Packet Gateway (PGW) TTL hop count verification confirming whether connection was direct or Wi-Fi tethered (TTL=63 anomaly).
   (d) Section 63(4) BSA electronic record certificate certifying systemic accuracy of telecom carrier records.

Failure to furnish DoT Clause 39.20 logs obstructs statutory investigation under Section 106 BNSS.

Issued under seal of Investigating Officer, Noida Cyber Crime PS.`;
}

export function getDotSimSwapDirective(): string {
  return `STATUTORY MANDATE UNDER DOT SIM-SWAP SECURITY DIRECTIVE & SEC 94 BNSS
From: Investigating Officer (Cyber Crime Police Station, Noida)
To: Nodal Officers — Bharti Airtel Ltd. & Reliance Jio Infocomm Ltd.
Case Ref: FIR #149/2026 · Noida Cyber Crime PS (Complainant: Sunil Kumar)
Date/Time: 2026-09-22 11:45:00 IST

SUBJECT: INVESTIGATION OF PRECURSOR SIM-SWAP FRAUD & PHYSICAL IMSI RE-ALLOCATION

1. Forensic evidence indicates that MSISDN +91-98711-23941 underwent an unauthorized physical SIM swap at 09:44:12 IST (16 minutes prior to ₹5,00,000 siphoning):
   - Legacy IMSI: 404100291048882 (Deactivated)
   - Fraudulent Target IMSI: 404100291048904 (Activated on Handset TAC 86749206)
   - Handset Hardware: Samsung Galaxy M34 5G (Dual-SIM Chassis)
   - Slot 1 IMEI: 867492061234564 (Airtel) | Slot 2 IMEI: 867492061234572 (Jio)

2. Under Section 94 BNSS and DoT Security Directives, produce immediately:
   (a) Store POS transaction ID, biometric Aadhaar thumbprint scan, and agent identity authorizing the SIM swap at 09:44:12 IST.
   (b) SMS Gateway dispatch logs for OTPs routed to IMSI 404100291048904 during the 09:45:00 - 10:15:00 IST window.
   (c) Immediate block / IMEI blacklisting across CEIR portal for chassis TAC 86749206.

Issued under seal of Investigating Officer, Noida Cyber Crime PS.`;
}

export function getBnss94ImeiSeizureDirective(): string {
  return `SEARCH & SEIZURE WARRANT REQUISITION UNDER SEC 94/106 BNSS, 2023
From: Investigating Officer (Cyber Crime Police Station, Noida)
To: In-Charge Officer, Special Task Force (STF) / Tactical Recovery Unit
Case Ref: FIR #149/2026 · Noida Cyber Crime PS
Date/Time: 2026-09-22 12:00:00 IST

SUBJECT: WARRANT FOR PHYSICAL RECOVERY & FORENSIC SEIZURE OF CHASSIS TAC 86749206

Target Device Hardware Identification:
• Model: Samsung Galaxy M34 5G (Exynos 1280 Octa-Core)
• Primary Slot 1 IMEI: 867492061234564 (Luhn Checksum: PASS)
• Secondary Slot 2 IMEI: 867492061234572 (Luhn Checksum: PASS)
• Client TLS JA4 Signature: t13d1516h2_8daaf6 (Dual-Anchor Validated)
• Last Triangulated Azimuth: DL-TWR-891 Sector 4 Rohini, Delhi (28.5355°N, 77.3910°E)

Directives:
1. Execute search and seizure of physical handset chassis TAC 86749206 under Section 106 BNSS.
2. Maintain strict air-gapped chain of custody into Faraday RF shielding pouch as mandated by ISO/IEC 27037 standards.
3. Secure immediate Section 63(4) BSA Hash verification upon seizure.

Issued under seal of Investigating Officer, Noida Cyber Crime PS.`;
}


