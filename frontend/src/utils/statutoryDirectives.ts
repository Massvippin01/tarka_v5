/**
 * TARKA v5.5 Statutory Directives & Court Requisitions Generator
 * Implements legal text templates under BNSS 2023, BSA 2023, and DoT Mandates.
 */

import { CANONICAL_CASES } from "../fixtures/cases";
import { formatInr } from "./formatters";

function resolveCaseContext(caseId?: string) {
  const c = (caseId && CANONICAL_CASES[caseId]) ? CANONICAL_CASES[caseId] : CANONICAL_CASES["CASE-2026-001"];
  const firNumber = c ? c.firNumber : "FIR #149/2026";
  const complainant = c ? c.complainant.name : "Sunil Kumar";
  const station = c ? c.policeStation : "Noida Cyber Crime PS, UP";
  const bookedLoss = c ? formatInr(c.financials.bookedLossInr) : "₹5,00,000.00";
  const claimedLoss = c ? formatInr(c.financials.claimedLossInr) : "₹15,000.00";
  const recoverable = c ? formatInr(c.financials.recoverableLibrInr || 380000) : "₹3,80,000.00";
  const merchantLien = c?.financials?.shieldedCommercialInr ? formatInr(c.financials.shieldedCommercialInr) : "₹1,80,000.00";
  const victimAcc = c ? c.complainant.accountNumber : "30910029101";
  const l1 = c?.accounts.find(a => a.holderType === "LAYER_1_MULE") || c?.accounts[1];
  const l1Name = l1 ? l1.holderName : "Vikram Shah";
  const l1Acc = l1 ? l1.accountNumber : "41088291083";
  const l2 = c?.accounts.find(a => a.holderType === "LAYER_2_CONDUIT") || c?.accounts[2];
  const l2Name = l2 ? l2.holderName : "Rohit Verma";
  const l2Acc = l2 ? l2.accountNumber : "5010029419920";
  const merchant = c?.accounts.find(a => a.holderType === "BONA_FIDE_MERCHANT") || c?.accounts[4];
  const merchantName = merchant ? merchant.holderName : "Apex Electronics Pvt Ltd";
  const merchantAcc = (!caseId || caseId === "CASE-2026-001") ? "001405008129" : (merchant?.accountNumber || "001405008129");
  const merchantGstin = merchant?.gstin || "07AAACA1234F1Z8";

  return {
    c,
    firNumber,
    complainant,
    station,
    bookedLoss,
    claimedLoss,
    recoverable,
    merchantLien,
    victimAcc,
    l1Name,
    l1Acc,
    l2Name,
    l2Acc,
    merchantName,
    merchantAcc,
    merchantGstin,
  };
}

export function getBnss94CbsDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  return `STATUTORY REQUISITION UNDER SECTION 94 BNSS, 2023 / SEC 91 CrPC
From: Investigating Officer (${ctx.station})
To: Nodal Officer, State Bank of India (Core Banking Operations)
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})
Date/Time: 2026-09-22 10:30:00 IST

SUBJECT: MANDATORY CBS INVARIANT & LOG PRODUCTION FOR DISPUTED UTR #626510149921

1. Reference is made to transaction sequence #14 dated 22-09-2026 10:00:14 IST:
   - Disputed Beneficiary: ${ctx.l1Name} (Account #${ctx.l1Acc})
   - Disputed CBS Debit: ${ctx.bookedLoss} (Total fraud outflow)
   - Claimant Purported Receipt Amount: ${ctx.claimedLoss} (Tier-3 Canva-generated artifact)
   - Document Forensics: Dual %%EOF trailers detected; incremental xref appended at byte offset 0x00014209..0x00015080.

2. In exercise of powers conferred under Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, you are hereby directed to produce the following within TWENTY-FOUR (24) HOURS:
   (a) Certified Finacle 10.x database commit transaction log & HSM cryptographic signature for UTR #626510149921.
   (b) Statutory Certificate under Section 63(4) of Bharatiya Sakshya Adhiniyam, 2023 (Part-A Custodian Certification).
   (c) IP ingress logs and MAC/IMEI binding for UPI Switch request received at 10:00:14 IST.
   (d) Immediate debit freeze / administrative lien under Section 106 BNSS on beneficiary account #${ctx.l1Acc}.

Failure to comply with this statutory directive shall invite penal consequences under Section 223 of Bharatiya Nyaya Sanhita (BNS), 2023.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss94EntityResolutionDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  return `STATUTORY REQUISITION UNDER SECTION 94 BNSS, 2023 / SEC 91 CrPC
From: Investigating Officer (${ctx.station})
To: Nodal Officers — State Bank of India, HDFC Bank, Axis Bank, ICICI Bank & Telecom Carriers
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})
Date/Time: 2026-09-22 11:30:00 IST

SUBJECT: MANDATORY CROSS-BANK ENTITY RESOLUTION, KYC & CDR CORRELATION FOR RESOLVED TARGETS

1. Based on multi-source forensic ingestion (NPCI Switch Logs, CBS Finacle Narration, and IPDRs), TARKA has resolved raw identifiers into canonical entities:
   - ENT-01 (Victim Origin): ${ctx.complainant} (A/c #${ctx.victimAcc})
   - ENT-02 (Layer-1 Conduit): ${ctx.l1Name} (A/c #${ctx.l1Acc})
   - ENT-03 & ENT-04 (Syndicate Layer-2): ${ctx.l2Name} (A/c #${ctx.l2Acc})
   - ENT-05 (Bona-Fide Commercial Merchant): ${ctx.merchantName} (GSTIN ${ctx.merchantGstin}, A/c #${ctx.merchantAcc})
     * HARD VETO APPLIED: Zero shared hardware tokens; active commercial POS history.

2. In exercise of powers under Section 94 BNSS, you are hereby directed to produce within 24 HOURS:
   (a) Certified Account Opening Forms (AOF), biometric e-KYC records, and registered MSISDN for ENT-02, ENT-03, and ENT-04.
   (b) Device binding MAC/IMEI and IP ingress session history for mobile banking logins.
   (c) Confirmation of Section 106(1) Specific Debit Lien on ${ctx.merchantLien} for ENT-05 while keeping remaining commercial operational capital active.

Failure to comply invites penal proceedings under Section 223 BNS, 2023.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getDot3920PortBlockDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  return `STATUTORY REQUISITION UNDER DOT CLAUSE 39.20 & SEC 94 BNSS
From: Investigating Officer (${ctx.station})
To: Nodal Officer / Law Enforcement Liaison, Telecom Service Provider
Case Ref: ${ctx.firNumber} · ${ctx.station}
Date/Time: 2026-09-22 11:00:00 IST

SUBJECT: MANDATORY CARRIER-GRADE NAT (CGNAT) PORT TRANSLATION & RADIUS IPDR PRODUCTION

1. Reference is made to independent bank login sessions associated with beneficiary ${ctx.l1Name}:
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

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getDotSimSwapDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  return `STATUTORY MANDATE UNDER DOT SIM-SWAP SECURITY DIRECTIVE & SEC 94 BNSS
From: Investigating Officer (${ctx.station})
To: Nodal Officers — Telecom Service Providers
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})
Date/Time: 2026-09-22 11:45:00 IST

SUBJECT: INVESTIGATION OF PRECURSOR SIM-SWAP FRAUD & PHYSICAL IMSI RE-ALLOCATION

1. Forensic evidence indicates that MSISDN underwent an unauthorized physical SIM swap 16 minutes prior to ${ctx.bookedLoss} siphoning:
   - Handset Hardware: Dual-SIM Chassis (TAC 86749206)
   - Slot 1 IMEI: 867492061234564 | Slot 2 IMEI: 867492061234572

2. Under Section 94 BNSS and DoT Security Directives, produce immediately:
   (a) Store POS transaction ID, biometric Aadhaar thumbprint scan, and agent identity authorizing the SIM swap.
   (b) SMS Gateway dispatch logs for OTPs routed during the incident window.
   (c) Immediate block / IMEI blacklisting across CEIR portal for chassis TAC 86749206.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss94ImeiSeizureDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  return `SEARCH & SEIZURE WARRANT REQUISITION UNDER SEC 94/106 BNSS, 2023
From: Investigating Officer (${ctx.station})
To: In-Charge Officer, Special Task Force (STF) / Tactical Recovery Unit
Case Ref: ${ctx.firNumber} · ${ctx.station}
Date/Time: 2026-09-22 12:00:00 IST

SUBJECT: WARRANT FOR PHYSICAL RECOVERY & FORENSIC SEIZURE OF CHASSIS TAC 86749206

Target Device Hardware Identification:
• Primary Slot 1 IMEI: 867492061234564 (Luhn Checksum: PASS)
• Secondary Slot 2 IMEI: 867492061234572 (Luhn Checksum: PASS)
• Client TLS JA4 Signature: t13d1516h2_8daaf6 (Dual-Anchor Validated)
• Last Triangulated Azimuth: DL-TWR-891 Sector 4 Rohini, Delhi (28.5355°N, 77.3910°E)

Directives:
1. Execute search and seizure of physical handset chassis TAC 86749206 under Section 106 BNSS.
2. Maintain strict air-gapped chain of custody into Faraday RF shielding pouch as mandated by ISO/IEC 27037 standards.
3. Secure immediate Section 63(4) BSA Hash verification upon seizure.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss106PoliceSpecificLienNotice(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  return `POLICE SPECIFIC DEBIT LIEN NOTICE UNDER SECTION 106 BNSS, 2023 & I4C CFCFRMS
From: Investigating Officer, ${ctx.station}
To: Nodal Officer, ICICI Bank Ltd., Bandra-Kurla Complex, Mumbai
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})
Date/Time: 2026-09-22 10:45:00 IST

SUBJECT: SPECIFIC LIEN ON ${ctx.merchantLien} IN A/C ${ctx.merchantAcc} (${ctx.merchantName.toUpperCase()}) WITH FORTHWITH REPORT TO MAGISTRATE UNDER §106(3) BNSS

1. Reference is made to inward Layer-2 credit of ${ctx.merchantLien} received at 10:14:32 IST from conduit ${ctx.l2Name} (${ctx.l2Acc}) traceable to extorted funds of ${ctx.complainant}.
2. In exercise of powers under Section 106(1) of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023:
   (a) You are directed to mark an IMMEDIATE SPECIFIC DEBIT LIEN of EXACTLY ${ctx.merchantLien} on Account No. ${ctx.merchantAcc} (${ctx.merchantName}, GSTIN: ${ctx.merchantGstin}).
   (b) DO NOT FREEZE THE ENTIRE ACCOUNT. The balance of clean commercial operating capital is protected under the doctrine of Roscoe v. Winder [1915] 1 Ch 62 and shall remain operational for legitimate commercial transactions.
3. STATUTORY COMPLIANCE DECLARATION: As mandated by Section 106(3) BNSS, a forthwith report of this operational lien has been transmitted to the Chief Judicial Magistrate.

Issued under the official seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss107JudicialAttachmentApplication(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  return `IN THE COURT OF CHIEF JUDICIAL MAGISTRATE / SPECIAL JUDGE, GAUTAM BUDDHA NAGAR
APPLICATION UNDER SECTION 107 BNSS, 2023 FOR PROVISIONAL ATTACHMENT & RESTITUTION
Case Ref: ${ctx.firNumber} · ${ctx.station}
In Re: State (NCPCR / 1930 Samanvaya) v. ${ctx.l1Name} & Others

APPLICATION FOR ATTACHMENT OF PROCEEDS OF CRIME (§107(1)) & RESTORATION TO VICTIM (§107(6)–(7))

Most Respectfully Showeth:
1. That during investigation into extortion of ${ctx.bookedLoss} from Complainant ${ctx.complainant}, TARKA forensic engine has identified ${ctx.recoverable} as proceeds of crime currently held in:
   (a) Conduit Account (${ctx.l2Name}) — Tainted Mule Balance
   (b) Account No. ${ctx.merchantAcc} (${ctx.merchantName}) — Specific Lien Hold
2. COUNTERSIGNATURE OF SUPERINTENDENT OF POLICE (§107(1)):
   This application is submitted with the prior written concurrence and countersignature of the Deputy Commissioner of Police (Crime / Cyber), Noida.
3. PRAYERS:
   (a) Issue a 14-day Show Cause Notice under Section 107(2) BNSS to account holders as to why the said funds should not be attached.
   (b) Pass an Order of Attachment under Section 107(4) BNSS over ${ctx.recoverable}.
   (c) Direct restoration and restitution of the attached ${ctx.recoverable} to Complainant ${ctx.complainant} under Section 107(6) and 107(7) BNSS.

APPLICANT: Investigating Officer, ${ctx.station}
COUNTERSIGNED: Deputy Commissioner of Police (Cyber), Gautam Buddha Nagar`;
}
