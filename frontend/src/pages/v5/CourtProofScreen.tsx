import React, { useState, useMemo } from "react";
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  FileCheck,
  Network,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import {
  BentoKpiCard,
  SegmentedPillSwitcher,
} from "../../components/tarka/BentoPrimitives";
import {
  evaluateLeaveOneOut,
  generateBsa63SplitSchedules,
  getCanonicalPaperAnchor,
  generateOfflineVerifyHtml,
  getCbiSyndicateMemo,
  type CaseArtifact,
  type AlibiChallenge,
} from "../../utils/courtProofEngine";

export const CourtProofScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<"leave-one-out" | "bsa-split" | "paper-anchor" | "cbi-aggregation">("leave-one-out");

  // Initial Case Artifacts
  const initialArtifacts: CaseArtifact[] = [
    {
      id: "art-victim-screenshot",
      name: "#01 Complainant Video Call Screenshot",
      tier: "TIER_2_CORROBORATIVE",
      custodian: "Sunil Kumar (Victim)",
      sha256: "c89148bc92019482019a84719284102948192841029481928410294819284102",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-sbi-cbs",
      name: "#02 SBI CBS Core Banking Ledger",
      tier: "TIER_1_INDEPENDENT",
      custodian: "State Bank of India (Global IT Centre)",
      sha256: "b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-npci-switch",
      name: "#03 NPCI Central UPI Switch Log",
      tier: "TIER_1_INDEPENDENT",
      custodian: "NPCI Central Gateway Node",
      sha256: "9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-airtel-cgnat",
      name: "#04 Airtel CGNAT IPDR Translation",
      tier: "TIER_1_INDEPENDENT",
      custodian: "Bharti Airtel Lawful Intercept",
      sha256: "4d71290481029481029481029481029481029481029481029481029481029481",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-whatsapp",
      name: "#05 WhatsApp Extortion Chat Export",
      tier: "TIER_2_CORROBORATIVE",
      custodian: "Complainant Cellular Handset",
      sha256: "88ab102938475610293847561029384756102938475610293847561029384756",
      isExcluded: false,
      canBeExcluded: true,
    },
  ];

  const [artifacts, setArtifacts] = useState<CaseArtifact[]>(initialArtifacts);

  const toggleArtifact = (id: string) => {
    setArtifacts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isExcluded: !a.isExcluded } : a))
    );
  };

  // Defense Alibi Challenges
  const [alibis, setAlibis] = useState<AlibiChallenge[]>([
    {
      id: "alibi-whatsapp-excluded",
      name: "WhatsApp Chat Excluded under BSA § 63",
      defenseArgument: "Defense argues WhatsApp chats lack certified device hash under Section 63(4).",
      isChallenged: false,
    },
    {
      id: "alibi-clock-drift",
      name: "Bank Finacle Clock Drifted +45s",
      defenseArgument: "Defense claims bank transaction time does not synchronize with telecom switch.",
      isChallenged: false,
    },
    {
      id: "alibi-someone-else",
      name: "Someone Else Held the Phone",
      defenseArgument: "Defense claims physical possession of cellular handset was transferred.",
      isChallenged: false,
    },
  ]);

  const toggleAlibi = (id: string) => {
    setAlibis((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isChallenged: !a.isChallenged } : a))
    );
  };

  // Evaluate LOO
  const looResult = useMemo(() => {
    return evaluateLeaveOneOut(artifacts, alibis);
  }, [artifacts, alibis]);

  // BSA Section 63 Split Schedules
  const bsaSchedules = useMemo(() => {
    return generateBsa63SplitSchedules("CASE-2026-001");
  }, []);

  // 24-Word Paper Anchor Bundle
  const paperAnchor = useMemo(() => {
    const canonical = getCanonicalPaperAnchor("CASE-2026-001");
    if (mutations.flipCustodyByte || mutations.ledgerBitFlip) {
      return {
        ...canonical,
        merkleRootSha256: "CORRUPTED_ROOT_HASH_BIT_FLIPPED_AT_SEQ_004",
        ed25519SignatureHex: "INVALID_ED25519_SIGNATURE_DIGEST_MISMATCH",
      };
    }
    return canonical;
  }, [mutations.flipCustodyByte, mutations.ledgerBitFlip]);

  // CBI Syndicate Cluster
  const cbiMemo = useMemo(() => {
    return getCbiSyndicateMemo();
  }, []);

  // Copy State
  const [copiedSchedule, setCopiedSchedule] = useState<string | null>(null);
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSchedule(id);
    setTimeout(() => setCopiedSchedule(null), 2000);
  };

  // Download verify.html
  const handleDownloadVerify = () => {
    const html = generateOfflineVerifyHtml(paperAnchor);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verify.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px", overflowY: "auto", height: "calc(100vh - 120px)" }}>
      {/* 1. Header & Tab Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className="bento-badge bento-badge-blue">
              <Scale size={11} /> SCREEN 4: ADVERSARIAL COURT PROOF
            </span>
            <span className="bento-badge bento-badge-neutral font-mono-tabular">
              BSA § 63(4) & PUNE BAR COMPLIANT
            </span>
          </div>
          <h1 style={{ margin: "2px 0 4px", fontSize: "22px", fontWeight: 700, color: "var(--bento-text-main)", letterSpacing: "-0.5px" }}>
            Adversarial Stress-Testing & Cryptographic Paper Anchor
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--bento-text-muted)", maxWidth: "800px", lineHeight: 1.5 }}>
            Leave-One-Out (LOO) evidence survival stress-testing, BSA Section 63(4) split schedules (Part A Custodian + Part B Forensic Expert), 24-word BIP-39 physical court anchor, and ₹10-Crore CBI multi-state syndicate blind indexing.
          </p>
        </div>

        <SegmentedPillSwitcher
          options={[
            { id: "leave-one-out", label: "Leave-One-Out Stress" },
            { id: "bsa-split", label: "BSA § 63(4) Split Drafts" },
            { id: "paper-anchor", label: "Ed25519 Paper Anchor" },
            { id: "cbi-aggregation", label: "₹10-Cr CBI Syndicate" },
          ]}
          activeId={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </div>

      {/* 2. Top 4 Bento KPI Cards */}
      <div className="bento-grid-4">
        <BentoKpiCard
          title="PROSECUTION CONFIDENCE SCORE"
          metric={`${looResult.confidenceScore}%`}
          metricColor={looResult.proofSurvives ? "var(--bento-emerald)" : "var(--bento-crimson)"}
          delta={{
            value: looResult.proofSurvives ? "SURVIVES DEFENSE CHALLENGE" : "FATAL EVIDENCE DEFECT",
            isPositive: looResult.proofSurvives,
            isWarning: !looResult.proofSurvives,
            label: "Beyond Reasonable Doubt",
          }}
          subtitle="Tier-1 Independent Record Baseline"
          icon={Scale}
          iconColor={looResult.proofSurvives ? "var(--bento-emerald)" : "var(--bento-crimson)"}
          iconBg={looResult.proofSurvives ? "var(--bento-emerald-subtle)" : "var(--bento-crimson-subtle)"}
        />

        <BentoKpiCard
          title="TIER-1 INDEPENDENT RECORDS"
          metric={`${looResult.tier1Count} OF 3 ACTIVE`}
          metricColor="var(--bento-indigo)"
          delta={{
            value: "STATUTORY PRECEDENT",
            isPositive: true,
            label: "Arjun Panditrao Khotkar SAT",
          }}
          subtitle="CBS + NPCI + CGNAT IPDR"
          icon={FileCheck}
          iconColor="var(--bento-indigo)"
          iconBg="var(--bento-indigo-subtle)"
        />

        <BentoKpiCard
          title="PUNE BAR COMPLIANCE"
          metric="CERTIFIED SAT"
          metricColor="var(--bento-emerald)"
          delta={{
            value: "PART A + PART B SPLIT",
            isPositive: true,
            label: "Write-blocker serial declared",
          }}
          subtitle="BSA Section 63 Mandate"
          icon={ShieldCheck}
          iconColor="var(--bento-emerald)"
          iconBg="var(--bento-emerald-subtle)"
        />

        <BentoKpiCard
          title="CBI SYNDICATE SCALE"
          metric={cbiMemo.totalLossCroresStr}
          metricColor="var(--bento-crimson)"
          delta={{
            value: `${cbiMemo.linkedFirCount} LINKED FIRS`,
            isWarning: true,
            label: "4 States (Delhi, MH, KA, UP)",
          }}
          subtitle="Salted Blind-Index Nexus"
          icon={Network}
          iconColor="var(--bento-crimson)"
          iconBg="var(--bento-crimson-subtle)"
        />
      </div>

      {/* 3. SUB-TAB 1: Leave-One-Out Stress Tester */}
      {activeTab === "leave-one-out" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Status Alert Banner */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: looResult.proofSurvives ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: looResult.proofSurvives ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {looResult.proofSurvives ? (
                <CheckCircle2 size={24} color="#10B981" />
              ) : (
                <ShieldAlert size={24} color="#EF4444" />
              )}
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: looResult.proofSurvives ? "#059669" : "#DC2626" }}>
                  {looResult.proofSurvives
                    ? "PROOF SURVIVES ADVERSARIAL STRESS TEST (TIER-1 ANCHORED)"
                    : "ADMISSIBILITY BREACH: CRITICAL TIER-1 RECORD EXCLUDED"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginTop: "2px" }}>
                  Active Evidence Artifacts: <strong className="font-mono-tabular">{looResult.activeArtifactsCount} of 5</strong> | Attribution Survival: <strong className="font-mono-tabular">{looResult.attributionSurvives ? "SAT" : "UNSAT"}</strong> | Taint Survival: <strong className="font-mono-tabular">{looResult.taintSurvives ? "SAT" : "UNSAT"}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setArtifacts(initialArtifacts)}
              className="bento-btn bento-btn-secondary bento-btn-sm"
            >
              <RotateCcw size={12} />
              <span>Reset Evidence Matrix</span>
            </button>
          </div>

          {/* Interactive Evidence Matrix */}
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "4px" }}>
              Leave-One-Out Artifact Ingestion Matrix
            </div>
            <p style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginBottom: "16px" }}>
              Uncheck any artifact to simulate a successful defense motion to exclude evidence under BSA Section 63(4). Observe how the state&apos;s case re-evaluates.
            </p>

            {/* Defense Alibi Hypothesis Toggles */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--bento-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                Defense Cross-Examination Alibi Challenges (1-Click Test):
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {alibis.map((alibi) => (
                  <button
                    key={alibi.id}
                    type="button"
                    onClick={() => toggleAlibi(alibi.id)}
                    className={`bento-btn bento-btn-sm ${alibi.isChallenged ? "bento-btn-primary" : "bento-btn-secondary"}`}
                    style={{
                      background: alibi.isChallenged ? "#DC2626" : undefined,
                      borderColor: alibi.isChallenged ? "#DC2626" : undefined,
                    }}
                  >
                    <span>{alibi.name}</span>
                    {alibi.isChallenged && <span className="bento-badge bento-badge-coral font-mono-tabular">CHALLENGED</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {artifacts.map((art) => (
                <div
                  key={art.id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: art.isExcluded ? "1px dashed var(--bento-border-subtle)" : "1px solid var(--bento-border-subtle)",
                    background: art.isExcluded ? "rgba(0,0,0,0.02)" : "var(--bento-card-bg)",
                    opacity: art.isExcluded ? 0.5 : 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="checkbox"
                      checked={!art.isExcluded}
                      onChange={() => toggleArtifact(art.id)}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563EB" }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                          {art.name}
                        </span>
                        <span className={`bento-badge ${art.tier === "TIER_1_INDEPENDENT" ? "bento-badge-emerald" : "bento-badge-amber"}`}>
                          {art.tier}
                        </span>
                        {art.isExcluded && <span className="bento-badge bento-badge-coral font-mono-tabular">EXCLUDED</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--bento-text-muted)", marginTop: "2px" }} className="font-mono-tabular">
                        Custodian: {art.custodian} | SHA-256: {art.sha256.slice(0, 24)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Cross-Examination Rebuttal */}
            <div style={{ padding: "16px", borderRadius: "8px", background: "#0F172A", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#38BDF8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                AUTOMATED PROSECUTOR CROSS-EXAMINATION REBUTTAL:
              </div>
              <div style={{ fontSize: "12px", color: "#F8FAFC", lineHeight: 1.6, fontFamily: "var(--font-mono)" }}>
                {looResult.prosecutorRebuttal}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: BSA § 63(4) Split Drafts */}
      {activeTab === "bsa-split" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "4px" }}>
              BSA Section 63(4) Split Certificate Generator (Pune Bar Association Mandate)
            </div>
            <p style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginBottom: "16px" }}>
              Separates Schedule &apos;A&apos; (Device/Server Custodian) from Schedule &apos;B&apos; (Certified Independent Forensic Examiner), complying with 2026 Supreme Court and Pune Bar Association advisories.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Part A: Bank Nodal */}
              <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid var(--bento-border-subtle)", background: "var(--bento-card-bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <span className="bento-badge bento-badge-blue">SCHEDULE &apos;A&apos; (CUSTODIAN)</span>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main)", marginTop: "4px" }}>
                      Bank Nodal CBS Administrator
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(bsaSchedules.partA_BankNodal, "partA_cbs")}
                    className="bento-btn bento-btn-secondary bento-btn-sm"
                  >
                    {copiedSchedule === "partA_cbs" ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>{copiedSchedule === "partA_cbs" ? "Copied" : "Copy Schedule"}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  value={bsaSchedules.partA_BankNodal}
                  style={{
                    width: "100%",
                    height: "220px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "#0F172A",
                    color: "#94A3B8",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    resize: "none",
                  }}
                />
              </div>

              {/* Part B: Forensic Expert */}
              <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid var(--bento-border-subtle)", background: "var(--bento-card-bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <span className="bento-badge bento-badge-emerald">SCHEDULE &apos;B&apos; (EXPERT)</span>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main)", marginTop: "4px" }}>
                      MeitY Empanelled Forensic Examiner
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(bsaSchedules.partB_ForensicExpert, "partB_expert")}
                    className="bento-btn bento-btn-secondary bento-btn-sm"
                  >
                    {copiedSchedule === "partB_expert" ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>{copiedSchedule === "partB_expert" ? "Copied" : "Copy Schedule"}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  value={bsaSchedules.partB_ForensicExpert}
                  style={{
                    width: "100%",
                    height: "220px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--bento-border-subtle)",
                    background: "#0F172A",
                    color: "#94A3B8",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    resize: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 3: Ed25519 Paper Anchor */}
      {activeTab === "paper-anchor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)" }}>
                  Ed25519 Cryptographic Proof Bundle & 24-Word BIP-39 Paper Anchor
                </div>
                <div style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Provides air-gapped cryptographic anchors that can be printed and sealed in court evidence lockers.
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => toggleMutation("flipCustodyByte")}
                  className={`bento-btn bento-btn-sm ${mutations.flipCustodyByte ? "bento-btn-primary" : "bento-btn-secondary"}`}
                  style={{
                    background: mutations.flipCustodyByte ? "#DC2626" : undefined,
                    borderColor: mutations.flipCustodyByte ? "#DC2626" : undefined,
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>{mutations.flipCustodyByte ? "Revert Custody Bit-Flip" : "Simulate 1-Bit Ledger Tamper (Seq #4)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadVerify}
                  className="bento-btn bento-btn-primary bento-btn-sm"
                >
                  <Download size={13} />
                  <span>Download Standalone verify.html</span>
                </button>
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background: mutations.flipCustodyByte ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)",
                border: mutations.flipCustodyByte ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className={`bento-badge ${mutations.flipCustodyByte ? "bento-badge-coral" : "bento-badge-emerald"}`}>
                  {mutations.flipCustodyByte ? "LEDGER CORRUPTED (BIT-FLIP DETECTED)" : "CRYPTOGRAPHIC CUSTODY PRISTINE"}
                </span>
                <span style={{ fontSize: "12px", color: "var(--bento-text-muted)" }}>
                  Generated: <strong className="font-mono-tabular">{paperAnchor.generatedAtIST}</strong>
                </span>
              </div>

              <div className="bento-grid-4" style={{ marginTop: "12px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Canonical Merkle Root SHA-256</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: mutations.flipCustodyByte ? "#DC2626" : "#059669" }} className="font-mono-tabular">
                    {paperAnchor.merkleRootSha256}
                  </div>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: "11px", color: "var(--bento-text-muted)" }}>Ed25519 Custodial Signature</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-main)", overflow: "hidden", textOverflow: "ellipsis" }} className="font-mono-tabular">
                    {paperAnchor.ed25519SignatureHex.slice(0, 48)}...
                  </div>
                </div>
              </div>
            </div>

            {/* 24-Word BIP-39 Grid */}
            <div style={{ padding: "16px", borderRadius: "10px", background: "var(--bento-card-bg)", border: "1px solid var(--bento-border-subtle)" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "12px" }}>
                24-Word BIP-39 Physical Court Custody Mnemonic:
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
                {paperAnchor.bip39Mnemonic.map((word, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px",
                      borderRadius: "6px",
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid var(--bento-border-subtle)",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "10px", color: "var(--bento-text-muted)" }} className="font-mono-tabular">
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <strong className="font-mono-tabular">{word}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 4: CBI Syndicate Aggregation */}
      {activeTab === "cbi-aggregation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="bento-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--bento-text-main)", marginBottom: "4px" }}>
              Salted Blind-Index (HMAC-SHA256) ₹10-Crore Multi-State CBI Syndicate Aggregation
            </div>
            <p style={{ fontSize: "12px", color: "var(--bento-text-muted)", marginBottom: "16px" }}>
              Demonstrates cross-jurisdiction correlation across 4 state police cyber cells (Delhi, Maharashtra, Karnataka, Uttar Pradesh) using cryptographic blind indexes without sharing unredacted PII across state lines.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {cbiMemo.blindIndexedEntities.map((ent, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid var(--bento-border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="bento-badge bento-badge-blue">{ent.entityType}</span>
                      <code className="font-mono-tabular" style={{ fontSize: "12px", color: "var(--bento-text-main)", fontWeight: 700 }}>
                        {ent.blindIndexHash}
                      </code>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--bento-text-muted)", marginTop: "4px" }}>
                      Linked FIR Jurisdictions: {ent.locations.join(" • ")}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", color: "var(--bento-text-muted)", textTransform: "uppercase" }}>
                      Cross-FIR Matches
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#2563EB" }} className="font-mono-tabular">
                      {ent.matchesCount} Multi-State FIRs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
