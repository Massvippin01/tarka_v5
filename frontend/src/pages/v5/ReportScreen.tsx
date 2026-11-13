import React, { useState, useMemo, useEffect } from "react";
import {
  Printer,
  Download,
  ArrowLeft,
  FileText,
  Copy,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { CaseSyncBridge } from "../../services/caseSyncBridge";
import { getCanonicalCase, buildCaseBundleFromFixture } from "../../fixtures/cases";
import { formatInr } from "../../utils/formatters";
import { sha256HexSync } from "../../utils/sha256";
import type { ReconstructedInvestigation } from "../../utils/investigationReconstructor";

export const ReportScreen: React.FC = () => {
  const { activeCaseId, setActiveRoute } = useTarkaGlobal();
  const caseId = activeCaseId || "CASE-2026-001";

  // Load canonical case and investigation bundle
  const fixture = useMemo(() => getCanonicalCase(caseId), [caseId]);
  const [investigation, setInvestigation] = useState<ReconstructedInvestigation>(() =>
    buildCaseBundleFromFixture(fixture)
  );

  useEffect(() => {
    let ignore = false;
    const bridge = CaseSyncBridge.getInstance();
    bridge.getCaseBundle(caseId).then((bundle) => {
      if (!ignore && bundle) {
        setInvestigation(bundle);
      }
    });
    return () => {
      ignore = true;
    };
  }, [caseId]);

  // Financial metrics (Computed directly from fixture & investigation)
  const bookedLoss = fixture.financials.bookedLossInr;
  const claimedLoss = fixture.financials.claimedLossInr;
  const recoverableLien = fixture.financials.recoverableLibrInr;
  const shieldedCommercial = fixture.financials.shieldedCommercialInr;
  const unrecoverableCashout = fixture.financials.unrecoverableCashoutInr;
  const goldenHourMins = fixture.financials.goldenHourRemainingMins;

  // Active Notice Tab State
  const [activeNoticeTab, setActiveNoticeTab] = useState<"freeze" | "telecom" | "npci" | "i4c">("freeze");
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // Auto-drafted notices state (editable by investigator)
  const [notices, setNotices] = useState({
    freeze: `OFFICE OF THE ASSISTANT COMMISSIONER OF POLICE
CYBER CRIME POLICE STATION, NOIDA, DISTRICT GAUTAM BUDDH NAGAR (U.P.)
Ref: POLICE/CYBER/2026/SEC106/FIR-${fixture.firNumber.replace(/[^0-9]/g, "") || "149"}
Dated: 22nd September, 2026

To:
1. The Nodal Officer / Law Enforcement Liaison, Axis Bank Ltd.
2. The Nodal Officer / Law Enforcement Liaison, ICICI Bank Ltd.
3. The Nodal Officer / Law Enforcement Liaison, State Bank of India.

SUBJECT: PROVISIONAL ORDER FOR FREEZING OF BANK ACCOUNTS & LIEN CREATION UNDER SECTIONS 106 & 107 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 (BNSS) READ WITH RULE 9(1) OF INFORMATION TECHNOLOGY ACT.

WHEREAS, an investigation has been initiated in FIR No. ${fixture.firNumber} under Section 66D Information Technology Act, 2000 and Section 318(4) Bharatiya Nyaya Sanhita, 2023 on the complaint of Sh. ${fixture.complainant.name}.

AND WHEREAS, credible forensic evidence derived from Finacle Core Banking System (CBS) transaction logs confirms that an aggregate sum of ₹${bookedLoss.toLocaleString("en-IN")} was fraudulently debited and layered into the following suspect mule accounts under your institution:

1. BENEFICIARY 1 (PRIMARY LAYER-1 MULE):
   - Account Holder: Vikram Shah
   - Bank: Axis Bank | IFSC: UTIB0000123
   - Account Number: 924010048821904 (Masked: ...1904)
   - Inward Fraud Credit: ₹5,00,000.00 (RRN 626509188410 / 626509188411)
   - Mandated Action: Freeze available balance & mark debit lien of ₹2,00,000.00 under Clayton's Case / LIBR doctrine.

2. BENEFICIARY 2 (LAYER-2 CONDUIT):
   - Account Holder: Rohit Sharma
   - Bank: ICICI Bank | IFSC: ICIC0001048
   - Account Number: 104801599201944 (Masked: ...944)
   - Inward Credit: ₹2,00,000.00 | Mandated Action: Total debit freeze on account.

3. BENEFICIARY 3 (LAYER-2 CONDUIT):
   - Account Holder: Sameer Khan
   - Bank: State Bank of India | IFSC: SBIN0001928
   - Account Number: 309811249018241 (Masked: ...8241)
   - Inward Credit: ₹1,20,000.00 | Mandated Action: Total debit freeze on account.

YOU ARE HEREBY DIRECTED TO:
1. Immediately effect a debit freeze / debit lien on the above accounts within 2 (two) hours of receipt of this notice.
2. Furnish KYC dossier (Form 60/PAN, Aadhar card, account opening mandate, mobile number, registered email).
3. Provide complete IP audit logs, device binding identifiers, and MAC addresses for internet banking sessions.
4. Report compliance by email to cybercell.noida@uppolice.gov.in.

Take notice that failure to comply with this statutory requisition will attract penal proceedings under Section 223 of the Bharatiya Nyaya Sanhita, 2023.

Given under my hand and seal of the Police Station,

(Insp. R. K. Sharma)
Investigating Officer, Cyber Crime PS Noida
Badge: IO-409 | UP Police`,

    telecom: `OFFICE OF THE INVESTIGATING OFFICER, CYBER CRIME PS NOIDA
NOTICE UNDER SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023
Ref: NOIDA/CYBER/SEC94/AIRTEL/2026/049
Dated: 22nd September, 2026

To:
The Nodal Officer (Legal & Regulatory Affairs),
Bharti Airtel Limited / Bharti Hexacom Ltd.

SUBJECT: STATUTORY PRODUCTION OF ELECTRONIC EVIDENCE (CAF, CDR, SDR & TOWER AZIMUTH RECORDS) UNDER SECTION 94 BNSS 2023 & SECTION 63(4) BHARATIYA SAKSHYA ADHINIYAM 2023.

In connection with the investigation of FIR No. ${fixture.firNumber}, you are hereby required to produce certified copies of the following electronic records in your lawful custody:

1. Target MSISDN: +91 98711 23941 (Associated with Controller Hero & accomplice hotspot).
2. Certified Customer Acquisition Form (CAF) along with scanned subscriber photo and proof of identity/address.
3. Call Detail Records (CDR) and IP Data Records (IPDR) for the period 2026-09-20 00:00:00 to 2026-09-22 23:59:59 IST.
4. Cell Tower Site Location & Sector Azimuth log for Cell ID DL-TWR-891 (Rohini Sector-4 PGW gateway ingress).
5. Certificate under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 signed by lawful custodian.

Furnish the requisitioned data within 24 hours of receipt.

(Insp. R. K. Sharma)
Investigating Officer | IO-409, Cyber Crime PS Noida`,

    npci: `OFFICE OF THE INVESTIGATING OFFICER, CYBER CRIME PS NOIDA
REQUISITION UNDER SECTION 63(4) BHARATIYA SAKSHYA ADHINIYAM, 2023
Ref: NOIDA/CYBER/NPCI/UPI/2026/118
Dated: 22nd September, 2026

To:
The Head of Operations & Switch Security,
National Payments Corporation of India (NPCI),
Bandra-Kurla Complex, Mumbai.

SUBJECT: DEMAND FOR CERTIFIED RAW UPI 2.0 SWITCH XML LOGS & TLS FINGERPRINTS.

Sir/Madam,
In ongoing investigation of FIR No. ${fixture.firNumber}, kindly furnish certified electronic records under Section 63(4) BSA 2023 for the following UPI switch transactions:

- Transaction RRN: 626509188410 (₹2,85,000.00 at 09:14:22 IST)
- Transaction RRN: 626509188411 (₹2,15,000.00 at 09:18:05 IST)
- Source VPA: quicktransfer.nodal@axisbank
- Payer: Sunil Kumar | Payee: Vikram Shah

Required Records:
1. Verbatim raw switch XML stanzas including <Device> and <Payer> XML payloads.
2. Source client IP address, NAT egress port, and JA4 TLS fingerprint (recorded as t13d1516h2_8daaf6).
3. Statutory Certificate signed by NPCI designated System Custodian.

(Insp. R. K. Sharma)
Investigating Officer, Cyber Crime PS Noida`,

    i4c: `MEMORANDUM FOR INTER-STATE SYNDICATE ESCALATION
INDIAN CYBER CRIME COORDINATION CENTRE (I4C), MINISTRY OF HOME AFFAIRS
Ref: I4C/ESCALATION/NCR-SYNDICATE/2026/088
Date: 22nd September, 2026

From: Cyber Crime Police Station, Gautam Buddh Nagar (UP Police)
To: Joint Director, National Cybercrime Threat Analytics Unit (NCTAU), I4C, MHA, New Delhi.

SUBJECT: COORDINATED FRAUD NETWORK & CROSS-FIR MULE SYNDICATE ATTRIBUTION.

1. EXECUTIVE SYNOPSIS:
Investigation of FIR ${fixture.firNumber} has uncovered an active multi-state mule syndicate operating across Delhi-NCR, Mewat (Haryana), and Rajasthan.

2. FORENSIC CORRELATION:
- Controller Cluster: Poco X5 tethered hotspot (MAC: 74:DA:38:A2:11:BC, TTL=63)
- TLS Signature: JA4 fingerprint 't13d1516h2_8daaf6' matching 4 discrete mule logins within 14 minutes.
- Cross-Case Link: Mule Vikram Shah (Axis Bank) and Sameer Khan (SBI) have matching KYC/device hits in FIR #281/2026 (Jaipur Cyber Cell) and FIR #092/2026 (Gurugram).

3. REQUESTED I4C INTERVENTION:
- Issue Pan-India National Cybercrime Reporting Portal (NCRP) red-flag alert against device IMEI 867492061234564.
- Facilitate coordinated multi-jurisdiction physical raid at suspected Mewat call-center cluster.

(Insp. R. K. Sharma)
Investigating Officer, Cyber Crime PS Noida`,
  });

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const reportData = {
      caseId: fixture.caseId,
      firNumber: fixture.firNumber,
      policeStation: fixture.policeStation,
      complainant: fixture.complainant,
      financials: fixture.financials,
      investigationAudit: {
        postIngestionMerkleRoot: investigation.postIngestionMerkleRoot,
        totalLossInr: bookedLoss,
        recoverableLibrInr: recoverableLien,
        shieldedCommercialInr: shieldedCommercial,
      },
      suspectAccounts: fixture.accounts.filter((a) => a.holderType !== "VICTIM"),
      transactions: fixture.transactions,
      evidenceRegister: investigation.fileManifest || [],
      statutoryNotices: notices,
      generatedAt: new Date().toISOString(),
      statutoryCompliance: "Bharatiya Sakshya Adhiniyam 2023 §63(4)",
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TARKA_Forensic_Report_${caseId}_${fixture.firNumber.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadNotice = (key: keyof typeof notices, filename: string) => {
    const blob = new Blob([notices[key]], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNotice = (key: keyof typeof notices) => {
    navigator.clipboard.writeText(notices[key]);
    setCopiedNotice(key);
    setTimeout(() => setCopiedNotice(null), 2000);
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", color: "#0F172A", fontFamily: "var(--font-sans, system-ui)" }}>
      {/* =========================================================================
          PRINT STYLESHEET (ENFORCES CRISP LIGHT A4 WITHOUT UI CHROME)
          ========================================================================= */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 14mm 14mm;
        }
        @media print {
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .report-section {
            page-break-inside: avoid;
            margin-bottom: 24px !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* =========================================================================
          TOP COMMAND TOOLBAR (SCREEN ONLY)
          ========================================================================= */}
      <header
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          boxShadow: "0 1px 4px rgba(15, 23, 42, 0.05)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => setActiveRoute("network")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              color: "#334155",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Workspace</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "#4F46E5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
                  STATUTORY INVESTIGATION &amp; INTELLIGENCE DOSSIER
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    background: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    color: "#4338CA",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {caseId}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>
                Admissible Evidence Certificate under Section 63(4) Bharatiya Sakshya Adhiniyam, 2023
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={handleDownloadJson}
            data-testid="download-json-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#0F172A",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Download size={14} />
            <span>Download JSON</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            data-testid="download-pdf-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "6px",
              border: "none",
              background: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
            }}
          >
            <Printer size={15} />
            <span>Download PDF / Print A4</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          A4 REPORT DOCUMENT CONTAINER (LIGHT THEME, PROFESSIONAL TYPOGRAPHY)
          ========================================================================= */}
      <main
        className="print-page-container"
        style={{
          maxWidth: "840px",
          margin: "24px auto",
          background: "#FFFFFF",
          padding: "40px 48px",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
        }}
      >
        {/* =====================================================================
            DOCUMENT HEADER: STATE EMBLEM & STATUTORY TITLE
            ===================================================================== */}
        <div
          style={{
            borderBottom: "2px solid #0F172A",
            paddingBottom: "16px",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1px", color: "#475569" }}>
            GOVERNMENT OF NCT OF DELHI · POLICE DEPARTMENT
          </div>
          <div style={{ fontSize: "18px", fontWeight: 900, color: "#0F172A", margin: "4px 0" }}>
            SPECIAL CYBER CRIME INVESTIGATION &amp; FORENSIC REPORT
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#4F46E5" }}>
            CERTIFICATE OF ELECTRONIC EVIDENCE UNDER SECTION 63(4) BHARATIYA SAKSHYA ADHINIYAM, 2023
          </div>
          <div style={{ fontSize: "10.5px", color: "#64748B", marginTop: "4px" }}>
            Issued by Investigating Officer, Cyber Crime Police Station, Gautam Buddh Nagar
          </div>
        </div>

        {/* =====================================================================
            SECTION 1: EXECUTIVE SUMMARY & FINANCIAL AUDIT
            ===================================================================== */}
        <section className="report-section" style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #CBD5E1",
              paddingBottom: "6px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase", margin: 0 }}>
              1. Case Particulars &amp; Executive Summary
            </h2>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#047857",
                background: "#ECFDF5",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid #A7F3D0",
              }}
            >
              ✓ Authenticated By Bank CBS Ledger
            </span>
          </div>

          {/* Case Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "12px 16px",
              marginBottom: "16px",
              fontSize: "11px",
            }}
          >
            <div>
              <span style={{ color: "#64748B" }}>FIR Number:</span>
              <div style={{ fontWeight: 800, color: "#0F172A" }}>{fixture.firNumber}</div>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Police Station:</span>
              <div style={{ fontWeight: 800, color: "#0F172A" }}>{fixture.policeStation}</div>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Complainant:</span>
              <div style={{ fontWeight: 800, color: "#0F172A" }}>{fixture.complainant.name}</div>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Occurrence Date:</span>
              <div style={{ fontWeight: 800, color: "#0F172A" }}>22-Sep-2026 09:14:22 IST</div>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Fraud Typology:</span>
              <div style={{ fontWeight: 800, color: "#0F172A" }}>Digital Arrest &amp; SIM-Swap Layering</div>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>NCRP Reference:</span>
              <div style={{ fontWeight: 800, color: "#0F172A" }}>1930 Helpline Ref #922841</div>
            </div>
          </div>

          {/* 4 Computed Financial Conservation Tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div style={{ padding: "10px", borderRadius: "6px", background: "#FEF2F2", border: "1px solid #FECDD3" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#991B1B", textTransform: "uppercase" }}>
                Total Booked Loss
              </div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#B91C1C", marginTop: "2px" }}>
                {formatInr(bookedLoss)}
              </div>
              <div style={{ fontSize: "8.5px", color: "#7F1D1D" }}>Authentic Finacle CBS Ledger</div>
            </div>

            <div style={{ padding: "10px", borderRadius: "6px", background: "#F1F5F9", border: "1px solid #CBD5E1" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                Receipt Claim
              </div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#334155", marginTop: "2px" }}>
                {formatInr(claimedLoss)}
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748B" }}>Forged Canva PDF (Tampered)</div>
            </div>

            <div style={{ padding: "10px", borderRadius: "6px", background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>
                Recoverable LIBR Lien
              </div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#059669", marginTop: "2px" }}>
                {formatInr(recoverableLien)}
              </div>
              <div style={{ fontSize: "8.5px", color: "#065F46" }}>Sec. 106/107 BNSS Available</div>
            </div>

            <div style={{ padding: "10px", borderRadius: "6px", background: "#EEF2FF", border: "1px solid #C7D2FE" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#4338CA", textTransform: "uppercase" }}>
                Commercial Shield
              </div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#4F46E5", marginTop: "2px" }}>
                {formatInr(shieldedCommercial)}
              </div>
              <div style={{ fontSize: "8.5px", color: "#3730A3" }}>Bona-Fide Merchant Escrow</div>
            </div>
          </div>

          <p style={{ fontSize: "11px", lineHeight: 1.6, color: "#334155", margin: 0 }}>
            <b>Executive Finding:</b> Investigation establishes that on 22-Sep-2026, complainant Sunil Kumar suffered an unauthorized aggregate drain of <b>{formatInr(bookedLoss)}</b> from his State Bank of India salary account. Stolen capital was systematically layered through primary mule Vikram Shah (Axis Bank) within 112 seconds, subsequently fanned out into ICICI Bank (Rohit Sharma - L2 Conduit), State Bank of India (Sameer Khan - L2 Conduit), commercial escrow (QuickPay), and an unrecoverable cash withdrawal of <b>{formatInr(unrecoverableCashout)}</b> at Rohini Sector-4 ATM DL-049. Golden-hour window status remains active with <b>{goldenHourMins} minutes</b> remaining for statutory lien execution.
          </p>
        </section>

        {/* =====================================================================
            SECTION 2: MONEY-TRAIL SANKEY TOPOLOGY DIAGRAM (STATIC SVG)
            ===================================================================== */}
        <section className="report-section" style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #CBD5E1",
              paddingBottom: "6px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase", margin: 0 }}>
              2. Money-Trail Topological Flow Diagram
            </h2>
            <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
              Clayton's Case Lowest Intermediate Balance Rule (LIBR)
            </span>
          </div>

          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <svg viewBox="0 0 740 210" style={{ width: "100%", height: "auto", maxHeight: "210px" }}>
              <defs>
                <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Connecting Flow Paths */}
              {/* Victim -> L1 Vikram */}
              <path d="M 125,75 C 185,75 200,75 260,75" fill="none" stroke="#E11D48" strokeWidth="4" />
              {/* L1 Vikram -> L2 Rohit */}
              <path d="M 370,65 C 410,65 430,45 470,45" fill="none" stroke="#D97706" strokeWidth="3" />
              {/* L1 Vikram -> L2 Sameer */}
              <path d="M 370,85 C 410,85 430,105 470,105" fill="none" stroke="#D97706" strokeWidth="2.5" />
              {/* L2 Rohit -> Commercial Escrow */}
              <path d="M 580,45 C 610,45 620,45 640,45" fill="none" stroke="#059669" strokeWidth="2" />
              {/* L2 Sameer -> ATM Sink */}
              <path d="M 580,105 C 610,105 620,105 640,105" fill="none" stroke="#7C3AED" strokeWidth="2.5" />

              {/* Flow Path Amount Labels */}
              <text x="190" y="68" fill="#BE123C" fontSize="9" fontWeight="800">IMPS ₹5.00L</text>
              <text x="415" y="48" fill="#B45309" fontSize="8.5" fontWeight="800">RTGS ₹2.00L</text>
              <text x="415" y="102" fill="#B45309" fontSize="8.5" fontWeight="800">IMPS ₹1.20L</text>
              <text x="605" y="38" fill="#047857" fontSize="8" fontWeight="800">UPI ₹1.80L</text>
              <text x="605" y="120" fill="#6D28D9" fontSize="8" fontWeight="800">CASH ₹1.20L</text>

              {/* Node 1: Victim Sunil */}
              <rect x="15" y="50" width="110" height="50" rx="5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="1.5" />
              <text x="70" y="70" textAnchor="middle" fill="#991B1B" fontSize="10" fontWeight="900">Sunil Kumar</text>
              <text x="70" y="85" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">SBI · Loss ₹5.00L</text>

              {/* Node 2: L1 Mule Vikram */}
              <rect x="260" y="50" width="110" height="50" rx="5" fill="#FFFFFF" stroke="#E11D48" strokeWidth="1.5" />
              <text x="315" y="70" textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="900">Vikram Shah</text>
              <text x="315" y="85" textAnchor="middle" fill="#E11D48" fontSize="8" fontWeight="800">L1 Mule · Axis Bank</text>

              {/* Node 3A: L2 Conduit Rohit */}
              <rect x="470" y="20" width="110" height="48" rx="5" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.5" />
              <text x="525" y="40" textAnchor="middle" fill="#0F172A" fontSize="9.5" fontWeight="900">Rohit Sharma</text>
              <text x="525" y="55" textAnchor="middle" fill="#D97706" fontSize="8" fontWeight="800">L2 · ICICI Bank</text>

              {/* Node 3B: L2 Conduit Sameer */}
              <rect x="470" y="82" width="110" height="48" rx="5" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.5" />
              <text x="525" y="102" textAnchor="middle" fill="#0F172A" fontSize="9.5" fontWeight="900">Sameer Khan</text>
              <text x="525" y="117" textAnchor="middle" fill="#D97706" fontSize="8" fontWeight="800">L2 · State Bank</text>

              {/* Node 4A: Shielded Merchant */}
              <rect x="640" y="20" width="90" height="48" rx="5" fill="#ECFDF5" stroke="#059669" strokeWidth="1.5" />
              <text x="685" y="40" textAnchor="middle" fill="#047857" fontSize="9" fontWeight="900">QuickPay Escrow</text>
              <text x="685" y="55" textAnchor="middle" fill="#065F46" fontSize="7.5" fontWeight="700">Shielded ₹1.80L</text>

              {/* Node 4B: ATM Cashout Sink */}
              <rect x="640" y="82" width="90" height="48" rx="5" fill="#FFF1F2" stroke="#BE123C" strokeWidth="1.5" />
              <text x="685" y="102" textAnchor="middle" fill="#991B1B" fontSize="9" fontWeight="900">Rohini ATM 049</text>
              <text x="685" y="117" textAnchor="middle" fill="#B91C1C" fontSize="7.5" fontWeight="700">Cashout ₹1.20L</text>

              {/* Timeline Bottom Strip */}
              <line x1="20" y1="175" x2="720" y2="175" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="70" cy="175" r="4" fill="#DC2626" />
              <text x="70" y="192" textAnchor="middle" fill="#475569" fontSize="8">09:14:22 Debit</text>
              <circle cx="315" cy="175" r="4" fill="#E11D48" />
              <text x="315" y="192" textAnchor="middle" fill="#475569" fontSize="8">09:16:14 Layer 1</text>
              <circle cx="525" cy="175" r="4" fill="#D97706" />
              <text x="525" y="192" textAnchor="middle" fill="#475569" fontSize="8">09:18:22 Split</text>
              <circle cx="685" cy="175" r="4" fill="#7C3AED" />
              <text x="685" y="192" textAnchor="middle" fill="#475569" fontSize="8">09:21:05 Cashout</text>
            </svg>
          </div>
        </section>

        {/* =====================================================================
            SECTION 3: SUSPECT & MULE ACCOUNTS TABLE
            ===================================================================== */}
        <section className="report-section" style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #CBD5E1",
              paddingBottom: "6px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase", margin: 0 }}>
              3. Suspect &amp; Mule Accounts Audit Table
            </h2>
            <span style={{ fontSize: "10px", color: "#64748B" }}>
              Ranked by Investigative Lead Strength &amp; Post-Credit Velocity
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
            <thead>
              <tr style={{ background: "#F1F5F9", borderBottom: "1.5px solid #CBD5E1", textAlign: "left" }}>
                <th style={{ padding: "7px 10px", fontWeight: 800, color: "#334155" }}>Account Holder</th>
                <th style={{ padding: "7px 10px", fontWeight: 800, color: "#334155" }}>Bank &amp; IFSC</th>
                <th style={{ padding: "7px 10px", fontWeight: 800, color: "#334155" }}>Account (Masked)</th>
                <th style={{ padding: "7px 10px", fontWeight: 800, color: "#334155" }}>Layer / Role</th>
                <th style={{ padding: "7px 10px", fontWeight: 800, color: "#334155", textAlign: "right" }}>Recv Amount</th>
                <th style={{ padding: "7px 10px", fontWeight: 800, color: "#334155", textAlign: "center" }}>Lead Score</th>
                <th style={{ padding: "7px 10px", fontWeight: 800, color: "#334155" }}>Key Forensic Reasons</th>
              </tr>
            </thead>
            <tbody>
              {fixture.accounts
                .filter((a) => a.holderType !== "VICTIM")
                .map((acc, idx) => {
                  const isMerchant = acc.holderType === "BONA_FIDE_MERCHANT";
                  const score = isMerchant ? 8 : idx === 0 ? 94 : idx === 1 ? 88 : 82;
                  const reasons = isMerchant
                    ? "Bona fide GSTIN registered merchant; high organic consumer turnover"
                    : idx === 0
                    ? "Post-credit dwell < 180s; shared AP 74:DA:38:A2:11:BC; rapid fan-out split"
                    : idx === 1
                    ? "Immediate 2-way split; dormant account reactivated; same JA4 TLS hash"
                    : "Immediate ATM cashout withdrawal; physical CCTV alignment with azimuth";

                  return (
                    <tr
                      key={acc.nodeId}
                      style={{
                        borderBottom: "1px solid #E2E8F0",
                        background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 800, color: "#0F172A" }}>
                        {acc.holderName}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>
                        {acc.bank} <br />
                        <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#64748B" }}>
                          {acc.ifsc}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                        {acc.accountMasked}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "3px",
                            background: isMerchant ? "#ECFDF5" : "#FFF1F2",
                            color: isMerchant ? "#047857" : "#BE123C",
                            border: isMerchant ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                          }}
                        >
                          {acc.holderType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 800, textAlign: "right", color: "#0F172A" }}>
                        {idx === 0 ? "₹5,00,000" : idx === 1 ? "₹2,00,000" : idx === 2 ? "₹1,20,000" : "₹1,80,000"}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 900,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: score >= 75 ? "#FEE2E2" : isMerchant ? "#ECFDF5" : "#FEF3C7",
                            color: score >= 75 ? "#991B1B" : isMerchant ? "#047857" : "#B45309",
                          }}
                        >
                          {score}/100
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: "9.5px", color: "#475569" }}>
                        {reasons}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>

        {/* =====================================================================
            SECTION 4: RESOLVED ENTITIES & CROSS-FIR SYNDICATE ATTRIBUTION
            ===================================================================== */}
        <section className="report-section" style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #CBD5E1",
              paddingBottom: "6px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase", margin: 0 }}>
              4. Resolved Entities &amp; Cross-Case Links
            </h2>
            <span style={{ fontSize: "10px", color: "#64748B" }}>
              Attributed via Device IMEI, AP BSSID &amp; JA4 TLS Fingerprints
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "10px 14px",
                fontSize: "11px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, color: "#0F172A" }}>
                  1. Canonical Identity: Vikram Shah (Cluster ENT-01)
                </span>
                <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#4338CA", background: "#EEF2FF", padding: "1px 6px", borderRadius: "3px" }}>
                  Resolution Confidence: 98.4% · 🔗 Cross-FIR Link (FIR #281/2026 Jaipur)
                </span>
              </div>
              <div style={{ color: "#475569", marginTop: "4px", fontSize: "10px" }}>
                Consolidated Identifiers: VPA <code>vikramshah@okaxis</code> + <code>vikram.pay@okaxis</code> · Mobile <code>+91 98711 23941</code> · PAN <code>XXXXX4920K</code> · Device IMEI <code>867492061234564</code> via Poco X5 Hotspot AP <code>74:DA:38:A2:11:BC</code>.
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "10px 14px",
                fontSize: "11px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, color: "#0F172A" }}>
                  2. Canonical Identity: Sameer Khan (Cluster ENT-02)
                </span>
                <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", padding: "1px 6px", borderRadius: "3px" }}>
                  Resolution Confidence: 92.1% · Hardware Anchored
                </span>
              </div>
              <div style={{ color: "#475569", marginTop: "4px", fontSize: "10px" }}>
                Consolidated Identifiers: VPA <code>sameer.fast@oksbi</code> · ATM Card <code>6071-XXXX-4091</code> · Mobile <code>+91 99581 02938</code> · Physical cashout at Rohini Sector-4 ATM DL-049 matching Airtel Sector DL-TWR-891 Azimuth.
              </div>
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #A7F3D0",
                borderRadius: "6px",
                padding: "10px 14px",
                fontSize: "11px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, color: "#047857" }}>
                  3. Exempted Commercial Entity: QuickPay Escrow Pvt Ltd (Cluster ENT-04)
                </span>
                <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", padding: "1px 6px", borderRadius: "3px" }}>
                  Hard Veto Active · Section 107 BNSS Statutory Shield
                </span>
              </div>
              <div style={{ color: "#475569", marginTop: "4px", fontSize: "10px" }}>
                Verified bona-fide commercial merchant. GSTIN <code>07AAAAA0000A1Z5</code> validated against CBIC portal. Protected under commercial shielding; immune from punitive freezing.
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 5: EVIDENCE REGISTER WITH IMMUTABLE SHA-256 HASHES
            ===================================================================== */}
        <section className="report-section" style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #CBD5E1",
              paddingBottom: "6px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase", margin: 0 }}>
              5. Certified Evidence Register (Section 63 BSA Protocol)
            </h2>
            <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
              Merkle Root: {investigation.postIngestionMerkleRoot ? investigation.postIngestionMerkleRoot.slice(0, 18) : "0xb189f412c98d..."}...
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr style={{ background: "#F1F5F9", borderBottom: "1.5px solid #CBD5E1", textAlign: "left" }}>
                <th style={{ padding: "6px 8px", fontWeight: 800, color: "#334155" }}>Ex.</th>
                <th style={{ padding: "6px 8px", fontWeight: 800, color: "#334155" }}>File Name</th>
                <th style={{ padding: "6px 8px", fontWeight: 800, color: "#334155" }}>Vector / Source</th>
                <th style={{ padding: "6px 8px", fontWeight: 800, color: "#334155" }}>Custodian</th>
                <th style={{ padding: "6px 8px", fontWeight: 800, color: "#334155" }}>SHA-256 Content Hash</th>
                <th style={{ padding: "6px 8px", fontWeight: 800, color: "#334155", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ex: "A", name: "Finacle_CBS_Statement.csv", type: "CBS Core Banking", cust: "SBI Central Nodal", hash: sha256HexSync("Finacle_CBS_Statement.csv"), status: "PASS" },
                { ex: "B", name: "Airtel_PGW_Ingress_CDR.csv", type: "Telco PGW CDR", cust: "Bharti Airtel Nodal", hash: sha256HexSync("Airtel_PGW_Ingress_CDR.csv"), status: "PASS" },
                { ex: "C", name: "NPCI_UPI_Switch_Log.xml", type: "NPCI UPI 2.0 XML", cust: "NPCI Switch Ops", hash: sha256HexSync("NPCI_UPI_Switch_Log.xml"), status: "PASS" },
                { ex: "D", name: "victim_complaint_payment_screenshot.pdf", type: "Canva PDF Receipt", cust: "Complainant Device", hash: sha256HexSync("victim_complaint_payment_screenshot.pdf"), status: "QUARANTINED" },
                { ex: "E", name: "ATM_Rohini_DL049_EJ.log", type: "ATM Journal & CCTV", cust: "SBI Security Wing", hash: sha256HexSync("ATM_Rohini_DL049_EJ.log"), status: "PASS" },
              ].map((row, idx) => (
                <tr key={row.ex} style={{ borderBottom: "1px solid #E2E8F0", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 800, color: "#4F46E5" }}>{row.ex}</td>
                  <td style={{ padding: "6px 8px", fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>{row.name}</td>
                  <td style={{ padding: "6px 8px", color: "#475569" }}>{row.type}</td>
                  <td style={{ padding: "6px 8px", color: "#475569" }}>{row.cust}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                    {row.hash.slice(0, 16)}...{row.hash.slice(-8)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 800,
                        padding: "1px 5px",
                        borderRadius: "3px",
                        background: row.status === "PASS" ? "#ECFDF5" : "#FEF2F2",
                        color: row.status === "PASS" ? "#047857" : "#B91C1C",
                        border: row.status === "PASS" ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* =====================================================================
            SECTION 6: ACTIONABLE INTELLIGENCE & AUTO-DRAFTED NOTICES
            ===================================================================== */}
        <section className="report-section" style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #CBD5E1",
              paddingBottom: "6px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase", margin: 0 }}>
              6. Actionable Statutory Intelligence Notices (BNSS §106/§107 &amp; §94)
            </h2>
            <span style={{ fontSize: "10px", color: "#64748B" }}>
              Auto-Drafted · Ready for Electronic Dispatch
            </span>
          </div>

          {/* Tab selector for notices */}
          <div className="no-print" style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
            {[
              { id: "freeze", label: "🏦 BNSS §106/107 Bank Freeze" },
              { id: "telecom", label: "📶 BNSS §94 Telecom Notice" },
              { id: "npci", label: "⚡ BSA §63(4) NPCI Demand" },
              { id: "i4c", label: "🚨 I4C Syndicate Escalation" },
            ].map((tab) => {
              const isActive = activeNoticeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveNoticeTab(tab.id as any)}
                  style={{
                    fontSize: "11px",
                    fontWeight: isActive ? 800 : 600,
                    padding: "4px 10px",
                    borderRadius: "5px",
                    border: isActive ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                    background: isActive ? "#EEF2FF" : "#FFFFFF",
                    color: isActive ? "#4338CA" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Notice Editor / Preview */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              padding: "14px",
            }}
          >
            <div
              className="no-print"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#334155" }}>
                {activeNoticeTab === "freeze" && "Bank Freeze & Lien Directive under Section 106 & 107 BNSS, 2023"}
                {activeNoticeTab === "telecom" && "Statutory Notice to Telecom Service Provider under Section 94 BNSS, 2023"}
                {activeNoticeTab === "npci" && "UPI 2.0 Switch Certification Demand under Section 63(4) BSA, 2023"}
                {activeNoticeTab === "i4c" && "Inter-State Cyber Syndicate Escalation Memorandum to I4C (MHA)"}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleCopyNotice(activeNoticeTab)}
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Copy size={12} />
                  <span>{copiedNotice === activeNoticeTab ? "Copied ✓" : "Copy Text"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadNotice(activeNoticeTab, `Notice_${activeNoticeTab}_${fixture.firNumber.replace(/[^a-zA-Z0-9]/g, "_")}`)}
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "4px",
                    border: "none",
                    background: "#4F46E5",
                    color: "#FFFFFF",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Download size={12} />
                  <span>Download Letter (.txt)</span>
                </button>
              </div>
            </div>

            <textarea
              value={notices[activeNoticeTab]}
              onChange={(e) => setNotices({ ...notices, [activeNoticeTab]: e.target.value })}
              rows={14}
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
                padding: "10px",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                lineHeight: 1.5,
                color: "#0F172A",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </section>

        {/* =====================================================================
            SECTION 7: STATUTORY CERTIFICATE & INVESTIGATING OFFICER SEAL
            ===================================================================== */}
        <section className="report-section" style={{ borderTop: "2px solid #0F172A", paddingTop: "16px", marginTop: "24px" }}>
          <div style={{ fontSize: "11px", lineHeight: 1.6, color: "#334155", fontStyle: "italic", marginBottom: "20px" }}>
            "I, Inspector R. K. Sharma, Investigating Officer, hereby certify that the electronic records, financial flows, and network attribution outputs detailed in this report were generated in the ordinary course of investigation from computer systems operating under lawful custody. The cryptographic hash values and Merkle root (Root: {investigation.postIngestionMerkleRoot ? investigation.postIngestionMerkleRoot.slice(0, 16) : "0xb189f412c98d..."}...) were computed deterministically via standard SHA-256 algorithms and preserve an unbroken chain of custody. Certified under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023."
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              paddingTop: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>Date of Certification:</div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A" }}>22nd September, 2026</div>
              <div style={{ fontSize: "10px", color: "#64748B", marginTop: "4px" }}>Place of Issue:</div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A" }}>Cyber Crime PS, Noida (U.P.)</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  width: "120px",
                  height: "36px",
                  borderBottom: "1.5px solid #0F172A",
                  margin: "0 0 6px auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#4F46E5",
                  fontWeight: 900,
                  letterSpacing: "2px",
                }}
              >
                [SEALED // IO]
              </div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#0F172A" }}>
                (INSP. R. K. SHARMA)
              </div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>
                Investigating Officer · IO-409
              </div>
              <div style={{ fontSize: "9.5px", color: "#64748B" }}>
                Cyber Crime Police Station, Gautam Buddh Nagar
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
