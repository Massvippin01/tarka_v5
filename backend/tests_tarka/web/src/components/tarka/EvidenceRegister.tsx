import React, { useState } from "react";
import {
  Boxes,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Shield,
} from "lucide-react";
import type { ArtifactIntake } from "../../types/forensics";
import { forensicsApi } from "../../api/forensicsApi";

interface EvidenceRegisterProps {
  caseId: string;
  artifacts: ArtifactIntake[];
  onRefresh?: () => void;
  className?: string;
  onSelectArtifact?: (art: ArtifactIntake) => void;
  selectedArtifactId?: string;
}

export const EvidenceRegister: React.FC<EvidenceRegisterProps> = ({
  caseId,
  artifacts,
  onRefresh,
  className = "",
  onSelectArtifact,
  selectedArtifactId,
}) => {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<
    Record<string, { verified?: boolean; stored_hash?: string; calculated_hash?: string; bitstream_intact?: boolean; bitstream_verified?: boolean; error?: string }>
  >({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleVerify = async (e: React.MouseEvent, artifactId: string) => {
    e.stopPropagation();
    setVerifyingId(artifactId);
    try {
      const res = await forensicsApi.verifyArtifact(caseId, artifactId);
      setVerificationResults((prev) => ({ ...prev, [artifactId]: res }));
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      let errMsg = err instanceof Error ? err.message : "Verification failed";
      if (axErr?.response?.status === 401) {
        errMsg = "HTTP 401: Authentication required. Session missing or invalid.";
      } else if (axErr?.response?.status === 403) {
        errMsg = `HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`;
      }
      setVerificationResults((prev) => ({
        ...prev,
        [artifactId]: { verified: false, error: errMsg },
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "T1":
        return <span className="lg-badge lg-badge-emerald">T1: Official Ledger / CDR</span>;
      case "T2":
        return <span className="lg-badge lg-badge-blue">T2: Verified System Record</span>;
      default:
        return <span className="lg-badge lg-badge-amber">T3: Unverified User Claim / Media</span>;
    }
  };

  return (
    <div className={`lg-table-wrapper ${className}`}>
      <div className="lg-table-header">
        <div>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
            <Boxes size={15} strokeWidth={2} color="#60A5FA" />
            <span>Forensic Evidence Register & Custody Ledger</span>
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9CA3AF" }}>
            Immutable intake records with SHA-256 bitstream verification and trust tier ratings.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "#9CA3AF", fontFamily: "'IBM Plex Mono', monospace" }}>
            Artifacts: <strong style={{ color: "#E5E7EB" }}>{artifacts.length}</strong>
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="lg-btn lg-btn-secondary"
              style={{ padding: "4px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <RefreshCw size={11} strokeWidth={2} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {artifacts.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#6B7280", fontSize: "13px" }}>
            No artifacts found in this case. Click "Evidence Intake" above to upload or seed.
          </div>
        ) : (
          artifacts.map((art) => {
            const vResult = verificationResults[art.artifact_id];
            const isVerifying = verifyingId === art.artifact_id;
            const isSelected = selectedArtifactId === art.artifact_id;

            return (
              <div
                key={art.artifact_id}
                onClick={() => onSelectArtifact?.(art)}
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  backgroundColor: isSelected
                    ? "rgba(37, 99, 235, 0.12)"
                    : "transparent",
                  borderLeft: isSelected ? "3px solid #3B82F6" : "3px solid transparent",
                  cursor: onSelectArtifact ? "pointer" : "default",
                  transition: "background 0.15s ease",
                }}
                className="lg-table-row"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#60A5FA" }}>
                      {art.artifact_id}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#F3F4F6", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {art.filename}
                    </span>
                    {getTierBadge(art.source_tier)}
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.08)", color: "#9CA3AF", fontFamily: "'IBM Plex Mono', monospace" }}>
                      Seq #{art.custody_chain_sequence}
                    </span>
                  </div>

                  {/* Hash row */}
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                    <span style={{ color: "#6B7280", fontFamily: "'IBM Plex Mono', monospace" }}>SHA-256:</span>
                    <code style={{ color: "#E5E7EB", fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", backgroundColor: "rgba(0, 0, 0, 0.4)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      {art.sha256}
                    </code>
                    <button
                      onClick={(e) => copyToClipboard(e, art.sha256)}
                      style={{ background: "none", border: "none", color: copiedHash === art.sha256 ? "#34D399" : "#60A5FA", fontSize: "11px", cursor: "pointer", padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      title="Copy SHA-256 content hash"
                    >
                      {copiedHash === art.sha256 ? (
                        <>
                          <Check size={11} strokeWidth={2.5} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} strokeWidth={2} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "16px", fontSize: "11px", color: "#9CA3AF" }}>
                    <span>Size: {((art.file_size_bytes || 0) / 1024).toFixed(1)} KB</span>
                    <span>Officer: <strong style={{ color: "#D1D5DB" }}>{art.intake_officer}</strong></span>
                    <span>Intake: {art.intake_timestamp_iso?.slice(0, 16).replace("T", " ")}</span>
                    <span>Facts Extracted: <strong style={{ color: "#60A5FA" }}>{art.dna_count}</strong></span>
                  </div>
                </div>

                {/* Integrity status & verify action */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  {vResult ? (
                    vResult.bitstream_verified ? (
                      <div className="lg-badge lg-badge-emerald" style={{ padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={12} strokeWidth={2} />
                        <span>BITSTREAM INTACT</span>
                      </div>
                    ) : (
                      <div className="lg-badge lg-badge-coral" style={{ padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <AlertTriangle size={12} strokeWidth={2} />
                        <span>TAMPER DETECTED</span>
                      </div>
                    )
                  ) : (
                    <div className="lg-badge lg-badge-gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <ShieldCheck size={12} strokeWidth={2} />
                      <span>PRESERVED</span>
                    </div>
                  )}

                  <button
                    onClick={(e) => handleVerify(e, art.artifact_id)}
                    disabled={isVerifying}
                    className="lg-btn lg-btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {isVerifying ? (
                      <>
                        <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", border: "2px solid #60A5FA", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                        <span>Hashing...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={12} strokeWidth={2} />
                        <span>Verify Bitstream</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "12px 18px", backgroundColor: "rgba(10, 12, 18, 0.8)", borderTop: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "11px", color: "#6B7280" }}>
        <strong>Statutory Notice (Section 63 BSA 2023):</strong> Cryptographic SHA-256 confirms bitstream integrity during transfer and custody storage. It verifies that raw bits remain unchanged since intake.
      </div>
    </div>
  );
};

export default EvidenceRegister;
