import React, { useState, useEffect } from "react";
import { GitBranch, AlertTriangle, CheckCircle, XCircle, HelpCircle, ArrowRight, RefreshCw } from "lucide-react";
import { sha256HexSync } from "../../utils/sha256";

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
  artifacts?: EvidenceArtifactItem[];
  claims?: ClaimImpactItem[];
}

const DEFAULT_ARTIFACTS: EvidenceArtifactItem[] = [
  {
    id: "ART-BANK-001",
    name: "HDFC Primary Current Account Statement (A/C 99182)",
    sourceType: "BANK_STATEMENT_XLSX",
    hash: sha256HexSync("HDFC Primary Current Account Statement (A/C 99182)"),
    isExcluded: false,
    dependentClaimIds: ["CLM-001", "CLM-002", "CLM-004"],
  },
  {
    id: "ART-CDR-002",
    name: "Gurugram Tower Call Detail Record (SIM 98110-XXXXX)",
    sourceType: "CDR_TELECOM_CSV",
    hash: sha256HexSync("Gurugram Tower Call Detail Record (SIM 98110-XXXXX)"),
    isExcluded: false,
    dependentClaimIds: ["CLM-002", "CLM-003"],
  },
  {
    id: "ART-IPDR-003",
    name: "ISP NAT Translation Log (Port 18420)",
    sourceType: "IPDR_LOG_JSON",
    hash: sha256HexSync("ISP NAT Translation Log (Port 18420)"),
    isExcluded: false,
    dependentClaimIds: ["CLM-003"],
  },
  {
    id: "ART-PASSPORT-004",
    name: "Bureau of Immigration Exit Stamp (IGI Terminal 3)",
    sourceType: "IMMIGRATION_RECORD_PDF",
    hash: sha256HexSync("Bureau of Immigration Exit Stamp (IGI Terminal 3)"),
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
  artifacts: propArtifacts,
  claims: propClaims,
}) => {
  const [artifacts, setArtifacts] = useState<EvidenceArtifactItem[]>(propArtifacts || DEFAULT_ARTIFACTS);
  const [claims, setClaims] = useState<ClaimImpactItem[]>(propClaims || DEFAULT_CLAIMS);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    if (propArtifacts) setArtifacts(propArtifacts);
    if (propClaims) setClaims(propClaims);
  }, [propArtifacts, propClaims]);

  const toggleArtifact = (artId: string) => {
    const updated = artifacts.map((a) => (a.id === artId ? { ...a, isExcluded: !a.isExcluded } : a));
    setArtifacts(updated);

    // Recompute simulated impact
    const excludedIds = updated.filter((a) => a.isExcluded).map((a) => a.id);
    recomputeImpact(excludedIds, updated);
  };

  const recomputeImpact = (excludedIds: string[], currentArtifacts = artifacts) => {
    const baseClaims = propClaims || DEFAULT_CLAIMS;
    const updatedClaims = baseClaims.map((claim) => {
      let simulatedState = claim.baselineState;
      let formalSolverStatus = claim.formalSolverStatus;
      let affected = false;

      // Find if any artifact that this claim depends on is excluded
      const excludedDependencies = currentArtifacts.filter(
        (a) => excludedIds.includes(a.id) && a.dependentClaimIds.includes(claim.claimId)
      );

      if (excludedDependencies.length > 0) {
        if (claim.baselineState === "CONTRADICTED") {
          // If the contradicting artifact is removed, contradiction clears!
          simulatedState = "SUPPORTED";
          formalSolverStatus = "SAT";
          affected = true;
        } else {
          simulatedState = "UNSUPPORTED";
          formalSolverStatus = "UNKNOWN";
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
        return {
          label: "SUPPORTED",
          bg: "#ECFDF5",
          text: "#059669",
          border: "#A7F3D0",
          icon: <CheckCircle size={11} />,
        };
      case "CONTRADICTED":
        return {
          label: "CONTRADICTED",
          bg: "#FFF1F2",
          text: "#BE123C",
          border: "#FECDD3",
          icon: <AlertTriangle size={11} />,
        };
      case "UNCERTAIN":
        return {
          label: "UNCERTAIN",
          bg: "#EFF6FF",
          text: "#2563EB",
          border: "#BFDBFE",
          icon: <HelpCircle size={11} />,
        };
      case "UNSUPPORTED":
        return {
          label: "COLLAPSED",
          bg: "#F1F5F9",
          text: "#475569",
          border: "#CBD5E1",
          icon: <XCircle size={11} />,
        };
    }
  };

  const excludedCount = artifacts.filter((a) => a.isExcluded).length;
  const flippedCount = claims.filter((c) => c.affectedByAblation).length;

  return (
    <div
      className={`claim-dependency-lens ${className}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        padding: "16px",
        color: "#0F172A",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          borderBottom: "1px solid #E2E8F0",
          paddingBottom: "12px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <GitBranch size={18} color="#4F46E5" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.01em", color: "#0F172A" }}>
              CLAIM DEPENDENCY LENS & COUNTERFACTUAL ABLATION
            </h3>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#EEF2FF",
                color: "#4F46E5",
                border: "1px solid #C7D2FE",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              FORMAL SMT IMPACT RE-EVALUATION
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}>
            Ablate individual evidence pieces to observe formal constraint satisfaction and finding stability under counterfactual challenges for Case{" "}
            <span style={{ color: "#4F46E5", fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>
              {caseId}
            </span>.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {excludedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                const reset = artifacts.map((a) => ({ ...a, isExcluded: false }));
                setArtifacts(reset);
                recomputeImpact([]);
              }}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: 600,
                background: "#F8FAFC",
                color: "#475569",
                border: "1px solid #CBD5E1",
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.12s ease",
              }}
            >
              Reset All
            </button>
          )}

          <button
            type="button"
            onClick={handleRunBackendChallenge}
            disabled={isSimulating}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 700,
              background: isSimulating ? "#94A3B8" : "#4F46E5",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "5px",
              cursor: isSimulating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
              transition: "all 0.12s ease",
            }}
          >
            <RefreshCw size={12} style={{ animation: isSimulating ? "spin 1s linear infinite" : undefined }} />
            {isSimulating ? "Solving Z3 Constraints..." : "Commit Challenge to Backend"}
          </button>
        </div>
      </div>

      {/* 2. Main Grid: Artifact Ablator on Left, Claim Impact Matrix on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "16px" }}>
        {/* Left: Artifact Toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#334155",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Case Artifact Ledger ({artifacts.length})
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: excludedCount > 0 ? "#BE123C" : "#64748B",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {excludedCount} Ablated
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {artifacts.map((art) => (
              <div
                key={art.id}
                onClick={() => toggleArtifact(art.id)}
                style={{
                  background: art.isExcluded ? "#FFF1F2" : "#FFFFFF",
                  border: art.isExcluded ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: art.isExcluded ? "#F1F5F9" : "#EEF2FF",
                      color: art.isExcluded ? "#64748B" : "#4F46E5",
                      border: `1px solid ${art.isExcluded ? "#E2E8F0" : "#C7D2FE"}`,
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {art.sourceType}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: art.isExcluded ? "#FFE4E6" : "#ECFDF5",
                      color: art.isExcluded ? "#BE123C" : "#059669",
                      border: `1px solid ${art.isExcluded ? "#FECDD3" : "#A7F3D0"}`,
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {art.isExcluded ? "EXCLUDED [ABLATED]" : "INCLUDED [ACTIVE]"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: art.isExcluded ? "#94A3B8" : "#0F172A",
                    textDecoration: art.isExcluded ? "line-through" : "none",
                  }}
                >
                  {art.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    fontFamily: "var(--font-mono, monospace)",
                    marginTop: "4px",
                  }}
                >
                  {art.id} • {art.dependentClaimIds.length} dependent claim(s)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Claim Impact Matrix */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#334155",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Formal SMT Claim Re-evaluation Matrix
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: flippedCount > 0 ? "#D97706" : "#64748B",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
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
                    background: claim.affectedByAblation ? "#FFFBEB" : "#FFFFFF",
                    border: claim.affectedByAblation ? "1px solid #FDE68A" : "1px solid #E2E8F0",
                    borderRadius: "6px",
                    padding: "12px",
                    boxShadow: claim.affectedByAblation
                      ? "0 1px 3px rgba(217, 119, 6, 0.08)"
                      : "0 1px 2px rgba(0,0,0,0.02)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#64748B",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {claim.claimId}
                      </span>
                      {claim.affectedByAblation && (
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            background: "#FEF3C7",
                            color: "#B45309",
                            border: "1px solid #FDE68A",
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
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748B",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {baselineBadge.label}
                      </span>
                      <ArrowRight size={10} color="#94A3B8" />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "2px 7px",
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

                  <p style={{ margin: "4px 0 6px", fontSize: "12px", lineHeight: "1.45", color: "#0F172A" }}>
                    {claim.statement}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                      color: "#64748B",
                      fontFamily: "var(--font-mono, monospace)",
                      paddingTop: "6px",
                      borderTop: "1px solid #F1F5F9",
                    }}
                  >
                    <span>
                      Z3 Solver:{" "}
                      <strong
                        style={{
                          color:
                            claim.formalSolverStatus === "SAT"
                              ? "#059669"
                              : claim.formalSolverStatus === "UNSAT"
                              ? "#BE123C"
                              : "#B45309",
                        }}
                      >
                        {claim.formalSolverStatus}
                      </strong>
                    </span>
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
