import React, { useState, useEffect, useRef } from "react";
import {
  Boxes,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Shield,
  UploadCloud,
  FileText,
  Activity,
  Eye,
  X,
  Radio,
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

interface ActiveJobState {
  job_id: string;
  status: string;
  stage: string;
  progress_percent: number;
  partial_results?: Record<string, any>;
  error_message?: string;
  updated_at?: string;
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

  // Ingestion states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live SSE state
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);

  // Artifact deep examination modal
  const [examiningArtifact, setExaminingArtifact] = useState<ArtifactIntake | null>(null);
  const [examiningData, setExaminingData] = useState<any>(null);
  const [loadingExam, setLoadingExam] = useState<boolean>(false);

  // 1. Establish Authenticated Real-Time SSE Event Stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const url = forensicsApi.getEventStreamUrl(caseId);
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.job_id) {
            setActiveJob({
              job_id: data.job_id,
              status: data.status,
              stage: data.stage || data.status,
              progress_percent: data.progress_percent || 0,
              partial_results: data.partial_results,
              error_message: data.error_message,
              updated_at: data.timestamp,
            });

            // Automatically refresh artifact register when job completes
            if (data.status === "COMPLETED") {
              onRefresh?.();
              setTimeout(() => {
                setActiveJob((prev) => (prev?.job_id === data.job_id ? null : prev));
              }, 4000);
            }
          }
        } catch {
          // ignore non-json heartbeats
        }
      };

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      setSseConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [caseId, onRefresh]);

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

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setStagedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setStagedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleExecuteUpload = async () => {
    if (stagedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(5);
    setUploadStatusMsg("Preparing evidence intake...");

    const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB per chunk

    try {
      let admittedCount = 0;
      for (let i = 0; i < stagedFiles.length; i++) {
        const file = stagedFiles[i];
        if (file.size > 10 * 1024 * 1024) {
          // Large file (> 10MB): Resumable chunked upload protocol
          setUploadStatusMsg(`Creating resumable session for ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);
          const session = await forensicsApi.createUploadSession(caseId, file.name, file.size, file.type || "application/octet-stream");
          const sessionId = session.session_id;

          let offset = 0;
          while (offset < file.size) {
            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const pct = Math.round(((offset + chunk.size) / file.size) * 100);
            setUploadProgress(pct);
            setUploadStatusMsg(`Uploading ${file.name}: ${pct}% (${(offset / (1024 * 1024)).toFixed(1)} / ${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

            await forensicsApi.uploadChunk(caseId, sessionId, chunk, offset);
            offset += chunk.size;
          }
          admittedCount++;
        } else {
          // Small file (<= 10MB): Direct streaming intake
          setUploadStatusMsg(`Streaming ${file.name} to CAS...`);
          await forensicsApi.ingestEvidenceFiles(caseId, [file], "Asia/Kolkata");
          admittedCount++;
        }
      }

      setUploadProgress(100);
      setUploadStatusMsg(`Successfully admitted ${admittedCount} evidence artifact(s) into CAS.`);
      setStagedFiles([]);
      onRefresh?.();
      setTimeout(() => {
        setUploadStatusMsg(null);
        setUploadProgress(0);
      }, 4000);
    } catch (err: unknown) {
      console.error("Evidence upload failed:", err);
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      let msg = err instanceof Error ? err.message : "Evidence upload failed";
      if (axErr?.response?.data?.detail) {
        msg = axErr.response.data.detail;
      }
      setUploadError(msg);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Inspect artifact in modal
  const handleOpenExamination = async (e: React.MouseEvent, art: ArtifactIntake) => {
    e.stopPropagation();
    setExaminingArtifact(art);
    setLoadingExam(true);
    try {
      const data = await forensicsApi.getArtifactExamination(caseId, art.artifact_id);
      setExaminingData(data);
    } catch (err: unknown) {
      setExaminingData({
        examination_status: "ERROR",
        message: err instanceof Error ? err.message : "Failed to load examination detail",
      });
    } finally {
      setLoadingExam(false);
    }
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
    <div className={`lg-table-wrapper ${className}`} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 1. Header & Live SSE Indicator */}
      <div className="lg-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
            <Boxes size={15} strokeWidth={2} color="#60A5FA" />
            <span>Forensic Evidence Register & Custody Ledger</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: sseConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: sseConnected ? "#34D399" : "#F87171",
                border: sseConnected ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <Radio size={10} className={sseConnected ? "animate-pulse" : ""} />
              <span>{sseConnected ? "LIVE SSE" : "OFFLINE"}</span>
            </span>
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#9CA3AF" }}>
            Immutable intake records with streaming SHA-256 bitstream verification and real-time processing.
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

      {/* 2. Active Background Job Banner (Real-Time SSE) */}
      {activeJob && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(30, 41, 59, 0.8)",
            border: "1px solid rgba(96, 165, 250, 0.3)",
            borderRadius: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#93C5FD", fontWeight: 600 }}>
              <Activity size={14} className="animate-spin" />
              <span>Active Job: {activeJob.job_id}</span>
              <span className="lg-badge lg-badge-blue">{activeJob.status}</span>
            </span>
            <span style={{ color: "#E5E7EB", fontFamily: "monospace", fontSize: "11px" }}>
              {activeJob.progress_percent}%
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#CBD5E1" }}>
            Stage: <strong>{activeJob.stage}</strong>
          </div>
          <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                width: `${activeJob.progress_percent}%`,
                height: "100%",
                backgroundColor: "#3B82F6",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Universal Evidence Drag & Drop Intake Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? "2px dashed #3B82F6" : "1px dashed rgba(255, 255, 255, 0.15)",
          borderRadius: "8px",
          backgroundColor: isDragging ? "rgba(37, 99, 235, 0.08)" : "rgba(17, 24, 39, 0.4)",
          padding: "20px",
          textAlign: "center",
          transition: "all 0.2s ease",
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <UploadCloud size={28} color="#60A5FA" />
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#E5E7EB" }}>
            Drag & Drop Evidence Files Here, or{" "}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "none",
                border: "none",
                color: "#60A5FA",
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Browse Files
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "11px", color: "#9CA3AF" }}>
            Universal Intake: Images (PNG/JPG/WebP/TIFF), PDFs, Bank Statements (CSV/XLSX), DOCX, Audio, Video, Archives.
            Preserved immutably in Content-Addressed Storage. Bounded-memory streaming up to 5 GB.
          </p>

          {/* Staged files preview */}
          {stagedFiles.length > 0 && (
            <div style={{ marginTop: "12px", width: "100%", maxWidth: "600px", textAlign: "left" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#CBD5E1", marginBottom: "6px" }}>
                Staged for Intake ({stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""}):
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "120px", overflowY: "auto" }}>
                {stagedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "11px",
                      padding: "4px 8px",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      borderRadius: "4px",
                    }}
                  >
                    <span style={{ color: "#E5E7EB", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {f.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#9CA3AF" }}>{(f.size / 1024).toFixed(1)} KB</span>
                      <button
                        onClick={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", padding: "0 2px" }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={handleExecuteUpload}
                  disabled={isUploading}
                  className="lg-btn lg-btn-primary"
                  style={{ padding: "6px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {isUploading ? (
                    <>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                      <span>Ingesting & Preserving...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={13} />
                      <span>Admit {stagedFiles.length} Evidence File(s)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStagedFiles([])}
                  disabled={isUploading}
                  className="lg-btn lg-btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Feedback & progress */}
          {uploadProgress > 0 && (
            <div style={{ width: "100%", maxWidth: "600px", marginTop: "8px" }}>
              <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${uploadProgress}%`, height: "100%", backgroundColor: "#10B981", transition: "width 0.3s ease" }} />
              </div>
            </div>
          )}
          {uploadStatusMsg && (
            <div style={{ fontSize: "12px", color: "#34D399", marginTop: "6px" }}>{uploadStatusMsg}</div>
          )}
          {uploadError && (
            <div style={{ fontSize: "12px", color: "#F87171", marginTop: "6px" }}>Error: {uploadError}</div>
          )}
        </div>
      </div>

      {/* 4. Artifacts List & Custody Ledger */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {artifacts.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#6B7280", fontSize: "13px" }}>
            No artifacts found in this case. Drag and drop evidence files above to begin ingestion.
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
                data-testid={`artifact-row-${art.artifact_id}`}
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
                    <span>Facts: <strong style={{ color: "#60A5FA" }}>{art.dna_count}</strong></span>
                  </div>
                </div>

                {/* Actions: Examine & Verify */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={(e) => handleOpenExamination(e, art)}
                    className="lg-btn lg-btn-secondary"
                    style={{ padding: "6px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                    title="Inspect forensic extraction & analysis"
                  >
                    <Eye size={12} strokeWidth={2} />
                    <span>Inspect</span>
                  </button>

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
                    id={`btn-verify-${art.artifact_id}`}
                    data-testid={`btn-verify-${art.artifact_id}`}
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
                        <span>Verify</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Statutory Footnote */}
      <div style={{ padding: "12px 18px", backgroundColor: "rgba(10, 12, 18, 0.8)", borderTop: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "11px", color: "#6B7280" }}>
        <strong>Statutory Notice (Section 63 BSA 2023):</strong> Cryptographic SHA-256 confirms bitstream integrity during transfer and custody storage. It verifies that raw bits remain unchanged since intake.
      </div>

      {/* 6. Deep Forensic Examination Modal */}
      {examiningArtifact && (
        <div className="glass-modal-backdrop" onClick={() => setExaminingArtifact(null)}>
          <div
            className="glass-modal"
            style={{ maxWidth: "720px", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={18} color="#60A5FA" />
                <h3 style={{ margin: 0, fontSize: "16px", color: "#F3F4F6" }}>
                  Forensic Examination: {examiningArtifact.filename}
                </h3>
              </div>
              <button
                onClick={() => setExaminingArtifact(null)}
                style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingExam ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF" }}>
                Executing forensic analysis engines...
              </div>
            ) : examiningData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", backgroundColor: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "6px" }}>
                  <div>
                    <span style={{ color: "#9CA3AF" }}>Artifact ID:</span>{" "}
                    <code style={{ color: "#60A5FA" }}>{examiningArtifact.artifact_id}</code>
                  </div>
                  <div>
                    <span style={{ color: "#9CA3AF" }}>Format Category:</span>{" "}
                    <strong>{examiningData.is_image ? "Visual Raster Image" : examiningData.media_type || "Evidence"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#9CA3AF" }}>Assessment:</span>{" "}
                    <span className="lg-badge lg-badge-blue">{examiningData.preliminary_assessment || "EXAMINED"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#9CA3AF" }}>Composite Anomaly Score:</span>{" "}
                    <strong>{(examiningData.composite_anomaly_score || 0).toFixed(3)}</strong>
                  </div>
                </div>

                {/* Extracted Fields (OCR / Content) */}
                {examiningData.ocr_analysis?.extracted_fields && Object.keys(examiningData.ocr_analysis.extracted_fields).length > 0 && (
                  <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "6px" }}>
                    <div style={{ fontWeight: 600, color: "#E5E7EB", marginBottom: "8px" }}>
                      Extracted Candidate Fields:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {Object.entries(examiningData.ocr_analysis.extracted_fields).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#9CA3AF", textTransform: "capitalize" }}>{k}:</span>
                          <strong style={{ color: "#F3F4F6" }}>{String(v)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statutory Caveat */}
                <div style={{ padding: "10px 14px", backgroundColor: "rgba(59, 130, 246, 0.08)", borderLeft: "3px solid #3B82F6", borderRadius: "0 4px 4px 0", color: "#93C5FD", fontSize: "11px", lineHeight: 1.5 }}>
                  {examiningData.statutory_caveat || (
                    "AI PROPOSES. FORENSIC ENGINES TEST. INVESTIGATORS DECIDE. No digital artifact may be declared authentic solely from absent manipulation, nor fraudulent solely from anomaly scores. Statutory cross-source CBS reconciliation is required."
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceRegister;
