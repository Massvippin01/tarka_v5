/**
 * TARKA Statutory Directives & Court Requisitions Generator.
 * Every figure, name, account, device and timestamp is derived from the case bundle
 * through the shared selectors; nothing here is specific to one case.
 */

import {
  resolveCase,
  selectAccountGroups,
  selectDeviceFacts,
  selectFinancialSummary,
  selectFreezeActions,
  selectLedgerFacts,
} from "../selectors/caseSelectors";
import { formatInr } from "../lib/formatInr";

const NA = "not available in this case bundle";

function resolveCaseContext(caseId?: string) {
  // Callers always pass the active case id; omitting it selects the first canonical case (legacy tests only).
  const c = resolveCase(caseId ?? "CASE-2026-001");
  if (!c) {
    return { c: null, firNumber: caseId ?? "—", complainant: "—", station: "—", ready: false as const };
  }
  const fin = selectFinancialSummary(c);
  const groups = selectAccountGroups(c);
  const devices = selectDeviceFacts(c);
  const ledger = selectLedgerFacts(c);
  const freezes = selectFreezeActions(c);
  const l1 = groups.mules[0] ?? groups.conduits[0] ?? null;
  const merchant = groups.merchants[0] ?? null;
  const firstTx = c.transactions.find((t) => t.category === "VICTIM_DRAIN");
  const dt = firstTx ? firstTx.timestampIst : "—";
  const date = dt.slice(0, 10);
  return {
    c,
    ready: true as const,
    firNumber: c.firNumber,
    complainant: c.complainant.name,
    station: c.policeStation,
    bookedLoss: formatInr(fin.bookedLossInr),
    claimedLoss: formatInr(fin.claimedLossInr),
    claimMatches: fin.claimMatchesLedger,
    recoverable: formatInr(fin.recoverableInr),
    merchantLien: formatInr(fin.shieldedCommercialInr),
    victimAcc: c.complainant.accountNumber,
    l1Name: l1?.holderName ?? NA,
    l1Acc: l1?.accountNumber ?? NA,
    conduits: groups.conduits,
    merchant,
    merchantName: merchant?.holderName ?? null,
    merchantAcc: merchant?.accountNumber ?? NA,
    merchantGstin: merchant?.gstin ?? NA,
    ledger,
    device: devices.devices[0] ?? null,
    devices,
    freezes,
    drainIst: dt,
    drainDate: date,
    typologyBank: c.complainant.bank,
  };
}

export function getBnss94CbsDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  if (!ctx.ready) return `No case bundle is loaded for ${ctx.firNumber}.`;
  const l = ctx.ledger;
  return `STATUTORY REQUISITION UNDER SECTION 94 BNSS, 2023 / SEC 91 CrPC
From: Investigating Officer (${ctx.station})
To: Nodal Officer, ${ctx.typologyBank} (Core Banking Operations)
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})

SUBJECT: MANDATORY CBS INVARIANT & LOG PRODUCTION FOR DISPUTED TRANSACTION ${l.firstDrainRrn ?? NA}

1. Reference is made to the first disputed debit dated ${ctx.drainIst}:
   - Disputed Beneficiary: ${ctx.l1Name} (Account #${ctx.l1Acc})
   - Disputed CBS Debit: ${ctx.bookedLoss} (total fraud outflow in ${l.drainTxCount} transfer${l.drainTxCount === 1 ? "" : "s"})
   - Complainant's stated loss: ${ctx.claimedLoss}${ctx.claimMatches ? " (matches the ledger)" : " (does not match the ledger; see receipt discrepancy)"}
   - Receipt note: ${l.receiptNote}

2. In exercise of powers conferred under Section 94 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, you are hereby directed to produce within TWENTY-FOUR (24) HOURS:
   (a) Certified core-banking transaction commit log and signature for RRN ${l.firstDrainRrn ?? NA}.
   (b) Statutory Certificate under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 (Part-A custodian certification).
   (c) IP ingress logs and device binding for the request received at ${ctx.drainIst}.
   (d) Immediate debit freeze / administrative lien under Section 106 BNSS on beneficiary account #${ctx.l1Acc}.

Failure to comply with this statutory directive shall invite penal consequences under Section 223 of the Bharatiya Nyaya Sanhita (BNS), 2023.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss94EntityResolutionDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  if (!ctx.ready || !ctx.c) return `No case bundle is loaded for ${ctx.firNumber}.`;
  const banks = [...new Set(ctx.c.accounts.map((a) => a.bank))].join(", ");
  const lines = ctx.c.accounts
    .map((a, i) => `   - ENT-${String(i + 1).padStart(2, "0")} (${a.holderType.replace(/_/g, " ").toLowerCase()}): ${a.holderName} (A/c #${a.accountNumber}, ${a.bank})${a.gstin ? ` GSTIN ${a.gstin}` : ""}`)
    .join("\n");
  const hasMerchant = !!ctx.merchantName;
  return `STATUTORY REQUISITION UNDER SECTION 94 BNSS, 2023 / SEC 91 CrPC
From: Investigating Officer (${ctx.station})
To: Nodal Officers, ${banks} & telecom carriers
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})

SUBJECT: MANDATORY CROSS-BANK ENTITY RESOLUTION, KYC & CDR CORRELATION FOR RESOLVED TARGETS

1. From the ingested exhibits (switch logs, bank statements, IPDRs), TARKA has resolved these canonical entities:
${lines}
${hasMerchant ? "   Commercial merchant accounts carry a HARD VETO: only the traced receipt is liened.\n" : ""}
2. In exercise of powers under Section 94 BNSS, you are hereby directed to produce within 24 HOURS:
   (a) Certified account opening forms, e-KYC records and registered mobile numbers for the mule and conduit accounts listed above.
   (b) Device binding (IMEI) and IP ingress session history for mobile banking logins.
${hasMerchant ? `   (c) Confirmation of the Section 106(1) specific debit lien on ${ctx.merchantLien} for ${ctx.merchantName}, keeping the remaining commercial capital active.\n` : ""}
Failure to comply invites penal proceedings under Section 223 BNS, 2023.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getDot3920PortBlockDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  if (!ctx.ready) return `No case bundle is loaded for ${ctx.firNumber}.`;
  const ip = ctx.devices.publicIps[0];
  const sessions = ctx.devices.sessions;
  const first = sessions[0]?.timestampIst ?? NA;
  const last = sessions[sessions.length - 1]?.timestampIst ?? NA;
  if (!ip) {
    return `No telecom session evidence (public IP / source port) is present in ${ctx.firNumber} yet.\nUpload carrier IPDR/CGNAT logs before issuing a DoT Clause 39.20 requisition.`;
  }
  return `STATUTORY REQUISITION UNDER DOT CLAUSE 39.20 & SEC 94 BNSS
From: Investigating Officer (${ctx.station})
To: Nodal Officer / Law Enforcement Liaison, Telecom Service Provider
Case Ref: ${ctx.firNumber} · ${ctx.station}

SUBJECT: MANDATORY CARRIER-GRADE NAT (CGNAT) PORT TRANSLATION & RADIUS IPDR PRODUCTION

1. Reference is made to bank login sessions associated with beneficiary ${ctx.l1Name}:
   - Public NAT IPv4 address: ${ip.ip}
   - Source ports observed: ${ip.ports.length ? ip.ports.join(", ") : NA} (${ip.sessionCount} session${ip.sessionCount === 1 ? "" : "s"})
   - Session timestamps: ${first} to ${last}

2. Pursuant to DoT licence clause 39.20 and Section 94 BNSS, you are directed to produce:
   (a) The dynamic NAT binding table (IPDR) resolving ${ip.ip} and the source ports above to the internal subscriber IP.
   (b) RADIUS accounting logs with MSISDN, IMSI and device IMEI.
   (c) Packet-gateway TTL verification confirming whether the connection was direct or tethered.
   (d) A Section 63(4) BSA certificate for the carrier records.

Failure to furnish these logs obstructs the statutory investigation under Section 106 BNSS.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getDotSimSwapDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  if (!ctx.ready) return `No case bundle is loaded for ${ctx.firNumber}.`;
  const sim = ctx.devices.simEvents;
  const evidence = sim.length
    ? sim.map((e) => `   - ${e.timestampIst}: ${e.title}`).join("\n")
    : "   - No SIM or telecom events are recorded in this case bundle yet.";
  return `STATUTORY MANDATE UNDER DOT SIM-SWAP SECURITY DIRECTIVE & SEC 94 BNSS
From: Investigating Officer (${ctx.station})
To: Nodal Officers, Telecom Service Providers
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})

SUBJECT: INVESTIGATION OF PRECURSOR SIM-SWAP FRAUD & IMSI RE-ALLOCATION

1. Telecom events recorded before the ${ctx.bookedLoss} loss:
${evidence}
   Handset on record: ${ctx.device ? `IMEI ${ctx.device.imei} (TAC ${ctx.device.tac})` : NA}

2. Under Section 94 BNSS and DoT security directives, produce immediately:
   (a) POS transaction ID, biometric record and agent identity authorising any SIM swap on ${ctx.c?.complainant.phone ?? "the complainant mobile"}.
   (b) SMS gateway dispatch logs for OTPs routed in the incident window.
   (c) IMEI blocking across the CEIR portal for ${ctx.device ? ctx.device.imei : "the handset once identified"}.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss94ImeiSeizureDirective(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  if (!ctx.ready) return `No case bundle is loaded for ${ctx.firNumber}.`;
  if (!ctx.devices.hasDeviceEvidence) {
    return `No device evidence (IMEI, TLS fingerprint, BSSID) is present in ${ctx.firNumber} yet.\nUpload telecom or switch logs before requesting a seizure warrant.`;
  }
  const devs = ctx.devices.devices
    .map((d) => `• IMEI ${d.imei} (Luhn ${d.luhnValid ? "PASS" : "FAIL"}) used by ${d.accountNames.join(", ")}`)
    .join("\n");
  return `SEARCH & SEIZURE WARRANT REQUISITION UNDER SEC 94/106 BNSS, 2023
From: Investigating Officer (${ctx.station})
To: In-Charge Officer, Special Task Force / Tactical Recovery Unit
Case Ref: ${ctx.firNumber} · ${ctx.station}

SUBJECT: WARRANT FOR PHYSICAL RECOVERY & FORENSIC SEIZURE OF HANDSET(S)

Target device identification:
${devs}
${ctx.devices.ja4s.length ? `• Client TLS JA4: ${ctx.devices.ja4s.join(", ")}\n` : ""}${ctx.devices.bssids.length ? `• Wi-Fi BSSID: ${ctx.devices.bssids.join(", ")}\n` : ""}
Directives:
1. Execute search and seizure of the handset(s) above under Section 106 BNSS.
2. Maintain chain of custody in a Faraday pouch as per ISO/IEC 27037.
3. Secure the Section 63(4) BSA hash verification immediately on seizure.

Issued under seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss106PoliceSpecificLienNotice(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  if (!ctx.ready) return `No case bundle is loaded for ${ctx.firNumber}.`;
  if (!ctx.merchant) {
    return `No merchant account is involved in ${caseId ?? "this case"}, so no specific-lien notice is required. Use the §107 attachment for mule balances.`;
  }
  const m = ctx.merchant;
  const credit = ctx.c!.transactions.find((t) => t.category === "COMMERCIAL_ESCROW");
  return `POLICE SPECIFIC DEBIT LIEN NOTICE UNDER SECTION 106 BNSS, 2023 & I4C CFCFRMS
From: Investigating Officer, ${ctx.station}
To: Nodal Officer, ${m.bank}
Case Ref: ${ctx.firNumber} · ${ctx.station} (Complainant: ${ctx.complainant})

SUBJECT: SPECIFIC LIEN ON ${ctx.merchantLien} IN A/C ${m.accountNumber} (${m.holderName.toUpperCase()}) WITH FORTHWITH REPORT TO MAGISTRATE UNDER §106(3) BNSS

1. Reference is made to the inward credit of ${ctx.merchantLien} received${credit ? ` at ${credit.timestampIst} from ${credit.fromName}` : ""} traceable to funds taken from ${ctx.complainant}.
2. In exercise of powers under Section 106(1) BNSS, 2023:
   (a) Mark an IMMEDIATE SPECIFIC DEBIT LIEN of EXACTLY ${ctx.merchantLien} on Account No. ${m.accountNumber} (${m.holderName}${m.gstin ? `, GSTIN ${m.gstin}` : ""}).
   (b) DO NOT FREEZE THE ENTIRE ACCOUNT. Clean commercial operating capital is protected under Roscoe v. Winder [1915] 1 Ch 62.
3. As mandated by Section 106(3) BNSS, a forthwith report of this lien is transmitted to the Chief Judicial Magistrate.

Issued under the official seal of Investigating Officer, ${ctx.station}.`;
}

export function getBnss107JudicialAttachmentApplication(caseId?: string): string {
  const ctx = resolveCaseContext(caseId);
  if (!ctx.ready || !ctx.c) return `No case bundle is loaded for ${ctx.firNumber}.`;
  const holds = ctx.freezes
    .filter((f) => f.kind !== "CASHOUT_REQUISITION" && f.amountInr > 0)
    .map((f, i) => `   (${String.fromCharCode(97 + i)}) ${f.holderName}, ${f.bank} ${f.accountMasked}: ${formatInr(f.amountInr)} (${f.kind === "MERCHANT_LIEN" ? "specific lien" : "tainted mule balance"})`)
    .join("\n");
  return `IN THE COURT OF CHIEF JUDICIAL MAGISTRATE / SPECIAL JUDGE (JURISDICTION OF ${ctx.station.toUpperCase()})
APPLICATION UNDER SECTION 107 BNSS, 2023 FOR PROVISIONAL ATTACHMENT & RESTITUTION
Case Ref: ${ctx.firNumber} · ${ctx.station}
In Re: State v. ${ctx.l1Name} & Others

APPLICATION FOR ATTACHMENT OF PROCEEDS OF CRIME (§107(1)) & RESTORATION TO VICTIM (§107(6)-(7))

Most Respectfully Showeth:
1. That during investigation into the loss of ${ctx.bookedLoss} from Complainant ${ctx.complainant}, TARKA has identified ${ctx.recoverable} as proceeds of crime currently held in:
${holds || "   (no attachable balance identified yet)"}
2. This application is submitted with the prior written concurrence of the Superintendent of Police / Deputy Commissioner (Cyber) as required by §107(1).
3. PRAYERS:
   (a) Issue a 14-day Show Cause Notice under Section 107(2) BNSS to the account holders.
   (b) Pass an Order of Attachment under Section 107(4) BNSS over ${ctx.recoverable}.
   (c) Direct restoration of the attached amount to Complainant ${ctx.complainant} under Section 107(6) and 107(7) BNSS.

APPLICANT: Investigating Officer, ${ctx.station}`;
}
