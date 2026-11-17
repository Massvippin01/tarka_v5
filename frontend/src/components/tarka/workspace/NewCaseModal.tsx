import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FilePlus2,
  Zap,
  ShieldAlert,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useTarkaGlobal, type CaseWorkspace } from "../../../context/TarkaGlobalContext";

export const NewCaseModal: React.FC = () => {
  const { isNewCaseModalOpen, closeNewCaseModal, createNewCaseWorkspace, openEvidenceModal, selectCaseWorkspace } = useTarkaGlobal();

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

  const handleClose = () => {
    setErrorMsg(null);
    setCreatedCaseId(null);
    closeNewCaseModal();
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firNumber.trim() || !title.trim() || !ncrpAckNo.trim() || !complainantName.trim()) {
      setErrorMsg("Please fill in all mandatory investigation parameters (FIR, Ack, Title, Complainant).");
      return;
    }

    try {
      const newId = await createNewCaseWorkspace({
        firNumber: firNumber.trim(),
        policeStation: policeStation.trim(),
        ncrpAckNo: ncrpAckNo.trim(),
        title: title.trim(),
        typology,
        complainantName: complainantName.trim(),
        leadInvestigator: leadInvestigator.trim(),
        claimedLossInr: Number(claimedLossInr) || 0,
        bookedLossInr: Number(bookedLossInr) || 0,
        recoverableInr: 0,
        commercialShieldedInr: 0,
        goldenHourRemainingMins: Number(goldenHourRemainingMins) || 0,
        priority,
        currentStage: "intake",
        syndicateLinks: [],
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
      selectCaseWorkspace(caseId, "intake");
      openEvidenceModal(caseId);
    }, 100);
  };

  const handleReturnToHub = () => {
    if (createdCaseId) {
      selectCaseWorkspace(createdCaseId, "intake");
    }
    handleClose();
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        data-testid="register-new-case-modal"
        className="w-full max-w-[680px] max-h-[min(90vh,700px)] my-auto flex flex-col overflow-hidden rounded-xl bg-white border border-[var(--line)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:px-5 sm:py-3.5 border-b border-[var(--line)] bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-[var(--accent)] flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-[14.5px] font-bold text-[var(--fg-1)]">
                Register New Cyber Crime Investigation Workspace
              </div>
              <div className="text-[12px] text-[var(--muted)] font-mono">
                BSA 2023 §63 · BNSS 2023 §173 · NCRP 1930 Golden-Hour Intake
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillEmergency}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
              title="Pre-fills a realistic emergency Corporate BEC case under NCRP 1930"
            >
              <Zap size={13} className="text-amber-600" />
              <span>⚡ 1-Click Auto-Fill Demo</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="text-[var(--muted)] hover:text-[var(--fg-1)] hover:bg-[#f4f4f5] p-1.5 rounded-lg border-none bg-transparent transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {createdCaseId ? (
            <div className="text-center py-6 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <div className="text-[16px] font-bold text-[var(--fg-1)]">
                  Case Workspace Initialized Successfully
                </div>
                <div className="text-[12.5px] text-[var(--fg-2)] mt-1.5">
                  Enclave identifier:{" "}
                  <span className="font-mono font-bold text-[var(--accent)] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {createdCaseId}
                  </span>
                </div>
                <div className="text-[12px] text-[var(--muted)] max-w-[460px] mx-auto mt-2 leading-relaxed">
                  All 5 forensic invariants (Double-Entry Balance, Root Hash Seal, Merkle Blinding, Audit Chain, and Golden-Hour SLA) have been provisioned.
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={handleLaunchWithEvidence}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-blue-700 text-white text-[12.5px] font-bold cursor-pointer shadow-xs border-none transition-colors"
                >
                  <Fingerprint size={15} />
                  <span>📥 Insert Initial Evidence Exhibits</span>
                </button>
                <button
                  type="button"
                  onClick={handleReturnToHub}
                  className="px-4 py-2 rounded-lg bg-white border border-[var(--line)] text-[var(--fg-1)] text-[12.5px] font-semibold hover:bg-[#f4f4f5] cursor-pointer transition-colors"
                >
                  Return to Workspace Hub
                </button>
              </div>
            </div>
          ) : (
            <form id="new-case-modal-form" onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-[12.5px]">
                  <AlertCircle size={15} className="text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Row 1: FIR & NCRP Ack */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    FIR / Regular Case Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firNumber}
                    onChange={(e) => setFirNumber(e.target.value)}
                    placeholder="e.g. FIR #188/2026 or RC-09/2026"
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    NCRP 1930 Ack Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ncrpAckNo}
                    onChange={(e) => setNcrpAckNo(e.target.value)}
                    placeholder="e.g. 1930-ACK-2611004921"
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>
              </div>

              {/* Row 2: Title */}
              <div>
                <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                  Investigation Subject / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Digital Arrest Extortion via Spoofed Telecom Nodal Gateway"
                  className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                />
              </div>

              {/* Row 3: Jurisdiction & IO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Jurisdiction / Police Station
                  </label>
                  <input
                    type="text"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    placeholder="e.g. Noida Cyber Crime PS, UP"
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Lead Investigating Officer (IO)
                  </label>
                  <input
                    type="text"
                    value={leadInvestigator}
                    onChange={(e) => setLeadInvestigator(e.target.value)}
                    placeholder="e.g. Insp. R. K. Sharma (IO-409)"
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>
              </div>

              {/* Row 4: Typology & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Crime Typology / Modus
                  </label>
                  <select
                    value={typology}
                    onChange={(e) => setTypology(e.target.value as any)}
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border cursor-pointer"
                  >
                    <option value="DIGITAL_ARREST">Digital Arrest Extortion (CBI/ED Impersonation)</option>
                    <option value="APK_SIM_SWAP">APK Malware SMS Stealer &amp; Dual-SIM Swap</option>
                    <option value="TELEGRAM_INVESTMENT">Telegram IPO/Crypto Pump Investment Syndicate</option>
                    <option value="CORPORATE_BEC">Business Email Compromise (BEC) &amp; Wire Fraud</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Initial SLA Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border cursor-pointer"
                  >
                    <option value="CRITICAL_GOLDEN_HOUR">⚡ Critical Golden-Hour (Active 180m Triage)</option>
                    <option value="HIGH_SYNDICATE">🔗 High Syndicate (Cross-State Linkage)</option>
                    <option value="COURT_FILING_READY">🏛️ Court Filing Ready (BSA 2023 Filing)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Complainant Name */}
              <div>
                <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                  Complainant Name &amp; Organization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  placeholder="e.g. Sunil Kumar or Novus Cloud Tech Pvt Ltd"
                  className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                />
              </div>

              {/* Row 6: Loss Amounts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Claimed Loss (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={claimedLossInr}
                    onChange={(e) => setClaimedLossInr(Number(e.target.value))}
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Booked Loss (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={bookedLossInr}
                    onChange={(e) => setBookedLossInr(Number(e.target.value))}
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Golden Hour (Mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={goldenHourRemainingMins}
                    onChange={(e) => setGoldenHourRemainingMins(Number(e.target.value))}
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                </div>
              </div>

              {/* Callout */}
              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg flex items-start gap-2.5 text-[12px] text-blue-900 leading-relaxed">
                <ShieldAlert size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <span>
                  Upon registration, TARKA will generate a SHA-256 genesis hash and initialize an isolated cryptographic envelope for evidence admission. All subsequent artifacts will be verified against double-entry ledgers and Merkle blinded prior to tribunal submission.
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!createdCaseId && (
          <div className="shrink-0 px-5 py-3 bg-[#fafafa] border-t border-[var(--line)] flex items-center justify-between">
            <span className="text-[12px] text-[var(--muted)]">
              Press <kbd className="px-1.5 py-0.5 bg-white border border-[var(--line)] rounded text-[11px] font-mono shadow-2xs">Esc</kbd> to cancel
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg border-none bg-transparent hover:bg-black/[0.03] text-[var(--muted)] hover:text-[var(--fg-1)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-case-modal-form"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs border-none"
              >
                <FilePlus2 size={14} />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
};
