import React, { useState, useMemo } from "react";
import {
  Boxes,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Shield,
  Search,
  Filter,
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
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<"ALL" | "T1" | "T2" | "T3">("ALL");

  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((art) => {
      const matchesTier = tierFilter === "ALL" || art.source_tier === tierFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.artifact_id.toLowerCase().includes(q) ||
        art.filename.toLowerCase().includes(q) ||
        art.sha256.toLowerCase().includes(q) ||
        (art.intake_officer && art.intake_officer.toLowerCase().includes(q));
      return matchesTier && matchesSearch;
    });
  }, [artifacts, tierFilter, searchTerm]);

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
    <div
      className={`lg-table-wrapper ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 170px)",
        maxHeight: "calc(100vh - 170px)",
        minHeight: "450px",
        overflow: "hidden",
      }}
    >
      <div className="lg-table-header" style={{ flexShrink: 0, flexDirection: "column", gap: "10px", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
              <Boxes size={15} strokeWidth={2} color="#60A5FA" />
              <span>Forensic Evidence Register & Custody Ledger</span>
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9CA3AF" }}>
              Immutable intake records with SHA-256 bitstream verification and trust tier ratings.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
              Showing: <strong style={{ color: "#E5E7EB", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{filteredArtifacts.length}</strong> of <strong style={{ color: "#60A5FA", fontFamily: "var(--font-mono)" }}>{artifacts.length}</strong>
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

        {/* Filter & Search Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", paddingTop: "4px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={13} color="#9CA3AF" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Filter by filename, artifact ID, or hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                fontSize: "11px",
                height: "30px",
                borderRadius: "6px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(0, 0, 0, 0.3)", padding: "2px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <span style={{ fontSize: "10px", color: "#9CA3AF", padding: "0 6px", display: "flex", alignItems: "center", gap: "3px" }}>
              <Filter size={10} /> Tier:
            </span>
            {(["ALL", "T1", "T2", "T3"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  padding: "3px 8px",
                  fontSize: "10px",
                  fontWeight: tierFilter === t ? 700 : 500,
                  backgroundColor: tierFilter === t ? "rgba(59, 130, 246, 0.25)" : "transparent",
                  color: tierFilter === t ? "#93C5FD" : "#9CA3AF",
                  border: tierFilter === t ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {t === "ALL" ? "All" : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        id="evidence-ledger-scroll-container"
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          scrollbarGutter: "stable",
        }}
      >
        {artifacts.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#9CA3AF" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>📂</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#E2E8F0" }}>Case Workspace is in Clean Standby</div>
            <p style={{ fontSize: "12px", color: "#64748B", margin: "6px auto 16px", maxWidth: "420px" }}>
              Zero evidence files are registered in this case ledger. Ingest evidence files (Bank CSV, Telecom CDR, WhatsApp chat, or Payment Screenshot) to initiate formal analysis.
            </p>
            <div style={{ display: "inline-flex", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#60A5FA", background: "rgba(59, 130, 246, 0.1)", padding: "4px 10px", borderRadius: "4px", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                Click <strong>"Evidence Intake"</strong> or <strong>"Load Demo Pack"</strong> in the top bar
              </span>
            </div>
          </div>
        ) : filteredArtifacts.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#9CA3AF" }}>
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>🔍</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#E2E8F0" }}>No matching evidence records found</div>
            <p style={{ fontSize: "11px", color: "#64748B", margin: "4px auto 12px" }}>
              Try adjusting your search query or tier filter.
            </p>
            <button
              onClick={() => { setSearchTerm(""); setTierFilter("ALL"); }}
              className="lg-btn lg-btn-subtle"
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredArtifacts.map((art) => {
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
                    <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: "12px", fontWeight: 700, color: "#60A5FA" }}>
                      {art.artifact_id}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#F3F4F6", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {art.filename}
                    </span>
                    {getTierBadge(art.source_tier)}
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.08)", color: "#9CA3AF", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                      Seq #{art.custody_chain_sequence}
                    </span>
                  </div>

                  {/* Hash row */}
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                    <span style={{ color: "#6B7280" }}>SHA-256:</span>
                    <code style={{ color: "#E5E7EB", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: "11px", backgroundColor: "rgba(0, 0, 0, 0.4)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
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

      <div style={{ flexShrink: 0, padding: "12px 18px", backgroundColor: "rgba(10, 12, 18, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "11px", color: "#6B7280" }}>
        <strong>Statutory Notice (Section 63 BSA 2023):</strong> Cryptographic SHA-256 confirms bitstream integrity during transfer and custody storage. It verifies that raw bits remain unchanged since intake.
      </div>
    </div>
  );
};

export default EvidenceRegister;
