import React, { useState } from "react";
import { GitBranch, AlertTriangle, CheckCircle, XCircle, HelpCircle, ArrowRight, RefreshCw } from "lucide-react";

export interface EvidenceArtifactItem {
  id: string;
  name: string;
  sourceType: string;
  hash: string;
  isExcluded: boolean;
  dependentClaimIds: string[];
}

export interface ClaimImpactItem {
  claimId: string;
  statement: string;
  baselineState: "SUPPORTED" | "CONTRADICTED" | "UNCERTAIN" | "UNSUPPORTED";
  simulatedState: "SUPPORTED" | "CONTRADICTED" | "UNCERTAIN" | "UNSUPPORTED";
  formalSolverStatus: "SAT" | "UNSAT" | "UNKNOWN";
  affectedByAblation: boolean;
  explanation: string;
}

interface ClaimDependencyLensProps {
  caseId: string;
  onExecuteAblation?: (excludedIds: string[]) => Promise<void>;
  className?: string;
}

const DEFAULT_ARTIFACTS: EvidenceArtifactItem[] = [
  {
    id: "ART-BANK-001",
    name: "HDFC Primary Current Account Statement (A/C 99182)",
    sourceType: "BANK_STATEMENT_XLSX",
    hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    isExcluded: false,
    dependentClaimIds: ["CLM-001", "CLM-002", "CLM-004"],
  },
  {
    id: "ART-CDR-002",
    name: "Gurugram Tower Call Detail Record (SIM 98110-XXXXX)",
    sourceType: "CDR_TELECOM_CSV",
    hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    isExcluded: false,
    dependentClaimIds: ["CLM-002", "CLM-003"],
  },
  {
    id: "ART-IPDR-003",
    name: "ISP NAT Translation Log (Port 18420)",
    sourceType: "IPDR_LOG_JSON",
    hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    isExcluded: false,
    dependentClaimIds: ["CLM-003"],
  },
  {
    id: "ART-PASSPORT-004",
    name: "Bureau of Immigration Exit Stamp (IGI Terminal 3)",
    sourceType: "IMMIGRATION_RECORD_PDF",
    hash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    isExcluded: false,
    dependentClaimIds: ["CLM-003"],
  },
];

const DEFAULT_CLAIMS: ClaimImpactItem[] = [
  {
    claimId: "CLM-001",
    statement: "Accused A/C 99182 received INR 1,84,000 directly from victim's account within 9 minutes of call initiation.",
    baselineState: "SUPPORTED",
    simulatedState: "SUPPORTED",
    formalSolverStatus: "SAT",
    affectedByAblation: false,
    explanation: "Grounding rests strictly on primary bank ledger artifact ART-BANK-001.",
  },
  {
    claimId: "CLM-002",
    statement: "Fund transfer coincides temporally with device handover registered at Gurugram Cell Tower 981.",
    baselineState: "SUPPORTED",
    simulatedState: "SUPPORTED",
    formalSolverStatus: "SAT",
    affectedByAblation: false,
    explanation: "Multi-modal correlation between ART-BANK-001 and ART-CDR-002.",
  },
  {
    claimId: "CLM-003",
    statement: "Physical presence of Primary Accused in NCR at time of transaction execution is conclusively established.",
    baselineState: "CONTRADICTED",
    simulatedState: "CONTRADICTED",
    formalSolverStatus: "UNSAT",
    affectedByAblation: false,
    explanation: "Direct formal contradiction: Immigration exit record contradicts tower ping; Z3 solver yields UNSAT.",
  },
  {
    claimId: "CLM-004",
    statement: "Layer-2 mule dispersal transferred INR 1,20,000 into crypto-offramp merchant gateway.",
    baselineState: "SUPPORTED",
    simulatedState: "SUPPORTED",
    formalSolverStatus: "SAT",
    affectedByAblation: false,
    explanation: "Consolidated ledger trail from ART-BANK-001 to secondary beneficiary accounts.",
  },
];

export const ClaimDependencyLens: React.FC<ClaimDependencyLensProps> = ({
  caseId,
  onExecuteAblation,
  className = "",
}) => {
  const [artifacts, setArtifacts] = useState<EvidenceArtifactItem[]>(DEFAULT_ARTIFACTS);
  const [claims, setClaims] = useState<ClaimImpactItem[]>(DEFAULT_CLAIMS);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const toggleArtifact = (artId: string) => {
    const updated = artifacts.map((a) => (a.id === artId ? { ...a, isExcluded: !a.isExcluded } : a));
    setArtifacts(updated);

    // Recompute simulated impact
    const excludedIds = updated.filter((a) => a.isExcluded).map((a) => a.id);
    recomputeImpact(excludedIds);
  };

  const recomputeImpact = (excludedIds: string[]) => {
    const updatedClaims = DEFAULT_CLAIMS.map((claim) => {
      let simulatedState = claim.baselineState;
      let formalSolverStatus = claim.formalSolverStatus;
      let affected = false;

      if (excludedIds.includes("ART-BANK-001")) {
        if (claim.claimId === "CLM-001" || claim.claimId === "CLM-004") {
          simulatedState = "UNSUPPORTED";
          formalSolverStatus = "UNKNOWN";
          affected = true;
        } else if (claim.claimId === "CLM-002") {
          simulatedState = "UNCERTAIN";
          affected = true;
        }
      }

      if (excludedIds.includes("ART-PASSPORT-004")) {
        if (claim.claimId === "CLM-003") {
          // If passport record is removed, the contradiction disappears!
          simulatedState = "SUPPORTED";
          formalSolverStatus = "SAT";
          affected = true;
        }
      }

      if (excludedIds.includes("ART-CDR-002")) {
        if (claim.claimId === "CLM-002") {
          simulatedState = "UNSUPPORTED";
          affected = true;
        }
      }

      return {
        ...claim,
        simulatedState,
        formalSolverStatus,
        affectedByAblation: affected,
      };
    });

    setClaims(updatedClaims);
  };

  const handleRunBackendChallenge = async () => {
    setIsSimulating(true);
    const excludedIds = artifacts.filter((a) => a.isExcluded).map((a) => a.id);
    if (onExecuteAblation) {
      await onExecuteAblation(excludedIds);
    }
    setTimeout(() => {
      setIsSimulating(false);
    }, 400);
  };

  const getStateBadge = (state: ClaimImpactItem["simulatedState"]) => {
    switch (state) {
      case "SUPPORTED":
        return { label: "SUPPORTED", bg: "rgba(200, 247, 81, 0.14)", text: "#C8F751", border: "rgba(200, 247, 81, 0.35)", icon: <CheckCircle size={11} /> };
      case "CONTRADICTED":
        return { label: "CONTRADICTED", bg: "rgba(182, 91, 72, 0.15)", text: "#B65B48", border: "rgba(182, 91, 72, 0.35)", icon: <AlertTriangle size={11} /> };
      case "UNCERTAIN":
        return { label: "UNCERTAIN", bg: "rgba(82, 124, 154, 0.15)", text: "#527C9A", border: "rgba(82, 124, 154, 0.35)", icon: <HelpCircle size={11} /> };
      case "UNSUPPORTED":
        return { label: "COLLAPSED", bg: "rgba(255, 255, 255, 0.05)", text: "#9CA3AF", border: "rgba(255, 255, 255, 0.15)", icon: <XCircle size={11} /> };
    }
  };

  const excludedCount = artifacts.filter((a) => a.isExcluded).length;
  const flippedCount = claims.filter((c) => c.affectedByAblation).length;

  return (
    <div
      className={`claim-dependency-lens ${className}`}
      style={{
        background: "var(--surface-primary, #152220)",
        border: "1px solid var(--border-structural, rgba(107, 119, 112, 0.35))",
        borderRadius: "10px",
        padding: "16px",
        color: "var(--text-primary, #F4F6F4)",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle, rgba(107, 119, 112, 0.18))", paddingBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <GitBranch size={18} style={{ color: "var(--fieldnote-signal-lime, #C8F751)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "0.02em" }}>
              CLAIM DEPENDENCY LENS & COUNTERFACTUAL ABLATION
            </h3>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "rgba(200, 247, 81, 0.12)",
                color: "#C8F751",
                border: "1px solid rgba(200, 247, 81, 0.32)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              FORMAL SMT IMPACT RE-EVALUATION
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary, #A3B1AA)" }}>
            Ablate individual evidence pieces to observe formal constraint satisfaction and finding stability under counterfactual challenges for Case <span style={{ color: "#C8F751", fontFamily: "var(--font-mono, monospace)" }}>{caseId}</span>.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {excludedCount > 0 && (
            <button
              onClick={() => {
                const reset = artifacts.map((a) => ({ ...a, isExcluded: false }));
                setArtifacts(reset);
                recomputeImpact([]);
              }}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                background: "transparent",
                color: "var(--text-secondary, #A3B1AA)",
                border: "1px solid var(--border-subtle, rgba(107, 119, 112, 0.3))",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Reset All
            </button>
          )}
          <button
            onClick={handleRunBackendChallenge}
            disabled={isSimulating}
            style={{
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              background: "var(--fieldnote-signal-lime, #C8F751)",
              color: "#101918",
              border: "none",
              borderRadius: "4px",
              cursor: isSimulating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={12} className={isSimulating ? "spin-animate" : ""} />
            {isSimulating ? "Solving Z3 Constraints..." : "Commit Challenge to Backend"}
          </button>
        </div>
      </div>

      {/* Main Grid: Artifact Ablator on Left, Claim Impact Matrix on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "16px" }}>
        {/* Left: Artifact Toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary, #A3B1AA)", textTransform: "uppercase" }}>
              Case Artifact Ledger ({artifacts.length})
            </span>
            <span style={{ fontSize: "10px", color: excludedCount > 0 ? "#B65B48" : "#6B7770", fontFamily: "var(--font-mono, monospace)" }}>
              {excludedCount} Ablated
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {artifacts.map((art) => (
              <div
                key={art.id}
                onClick={() => toggleArtifact(art.id)}
                style={{
                  background: art.isExcluded ? "rgba(182, 91, 72, 0.12)" : "rgba(0, 0, 0, 0.25)",
                  border: art.isExcluded ? "1px solid rgba(182, 91, 72, 0.45)" : "1px solid rgba(107, 119, 112, 0.25)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      background: art.isExcluded ? "rgba(182, 91, 72, 0.2)" : "rgba(82, 124, 154, 0.2)",
                      color: art.isExcluded ? "#B65B48" : "#527C9A",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {art.sourceType}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: art.isExcluded ? "#B65B48" : "#C8F751",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {art.isExcluded ? "EXCLUDED [ABLATED]" : "INCLUDED [ACTIVE]"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: art.isExcluded ? "var(--text-muted, #6B7770)" : "#F4F6F4", textDecoration: art.isExcluded ? "line-through" : "none" }}>
                  {art.name}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
                  {art.id} • {art.dependentClaimIds.length} dependent claim(s)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Claim Impact Matrix */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary, #A3B1AA)", textTransform: "uppercase" }}>
              Formal SMT Claim Re-evaluation Matrix
            </span>
            <span style={{ fontSize: "11px", color: flippedCount > 0 ? "#C8F751" : "#6B7770", fontFamily: "var(--font-mono, monospace)" }}>
              {flippedCount} finding state{flippedCount === 1 ? "" : "s"} mutated
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {claims.map((claim) => {
              const badge = getStateBadge(claim.simulatedState);
              const baselineBadge = getStateBadge(claim.baselineState);

              return (
                <div
                  key={claim.claimId}
                  style={{
                    background: claim.affectedByAblation ? "rgba(200, 247, 81, 0.05)" : "rgba(0, 0, 0, 0.2)",
                    border: claim.affectedByAblation ? "1px solid rgba(200, 247, 81, 0.35)" : "1px solid rgba(107, 119, 112, 0.2)",
                    borderRadius: "6px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)" }}>
                        {claim.claimId}
                      </span>
                      {claim.affectedByAblation && (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: "rgba(200, 247, 81, 0.2)",
                            color: "#C8F751",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        >
                          STATE SHIFTED
                        </span>
                      )}
                    </div>

                    {/* Before -> After Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "10px", color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)" }}>
                        {baselineBadge.label}
                      </span>
                      <ArrowRight size={10} style={{ color: "var(--text-muted, #6B7770)" }} />
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: "4px 0 6px", fontSize: "12px", lineHeight: "1.4", color: "#F4F6F4" }}>
                    {claim.statement}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "var(--text-muted, #6B7770)", fontFamily: "var(--font-mono, monospace)" }}>
                    <span>Z3 Solver: <strong>{claim.formalSolverStatus}</strong></span>
                    <span>{claim.explanation}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
