import React from "react";
import { Users, Radio, Clock, Smartphone, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { GlossaryTerm } from "../../common/GlossaryTerm";

export interface CgnatFunnelChartProps {
  isPortDropped: boolean;
  onTogglePortDropped?: () => void;
  targetImei?: string;
  hideHeader?: boolean;
}

export const CgnatFunnelChart: React.FC<CgnatFunnelChartProps> = ({
  isPortDropped,
  onTogglePortDropped,
  targetImei = "867492061234564",
  hideHeader = false,
}) => {
  const stages = [
    {
      id: "initial",
      title: "1. Total CGNAT Subscriber Pool",
      count: 10000,
      label: "10,000 Candidates",
      reduction: "Baseline (100%)",
      detail: "Subscribers sharing public NAT IP 103.21.144.92",
      icon: Users,
      color: "#2563EB",
      widthPct: 100,
    },
    {
      id: "tower",
      title: "2. Cell Tower Sector Filter",
      count: 420,
      label: "420 Candidates",
      reduction: "95.8% filtered",
      detail: "Cell tower DL-TWR-891 (Sector 2, Azimuth 120°)",
      icon: Radio,
      color: "#0284C7",
      widthPct: 70,
    },
    {
      id: "time_port",
      title: "3. Timestamp & Port Range",
      count: isPortDropped ? 340 : 18,
      label: isPortDropped ? "340 Candidates (Omission)" : "18 Candidates",
      reduction: isPortDropped ? "Port dropped" : "99.82% filtered",
      detail: isPortDropped
        ? "Source port missing: Ambiguity expands across 44000-44511 block"
        : "Dynamic port allocation within ±200ms NTP synchronization window",
      icon: Clock,
      color: isPortDropped ? "#D97706" : "#7C3AED",
      widthPct: isPortDropped ? 55 : 42,
    },
    {
      id: "device_tac",
      title: "4. Handset Model (TAC)",
      count: isPortDropped ? 12 : 1,
      label: isPortDropped ? "12 Candidates" : "1 Candidate",
      reduction: isPortDropped ? "Model filter" : "99.99% filtered",
      detail: "Type Allocation Code 86749206 (Poco X5 5G) + JA4 TLS handshake",
      icon: Smartphone,
      color: isPortDropped ? "#D97706" : "#059669",
      widthPct: isPortDropped ? 35 : 20,
    },
    {
      id: "isolated",
      title: "5. Isolated Suspect Handset",
      count: 1,
      label: "1 Suspect Isolated",
      reduction: "P = 1.4 × 10⁻⁷",
      detail: `Target IMEI ${targetImei} (Binding to accomplice hotspot & SIM IMSI)`,
      icon: CheckCircle,
      color: "#059669",
      widthPct: 12,
    },
  ];

  return (
    <div className="cgnat-funnel-container flex flex-col h-full justify-between gap-3 text-[var(--fg-1)]">
      {/* Header controls & summary (only if hideHeader is false) */}
      {!hideHeader && (
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-[var(--fg-1)]">
                <GlossaryTerm term="CGNAT" explanation="Carrier-Grade Network Address Translation: multiplexing thousands of subscribers behind shared public IPv4 addresses.">CGNAT</GlossaryTerm> Subscriber Attribution Funnel
              </span>
              <span
                className={`px-2 py-0.5 text-[12px] font-semibold rounded-full border ${
                  isPortDropped
                    ? "bg-[var(--color-urgent-bg)] text-[var(--urgent)] border-[var(--urgent)]/30"
                    : "bg-[var(--color-safe-bg)] text-[var(--safe)] border-[var(--safe)]/30"
                }`}
              >
                {isPortDropped ? "Port Omission Active" : "Unambiguous 1:1 Match"}
              </span>
            </div>
            <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
              Progressive narrowing of 10,000 public IP subscribers down to 1 unique target handset
            </p>
          </div>

          {onTogglePortDropped && (
            <button
              type="button"
              onClick={onTogglePortDropped}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold border transition-all shadow-xs ${
                isPortDropped
                  ? "bg-[var(--color-urgent-bg)] border-[var(--urgent)] text-[var(--urgent)] font-bold"
                  : "bg-[var(--surface-1)] border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]"
              }`}
            >
              {isPortDropped ? "Reset Port Filter" : "Simulate Port Omission"}
            </button>
          )}
        </div>
      )}

      {/* Funnel Visual Stages: Clean Horizontal Funnel */}
      <div className="flex flex-col gap-2 flex-1 justify-center">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              className="cgnat-stage-row p-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-strong)] hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-3 w-full">
                {/* Left: Stage Title & Subtitle */}
                <div className="w-[210px] shrink-0 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className="text-[12.5px] font-bold text-[var(--fg-1)] truncate"
                      title={stage.title}
                    >
                      {stage.title}
                    </span>
                  </div>
                  <div
                    className="text-[12px] text-[var(--fg-3)] mt-0.5 truncate pl-6.5"
                    title={stage.detail}
                  >
                    {stage.detail}
                  </div>
                </div>

                {/* Center: Clean Progress Bar */}
                <div className="flex-1 min-w-0">
                  <div className="w-full h-3.5 rounded-full bg-slate-100 border border-slate-200/80 overflow-hidden relative shadow-inner">
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(stage.widthPct, 2)}%`,
                        backgroundColor: stage.color,
                        borderRadius: "9999px",
                        transition: "width 0.4s ease-out",
                      }}
                    />
                  </div>
                </div>

                {/* Right: Count & Percentage Chip */}
                <div className="w-[165px] shrink-0 flex items-center justify-end gap-2">
                  <span className="text-[13px] font-bold font-mono text-[var(--fg-1)] tabular-nums">
                    {stage.count.toLocaleString()}
                  </span>
                  <span
                    className="text-[12px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                    style={{
                      backgroundColor: `${stage.color}12`,
                      color: stage.color,
                      borderColor: `${stage.color}35`,
                    }}
                  >
                    {stage.reduction}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mathematical Proof & Odds Formula Card */}
      <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--fg-1)]">
            <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>Mathematical Coincidence Proof (Odds Claim Formula):</span>
          </div>
          <span className="text-[12px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            {isPortDropped ? "P = 1.2 × 10⁻³" : "P = 1.4 × 10⁻⁷"}
          </span>
        </div>

        <div className="text-center p-2 rounded bg-[var(--surface-1)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] shadow-xs overflow-x-auto">
          P(Match) = (1 / N_tower) × (Δt / T_window) × (1 / N_ports) × P(TAC) ={" "}
          <strong className={isPortDropped ? "text-[var(--urgent)] font-bold" : "text-[var(--safe)] font-bold"}>
            {isPortDropped ? "1 in 833 (Ambiguous)" : "1 in 7,142,857 (Deterministic)"}
          </strong>
        </div>

        <p className="text-[12px] text-[var(--fg-2)] leading-relaxed">
          {isPortDropped ? (
            <span className="text-[var(--urgent)] font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 inline shrink-0" />
              Without source port matching, coincidental match ambiguity expands across the port block. Issue a DoT Clause 39.20 order for dynamic translation logs.
            </span>
          ) : (
            "The probability that an innocent subscriber randomly shared the identical cell tower sector, NTP-synchronized dynamic port slice, and Poco X5 TAC is less than 1 in 7.14 million."
          )}
        </p>
      </div>
    </div>
  );
};

