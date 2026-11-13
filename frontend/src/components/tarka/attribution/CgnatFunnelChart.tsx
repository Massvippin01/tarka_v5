import React from "react";
import { Users, Radio, Clock, Smartphone, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { GlossaryTerm } from "../../common/GlossaryTerm";

export interface CgnatFunnelChartProps {
  isPortDropped: boolean;
  onTogglePortDropped?: () => void;
  targetImei?: string;
}

export const CgnatFunnelChart: React.FC<CgnatFunnelChartProps> = ({
  isPortDropped,
  onTogglePortDropped,
  targetImei = "867492061234564",
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
      color: "#64748B",
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
      color: "#3B82F6",
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
      color: isPortDropped ? "#F59E0B" : "#8B5CF6",
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
      color: isPortDropped ? "#F59E0B" : "#10B981",
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
    <div className="cgnat-funnel-container flex flex-col h-full justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-100">
      {/* Header controls & summary */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">
              <GlossaryTerm term="CGNAT">CGNAT</GlossaryTerm> Subscriber Attribution Funnel
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                isPortDropped
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {isPortDropped ? "Port Omission Active" : "Unambiguous 1:1 Match"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Progressive narrowing of 10,000 public IP subscribers down to 1 unique target handset
          </p>
        </div>

        {onTogglePortDropped && (
          <button
            type="button"
            onClick={onTogglePortDropped}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isPortDropped
                ? "bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {isPortDropped ? "Reset Port Filter" : "Simulate Port Omission"}
          </button>
        )}
      </div>

      {/* Funnel Visual Stages */}
      <div className="flex flex-col gap-2.5 my-3 flex-1 justify-center">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="relative group">
              <div className="flex items-center justify-between text-xs mb-1 px-1">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  {stage.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{stage.label}</span>
                  <span className="text-[11px] text-slate-400 font-mono">({stage.reduction})</span>
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="w-full bg-slate-800/80 rounded-md h-7 overflow-hidden p-0.5 relative flex items-center border border-slate-700/60">
                <div
                  className="h-full rounded transition-all duration-500 flex items-center px-2.5 justify-between"
                  style={{
                    width: `${Math.max(stage.widthPct, 15)}%`,
                    backgroundColor: stage.color,
                    boxShadow: `0 0 12px ${stage.color}33`,
                  }}
                >
                  <span className="text-[11px] font-bold text-white font-mono drop-shadow-sm whitespace-nowrap">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
                <div className="absolute right-3 text-[11px] text-slate-400 truncate max-w-[65%]">
                  {stage.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mathematical Proof & Odds Formula Card */}
      <div className="mt-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Mathematical Coincidence Proof (Odds Claim Formula):</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {isPortDropped ? "P = 1.2 × 10⁻³" : "P = 1.4 × 10⁻⁷"}
          </span>
        </div>

        <div className="mt-2 text-center p-2 rounded bg-slate-900/80 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
          P(Match) = (1 / N_tower) × (Δt / T_window) × (1 / N_ports) × P(TAC) ={" "}
          <strong className="text-emerald-400">{isPortDropped ? "1 in 833" : "1 in 7,142,857"}</strong>
        </div>

        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          {isPortDropped ? (
            <span className="text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 inline" />
              Without source port matching, coincidental match ambiguity rises to 1 in 833. Issue a DoT Clause 39.20 order for dynamic translation logs.
            </span>
          ) : (
            "The probability that an innocent subscriber randomly shared the identical cell tower sector, NTP-synchronized dynamic port slice, and Poco X5 TAC is less than 1 in 7.14 million."
          )}
        </p>
      </div>
    </div>
  );
};
