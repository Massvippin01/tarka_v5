import React from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Radio,
  Building2,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";
import { CANONICAL_CASES } from "../../../fixtures/cases";
import { formatInr } from "../../../utils/formatters";

interface EndToEndReconstructionStripProps {
  onOpenFileManifest?: (fileId: string) => void;
}

export const EndToEndReconstructionStrip: React.FC<EndToEndReconstructionStripProps> = ({
  onOpenFileManifest,
}) => {
  const { setIntelligenceBriefOpen, setTransformationAuditModalOpen } = useTarkaUiStore();
  const { activeCaseId } = useTarkaGlobal();
  const canonical = (activeCaseId && CANONICAL_CASES[activeCaseId]) ? CANONICAL_CASES[activeCaseId] : CANONICAL_CASES["CASE-2026-001"];
  const bookedLossStr = canonical?.financials?.bookedLossInr ? formatInr(canonical.financials.bookedLossInr) : "₹5.00L";
  const bankName = canonical?.complainant?.bank || "SBI";

  const files = [
    {
      id: "01_NCRP_1930",
      name: "01 NCRP 1930 Intake",
      status: "QUARANTINED",
      statusText: "2 %%EOF Canva Edit",
      badgeVariant: "rose" as const,
      icon: FileText,
      tooltip: `Complaint ${canonical?.ncrpAckNo || "NCRP-1930"} · Intake Evidence`,
    },
    {
      id: "02_Victim_SBI_Finacle",
      name: `02 ${bankName} Finacle Statement`,
      status: "PASS",
      statusText: `${bookedLossStr} Debit Invariant`,
      badgeVariant: "emerald" as const,
      icon: FileSpreadsheet,
      tooltip: `${bankName} Core Banking Statement · Commit Verified`,
    },
    {
      id: "03_NPCI_Switch",
      name: "03 NPCI Central Switch",
      status: "PASS",
      statusText: "7 Switch Hops Verified",
      badgeVariant: "emerald" as const,
      icon: FileCode,
      tooltip: "Central Switch Log · RRN Julian day 265 · JA4 t13d1516h2_8daaf6 · IMEI 86749206...",
    },
    {
      id: "04_Nodal_KYC",
      name: "04 Nodal CBS KYC",
      status: "PASS",
      statusText: "Mewat Introducer Ring",
      badgeVariant: "indigo" as const,
      icon: Building2,
      tooltip: "Axis, HDFC, ICICI, PNB Nodal KYC · Introducer INTRO-MEWAT-991 + GSTIN Merchant",
    },
    {
      id: "05_Airtel_CGNAT",
      name: "05 Airtel CGNAT IPDR",
      status: "WARN",
      statusText: "TTL 63 Hotspot · Port 0",
      badgeVariant: "amber" as const,
      icon: Radio,
      tooltip: "Bharti Airtel DoT IPDR · TTL=63 WiFi Hotspot · Port 0 Deepak Meena Quarantined",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "6px 10px",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Left Title Label */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "5px",
            background: "#EEF2FF",
            border: "1px solid #C7D2FE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4F46E5",
          }}
        >
          <Layers size={13} />
        </div>
        <div>
          <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            5-File Evidentiary Join
          </div>
          <div style={{ fontSize: "9px", color: "#64748B" }}>
            Indian Case Pack (FIR #0149/2026)
          </div>
        </div>
      </div>

      {/* Center 5 File Pills */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", overflowX: "auto", minWidth: 0 }}>
        {files.map((f) => {
          const Icon = f.icon;
          const isQuarantined = f.status === "QUARANTINED";
          const isWarn = f.status === "WARN";
          const isPass = f.status === "PASS";

          return (
            <div
              key={f.id}
              onClick={() => onOpenFileManifest?.(f.id)}
              title={f.tooltip}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                borderRadius: "5px",
                background: isQuarantined ? "#FFF1F2" : isWarn ? "#FFFBEB" : isPass ? "#F8FAFC" : "#F1F5F9",
                border: `1px solid ${isQuarantined ? "#FECDD3" : isWarn ? "#FDE68A" : isPass ? "#E2E8F0" : "#CBD5E1"}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "10px",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={12} color={isQuarantined ? "#E11D48" : isWarn ? "#D97706" : "#4F46E5"} />
              <span style={{ fontWeight: 700, color: "#1E293B" }}>{f.name}</span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "0.5px 4px",
                  borderRadius: "3px",
                  background: isQuarantined ? "#FFE4E6" : isWarn ? "#FEF3C7" : "#ECFDF5",
                  color: isQuarantined ? "#BE123C" : isWarn ? "#92400E" : "#059669",
                  border: `1px solid ${isQuarantined ? "#FDA4AF" : isWarn ? "#FCD34D" : "#A7F3D0"}`,
                }}
              >
                {f.statusText}
              </span>
            </div>
          );
        })}
      </div>

      {/* Right Intelligence Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setIntelligenceBriefOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3.5px 8px",
            borderRadius: "5px",
            background: "#4F46E5",
            border: "1px solid #4338CA",
            color: "#FFFFFF",
            fontSize: "10.5px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
          }}
          title="Open 7-Question Explainable Investigation Intelligence Brief"
        >
          <Sparkles size={11} />
          <span>7-Question Brief</span>
        </button>

        <button
          type="button"
          onClick={() => setTransformationAuditModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3.5px 8px",
            borderRadius: "5px",
            background: "#F8FAFC",
            border: "1px solid #CBD5E1",
            color: "#334155",
            fontSize: "10.5px",
            fontWeight: 600,
            cursor: "pointer",
          }}
          title="Inspect 10-Step Deterministic Transformation Audit Log"
        >
          <Shield size={11} color="#64748B" />
          <span>Transformation Log</span>
        </button>
      </div>
    </div>
  );
};
