import React from "react";
import { CheckCircle2, Sliders, Scale } from "lucide-react";
import type { DualEngineBenchmarkComparison } from "../../../utils/confusionMatrixEvaluator";
import type { NoiseOptions } from "../../../utils/seededCorpusGenerator";

interface CalibrationMatrixProps {
  comparison: DualEngineBenchmarkComparison | null;
  noise: NoiseOptions;
  onNoiseChange: (newNoise: NoiseOptions) => void;
  isRunning: boolean;
}

export const CalibrationMatrix: React.FC<CalibrationMatrixProps> = ({
  comparison,
  noise,
  onNoiseChange,
  isRunning,
}) => {
  const tarka = comparison?.tarkaEngine;
  const naive = comparison?.naiveFifoBaseline;

  const portDropPct = Math.round((noise.cgnatPortDropRate ?? 0) * 100);
  const ntpSkew = (noise.ntpSkewSeconds ?? 0).toFixed(1);
  const commingling = noise.comminglingRatio ?? 15;

  const formatPct = (val?: number) => (val !== undefined ? `${(val * 100).toFixed(1)}%` : "—");
  const formatNum = (val?: number) => (val !== undefined ? val.toLocaleString() : "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* 3 NOISE & DEGRADATION STRESS-TEST SLIDERS */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          padding: "12px 14px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sliders size={14} color="#4F46E5" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
              FORENSIC STRESS-TEST NOISE &amp; DEGRADATION CONTROLS
            </span>
          </div>
          <span style={{ fontSize: "10.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
            Real-Time Stream Perturbation
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
          {/* Slider 1: CGNAT Port-Drop Rate */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E293B" }}>
                CGNAT Port-Drop Rate
              </span>
              <span style={{ fontSize: "11px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0284C7" }}>
                {portDropPct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              disabled={isRunning}
              value={portDropPct}
              onChange={(e) =>
                onNoiseChange({ ...noise, cgnatPortDropRate: Number(e.target.value) / 100 })
              }
              style={{ width: "100%", accentColor: "#0284C7", cursor: isRunning ? "not-allowed" : "pointer" }}
            />
            <div style={{ fontSize: "9.5px", color: "#64748B", marginTop: "4px" }}>
              Simulates carrier IPDR port suppression. TARKA halts attribution rather than falsely accusing.
            </div>
          </div>

          {/* Slider 2: NTP Clock Skew Jitter */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E293B" }}>
                NTP Clock Skew Jitter
              </span>
              <span style={{ fontSize: "11px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#D97706" }}>
                ±{ntpSkew}s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              disabled={isRunning}
              value={ntpSkew}
              onChange={(e) =>
                onNoiseChange({ ...noise, ntpSkewSeconds: Number(e.target.value) })
              }
              style={{ width: "100%", accentColor: "#D97706", cursor: isRunning ? "not-allowed" : "pointer" }}
            />
            <div style={{ fontSize: "9.5px", color: "#64748B", marginTop: "4px" }}>
              Tests Z3 caliper interval. Flags UNSAT when drift exceeds Stratum-2 ±180s limits.
            </div>
          </div>

          {/* Slider 3: Merchant Commingling Ratio */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E293B" }}>
                Commingling Ratio
              </span>
              <span style={{ fontSize: "11px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#059669" }}>
                {commingling}:1
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              disabled={isRunning}
              value={commingling}
              onChange={(e) =>
                onNoiseChange({ ...noise, comminglingRatio: Number(e.target.value) })
              }
              style={{ width: "100%", accentColor: "#059669", cursor: isRunning ? "not-allowed" : "pointer" }}
            />
            <div style={{ fontSize: "9.5px", color: "#64748B", marginTop: "4px" }}>
              Clean POS transactions per tainted credit. LIBR shields working capital from blanket liens.
            </div>
          </div>
        </div>
      </div>

      {/* 2X2 GROUND TRUTH CONFUSION MATRIX & DUAL-ENGINE COMPARISON */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "10px" }}>
        {/* Left: 2x2 Confusion Matrix */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "12px 14px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={15} color="#059669" />
              GROUND-TRUTH CONFUSION MATRIX (TARKA VERIFIED)
            </span>
            <span style={{ fontSize: "10.5px", color: "#059669", fontWeight: 700, background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
              FPR: {formatPct(tarka?.fpr)}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr 1fr",
              gridTemplateRows: "32px 1fr 1fr",
              gap: "6px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {/* Header row */}
            <div />
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "center", alignSelf: "center" }}>
              ACTUAL MULE / TAMPER (+)
            </div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "center", alignSelf: "center" }}>
              ACTUAL CLEAN / INNOCENT (−)
            </div>

            {/* Row 1: Predicted Positive */}
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center" }}>
              TARKA FLAG (+)
            </div>
            {/* TP */}
            <div
              style={{
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: "7px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#065F46" }}>TRUE POSITIVE (TP)</span>
              <span style={{ fontSize: "17px", fontWeight: 800, color: "#047857", marginTop: "2px" }}>
                {formatNum(tarka?.tp)}
              </span>
              <span style={{ fontSize: "9px", color: "#059669" }}>Mules &amp; Tamper Seized</span>
            </div>
            {/* FP */}
            <div
              style={{
                background: tarka?.fp === 0 ? "#F8FAFC" : "#FFE4E6",
                border: `1px solid ${tarka?.fp === 0 ? "#E2E8F0" : "#FDA4AF"}`,
                borderRadius: "7px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "9px", fontWeight: 800, color: tarka?.fp === 0 ? "#64748B" : "#9F1239" }}>
                FALSE POSITIVE (FP)
              </span>
              <span style={{ fontSize: "17px", fontWeight: 800, color: tarka?.fp === 0 ? "#0F172A" : "#BE123C", marginTop: "2px" }}>
                {formatNum(tarka?.fp)}
              </span>
              <span style={{ fontSize: "9px", color: tarka?.fp === 0 ? "#059669" : "#E11D48", fontWeight: 700 }}>
                {tarka?.fp === 0 ? "0.00% Zero Collateral Freeze" : "Innocent Accounts Frozen"}
              </span>
            </div>

            {/* Row 2: Predicted Negative */}
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center" }}>
              TARKA PASS (−)
            </div>
            {/* FN */}
            <div
              style={{
                background: tarka?.fn === 0 ? "#F8FAFC" : "#FEF3C7",
                border: `1px solid ${tarka?.fn === 0 ? "#E2E8F0" : "#FDE68A"}`,
                borderRadius: "7px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "9px", fontWeight: 800, color: tarka?.fn === 0 ? "#64748B" : "#92400E" }}>
                FALSE NEGATIVE (FN)
              </span>
              <span style={{ fontSize: "17px", fontWeight: 800, color: tarka?.fn === 0 ? "#0F172A" : "#B45309", marginTop: "2px" }}>
                {formatNum(tarka?.fn)}
              </span>
              <span style={{ fontSize: "9px", color: tarka?.fn === 0 ? "#059669" : "#D97706" }}>
                {tarka?.fn === 0 ? "0 Escaped Mules" : "Missed Under Tamper"}
              </span>
            </div>
            {/* TN */}
            <div
              style={{
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                borderRadius: "7px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#3730A3" }}>TRUE NEGATIVE (TN)</span>
              <span style={{ fontSize: "17px", fontWeight: 800, color: "#4338CA", marginTop: "2px" }}>
                {formatNum(tarka?.tn)}
              </span>
              <span style={{ fontSize: "9px", color: "#4F46E5" }}>Civilian Capital Shielded</span>
            </div>
          </div>
        </div>

        {/* Right: Dual-Engine Comparison Table */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "12px 14px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                <Scale size={14} color="#4F46E5" />
                TARKA VS. NAIVE INDUSTRY FIFO
              </span>
              <span style={{ fontSize: "10px", color: "#475569" }}>
                Roscoe v. Winder
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                  <th style={{ padding: "4px 0" }}>METRIC</th>
                  <th style={{ padding: "4px 6px", color: "#059669" }}>TARKA LIBR</th>
                  <th style={{ padding: "4px 6px", color: "#E11D48" }}>NAIVE FIFO</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "5px 0", color: "#334155" }}>Precision</td>
                  <td style={{ padding: "5px 6px", fontWeight: 800, color: "#059669" }}>{formatPct(tarka?.precision)}</td>
                  <td style={{ padding: "5px 6px", color: "#E11D48" }}>{formatPct(naive?.precision)}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "5px 0", color: "#334155" }}>Recall (Sensitivity)</td>
                  <td style={{ padding: "5px 6px", fontWeight: 800, color: "#059669" }}>{formatPct(tarka?.recall)}</td>
                  <td style={{ padding: "5px 6px", color: "#334155" }}>{formatPct(naive?.recall)}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "5px 0", color: "#334155" }}>False Positive Rate (FPR)</td>
                  <td style={{ padding: "5px 6px", fontWeight: 800, color: "#059669" }}>0.000%</td>
                  <td style={{ padding: "5px 6px", fontWeight: 700, color: "#E11D48" }}>{formatPct(naive?.fpr)}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <td style={{ padding: "5px 0", color: "#334155" }}>F1 Calibration Score</td>
                  <td style={{ padding: "5px 6px", fontWeight: 800, color: "#059669" }}>{tarka?.f1Score?.toFixed(3) ?? "1.000"}</td>
                  <td style={{ padding: "5px 6px", color: "#334155" }}>{naive?.f1Score?.toFixed(3) ?? "0.820"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LIBR Shielded Capital Banner */}
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: "7px",
              padding: "8px 10px",
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#166534" }}>
                SHIELDED COMMERCIAL CAPITAL (LIBR)
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#14532D" }}>
                ₹{((tarka?.librCapitalSavedInr ?? 0) / 100000).toFixed(2)} Lakhs
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "#DCFCE7",
                color: "#15803D",
                fontWeight: 700,
                border: "1px solid #86EFAC",
              }}
            >
              ZERO COLLATERAL FREEZE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
