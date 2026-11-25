import React, { useState, useRef, useEffect } from "react";
import {
  X,
  FileUp,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal, type IngestedArtifact } from "../../../context/TarkaGlobalContext";
import { generateBip39Words } from "../../../utils/forensicCrypto";

interface BulkIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCaseId?: string;
}

interface IngestionProgressState {
  isProcessing: boolean;
  percent: number;
  processedRows: number;
  totalRows: number;
  rowsPerSec: number;
  sha256Hex: string;
}

interface IngestionSummaryState {
  filename: string;
  totalRows: number;
  validRows: number;
  quarantinedRows: number;
  sha256Hex: string;
  throughputRowsPerSec: number;
  previewRows: Array<{
    rowIndex: number;
    reference: string;
    timestamp: string;
    sender: string;
    receiver: string;
    amount: number;
    type: string;
    status: string;
  }>;
}

export const BulkIngestionModal: React.FC<BulkIngestionModalProps> = ({
  isOpen,
  onClose,
  targetCaseId,
}) => {
  const { caseWorkspaces, ingestArtifactToCase, activeCaseId } = useTarkaGlobal();

  const [selectedCaseId, setSelectedCaseId] = useState<string>(targetCaseId || activeCaseId || "");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const [progress, setProgress] = useState<IngestionProgressState | null>(null);
  const [summary, setSummary] = useState<IngestionSummaryState | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (targetCaseId) {
      setSelectedCaseId(targetCaseId);
    }
  }, [targetCaseId]);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartWorkerIngestion = (filename: string, rawText: string) => {
    setSummary(null);
    setProgress({
      isProcessing: true,
      percent: 0,
      processedRows: 0,
      totalRows: 0,
      rowsPerSec: 0,
      sha256Hex: "Calculating SHA-256...",
    });

    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      const worker = new Worker(
        new URL("../../../workers/bulkIngestion.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === "PROGRESS") {
          setProgress({
            isProcessing: true,
            percent: data.percent,
            processedRows: data.processedRows,
            totalRows: data.totalRows,
            rowsPerSec: data.rowsPerSec,
            sha256Hex: data.sha256Hex,
          });
        } else if (data.type === "COMPLETE") {
          setProgress(null);
          setSummary(data.summary);
          toast.success(`Successfully parsed ${data.summary.totalRows.toLocaleString()} rows at ${data.summary.throughputRowsPerSec.toLocaleString()} rows/sec!`);
        }
      };

      worker.onerror = (err) => {
        console.error("Worker error:", err);
        setProgress(null);
        toast.error("Web Worker error parsing file payload.");
      };

      worker.postMessage({
        type: "START_INGESTION",
        filename,
        rawText,
        chunkSize: 2000,
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to initialize background ingestion worker.");
      setProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleStartWorkerIngestion(file.name, text);
    };
    reader.readAsText(file);
  };

  const handleGenerateSynthetic50k = () => {
    // Generate synthetic 10,000 transaction CSV dump
    const rows = ["RRN,TIMESTAMP,SENDER,RECEIVER,AMOUNT,STATUS"];
    const baseTime = new Date("2026-09-22T10:00:00Z").getTime();

    for (let i = 1; i <= 10000; i++) {
      const ts = new Date(baseTime + i * 500).toISOString();
      const rrn = `429100${String(i).padStart(6, "0")}`;
      const sender = i % 3 === 0 ? "Vikram_Shah_L1" : `Mule_Acct_${i % 20}`;
      const receiver = `Beneficiary_${(i % 50) + 1}`;
      const amt = (1000 + (i % 25) * 500).toFixed(2);
      rows.push(`${rrn},${ts},${sender},${receiver},${amt},SUCCESS`);
    }

    const payload = rows.join("\n");
    handleStartWorkerIngestion("NPCI_Central_Switch_10k_Dump.csv", payload);
  };

  const handleCommitArtifact = () => {
    if (!summary) return;

    const bip39 = generateBip39Words(summary.sha256Hex, 6);

    const newArtifact: IngestedArtifact = {
      id: `art-bulk-${Date.now()}`,
      filename: summary.filename,
      vectorType: summary.filename.endsWith(".xml") ? "NPCI_XML" : "CBS_LEDGER",
      tier: summary.quarantinedRows > 0 ? "TIER_2_CORROBORATIVE" : "TIER_1_CERTIFIED",
      byteSize: summary.totalRows * 75,
      sha256: summary.sha256Hex,
      bip39Words: bip39,
      ingestedAtIst: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
      custodianNode: "High-Throughput Bulk Ingestion Bridge",
      gateStatus: summary.quarantinedRows > 0 ? "QUARANTINED_BALANCE_DEFICIT" : "PASS",
      gateDetail: `Verified ${summary.validRows.toLocaleString()} valid rows (${summary.quarantinedRows} quarantined) @ ${summary.throughputRowsPerSec.toLocaleString()} rows/sec.`,
    };

    ingestArtifactToCase(selectedCaseId, newArtifact);
    toast.success(`Committed exhibit to ${selectedCaseId} evidence locker!`);
    onClose();
  };

  const handleCopyHash = () => {
    if (!summary?.sha256Hex) return;
    navigator.clipboard.writeText(summary.sha256Hex);
    setIsCopied(true);
    toast.success("SHA-256 hash copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100060,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "680px",
          maxWidth: "92vw",
          maxHeight: "88vh",
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 20px 48px rgba(0,0,0,0.3)",
          border: "1px solid #CBD5E1",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 18px",
            background: "#0F172A",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileUp size={16} color="#38BDF8" />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800 }}>
                HIGH-THROUGHPUT BULK EVIDENCE INGESTION
              </div>
              <div style={{ fontSize: "9.5px", color: "#94A3B8" }}>
                Non-Blocking Web Worker Parsing for 50,000+ Record Dumps
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Target Case Assignment */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>
              Target Investigation Case:
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#F8FAFC",
                color: "#0F172A",
                cursor: "pointer",
              }}
            >
              {caseWorkspaces.map((c) => (
                <option key={c.caseId} value={c.caseId}>
                  {c.caseId} — {c.title.slice(0, 36)}...
                </option>
              ))}
            </select>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  handleStartWorkerIngestion(file.name, ev.target?.result as string);
                };
                reader.readAsText(file);
              }
            }}
            style={{
              border: `2px dashed ${isDragOver ? "#4F46E5" : "#CBD5E1"}`,
              borderRadius: "8px",
              padding: "24px 16px",
              textAlign: "center",
              background: isDragOver ? "#EEF2FF" : "#F8FAFC",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xml,.json,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <FileSpreadsheet size={28} color="#4F46E5" style={{ margin: "0 auto 8px auto" }} />
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B" }}>
              Drop Bank Statement, NPCI RRN Dump, or Telecom CDR here
            </div>
            <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
              Supports up to 100,000 rows (CSV, XML, JSON) with non-blocking Web Worker bitstream hashing
            </div>
          </div>

          {/* Quick Benchmark Button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={handleGenerateSynthetic50k}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #C7D2FE",
                background: "#EEF2FF",
                color: "#4338CA",
                cursor: "pointer",
              }}
            >
              <Sparkles size={12} color="#4F46E5" />
              <span>⚡ Generate & Parse Synthetic 10,000 Transaction Dump</span>
            </button>
          </div>

          {/* Worker Progress Indicator */}
          {progress && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A" }}>
                  Web Worker Streaming Parser Active...
                </span>
                <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#4F46E5", fontFamily: "var(--font-mono)" }}>
                  {progress.percent}% ({progress.processedRows.toLocaleString()} / {progress.totalRows.toLocaleString()})
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: "100%", height: "6px", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progress.percent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #4F46E5, #38BDF8)",
                    borderRadius: "3px",
                    transition: "width 0.1s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", color: "#64748B" }}>
                <span>Throughput: <b>{progress.rowsPerSec.toLocaleString()} rows/sec</b></span>
                <span style={{ fontFamily: "var(--font-mono)" }}>Calculating SHA-256 in background...</span>
              </div>
            </div>
          )}

          {/* Parsed Summary & Preview */}
          {summary && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #A7F3D0",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#065F46" }}>
                    Ingestion Verification Complete: {summary.filename}
                  </span>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#047857", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                  {summary.throughputRowsPerSec.toLocaleString()} rows/sec
                </span>
              </div>

              {/* Stats Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "10.5px" }}>
                <div style={{ padding: "6px 8px", background: "#F8FAFC", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                  <div style={{ color: "#64748B", fontSize: "9px" }}>TOTAL RECORDS</div>
                  <div style={{ fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>{summary.totalRows.toLocaleString()} rows</div>
                </div>
                <div style={{ padding: "6px 8px", background: "#ECFDF5", borderRadius: "4px", border: "1px solid #A7F3D0" }}>
                  <div style={{ color: "#047857", fontSize: "9px" }}>VALID RECORDS</div>
                  <div style={{ fontWeight: 800, color: "#047857", marginTop: "2px" }}>{summary.validRows.toLocaleString()} rows</div>
                </div>
                <div style={{ padding: "6px 8px", background: "#FFF1F2", borderRadius: "4px", border: "1px solid #FECDD3" }}>
                  <div style={{ color: "#BE123C", fontSize: "9px" }}>QUARANTINED</div>
                  <div style={{ fontWeight: 800, color: "#BE123C", marginTop: "2px" }}>{summary.quarantinedRows.toLocaleString()} rows</div>
                </div>
              </div>

              {/* SHA-256 Bitstream Hash */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "5px",
                  padding: "6px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                }}
              >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#334155" }}>
                  <span style={{ fontWeight: 700, color: "#64748B", marginRight: "6px" }}>SHA-256:</span>
                  <span>{summary.sha256Hex}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: isCopied ? "#059669" : "#64748B",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    marginLeft: "8px",
                  }}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* 5-Row Data Preview */}
              <div style={{ marginTop: "4px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", marginBottom: "4px" }}>
                  Extracted Records Sample (First 5 of {summary.totalRows.toLocaleString()}):
                </div>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: "4px", overflow: "hidden", maxHeight: "120px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px", textAlign: "left" }}>
                    <thead style={{ background: "#F1F5F9", color: "#475569" }}>
                      <tr>
                        <th style={{ padding: "3px 6px" }}>RRN / Ref</th>
                        <th style={{ padding: "3px 6px" }}>Sender</th>
                        <th style={{ padding: "3px 6px" }}>Receiver</th>
                        <th style={{ padding: "3px 6px" }}>Amount</th>
                        <th style={{ padding: "3px 6px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.previewRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "3px 6px", fontFamily: "var(--font-mono)" }}>{row.reference}</td>
                          <td style={{ padding: "3px 6px" }}>{row.sender}</td>
                          <td style={{ padding: "3px 6px" }}>{row.receiver}</td>
                          <td style={{ padding: "3px 6px", fontWeight: 700 }}>₹{row.amount.toLocaleString("en-IN")}</td>
                          <td style={{ padding: "3px 6px", color: row.status === "VALID" ? "#059669" : "#BE123C", fontWeight: 700 }}>
                            {row.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 18px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "5px 12px",
              borderRadius: "5px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          {summary && (
            <button
              type="button"
              onClick={handleCommitArtifact}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 14px",
                borderRadius: "5px",
                border: "none",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(79, 70, 229, 0.3)",
              }}
            >
              <Check size={13} />
              <span>Commit Exhibit to {selectedCaseId}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
