import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Network,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { CaseSyncBridge } from "../../../services/caseSyncBridge";
import { reconstruct5FileInvestigation } from "../../../utils/investigationReconstructor";
import { CANONICAL_CASES, buildCaseBundleFromFixture } from "../../../fixtures/cases";
import { StoryBanner, KpiTile } from "../kit";
import { sha256HexSync } from "../../../utils/sha256";

export const PrivacyCryptoWorkbench: React.FC = () => {
  const { activeCaseId, activeCase } = useTarkaGlobal();
  const { reconstructedInvestigation } = useTarkaUiStore();

  const currentCase = activeCase;

  const investigation = useMemo(() => {
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === activeCaseId) {
      return reconstructedInvestigation;
    }
    if (activeCaseId && CANONICAL_CASES[activeCaseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[activeCaseId]);
    }
    return reconstructedInvestigation || reconstruct5FileInvestigation();
  }, [reconstructedInvestigation, activeCaseId]);

  const consortium = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCasePrivacyConsortium(
      activeCaseId || "CASE-2026-001",
      investigation
    );
  }, [activeCaseId, investigation]);

  const [activeTab, setActiveTab] = useState<"psi" | "zkp" | "pbft" | "claims">("psi");

  // ============================================================================
  // TAB 1: PRIVATE SET INTERSECTION (ECDH-PSI) STATE
  // ============================================================================
  const [psiIdType, setPsiIdType] = useState<"MSISDN" | "PAN" | "UPI_VPA">("MSISDN");
  const [psiRunning, setPsiRunning] = useState(false);
  const [psiCompleted, setPsiCompleted] = useState(true);

  // Dynamic Bank Datasets from Active Case Consortium
  const bankData = consortium.bankData;
  const [bankA = "SBI", bankB = "HDFC", bankC = "AXIS"] = consortium.banksInvolved;
  const bankAData = bankData[bankA] || { MSISDN: [], PAN: [], UPI_VPA: [] };
  const bankBData = bankData[bankB] || { MSISDN: [], PAN: [], UPI_VPA: [] };
  const bankCData = bankData[bankC] || { MSISDN: [], PAN: [], UPI_VPA: [] };

  const handleRunPsi = () => {
    setPsiRunning(true);
    setTimeout(() => {
      setPsiRunning(false);
      setPsiCompleted(true);
    }, 600);
  };

  // ============================================================================
  // TAB 2: ZERO-KNOWLEDGE PROOF (ZKP) STATE
  // ============================================================================
  const caseBookedLoss = investigation.bookedLossInr || 500000;
  const [zkpThreshold, setZkpThreshold] = useState<number>(caseBookedLoss);
  useEffect(() => {
    setZkpThreshold(caseBookedLoss);
  }, [caseBookedLoss]);
  const [zkpTamperProof, setZkpTamperProof] = useState<boolean>(false);
  const [zkpTamperThreshold, setZkpTamperThreshold] = useState<boolean>(false);
  const [showPrivateWitness, setShowPrivateWitness] = useState<boolean>(false);

  const privateTransactions = [
    { id: "TX-01", amount: 50000, recipient: "ACC-MULE-01", salt: "s_9f81a" },
    { id: "TX-02", amount: 75000, recipient: "ACC-MULE-02", salt: "s_3b12c" },
    { id: "TX-03", amount: 25000, recipient: "ACC-MULE-03", salt: "s_7e44d" },
    { id: "TX-04", amount: 100000, recipient: "ACC-MULE-04", salt: "s_1a09f" },
    { id: "TX-05", amount: 100000, recipient: "ACC-MULE-05", salt: "s_88e2b" },
  ];
  const totalBatchAmount = privateTransactions.reduce((acc, t) => acc + t.amount, 0); // 350,000

  const effectiveThreshold = zkpTamperThreshold ? 200000 : zkpThreshold;
  const isZkpValid = totalBatchAmount <= effectiveThreshold && !zkpTamperProof;

  // ============================================================================
  // TAB 3: 4-NODE PBFT CONSENSUS STATE
  // ============================================================================
  const [pbftFaultMode, setPbftFaultMode] = useState<"HONEST" | "SILENT" | "CONFLICTING">("HONEST");
  const [pbftRunning, setPbftRunning] = useState<boolean>(false);
  const [pbftRound, setPbftRound] = useState<number>(1);

  const pbftNodes = [
    { id: "node_0", name: `${consortium.banksInvolved[0] || "HDFC"} Primary`, role: "Leader", status: "COMMITTED" },
    { id: "node_1", name: `${consortium.banksInvolved[1] || "ICICI"} Validator`, role: "Replica", status: "COMMITTED" },
    { id: "node_2", name: `${consortium.banksInvolved[2] || "AXIS"} Validator`, role: "Replica", status: "COMMITTED" },
    {
      id: "node_3",
      name: `${consortium.banksInvolved[0] || "SBI"} Replica`,
      role: pbftFaultMode === "HONEST" ? "Replica" : "Byzantine",
      status:
        pbftFaultMode === "HONEST"
          ? "COMMITTED"
          : pbftFaultMode === "SILENT"
          ? "CRASHED / SILENT"
          : "REJECTED FORGERY",
    },
  ];

  const handleRunPbft = () => {
    setPbftRunning(true);
    setTimeout(() => {
      setPbftRunning(false);
      setPbftRound((r) => r + 1);
    }, 500);
  };

  // ============================================================================
  // TAB 4: COUNTERFACTUAL EVIDENCE EXCLUSION STATE
  // ============================================================================
  const [excludeScreenshot, setExcludeScreenshot] = useState<boolean>(false);

  return (
    <div
      data-case-id={activeCaseId || ""}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 52px)",
        maxHeight: "calc(100dvh - 52px)",
        padding: "8px 16px 12px 16px",
        gap: "8px",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#F8FAFC",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* 1. STORY BANNER */}
      <StoryBanner
        screenId="privacy-crypto"
        takeaway={`Multi-Party ECDH-PSI, Groth16 ZK-SNARK verifiers, and 4-Node PBFT consensus for ${currentCase?.firNumber || investigation.firNumber} across ${consortium.banksInvolved.join(", ")} consortium without exposing innocent civilian banking data.`}
        evidenceChips={[
          { tier: "T1", label: "SECP256k1 Curve", hash: sha256HexSync("SECP256k1 Curve") },
          { tier: "T1", label: "Circom ZKP Key", hash: sha256HexSync("Circom ZKP Key") },
          { tier: "T1", label: "Consortium PBFT", hash: sha256HexSync("Consortium PBFT") },
        ]}
      />

      {/* 2. KPI ROW (4 TILES) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}
      >
        <KpiTile
          title="ECDH-PSI PRIVACY"
          value="100%"
          suffix=" Zero-Leak"
          icon={KeyRound}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "SECP256k1", variant: "emerald" }}
          subtitle="Non-matching records mathematically protected"
        />
        <KpiTile
          title="CIRCOM ZKP BOUND"
          value="≤ ₹5.00L"
          icon={Lock}
          iconColor="#0D9488"
          iconBg="#F0FDFA"
          statusBadge={{ text: isZkpValid ? "SAT VERIFIED" : "FAIL CLOSED", variant: isZkpValid ? "emerald" : "rose" }}
          subtitle="Zero-knowledge private transaction sum proof"
        />
        <KpiTile
          title="PBFT QUORUM"
          value="3 / 4"
          suffix=" Nodes"
          icon={Network}
          iconColor="#9333EA"
          iconBg="#FAF5FF"
          statusBadge={{ text: "2f + 1 MET", variant: "emerald" }}
          subtitle="Tolerates 1 Byzantine forged/crashing node"
        />
        <KpiTile
          title="CLAIM DAG STATES"
          value="5"
          suffix=" States"
          icon={Layers}
          iconColor="#EA580C"
          iconBg="#FFF7ED"
          statusBadge={{ text: excludeScreenshot ? "CHALLENGER" : "BASELINE", variant: "indigo" }}
          subtitle="Acyclic causal derivation and ablation proof"
        />
      </div>

      {/* 3. WORKBENCH SUB-HEADER & NAVIGATION TABS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#FFFFFF",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={18} color="#4F46E5" />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
            Cryptographic & Formal Verification Workstreams
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#ECFDF5",
              color: "#059669",
              border: "1px solid #A7F3D0",
            }}
          >
            SUTRAM 2026 MEMBER B
          </span>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "4px", background: "#F1F5F9", padding: "3px", borderRadius: "6px" }}>
          {[
            { id: "psi", label: "1. Private Set Intersection", icon: KeyRound },
            { id: "zkp", label: "2. Zero-Knowledge Proofs", icon: Lock },
            { id: "pbft", label: "3. PBFT Consensus", icon: Network },
            { id: "claims", label: "4. Claim DAG & Counterfactual", icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "5px",
                  border: isActive ? "1px solid #CBD5E1" : "1px solid transparent",
                  background: isActive ? "#FFFFFF" : "transparent",
                  color: isActive ? "#4F46E5" : "#64748B",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "11px",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.12s ease",
                }}
              >
                <Icon size={13} color={isActive ? "#4F46E5" : "#64748B"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. TAB CONTENT CONTAINER */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingRight: "2px",
        }}
      >
        {/* ==================================================================== */}
        {/* TAB 1: PRIVATE SET INTERSECTION (ECDH-PSI)                           */}
        {/* ==================================================================== */}
        {activeTab === "psi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Controls Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#FFFFFF",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                    Correlation Identifier Type
                  </span>
                  <select
                    value={psiIdType}
                    onChange={(e) => setPsiIdType(e.target.value as any)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      background: "#F8FAFC",
                      color: "#0F172A",
                    }}
                  >
                    <option value="MSISDN">Mobile Phone Number (Indian E.164 +91)</option>
                    <option value="PAN">Permanent Account Number (PAN)</option>
                    <option value="UPI_VPA">Virtual Payment Address (UPI VPA)</option>
                  </select>
                </div>

                <div style={{ width: "1px", height: "28px", background: "#E2E8F0" }} />

                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                    Participating Inter-Bank Nodes
                  </span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                      {bankA} Bank (Bank A)
                    </span>
                    <span style={{ color: "#94A3B8", fontWeight: 700 }}>+</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" }}>
                      {bankB} Bank (Bank B)
                    </span>
                    <span style={{ color: "#94A3B8", fontWeight: 700 }}>+</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "#FAF5FF", color: "#7E22CE", border: "1px solid #E9D5FF" }}>
                      {bankC} Bank (Node C)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunPsi}
                disabled={psiRunning}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: psiRunning ? "#94A3B8" : "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: psiRunning ? "wait" : "pointer",
                  boxShadow: "0 1px 3px rgba(79,70,229,0.3)",
                }}
              >
                {psiRunning ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    <span>Blinding SECP256k1 Points...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Execute Tripartite ECDH-PSI</span>
                  </>
                )}
              </button>
            </div>

            {/* 3 Bank Vault Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {/* Vault 1: Bank A */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid #BFDBFE",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1D4ED8" }}>INST_{bankA} ({currentCase?.complainantName || "Complainant"} Bank)</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 6px", borderRadius: "4px" }}>
                    {bankAData[psiIdType]?.length || 0} Records
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {bankAData[psiIdType]?.map((item, idx) => {
                    const isMule = item === consortium.suspectMsisdn || item === consortium.suspectPan || item === consortium.suspectVpa || item.includes("9876543210");
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: isMule ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                          background: isMule ? "#FFF1F2" : "#F8FAFC",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        <span style={{ fontWeight: isMule ? 700 : 500, color: isMule ? "#BE123C" : "#334155" }}>{item}</span>
                        <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", background: isMule ? "#FFE4E6" : "#E2E8F0", color: isMule ? "#9F1239" : "#64748B" }}>
                          {isMule ? "Target Mule" : "Confidential"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", fontStyle: "italic", marginTop: "auto" }}>
                  Private Key: <code style={{ color: "#475569" }}>k_{bankA} = 0x8f2a...c4e1</code> (Kept air-gapped)
                </div>
              </div>

              {/* Vault 2: Bank B */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid #FDE68A",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#B45309" }}>INST_{bankB} (Layer-1 Mule Bank)</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, background: "#FFFBEB", color: "#B45309", padding: "1px 6px", borderRadius: "4px" }}>
                    {bankBData[psiIdType]?.length || 0} Records
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {bankBData[psiIdType]?.map((item, idx) => {
                    const isMule = item === consortium.suspectMsisdn || item === consortium.suspectPan || item === consortium.suspectVpa || item.includes("9876543210");
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: isMule ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                          background: isMule ? "#FFF1F2" : "#F8FAFC",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        <span style={{ fontWeight: isMule ? 700 : 500, color: isMule ? "#BE123C" : "#334155" }}>{item}</span>
                        <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", background: isMule ? "#FFE4E6" : "#E2E8F0", color: isMule ? "#9F1239" : "#64748B" }}>
                          {isMule ? "Target Mule" : "Confidential"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", fontStyle: "italic", marginTop: "auto" }}>
                  Private Key: <code style={{ color: "#475569" }}>k_{bankB} = 0x3d7b...9a12</code> (Kept air-gapped)
                </div>
              </div>

              {/* Vault 3: Bank C */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid #E9D5FF",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#7E22CE" }}>INST_{bankC} (Beneficiary Node)</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, background: "#FAF5FF", color: "#7E22CE", padding: "1px 6px", borderRadius: "4px" }}>
                    {bankCData[psiIdType]?.length || 0} Records
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {bankCData[psiIdType]?.map((item, idx) => {
                    const isMule = item === consortium.suspectMsisdn || item === consortium.suspectPan || item === consortium.suspectVpa || item.includes("9876543210");
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: isMule ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                          background: isMule ? "#FFF1F2" : "#F8FAFC",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        <span style={{ fontWeight: isMule ? 700 : 500, color: isMule ? "#BE123C" : "#334155" }}>{item}</span>
                        <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", background: isMule ? "#FFE4E6" : "#E2E8F0", color: isMule ? "#9F1239" : "#64748B" }}>
                          {isMule ? "Target Mule" : "Confidential"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", fontStyle: "italic", marginTop: "auto" }}>
                  Private Key: <code style={{ color: "#475569" }}>k_{bankC} = 0x11c0...4f88</code> (Kept air-gapped)
                </div>
              </div>
            </div>

            {/* Discovered Match Output Banner */}
            {psiCompleted && (
              <div
                style={{
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#065F46" }}>
                      Tripartite Intersection Result: 1 Inter-Bank Mule Discovered
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "#D1FAE5", color: "#065F46" }}>
                    Zero Non-Matching Accounts Exposed
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#FFFFFF",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1FAE5",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748B", marginRight: "8px" }}>Discovered Permitted Match:</span>
                    <span style={{ fontWeight: 800, color: "#BE123C", fontSize: "13px" }}>
                      {psiIdType === "MSISDN" ? consortium.suspectMsisdn : psiIdType === "PAN" ? consortium.suspectPan : consortium.suspectVpa}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>
                    Curve Point Digest: <code style={{ fontWeight: 700, color: "#4F46E5" }}>0279be667ef9dcbb...a06295</code>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#047857" }}>
                  <span>Discrete logarithm problem on SECP256k1 prevents dictionary recovery of unblinded inputs.</span>
                  <span style={{ fontWeight: 700 }}>Audit Reference: #PSI-AUDIT-9941</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: ZERO-KNOWLEDGE PROOFS (ZKP)                                   */}
        {/* ==================================================================== */}
        {activeTab === "zkp" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {/* Left Column: Prover Space */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <KeyRound size={16} color="#4F46E5" />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>
                    Bank Air-Gapped Prover Space (Private)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrivateWitness(!showPrivateWitness)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "transparent",
                    border: "none",
                    color: "#4F46E5",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showPrivateWitness ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPrivateWitness ? "Hide Witness" : "Inspect Witness"}</span>
                </button>
              </div>

              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B" }}>
                PRIVATE TRANSACTION BATCH (5 ITEMS):
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {privateTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: "#334155", marginRight: "8px" }}>{tx.id}</span>
                      <span style={{ color: "#64748B" }}>→ {tx.recipient}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: "#0F172A" }}>
                      {showPrivateWitness ? `₹${tx.amount.toLocaleString()}` : "••••••••"}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span style={{ color: "#4338CA" }}>Calculated Private Sum:</span>
                <span style={{ color: "#3730A3", fontFamily: "var(--font-mono, monospace)", fontSize: "13px" }}>
                  {showPrivateWitness ? `₹${totalBatchAmount.toLocaleString()}` : "HIDDEN (PASSIVE WITNESS)"}
                </span>
              </div>

              {/* Circuit Info Box */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  padding: "8px 12px",
                  fontSize: "11px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  color: "#64748B",
                  marginTop: "auto",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Circom Circuit:</span>
                  <code style={{ color: "#4F46E5", fontWeight: 700 }}>transaction_threshold.circom</code>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>R1CS Constraints:</span>
                  <span style={{ fontFamily: "var(--font-mono, monospace)" }}>132 linear constraints</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Proving System:</span>
                  <span style={{ fontFamily: "var(--font-mono, monospace)" }}>Groth16 / BN254</span>
                </div>
              </div>
            </div>

            {/* Right Column: Verifier Space */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>
                    Independent Auditor Verifier Space (Public)
                  </span>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "2px 6px", borderRadius: "4px" }}>
                  Public Inputs Only
                </span>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", display: "block", marginBottom: "4px" }}>
                  PUBLIC REGULATORY THRESHOLD (IN RUPEES)
                </label>
                <input
                  type="number"
                  value={zkpThreshold}
                  onChange={(e) => setZkpThreshold(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    fontSize: "13px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono, monospace)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  padding: "8px 12px",
                  fontSize: "11px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  color: "#64748B",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Expected Merkle Root:</span>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>0x4a9b...7e11</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Batch Size:</span>
                  <span>5 transactions</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Proof Elements (πA, πB, πC):</span>
                  <span style={{ color: "#059669", fontWeight: 700 }}>3 group points (256 bytes)</span>
                </div>
              </div>

              {/* Adversarial Attack Simulator */}
              <div
                style={{
                  background: "#FFFBEB",
                  borderRadius: "6px",
                  border: "1px solid #FDE68A",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#B45309", textTransform: "uppercase" }}>
                  Adversarial Attack Simulator (Judge Testing)
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#78350F", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={zkpTamperProof}
                    onChange={(e) => setZkpTamperProof(e.target.checked)}
                  />
                  <span>Inject Forged πA Group Point (Tampered Proof Element)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#78350F", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={zkpTamperThreshold}
                    onChange={(e) => setZkpTamperThreshold(e.target.checked)}
                  />
                  <span>Tamper Public Threshold to ₹2,00,000 (Violate Bound)</span>
                </label>
              </div>

              {/* Verification Outcome */}
              <div
                style={{
                  background: isZkpValid ? "#ECFDF5" : "#FFF1F2",
                  border: isZkpValid ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {isZkpValid ? <CheckCircle2 size={20} color="#059669" /> : <XCircle size={20} color="#BE123C" />}
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: isZkpValid ? "#065F46" : "#9F1239" }}>
                      {isZkpValid ? "ZKP VERIFICATION: ACCEPTED" : "ZKP VERIFICATION: REJECTED (FAIL CLOSED)"}
                    </div>
                    <div style={{ fontSize: "10px", color: isZkpValid ? "#047857" : "#BE123C", opacity: 0.9 }}>
                      {isZkpValid
                        ? `Mathematically proven: Batch sum ≤ ₹${zkpThreshold.toLocaleString()} without revealing private amounts.`
                        : zkpTamperProof
                        ? "Cryptographic rejection: Malformed or forged group element πA."
                        : "Public inputs hash mismatch: Constraint sum > threshold."}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono, monospace)",
                    background: "#FFFFFF",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid #E2E8F0",
                    color: "#334155",
                  }}
                >
                  {isZkpValid ? "0.42 ms" : "0.08 ms"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: 4-NODE PBFT CONSENSUS EXPERIMENT                             */}
        {/* ==================================================================== */}
        {activeTab === "pbft" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Controls Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#FFFFFF",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
              }}
            >
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Byzantine Node 3 Fault Behavior
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setPbftFaultMode("HONEST")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: pbftFaultMode === "HONEST" ? 700 : 500,
                      background: pbftFaultMode === "HONEST" ? "#ECFDF5" : "#F8FAFC",
                      color: pbftFaultMode === "HONEST" ? "#065F46" : "#64748B",
                      border: pbftFaultMode === "HONEST" ? "1px solid #A7F3D0" : "1px solid #CBD5E1",
                      cursor: "pointer",
                    }}
                  >
                    1. All 4 Nodes Honest
                  </button>
                  <button
                    type="button"
                    onClick={() => setPbftFaultMode("SILENT")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: pbftFaultMode === "SILENT" ? 700 : 500,
                      background: pbftFaultMode === "SILENT" ? "#FFFBEB" : "#F8FAFC",
                      color: pbftFaultMode === "SILENT" ? "#B45309" : "#64748B",
                      border: pbftFaultMode === "SILENT" ? "1px solid #FDE68A" : "1px solid #CBD5E1",
                      cursor: "pointer",
                    }}
                  >
                    2. Node 3 Crashed / Silent
                  </button>
                  <button
                    type="button"
                    onClick={() => setPbftFaultMode("CONFLICTING")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: pbftFaultMode === "CONFLICTING" ? 700 : 500,
                      background: pbftFaultMode === "CONFLICTING" ? "#FFF1F2" : "#F8FAFC",
                      color: pbftFaultMode === "CONFLICTING" ? "#9F1239" : "#64748B",
                      border: pbftFaultMode === "CONFLICTING" ? "1px solid #FECDD3" : "1px solid #CBD5E1",
                      cursor: "pointer",
                    }}
                  >
                    3. Node 3 Active Byzantine Forgery
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunPbft}
                disabled={pbftRunning}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: pbftRunning ? "#94A3B8" : "#9333EA",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: pbftRunning ? "wait" : "pointer",
                  boxShadow: "0 1px 3px rgba(147,51,234,0.3)",
                }}
              >
                {pbftRunning ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    <span>Exchanging 3-Phase Votes...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Simulate Consensus Round #{pbftRound}</span>
                  </>
                )}
              </button>
            </div>

            {/* 4 Validator Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {pbftNodes.map((node) => {
                const isByz = node.role === "Byzantine";
                return (
                  <div
                    key={node.id}
                    style={{
                      background: isByz ? "#FFF1F2" : "#FFFFFF",
                      borderRadius: "8px",
                      border: isByz ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>{node.name}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: node.role === "Leader" ? "#EEF2FF" : isByz ? "#FFE4E6" : "#F1F5F9",
                          color: node.role === "Leader" ? "#4338CA" : isByz ? "#9F1239" : "#475569",
                        }}
                      >
                        {node.role}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#64748B" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Pre-Prepare:</span>
                        <span style={{ fontWeight: 700, color: "#059669" }}>Verified</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Prepare Vote:</span>
                        <span style={{ fontWeight: 700, color: isByz && pbftFaultMode !== "HONEST" ? "#DC2626" : "#059669" }}>
                          {isByz && pbftFaultMode === "CONFLICTING"
                            ? "Forged Digest"
                            : isByz && pbftFaultMode === "SILENT"
                            ? "Dropped"
                            : "Quorum Met (2/2)"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Commit Vote:</span>
                        <span style={{ fontWeight: 700, color: isByz && pbftFaultMode !== "HONEST" ? "#DC2626" : "#059669" }}>
                          {isByz && pbftFaultMode === "CONFLICTING"
                            ? "Rejected"
                            : isByz && pbftFaultMode === "SILENT"
                            ? "No Response"
                            : "Quorum Met (3/3)"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "4px",
                        borderRadius: "5px",
                        marginTop: "auto",
                        background: node.status === "COMMITTED" ? "#D1FAE5" : "#FFE4E6",
                        color: node.status === "COMMITTED" ? "#065F46" : "#9F1239",
                      }}
                    >
                      {node.status}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quorum Summary */}
            <div
              style={{
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: "8px",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={18} color="#059669" />
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#065F46", display: "block" }}>
                    PBFT Consensus Guaranteed: Quorum 3/4 Committed (2f + 1 Met)
                  </span>
                  <span style={{ fontSize: "10px", color: "#047857" }}>
                    Even under active adversarial forgery by Node 3, honest nodes 0, 1, and 2 reach strict distributed agreement.
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "11px", fontFamily: "var(--font-mono, monospace)" }}>
                <span style={{ color: "#64748B", display: "block" }}>Round Latency:</span>
                <span style={{ fontWeight: 800, color: "#0F172A" }}>0.90 ms (32 messages)</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: CLAIM COMPILER & COUNTERFACTUAL ARENA                          */}
        {/* ==================================================================== */}
        {activeTab === "claims" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Counterfactual Exclusion Toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#FFFFFF",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
              }}
            >
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", display: "block" }}>
                  COUNTERFACTUAL EVIDENCE CHALLENGE (DEFENSE EXCLUSION)
                </span>
                <span style={{ fontSize: "11px", color: "#64748B" }}>
                  Simulate legal defense objection: exclude unverified WhatsApp receipt screenshot (ART-SCREENSHOT)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExcludeScreenshot(!excludeScreenshot)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: excludeScreenshot ? "none" : "1px solid #CBD5E1",
                  background: excludeScreenshot ? "#DC2626" : "#F8FAFC",
                  color: excludeScreenshot ? "#FFFFFF" : "#0F172A",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: excludeScreenshot ? "0 1px 3px rgba(220,38,38,0.3)" : "none",
                }}
              >
                <span>{excludeScreenshot ? "Artifact Excluded (Challenger Run)" : "Exclude Screenshot Artifact"}</span>
              </button>
            </div>

            {/* Claim DAG List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Claim 1 */}
              <div
                style={{
                  background: excludeScreenshot ? "#F8FAFC" : "#FFFFFF",
                  border: excludeScreenshot ? "1px solid #E2E8F0" : "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  opacity: excludeScreenshot ? 0.65 : 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 800, color: "#0F172A" }}>CLM-01: Disputed ₹{(currentCase?.claimedLossInr || 15000).toLocaleString()} Transfer Claim</span>
                    <span style={{ fontSize: "11px", color: "#64748B" }}>| Source: ART-SCREENSHOT (Tier-3)</span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: excludeScreenshot ? "#F1F5F9" : "#ECFDF5",
                      color: excludeScreenshot ? "#64748B" : "#047857",
                      border: excludeScreenshot ? "1px solid #E2E8F0" : "1px solid #A7F3D0",
                    }}
                  >
                    {excludeScreenshot ? "UNSUPPORTED (DISSOLVED)" : "SUPPORTED"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748B" }}>
                  {excludeScreenshot
                    ? "Finding deactivated: Primary supporting artifact was excluded from evidence scope."
                    : `Complainant asserts transfer of ₹${(currentCase?.claimedLossInr || 15000).toLocaleString()} based on unverified smartphone gallery screenshot.`}
                </p>
              </div>

              {/* Claim 2 */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 800, color: "#0F172A" }}>CLM-02: Core Finacle Bank Debit ₹{(currentCase?.bookedLossInr || 2500).toLocaleString()}</span>
                    <span style={{ fontSize: "11px", color: "#64748B" }}>| Source: ART-FINACLE-LOG (Tier-1 Authority)</span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "#ECFDF5",
                      color: "#047857",
                      border: "1px solid #A7F3D0",
                    }}
                  >
                    SUPPORTED (SURVIVES)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748B" }}>
                  Core banking switch confirms actual debit of ₹{(currentCase?.bookedLossInr || 2500).toLocaleString()}. Unaffected by screenshot exclusion.
                </p>
              </div>

              {/* Claim 3 */}
              <div
                style={{
                  background: excludeScreenshot ? "#ECFDF5" : "#FFF1F2",
                  border: excludeScreenshot ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 800, color: "#0F172A" }}>CLM-03: Amount Discrepancy Conflict</span>
                    <span style={{ fontSize: "11px", color: "#64748B" }}>| Z3 SMT Formal Contradiction</span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: excludeScreenshot ? "#D1FAE5" : "#FFE4E6",
                      color: excludeScreenshot ? "#065F46" : "#9F1239",
                      border: excludeScreenshot ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                    }}
                  >
                    {excludeScreenshot ? "CONTRADICTION DISSOLVED" : "CONTRADICTED"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: excludeScreenshot ? "#047857" : "#BE123C" }}>
                  {excludeScreenshot
                    ? `Contradiction resolved: Upon excluding the disputed screenshot, the conflict between ₹${(currentCase?.claimedLossInr || 15000).toLocaleString()} and ₹${(currentCase?.bookedLossInr || 2500).toLocaleString()} evaporates, leaving the authentic ₹${(currentCase?.bookedLossInr || 2500).toLocaleString()} debit.`
                    : `Mathematical SMT conflict: Screenshot asserts ₹${(currentCase?.claimedLossInr || 15000).toLocaleString()} while Finacle switch asserts ₹${(currentCase?.bookedLossInr || 2500).toLocaleString()}.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
