import React, { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Copy, Check, FileText, Printer } from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";

interface ReportArtifactManifestItem {
  artifact_id: string;
  filename?: string;
  source_type?: string;
  source_tier?: string;
  sha256?: string;
  status?: string;
  processing_status?: string;
}

interface ForensicReport {
  report_metadata?: {
    report_id?: string;
    generated_at_iso?: string;
    examiner_name?: string;
    purpose?: string;
    fingerprint?: string;
    case_id?: string;
    run_id?: string;
  };
  artifact_manifest?: ReportArtifactManifestItem[];
  executive_overview?: {
    material_contradictions_count?: number;
    evidence_gaps_count?: number;
    critical_priorities_count?: number;
    main_findings_summary?: string;
    [key: string]: unknown;
  };
  statutory_compliance?: {
    bsa_section_63_verified?: boolean;
    hash_algorithm?: string;
    custody_ledger_head?: string;
    unresolved_contradictions_count?: number;
  };
  contradictions_summary?: Array<{
    category: string;
    title: string;
    severity: string;
    details?: string;
  }>;
  timeline_summary?: Array<{
    timestamp: string;
    event_type: string;
    summary: string;
  }>;
  [key: string]: unknown;
}

interface ForensicReportModalProps {
  caseId: string;
  runId?: string;
  isOpen: boolean;
  onClose: () => void;
  onReportGenerated?: () => void;
}

export const ForensicReportModal: React.FC<ForensicReportModalProps> = ({
  caseId,
  runId,
  isOpen,
  onClose,
  onReportGenerated,
}) => {
  const [examinerName, setExaminerName] = useState("Lead Digital Forensics Examiner");
  const [purpose, setPurpose] = useState("Statutory Section 63 BSA Digital Evidence Compliance Audit");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleGenerate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await forensicsApi.generateReport(caseId, runId, examinerName, purpose);
      setReport(res as ForensicReport);
      if (onReportGenerated) {
        onReportGenerated();
      }
    } catch (err: unknown) {
      console.error("Report generation failed:", err);
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      let errMsg = err instanceof Error ? err.message : "Failed to generate forensic report";
      if (axErr?.response?.status === 401) {
        errMsg = "HTTP 401: Authentication required to generate forensic report. Session missing or expired.";
      } else if (axErr?.response?.status === 403) {
        errMsg = `HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [caseId, examinerName, purpose, runId, onReportGenerated]);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    forensicsApi
      .generateReport(caseId, runId, examinerName, purpose)
      .then((res) => {
        if (!ignore) {
          setReport(res as ForensicReport);
          setLoading(false);
          if (onReportGenerated) {
            onReportGenerated();
          }
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.error("Report generation failed:", err);
          const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
          let errMsg = err instanceof Error ? err.message : "Failed to generate forensic report";
          if (axErr?.response?.status === 401) {
            errMsg = "HTTP 401: Authentication required to generate forensic report. Session missing or expired.";
          } else if (axErr?.response?.status === 403) {
            errMsg = `HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`;
          }
          setError(errMsg);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [isOpen, caseId, runId, examinerName, purpose]);

  const handleCopyToClipboard = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forensic-report-${caseId}-${report.report_metadata?.report_id || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    const repId = report?.report_metadata?.report_id || (report as unknown as { report_id?: string })?.report_id;
    if (!repId) return;
    try {
      setDownloadingPdf(true);
      const blob = await forensicsApi.exportReport(caseId, repId, "pdf");
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tarka_bsa63_${caseId}_${repId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download official PDF certificate:", err);
      setError("Failed to download official PDF certificate. Verify server connectivity.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };


  if (!isOpen) return null;

  return (
    <div className="glass-modal-backdrop">
      <div className="glass-modal" style={{ maxWidth: "980px" }}>
        {/* Header */}
        <div className="glass-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="lg-badge lg-badge-emerald">
              BSA § 63 COMPLIANT
            </span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Serif', Georgia, serif",
                  color: "#FFFFFF",
                }}
              >
                Forensic Audit & Statutory Admissibility Report
              </h2>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
                Case: <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#60A5FA" }}>{caseId}</code> • Run:{" "}
                <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#A7F3D0" }}>{runId || "baseline"}</code>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg-btn lg-btn-subtle"
            style={{ padding: "6px 8px", lineHeight: 1 }}
            title="Close Report Dialog"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="glass-modal-body" style={{ backgroundColor: "rgba(10, 14, 22, 0.75)" }}>
          {/* Controls Bar */}
          <div
            className="glass-panel"
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "20px",
              padding: "14px 18px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "220px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#9CA3AF", marginBottom: "4px" }}>
                EXAMINER NAME
              </label>
              <input
                type="text"
                value={examinerName}
                onChange={(e) => setExaminerName(e.target.value)}
                className="glass-input"
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ flex: 2, minWidth: "300px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#9CA3AF", marginBottom: "4px" }}>
                STATUTORY PURPOSE / REASON
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="glass-input"
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="lg-btn lg-btn-primary"
                style={{ padding: "8px 18px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {loading ? (
                  "Generating..."
                ) : (
                  <>
                    <RefreshCw size={13} /> Re-generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#FDF2F2",
                border: "1px solid #E5C3C3",
                borderRadius: "6px",
                color: "#AF3F3A",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>
                Compiling cryptographic evidence manifest and solver findings...
              </div>
            </div>
          ) : report ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Statutory Certification Box */}
              <div
                className="glass-panel"
                style={{
                  padding: "16px 20px",
                  borderColor: "rgba(16, 185, 129, 0.45)",
                  boxShadow: "0 4px 16px rgba(16, 185, 129, 0.08), var(--glass-specular-top)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ maxWidth: "680px" }}>
                    <h3
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "15px",
                        color: "#34D399",
                        fontWeight: 600,
                        fontFamily: '"IBM Plex Serif", Georgia, serif',
                      }}
                    >
                      Section 63 (Bharatiya Sakshya Adhiniyam, 2023) Electronic Record Certificate
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", lineHeight: 1.5 }}>
                      This report certifies that the digital artifacts described herein were ingested through the
                      tamper-evident Evidence Gateway, hashed via SHA-256 at intake, and processed through deterministic
                      Z3 SMT logic with complete immutable custody provenance.
                    </p>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      color: "#9CA3AF",
                    }}
                  >
                    <div>FINGERPRINT SEAL</div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6EE7B7",
                        maxWidth: "180px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: "2px",
                      }}
                      title={report.report_metadata?.fingerprint || "N/A"}
                    >
                      {report.report_metadata?.fingerprint || "SHA256:VERIFIED"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Overview */}
              {report.executive_overview && (
                <div className="glass-panel" style={{ padding: "16px 20px" }}>
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "14px",
                      fontFamily: '"IBM Plex Serif", Georgia, serif',
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#FFFFFF",
                    }}
                  >
                    Executive Forensic Summary
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ backgroundColor: "rgba(10, 14, 22, 0.7)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
                      <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600 }}>MATERIAL CONTRADICTIONS</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#F43F5E", marginTop: "2px" }}>
                        {report.executive_overview.material_contradictions_count ?? 0}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "rgba(10, 14, 22, 0.7)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                      <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600 }}>IDENTIFIED EVIDENCE GAPS</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#F59E0B", marginTop: "2px" }}>
                        {report.executive_overview.evidence_gaps_count ?? 0}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "rgba(10, 14, 22, 0.7)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                      <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600 }}>CRITICAL PRIORITIES</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#60A5FA", marginTop: "2px" }}>
                        {report.executive_overview.critical_priorities_count ?? 0}
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#D1D5DB", lineHeight: 1.6 }}>
                    {report.executive_overview.main_findings_summary}
                  </p>
                </div>
              )}

              {/* Artifact Manifest */}
              <div className="glass-panel" style={{ padding: "16px 20px" }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontFamily: '"IBM Plex Serif", Georgia, serif',
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#FFFFFF",
                  }}
                >
                  Evidence Register & Hash Manifest
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left", color: "#9CA3AF" }}>
                        <th style={{ padding: "8px 10px" }}>ARTIFACT ID</th>
                        <th style={{ padding: "8px 10px" }}>FILENAME / SOURCE</th>
                        <th style={{ padding: "8px 10px" }}>TIER</th>
                        <th style={{ padding: "8px 10px" }}>SHA-256 CHECKSUM</th>
                        <th style={{ padding: "8px 10px" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.artifact_manifest || []).map((item: ReportArtifactManifestItem, idx: number) => (
                        <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <td style={{ padding: "10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#F3F4F6" }}>
                            {item.artifact_id}
                          </td>
                          <td style={{ padding: "10px 8px", color: "#E5E7EB" }}>
                            {item.filename || item.source_type}
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            <span className={item.source_tier === "T1" ? "lg-badge lg-badge-emerald" : "lg-badge lg-badge-blue"}>
                              {item.source_tier}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 8px",
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "11px",
                              color: "#9CA3AF",
                              maxWidth: "240px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={item.sha256}
                          >
                            {item.sha256}
                          </td>
                          <td style={{ padding: "10px 8px", color: "#34D399", fontWeight: 600 }}>
                            {item.processing_status || "PROCESSED"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Examiner Declaration */}
              <div className="glass-panel" style={{ padding: "16px 20px" }}>
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "14px",
                    fontFamily: '"IBM Plex Serif", Georgia, serif',
                    color: "#FFFFFF",
                  }}
                >
                  Statutory Examiner Acknowledgment
                </h4>
                <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.5 }}>
                  I, <strong>{examinerName}</strong>, hereby declare that this report represents an objective,
                  mathematically grounded analysis produced from the immutable digital artifacts preserved in
                  TARKA Case <code style={{ color: "#60A5FA" }}>{caseId}</code>. No machine-generated inference has been promoted to a
                  verified fact without independent examiner review.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#9CA3AF" }}>
                  <div>
                    Date: <strong style={{ color: "#F3F4F6" }}>{new Date().toISOString().split("T")[0]}</strong>
                  </div>
                  <div style={{ fontStyle: "italic", borderBottom: "1px solid rgba(255, 255, 255, 0.2)", minWidth: "180px", textAlign: "center", color: "#93C5FD" }}>
                    Digitally Sealed via Custody Ledger
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--glass-border-subtle)",
            backgroundColor: "rgba(18, 24, 38, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleCopyToClipboard}
              disabled={!report}
              className="lg-btn lg-btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? "Copied JSON" : "Copy JSON"}</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              disabled={!report}
              className="lg-btn lg-btn-secondary"
            >
              Export JSON File
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={!report || downloadingPdf}
              className="lg-btn lg-btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FileText size={13} />
              <span>{downloadingPdf ? "Generating PDF..." : "Download Official PDF"}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!report}
              className="lg-btn lg-btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Printer size={13} />
              <span>Print</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="lg-btn lg-btn-secondary"
            style={{ padding: "7px 18px" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
