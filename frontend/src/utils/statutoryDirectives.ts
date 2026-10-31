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
