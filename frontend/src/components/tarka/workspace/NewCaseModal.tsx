import React, { useState, useEffect } from "react";
import {
  X,
  FilePlus2,
  Zap,
  ShieldAlert,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useTarkaGlobal, type CaseWorkspace } from "../../../context/TarkaGlobalContext";

export const NewCaseModal: React.FC = () => {
  const { isNewCaseModalOpen, closeNewCaseModal, createNewCaseWorkspace, openEvidenceModal } = useTarkaGlobal();

  const [firNumber, setFirNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("Noida Cyber Crime PS, UP");
  const [ncrpAckNo, setNcrpAckNo] = useState("");
  const [title, setTitle] = useState("");
  const [typology, setTypology] = useState<CaseWorkspace["typology"]>("DIGITAL_ARREST");
  const [complainantName, setComplainantName] = useState("");
  const [leadInvestigator, setLeadInvestigator] = useState("Insp. R. K. Sharma (IO-409)");
  const [claimedLossInr, setClaimedLossInr] = useState<number>(500000);
  const [bookedLossInr, setBookedLossInr] = useState<number>(500000);
  const [goldenHourRemainingMins, setGoldenHourRemainingMins] = useState<number>(180);
  const [priority, setPriority] = useState<CaseWorkspace["priority"]>("CRITICAL_GOLDEN_HOUR");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isNewCaseModalOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNewCaseModalOpen]);

  if (!isNewCaseModalOpen) return null;

  const handleClose = () => {
    setErrorMsg(null);
    setCreatedCaseId(null);
    closeNewCaseModal();
  };

  const handleAutoFillEmergency = () => {
    setFirNumber("FIR #188/2026");
    setPoliceStation("Cyber Crime PS Bengaluru City, KA");
    setNcrpAckNo("1930-ACK-2611004921");
    setTitle("Corporate CFO Impersonation & Multi-Bank RTGS Divert");
    setTypology("CORPORATE_BEC");
    setComplainantName("Ananya Deshmukh (Finance Director, Novus Cloud Tech)");
    setLeadInvestigator("Insp. V. K. Rao (IO-512)");
    setClaimedLossInr(4250000);
    setBookedLossInr(4250000);
    setGoldenHourRemainingMins(112);
    setPriority("CRITICAL_GOLDEN_HOUR");
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firNumber.trim() || !title.trim() || !ncrpAckNo.trim() || !complainantName.trim()) {
      setErrorMsg("Please fill in all mandatory investigation parameters (FIR, Ack, Title, Complainant).");
      return;
    }

    try {
      const newId = createNewCaseWorkspace({
        firNumber: firNumber.trim(),
        policeStation: policeStation.trim(),
        ncrpAckNo: ncrpAckNo.trim(),
        title: title.trim(),
        typology,
        complainantName: complainantName.trim(),
        leadInvestigator: leadInvestigator.trim(),
        claimedLossInr: Number(claimedLossInr) || 0,
        bookedLossInr: Number(bookedLossInr) || 0,
        recoverableInr: Math.round((Number(bookedLossInr) || 0) * 0.85),
        commercialShieldedInr: Math.round((Number(bookedLossInr) || 0) * 0.35),
        goldenHourRemainingMins: Number(goldenHourRemainingMins) || 0,
        priority,
        currentStage: "intake",
        syndicateLinks: [
          {
            linkedCaseId: "CASE-2026-001",
            sharedAnchorType: "MULE_ACCOUNT",
            sharedAnchorValue: "SBI-9021884102-MULE",
          },
        ],
      });

      setCreatedCaseId(newId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize workspace.");
    }
  };

  const handleLaunchWithEvidence = () => {
    if (!createdCaseId) return;
    const caseId = createdCaseId;
    handleClose();
    setTimeout(() => {
      openEvidenceModal(caseId);
    }, 100);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #CBD5E1",
    background: "#FFFFFF",
    fontSize: "12px",
    color: "#0F172A",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "4px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: "660px",
          maxWidth: "96vw",
          maxHeight: "92vh",
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px solid #CBD5E1",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                color: "#4F46E5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FilePlus2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0F172A" }}>
                Register New Cyber Crime Investigation Workspace
              </div>
              <div style={{ fontSize: "10.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                BSA 2023 §63 · BNSS 2023 §173 · NCRP 1930 Golden-Hour Intake
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleAutoFillEmergency}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#92400E",
                background: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              title="Pre-fills a realistic emergency Corporate BEC case under NCRP 1930"
            >
              <Zap size={12} color="#D97706" />
              <span>⚡ 1-Click Auto-Fill Demo</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: "1 1 0%" }}>
          {createdCaseId ? (
            <div style={{ textAlign: "center", padding: "24px 0", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>
                  Case Workspace Initialized Successfully
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "4px" }}>
                  Enclave identifier:{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      color: "#4F46E5",
                      background: "#EEF2FF",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid #C7D2FE",
                    }}
                  >
                    {createdCaseId}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", maxWidth: "420px", margin: "8px auto 0 auto", lineHeight: 1.4 }}>
                  All 5 forensic invariants (Double-Entry Balance, Root Hash Seal, Merkle Blinding, Audit Chain, and Golden-Hour SLA) have been provisioned.
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={handleLaunchWithEvidence}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "7px",
                    background: "#4F46E5",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  <Fingerprint size={14} />
                  <span>📥 Insert Initial Evidence Exhibits</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "7px",
                    background: "#F1F5F9",
                    color: "#334155",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid #CBD5E1",
                  }}
                >
                  Return to Workspace Hub
                </button>
              </div>
            </div>
          ) : (
            <form id="new-case-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {errorMsg && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#FFF1F2",
                    border: "1px solid #FECDD3",
                    borderRadius: "7px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#BE123C",
                    fontSize: "11.5px",
                  }}
                >
                  <AlertCircle size={14} color="#E11D48" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Row 1: FIR & NCRP Ack */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>
                    FIR / Regular Case Number <span style={{ color: "#E11D48" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firNumber}
                    onChange={(e) => setFirNumber(e.target.value)}
                    placeholder="e.g. FIR #188/2026 or RC-09/2026"
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    NCRP 1930 Ack Number <span style={{ color: "#E11D48" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ncrpAckNo}
                    onChange={(e) => setNcrpAckNo(e.target.value)}
                    placeholder="e.g. 1930-ACK-2611004921"
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              {/* Row 2: Title & Police Station */}
              <div>
                <label style={labelStyle}>
                  Investigation Subject / Title <span style={{ color: "#E11D48" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Digital Arrest Extortion via Spoofed Telecom Nodal Gateway"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Jurisdiction / Police Station</label>
                  <input
                    type="text"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    placeholder="e.g. Noida Cyber Crime PS, UP"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Lead Investigating Officer (IO)</label>
                  <input
                    type="text"
                    value={leadInvestigator}
                    onChange={(e) => setLeadInvestigator(e.target.value)}
                    placeholder="e.g. Insp. R. K. Sharma (IO-409)"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Row 3: Typology & Priority */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Crime Typology / Modus</label>
                  <select
                    value={typology}
                    onChange={(e) => setTypology(e.target.value as any)}
                    style={{ ...inputStyle, height: "32px", cursor: "pointer" }}
                  >
                    <option value="DIGITAL_ARREST">Digital Arrest Extortion (CBI/ED Impersonation)</option>
                    <option value="APK_SIM_SWAP">APK Malware SMS Stealer &amp; Dual-SIM Swap</option>
                    <option value="TELEGRAM_INVESTMENT">Telegram IPO/Crypto Pump Investment Syndicate</option>
                    <option value="CORPORATE_BEC">Business Email Compromise (BEC) &amp; Wire Fraud</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Initial SLA Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    style={{ ...inputStyle, height: "32px", cursor: "pointer" }}
                  >
                    <option value="CRITICAL_GOLDEN_HOUR">⚡ Critical Golden-Hour (Active 180m Triage)</option>
                    <option value="HIGH_SYNDICATE">🔗 High Syndicate (Cross-State Linkage)</option>
                    <option value="COURT_FILING_READY">🏛️ Court Filing Ready (BSA 2023 Filing)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Complainant Name & Financial Figures */}
              <div>
                <label style={labelStyle}>
                  Complainant Name &amp; Organization <span style={{ color: "#E11D48" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  placeholder="e.g. Sunil Kumar or Novus Cloud Tech Pvt Ltd"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Claimed Loss (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={claimedLossInr}
                    onChange={(e) => setClaimedLossInr(Number(e.target.value))}
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Booked Loss (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={bookedLossInr}
                    onChange={(e) => setBookedLossInr(Number(e.target.value))}
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Golden Hour (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={goldenHourRemainingMins}
                    onChange={(e) => setGoldenHourRemainingMins(Number(e.target.value))}
                    style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              {/* Informational Callout */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  borderRadius: "7px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  fontSize: "11px",
                  color: "#3730A3",
                  lineHeight: 1.4,
                }}
              >
                <ShieldAlert size={14} color="#4F46E5" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  Upon registration, TARKA will generate a SHA-256 genesis hash and initialize an isolated cryptographic envelope for evidence admission. All subsequent artifacts will be verified against double-entry ledgers and Merkle blinded prior to tribunal submission.
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!createdCaseId && (
          <div
            style={{
              padding: "10px 18px",
              borderTop: "1px solid #E2E8F0",
              background: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748B" }}>
              Press <kbd style={{ padding: "1px 4px", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "3px", fontFamily: "var(--font-mono)" }}>Esc</kbd> to cancel
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#475569",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-case-form"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 14px",
                  borderRadius: "6px",
                  border: "1px solid #4338CA",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
                }}
              >
                <FilePlus2 size={13} />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
