import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileCheck2,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Ban,
  ShieldAlert,
} from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";

interface MultimodalInboxProps {
  caseId: string;
  onEvidenceAdmitted?: () => void;
  onSelectArtifact?: (artifactId: string) => void;
}

interface IngestedItem {
  artifact_id: string;
  filename: string;
  sha256: string;
  file_type: string;
  file_size: number;
  status: string;
}

interface ActiveJobState {
  job_id: string;
  state: string;
  current_stage: string;
  progress_pct: number;
  total_artifacts: number;
  completed_artifacts: number;
  results_summary?: Record<string, any>;
  error_message?: string;
}

export const MultimodalInbox: React.FC<MultimodalInboxProps> = ({
  caseId,
  onEvidenceAdmitted,
  onSelectArtifact,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recentArtifacts, setRecentArtifacts] = useState<IngestedItem[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll or track active job
  useEffect(() => {
    if (!activeJob || activeJob.state === "COMPLETED" || activeJob.state === "FAILED" || activeJob.state === "CANCELLED") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const j = await forensicsApi.getJob(caseId, activeJob.job_id);
        if (j) {
          setActiveJob(j);
          if (j.state === "COMPLETED") {
            onEvidenceAdmitted?.();
          }
        }
      } catch (err) {
        console.warn("Failed to poll job status:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [caseId, activeJob, onEvidenceAdmitted]);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMessage(null);

    const fileArray = Array.from(files);

    try {
      const res = await forensicsApi.uploadMultimodalBatch(caseId, fileArray);
      if (res && res.artifacts) {
        setRecentArtifacts(res.artifacts);
      }
      if (res && res.job_id) {
        setActiveJob({
          job_id: res.job_id,
          state: "QUEUED",
          current_stage: "Queued for multimodal forensic pipeline",
          progress_pct: 10,
          total_artifacts: fileArray.length,
          completed_artifacts: 0,
        });
      }
      onEvidenceAdmitted?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to ingest evidence files";
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await forensicsApi.cancelJob(caseId, activeJob.job_id);
      setActiveJob((prev) => (prev ? { ...prev, state: "CANCELLED", current_stage: "Cancelled by Investigator" } : null));
    } catch (err) {
      console.error("Cancel job failed:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div className="skeuo-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="lg-badge lg-badge-blue">PHASE 10 MULTIMODAL GATEWAY</span>
            <span className="lg-badge lg-badge-emerald">STRICT MAGIC-BYTES VALIDATED</span>
            <span className="lg-badge" style={{ backgroundColor: "rgba(139, 92, 246, 0.2)", color: "#C4B5FD" }}>CAS BITSTREAM AUTHORITY</span>
          </div>
          <h2 style={{ margin: "8px 0 4px", fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
            Intelligent Evidence Intake & Multimodal Processing
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8" }}>
            Submit disputed UPI receipts, CBS bank statements, WhatsApp extractions, and PDF exports. All items are cryptographically verified, scanned for traversal exploits, hashed via SHA-256, and admitted into tamper-evident storage.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="skeuo-btn skeuo-btn-primary"
          disabled={uploading}
        >
          <UploadCloud size={16} />
          <span>{uploading ? "Ingesting..." : "Select Files for Ingestion"}</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div style={{ padding: "12px 16px", backgroundColor: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.4)", borderRadius: "12px", color: "#FECDD3", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldAlert size={18} color="#F43F5E" />
          <span><strong>Ingestion Denied:</strong> {errorMessage}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        className="skeuo-inset"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: "40px 20px",
          textAlign: "center",
          border: dragActive ? "2px dashed #3B82F6" : "2px dashed rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          backgroundColor: dragActive ? "rgba(37, 99, 235, 0.08)" : "rgba(10, 14, 24, 0.6)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.pdf,.csv,.xlsx,.txt,.zip"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
            }
          }}
        />
        <div style={{ display: "inline-flex", padding: "16px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#60A5FA", marginBottom: "14px" }}>
          <UploadCloud size={32} />
        </div>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF", marginBottom: "6px" }}>
          Drop multiple digital evidence files here, or <span style={{ color: "#60A5FA" }}>browse</span>
        </div>
        <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "560px", margin: "0 auto" }}>
          Supports payment screenshots (PhonePe, GPay, Paytm, BHIM, Cred), Bank CSV/PDF statements, WhatsApp export .txt/.zip, and CDR logs. Max 100MB per file, 500MB per batch.
        </div>
      </div>

      {/* Real-Time Processing Job Status */}
      {activeJob && (
        <div className="skeuo-card" style={{ padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {activeJob.state === "PROCESSING" ? (
                <RefreshCw size={16} className="animate-spin" color="#60A5FA" />
              ) : activeJob.state === "COMPLETED" ? (
                <CheckCircle size={18} color="#10B981" />
              ) : activeJob.state === "FAILED" ? (
                <XCircle size={18} color="#F43F5E" />
              ) : (
                <Clock size={16} color="#FBBF24" />
              )}
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                Analysis Job: <code style={{ color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>{activeJob.job_id}</code>
              </span>
              <span className={`lg-badge ${activeJob.state === "COMPLETED" ? "lg-badge-emerald" : activeJob.state === "FAILED" ? "lg-badge-rose" : "lg-badge-blue"}`}>
                {activeJob.state}
              </span>
            </div>

            {activeJob.state !== "COMPLETED" && activeJob.state !== "FAILED" && activeJob.state !== "CANCELLED" && (
              <button
                onClick={handleCancelJob}
                className="skeuo-btn"
                style={{ padding: "4px 10px", fontSize: "11px", borderColor: "#F43F5E", color: "#FDA4AF" }}
              >
                <Ban size={12} />
                <span>Cancel Job</span>
              </button>
            )}
          </div>

          <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "8px" }}>
            Current Stage: <strong style={{ color: "#E2E8F0" }}>{activeJob.current_stage}</strong>
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: "9999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${activeJob.progress_pct || (activeJob.state === "COMPLETED" ? 100 : 35)}%`,
                height: "100%",
                background: activeJob.state === "FAILED" ? "#F43F5E" : "linear-gradient(90deg, #3B82F6, #10B981)",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          {activeJob.results_summary && (
            <div style={{ marginTop: "14px", padding: "10px", backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: "8px", fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace", color: "#A7F3D0" }}>
              TRACE Pipeline complete: {Object.keys(activeJob.results_summary).length} artifacts analyzed.
            </div>
          )}
        </div>
      )}

      {/* Admitted Evidence Manifest */}
      {recentArtifacts.length > 0 && (
        <div className="skeuo-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileCheck2 size={16} color="#10B981" />
              <span>Admitted Artifacts Manifest ({recentArtifacts.length})</span>
            </div>
          </div>

          <div className="skeuo-inset" style={{ overflowX: "auto" }}>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Artifact ID</th>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Bitstream SHA-256</th>
                  <th>Custody Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentArtifacts.map((art) => (
                  <tr key={art.artifact_id}>
                    <td style={{ color: "#93C5FD", fontWeight: 600 }}>{art.artifact_id}</td>
                    <td style={{ color: "#F1F5F9" }}>{art.filename}</td>
                    <td>
                      <span className="lg-badge lg-badge-subtle">{art.file_type}</span>
                    </td>
                    <td>{(art.file_size / 1024).toFixed(1)} KB</td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: "#94A3B8" }}>
                      {art.sha256.slice(0, 16)}...
                    </td>
                    <td>
                      <span className="lg-badge lg-badge-emerald">
                        <CheckCircle size={10} style={{ marginRight: "4px" }} />
                        {art.status}
                      </span>
                    </td>
                    <td>
                      {art.file_type === "IMAGE" && (
                        <button
                          onClick={() => onSelectArtifact?.(art.artifact_id)}
                          className="skeuo-btn"
                          style={{ padding: "3px 8px", fontSize: "10px", borderColor: "#3B82F6", color: "#93C5FD" }}
                        >
                          <ImageIcon size={10} />
                          <span>Examine TRACE</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
