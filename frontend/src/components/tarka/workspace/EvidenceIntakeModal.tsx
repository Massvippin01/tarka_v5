import React, { useState, useRef } from "react";
import {
  FileUp,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Copy,
  Check,
  Radio,
  FileSpreadsheet,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTarkaGlobal,
  type IngestedArtifact,
  } from "../../../context/TarkaGlobalContext";
import {
  computeSha256Hex,
  generateBip39Words,
  computePhoneticReadout,
  generateChainOfCustodyRecord,
  inspectFilePayload,
  generateCanvaPdfPreset,
  generateFinacleCsvPreset,
  generateCgnatCsvPreset,
  generateNpciXmlPreset,
  type FalsificationInspectionResult,
} from "../../../utils/forensicCrypto";

interface ScannedFileState {
  filename: string;
  byteSize: number;
  rawText: string;
  sha256Hex: string;
  bip39Words: string[];
  inspection: FalsificationInspectionResult;
  isProcessing: boolean;
}

export const EvidenceIntakeModal: React.FC = () => {
  const {
    isEvidenceModalOpen,
    setIsEvidenceModalOpen,
    evidenceModalTargetCaseId,
    setEvidenceModalTargetCaseId,
    caseWorkspaces,
    ingestArtifactToCase,
  } = useTarkaGlobal();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scannedFile, setScannedFile] = useState<ScannedFileState | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isEvidenceModalOpen) return null;

  const currentCase =
    caseWorkspaces.find((c) => c.caseId === evidenceModalTargetCaseId) ||
    caseWorkspaces[0];

  const handleProcessBuffer = async (
    filename: string,
    buffer: ArrayBuffer,
    text: string
  ) => {
    setScannedFile({
      filename,
      byteSize: buffer.byteLength,
      rawText: text,
      sha256Hex: "Computing SHA-256...",
      bip39Words: [],
      inspection: {
        vectorType: "CBS_LEDGER",
        tier: "TIER_1_CERTIFIED",
        gateStatus: "PASS",
        gateDetail: "Running pre-admission falsification checks...",
        custodianNode: "Local Enclave",
      },
      isProcessing: true,
    });

    const sha256 = await computeSha256Hex(buffer);
    const bip39 = generateBip39Words(sha256, 6);
    const inspection = inspectFilePayload(filename, text, buffer.byteLength);

    setScannedFile({
      filename,
      byteSize: buffer.byteLength,
      rawText: text,
      sha256Hex: sha256,
      bip39Words: bip39,
      inspection,
      isProcessing: false,
    });
  };

  const handleNativeFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const text = await file.text();
    await handleProcessBuffer(file.name, buffer, text);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const text = await file.text();
    await handleProcessBuffer(file.name, buffer, text);
  };

  // Synthetic Demo Preset Injections
  const handleLoadCanvaPdf = async () => {
    const preset = generateCanvaPdfPreset();
    const encoder = new TextEncoder();
    const buffer = encoder.encode(preset.text).buffer;
    await handleProcessBuffer(preset.filename, buffer, preset.text);
    toast.info("Injected Disputed Canva Receipt (.PDF — 2 %%EOF markers)");
  };

  const handleLoadFinacleCsv = async () => {
    const preset = generateFinacleCsvPreset(true);
    const encoder = new TextEncoder();
    const buffer = encoder.encode(preset.text).buffer;
    await handleProcessBuffer(preset.filename, buffer, preset.text);
    toast.info("Injected SBI Finacle CBS Dump (.CSV — Row #14 Deficit)");
  };

  const handleLoadCgnatCsv = async () => {
    const preset = generateCgnatCsvPreset();
    const encoder = new TextEncoder();
    const buffer = encoder.encode(preset.text).buffer;
    await handleProcessBuffer(preset.filename, buffer, preset.text);
    toast.info("Injected Airtel CGNAT IPDR Log (.CSV — 10k Subscribers)");
  };

  const handleLoadNpciXml = async () => {
    const preset = generateNpciXmlPreset();
    const encoder = new TextEncoder();
    const buffer = encoder.encode(preset.text).buffer;
    await handleProcessBuffer(preset.filename, buffer, preset.text);
    toast.info("Injected NPCI UPI 2.0 <Device> XML Stanza");
  };

  const handleCommitArtifact = (admitAsQuarantined = false) => {
    if (!scannedFile) return;

    const tier = admitAsQuarantined
      ? "TIER_3_QUARANTINED"
      : scannedFile.inspection.tier;

    const cocRecord = generateChainOfCustodyRecord(
      currentCase.caseId,
      scannedFile.filename,
      scannedFile.byteSize,
      scannedFile.sha256Hex,
      {
        ...scannedFile.inspection,
        tier,
      },
      "Insp. R. K. Sharma (IO-409)"
    );

    const newArtifact: IngestedArtifact = {
      id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      filename: scannedFile.filename,
      vectorType: scannedFile.inspection.vectorType,
      tier,
      byteSize: scannedFile.byteSize,
      sha256: scannedFile.sha256Hex,
      bip39Words: scannedFile.bip39Words,
      phoneticReadout: computePhoneticReadout(scannedFile.sha256Hex),
      ingestedAtIst: new Date()
        .toISOString()
        .replace("T", " ")
        .substring(0, 19) + " IST",
      custodianNode: scannedFile.inspection.custodianNode,
      gateStatus: scannedFile.inspection.gateStatus,
      gateDetail: scannedFile.inspection.gateDetail,
      piiBlindedStats: scannedFile.inspection.piiBlindedStats,
      cocRecord,
    };

    ingestArtifactToCase(currentCase.caseId, newArtifact);

    toast.success(
      admitAsQuarantined
        ? `Admitted ${scannedFile.filename} to Quarantine (Disputed Exhibit)`
        : `Committed ${scannedFile.filename} to ${currentCase.caseId} Locker ✓`,
      {
        description: `SHA-256: ${scannedFile.sha256Hex.substring(0, 16)}... · Sealed under BSA §63(4)`,
        duration: 4000,
      }
    );

    setScannedFile(null);
    setIsEvidenceModalOpen(false);
  };

  const handleCopySha = () => {
    if (!scannedFile) return;
    navigator.clipboard.writeText(scannedFile.sha256Hex);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intake-modal-title"
    >
      <div
        style={{
          width: "780px",
          maxWidth: "96vw",
          maxHeight: "92vh",
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px solid #CBD5E1",
          boxShadow:
            "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#4F46E5",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(79, 70, 229, 0.3)",
              }}
            >
              <FileUp size={16} strokeWidth={2.4} />
            </div>
            <div>
              <div
                id="intake-modal-title"
                style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}
              >
                Live Cryptographic Evidence Intake Engine
              </div>
              <div
                style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}
              >
                WebCrypto SHA-256 · BIP-39 Forensic Seal · Automated Falsification Gate · 100% Air-Gap Verified
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Target Case Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Target Case:
              </span>
              <select
                value={evidenceModalTargetCaseId}
                onChange={(e) => setEvidenceModalTargetCaseId(e.target.value)}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#0F172A",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {caseWorkspaces.map((cw) => (
                  <option key={cw.caseId} value={cw.caseId}>
                    {cw.caseId} ({cw.firNumber})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsEvidenceModalOpen(false)}
              className="hover:bg-slate-200 enabled:active:scale-[0.96] transition-transform duration-150"
              style={{
                background: "transparent",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* DRAG & DROP ZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? "#4F46E5" : "#CBD5E1"}`,
              borderRadius: "10px",
              padding: "20px 16px",
              background: isDragOver ? "#EEF2FF" : "#F8FAFC",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleNativeFileChange}
              accept=".csv,.xml,.pdf,.json,.txt,.apk,.pcap"
              style={{ display: "none" }}
            />
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#EEF2FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4F46E5",
                marginBottom: "8px",
              }}
            >
              <FileUp size={20} />
            </div>
            <div
              style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F172A" }}
            >
              Click to browse or drag &amp; drop evidentiary files here
            </div>
            <div
              style={{
                fontSize: "10.5px",
                color: "#64748B",
                marginTop: "2px",
                textAlign: "center",
              }}
            >
              Supports SBI/HDFC Finacle CSVs, Telecom CGNAT IPDRs, NPCI UPI 2.0 XMLs, Canva PDFs, and APK telemetry
            </div>
          </div>

          {/* 1-CLICK SYNTHETIC DEMO PRESETS BAR */}
          <div
            style={{
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                <Sparkles size={12} color="#4F46E5" />
                <span>Quick-Load Standard Forensic Exhibits (1-Click Demo Presets):</span>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                  color: "#64748B",
                }}
              >
                Zero-setup offline evaluation
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "6px",
              }}
            >
              <button
                type="button"
                onClick={handleLoadCanvaPdf}
                className="hover:border-rose-400 hover:bg-rose-50/50 enabled:active:scale-[0.96] transition-transform duration-150"
                style={{
                  padding: "5px 6px",
                  borderRadius: "5px",
                  border: "1px solid #FECDD3",
                  background: "#FFFFFF",
                  color: "#BE123C",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                title="Generates PDF with dual %%EOF markers (Canva tampering)"
              >
                <FileText size={11} color="#E11D48" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Canva PDF (2 %%EOF)
                </span>
              </button>

              <button
                type="button"
                onClick={handleLoadFinacleCsv}
                className="hover:border-amber-400 hover:bg-amber-50/50 enabled:active:scale-[0.96] transition-transform duration-150"
                style={{
                  padding: "5px 6px",
                  borderRadius: "5px",
                  border: "1px solid #FDE68A",
                  background: "#FFFFFF",
                  color: "#92400E",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                title="Finacle CBS with Row 14 ₹2.00L deficit"
              >
                <FileSpreadsheet size={11} color="#D97706" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Finacle CBS (-₹2.0L)
                </span>
              </button>

              <button
                type="button"
                onClick={handleLoadCgnatCsv}
                className="hover:border-emerald-400 hover:bg-emerald-50/50 enabled:active:scale-[0.96] transition-transform duration-150"
                style={{
                  padding: "5px 6px",
                  borderRadius: "5px",
                  border: "1px solid #A7F3D0",
                  background: "#FFFFFF",
                  color: "#047857",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                title="Airtel CGNAT IPDR with 9,996 blinded subscribers"
              >
                <Radio size={11} color="#059669" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Airtel CGNAT (10k)
                </span>
              </button>

              <button
                type="button"
                onClick={handleLoadNpciXml}
                className="hover:border-indigo-400 hover:bg-indigo-50/50 enabled:active:scale-[0.96] transition-transform duration-150"
                style={{
                  padding: "5px 6px",
                  borderRadius: "5px",
                  border: "1px solid #C7D2FE",
                  background: "#FFFFFF",
                  color: "#4338CA",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                title="NPCI UPI 2.0 Device XML with BSSID and JA4"
              >
                <Cpu size={11} color="#4F46E5" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  NPCI UPI 2.0 XML
                </span>
              </button>
            </div>
          </div>

          {/* SCANNED FILE VERIFICATION RESULT STEPPER */}
          {scannedFile && (
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                background: "#FFFFFF",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* Stepper Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #F1F5F9",
                  paddingBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background:
                        scannedFile.inspection.tier === "TIER_1_CERTIFIED"
                          ? "#ECFDF5"
                          : scannedFile.inspection.tier === "TIER_3_QUARANTINED"
                          ? "#FFF1F2"
                          : "#FEF3C7",
                      color:
                        scannedFile.inspection.tier === "TIER_1_CERTIFIED"
                          ? "#047857"
                          : scannedFile.inspection.tier === "TIER_3_QUARANTINED"
                          ? "#BE123C"
                          : "#92400E",
                      border: `1px solid ${
                        scannedFile.inspection.tier === "TIER_1_CERTIFIED"
                          ? "#A7F3D0"
                          : scannedFile.inspection.tier === "TIER_3_QUARANTINED"
                          ? "#FECDD3"
                          : "#FDE68A"
                      }`,
                    }}
                  >
                    {scannedFile.inspection.tier === "TIER_3_QUARANTINED"
                      ? "TIER-3 DISPUTED"
                      : scannedFile.inspection.tier}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#0F172A",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {scannedFile.filename}
                  </span>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>
                    ({(scannedFile.byteSize / 1024).toFixed(1)} KB)
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    color:
                      scannedFile.inspection.gateStatus === "PASS"
                        ? "#059669"
                        : "#E11D48",
                  }}
                >
                  {scannedFile.inspection.gateStatus === "PASS"
                    ? "✓ GATE I1–I5 SATISFIED"
                    : "✗ QUARANTINE FLAGGED"}
                </div>
              </div>

              {/* 4-Step Verification Stepper Visual */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "6px",
                  fontSize: "9.5px",
                }}
              >
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "5px",
                    padding: "6px",
                  }}
                >
                  <div style={{ color: "#64748B", fontWeight: 700, fontSize: "8px" }}>
                    1. BYTE READ
                  </div>
                  <div style={{ fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>
                    {scannedFile.byteSize} Bytes
                  </div>
                </div>

                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "5px",
                    padding: "6px",
                  }}
                >
                  <div style={{ color: "#64748B", fontWeight: 700, fontSize: "8px" }}>
                    2. SHA-256 HASH
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#059669",
                      marginTop: "2px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {scannedFile.sha256Hex.substring(0, 12)}...
                  </div>
                </div>

                <div
                  style={{
                    background:
                      scannedFile.inspection.gateStatus === "PASS"
                        ? "#ECFDF5"
                        : "#FFF1F2",
                    border: `1px solid ${
                      scannedFile.inspection.gateStatus === "PASS"
                        ? "#A7F3D0"
                        : "#FECDD3"
                    }`,
                    borderRadius: "5px",
                    padding: "6px",
                  }}
                >
                  <div
                    style={{
                      color:
                        scannedFile.inspection.gateStatus === "PASS"
                          ? "#047857"
                          : "#BE123C",
                      fontWeight: 700,
                      fontSize: "8px",
                    }}
                  >
                    3. FALSIFICATION GATE
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      color:
                        scannedFile.inspection.gateStatus === "PASS"
                          ? "#047857"
                          : "#BE123C",
                      marginTop: "2px",
                    }}
                  >
                    {scannedFile.inspection.gateStatus}
                  </div>
                </div>

                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "5px",
                    padding: "6px",
                  }}
                >
                  <div style={{ color: "#64748B", fontWeight: 700, fontSize: "8px" }}>
                    4. CASE TARGET
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#4F46E5",
                      marginTop: "2px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {currentCase.caseId}
                  </div>
                </div>
              </div>

              {/* SHA-256 Digest & BIP-39 Seal Details */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>
                    CRYPTOGRAPHIC AUDIT DIGEST (SHA-256):
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySha}
                    className="hover:bg-slate-200 enabled:active:scale-[0.96] transition-transform duration-150"
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#4F46E5",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    {copiedHash ? <Check size={10} color="#059669" /> : <Copy size={10} />}
                    <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
                  </button>
                </div>
                <div
                  style={{
                    fontSize: "9.5px",
                    fontFamily: "var(--font-mono)",
                    color: "#0F172A",
                    wordBreak: "break-all",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {scannedFile.sha256Hex}
                </div>

                {/* BIP-39 Phonetic Seal */}
                <div style={{ marginTop: "2px" }}>
                  <div
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 700,
                      color: "#64748B",
                      marginBottom: "4px",
                    }}
                  >
                    6-WORD BIP-39 PHONETIC EVIDENCE SEAL:
                  </div>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {scannedFile.bip39Words.map((w, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)",
                          background: "#EEF2FF",
                          color: "#4338CA",
                          border: "1px solid #C7D2FE",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {idx + 1}. {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Falsification Inspection Detail / Warning Box */}
              <div
                style={{
                  background:
                    scannedFile.inspection.gateStatus === "PASS"
                      ? "#ECFDF5"
                      : "#FFF1F2",
                  border: `1px solid ${
                    scannedFile.inspection.gateStatus === "PASS"
                      ? "#A7F3D0"
                      : "#FECDD3"
                  }`,
                  borderRadius: "6px",
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                {scannedFile.inspection.gateStatus === "PASS" ? (
                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: "1px" }} />
                ) : (
                  <AlertTriangle size={16} color="#E11D48" style={{ flexShrink: 0, marginTop: "1px" }} />
                )}
                <div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      color:
                        scannedFile.inspection.gateStatus === "PASS"
                          ? "#065F46"
                          : "#9F1239",
                    }}
                  >
                    {scannedFile.inspection.gateStatus === "PASS"
                      ? "Evidence Passed Pre-Admission Falsification Checks"
                      : "Evidence Falsification Anomaly Flagged — Quarantine Protocol Required"}
                  </div>
                  <div
                    style={{
                      fontSize: "9.5px",
                      color:
                        scannedFile.inspection.gateStatus === "PASS"
                          ? "#047857"
                          : "#BE123C",
                      marginTop: "2px",
                      lineHeight: "1.35",
                    }}
                  >
                    {scannedFile.inspection.gateDetail}
                  </div>
                  {scannedFile.inspection.gateStatus !== "PASS" && (
                    <div
                      style={{
                        fontSize: "8.5px",
                        color: "#64748B",
                        marginTop: "4px",
                        fontStyle: "italic",
                      }}
                    >
                      Forensic Law Doctrine: Tampered exhibits are never discarded. They are admitted under Tier-3 Quarantine to document fabrication without poisoning the automated attribution graph.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "10px", color: "#64748B" }}>
            Destination Case: <strong style={{ color: "#0F172A" }}>{currentCase.firNumber}</strong> ({currentCase.policeStation})
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                setScannedFile(null);
                setIsEvidenceModalOpen(false);
              }}
              className="hover:bg-slate-200 enabled:active:scale-[0.96] transition-transform duration-150"
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            {scannedFile && scannedFile.inspection.gateStatus === "PASS" && (
              <button
                type="button"
                onClick={() => handleCommitArtifact(false)}
                className="hover:bg-emerald-700 enabled:active:scale-[0.96] transition-transform duration-150"
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#059669",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)",
                }}
              >
                <Check size={13} />
                <span>Commit Tier-1 Exhibit to Case Locker</span>
              </button>
            )}

            {scannedFile && scannedFile.inspection.gateStatus !== "PASS" && (
              <button
                type="button"
                onClick={() => handleCommitArtifact(true)}
                className="hover:bg-rose-700 enabled:active:scale-[0.96] transition-transform duration-150"
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#E11D48",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(225, 29, 72, 0.25)",
                }}
              >
                <AlertTriangle size={13} />
                <span>Admit to Quarantine as Disputed Exhibit (Isolate from AI Graph)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
