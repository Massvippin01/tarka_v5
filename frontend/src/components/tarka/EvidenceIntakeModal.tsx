import React, { useState, useRef } from "react";
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";

interface EvidenceIntakeModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: () => void;
}

interface IngestResult {
  source_files_summary?: Array<{
    filename: string;
    sha256: string;
    size_bytes: number;
    parsed_facts_count: number;
    rejected_rows_count: number;
    parser_type: string;
    is_date_ambiguous: boolean;
  }>;
  total_facts_parsed?: number;
  total_rejected_rows?: number;
  warnings?: string[];
  rejected_rows?: Array<{
    source_file: string;
    line_number: number;
    raw_content: string;
    reason: string;
  }>;
}

export const EvidenceIntakeModal: React.FC<EvidenceIntakeModalProps> = ({
  caseId,
  isOpen,
  onClose,
  onIngestSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [timezone, setTimezone] = useState<string>("Asia/Kolkata");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndIngest = async () => {
    if (selectedFiles.length === 0) return;
    try {
      setIsUploading(true);
      setErrorMessage(null);
      const res = await forensicsApi.ingestEvidenceFiles(caseId, selectedFiles, timezone);
      setIngestResult(res as IngestResult);
      onIngestSuccess();
    } catch (err: unknown) {
      console.error("Evidence ingestion failed:", err);
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      let msg = err instanceof Error ? err.message : "Evidence ingestion failed";
      if (axErr?.response?.status === 401) {
        msg = "HTTP 401: Authentication required. Session missing or invalid.";
      } else if (axErr?.response?.status === 403) {
        msg = `HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`;
      } else if (axErr?.response?.data?.detail) {
        msg = axErr.response.data.detail;
      }
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadDemoPack = async (packName: string) => {
    try {
      setIsUploading(true);
      setErrorMessage(null);
      const res = await forensicsApi.loadDemoPack(caseId, packName);
      setIngestResult(res as IngestResult);
      onIngestSuccess();
    } catch (err: unknown) {
      console.error("Failed to load demo pack:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage("Failed to load demo pack: " + msg);
    } finally {
      setIsUploading(false);
    }
  };

  const resetIntake = () => {
    setSelectedFiles([]);
    setIngestResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="glass-modal-backdrop">
      <div className="glass-modal" style={{ maxWidth: "800px" }}>
        {/* Header */}
        <div className="glass-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              DATA-ONLY INTAKE
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Forensic Evidence Intake & Line-Conservation Ingest
              </h2>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
                Target Case: <code style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "#60A5FA" }}>{caseId}</code>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          {errorMessage && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "rgba(244, 63, 94, 0.12)",
                border: "1px solid #F43F5E",
                borderRadius: "6px",
                color: "#FECDD3",
                fontSize: "13px",
              }}
            >
              <strong>Ingestion Error:</strong> {errorMessage}
            </div>
          )}

          {!ingestResult ? (
            <>
              {/* Quick Demo Evidence Pack Selection */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "rgba(37, 99, 235, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#93C5FD", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⚡ 1-CLICK DEMO EVIDENCE PACKAGES</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                    Files staged in <code>demo_evidence_files/</code> or load directly:
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleLoadDemoPack("case-1")}
                    disabled={isUploading}
                    style={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #3B82F6",
                      color: "#60A5FA",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: isUploading ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Load Case 1 (UPI ₹25k vs ₹15k)
                  </button>
                  <button
                    onClick={() => handleLoadDemoPack("case-2")}
                    disabled={isUploading}
                    style={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #8B5CF6",
                      color: "#C4B5FD",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: isUploading ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Load Case 2 (Digital Arrest ₹1.5L vs ₹50k)
                  </button>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed rgba(59, 130, 246, 0.4)",
                  borderRadius: "8px",
                  padding: "36px 20px",
                  textAlign: "center",
                  backgroundColor: "rgba(30, 41, 59, 0.25)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  style={{ display: "none" }}
                  accept=".csv,.tsv,.txt,.log,.json,.png,.jpg,.jpeg"
                />
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                  <UploadCloud size={38} style={{ color: "#60A5FA", strokeWidth: 1.5 }} />
                </div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#E2E8F0" }}>
                  Drag & Drop forensic files or click to browse
                </div>
                <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "6px" }}>
                  Supported formats: Bank/UPI CSVs, Telco CDR CSVs, WhatsApp Exports (.txt), Claims JSON, Tower Coordinates, and EXIF Photos.
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "6px", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                  Strict Byte-Conservation • Non-Destructive SHA-256 Hashing • Custody Ledger Preservation
                </div>
              </div>

              {/* Timezone Configuration */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <label style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>
                  ACQUISITION TIMEZONE:
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    backgroundColor: "#1E222D",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "4px",
                    color: "#F3F4F6",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30) - Standard Indian Jurisdiction</option>
                  <option value="UTC">UTC (Zulu +00:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                </select>
              </div>

              {/* Selected Files Queue */}
              {selectedFiles.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF", marginBottom: "8px" }}>
                    STAGED EVIDENCE FILES ({selectedFiles.length}):
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          backgroundColor: "#1A1D26",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                          <FileText size={14} style={{ color: "#60A5FA", flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, color: "#E5E7EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {file.name}
                          </span>
                          <span style={{ color: "#6B7280", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: "11px" }}>
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Remove file"
                          aria-label="Remove file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Ingest Summary Results */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid #10B981",
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} style={{ color: "#34D399", flexShrink: 0 }} />
                  <div style={{ fontWeight: 600, color: "#34D399", fontSize: "14px" }}>
                    Evidence Ingestion Completed & Sealed in Custody Ledger
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", marginTop: "12px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#9CA3AF" }}>Total Facts Parsed: </span>
                    <strong style={{ color: "#F3F4F6" }}>{ingestResult.total_facts_parsed || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#9CA3AF" }}>Rejected Rows: </span>
                    <strong style={{ color: ingestResult.total_rejected_rows ? "#F87171" : "#F3F4F6" }}>
                      {ingestResult.total_rejected_rows || 0}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#9CA3AF" }}>Files Processed: </span>
                    <strong style={{ color: "#F3F4F6" }}>{ingestResult.source_files_summary?.length || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Source Files Manifest */}
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>
                INGESTED ARTIFACT MANIFEST & BITSTREAM HASHES:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {ingestResult.source_files_summary?.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      backgroundColor: "#161922",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: "#E5E7EB" }}>{src.filename}</span>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "#1E222D",
                          color: "#60A5FA",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {src.parser_type}
                      </span>
                    </div>
                    <div style={{ marginTop: "4px", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: "11px", color: "#9CA3AF", wordBreak: "break-all" }}>
                      SHA-256: <span style={{ color: "#A7F3D0" }}>{src.sha256}</span>
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#6B7280" }}>
                      Facts: {src.parsed_facts_count} • Rejected: {src.rejected_rows_count} • Size: {(src.size_bytes / 1024).toFixed(1)} KB
                      {src.is_date_ambiguous && (
                        <span style={{ color: "#F59E0B", marginLeft: "8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AlertTriangle size={12} /> Ambiguous date format (conservative model applied)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rejected Rows Audit */}
              {ingestResult.rejected_rows && ingestResult.rejected_rows.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#F87171", marginBottom: "6px" }}>
                    REJECTED ROWS AUDIT LOG ({ingestResult.rejected_rows.length}):
                  </div>
                  <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {ingestResult.rejected_rows.map((rej, ri) => (
                      <div
                        key={ri}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "rgba(239, 68, 68, 0.08)",
                          borderLeft: "3px solid #EF4444",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <div style={{ color: "#FCA5A5" }}>
                          Line {rej.line_number} [{rej.source_file}]: {rej.reason}
                        </div>
                        <div style={{ color: "#6B7280", marginTop: "2px" }}>Raw: {rej.raw_content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#161922",
          }}
        >
          {!ingestResult ? (
            <>
              <div style={{ fontSize: "12px", color: "#6B7280" }}>
                {selectedFiles.length} file(s) selected
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#1E222D",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "4px",
                    color: "#D1D5DB",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadAndIngest}
                  disabled={selectedFiles.length === 0 || isUploading}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: selectedFiles.length > 0 && !isUploading ? "#2563EB" : "#1E293B",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: selectedFiles.length > 0 && !isUploading ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isUploading ? "Preserving & Parsing..." : `Ingest & Preserve Evidence (${selectedFiles.length})`}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={resetIntake}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#1E222D",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "4px",
                  color: "#D1D5DB",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Upload Additional Evidence
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close & View Evidence Ledger
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
