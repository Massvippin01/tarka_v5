import React, { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  GitMerge,
  Network,
  Scale,
  FileCheck,
} from "lucide-react";
import { useTarkaGlobal, type TarkaRoute } from "../../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { CaseSyncBridge } from "../../../services/caseSyncBridge";
import { toast } from "sonner";

interface DemoStep {
  stepIndex: number;
  route: TarkaRoute;
  title: string;
  badge: string;
  caption: string;
  highlightText: string;
  icon: React.ComponentType<{ className?: string; size?: number; color?: string }>;
  actionLabel?: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    stepIndex: 0,
    route: "intake",
    title: "Step 1: Multi-Source Evidence Ingestion",
    badge: "STAGE 01",
    caption: "Drop in raw bank statements, UPI XML, and CDR logs — or click 'Use Sample Evidence' for instant bitstream-verified loading.",
    highlightText: "Real SHA-256 integrity check runs on every uploaded file with zero backend tampering.",
    icon: FileSpreadsheet,
    actionLabel: "Use Sample Evidence",
  },
  {
    stepIndex: 1,
    route: "intake",
    title: "Step 2: Ledger Falsification Gate",
    badge: "STAGE 01",
    caption: "TARKA mathematically validates double-entry conservation (Bal[k] = Bal[k-1] + Cr - Dr) and catches tampered Canva PDF receipts.",
    highlightText: "6/6 Finacle CBS ledger rows reconciled; Canva PDF receipt exposes +14.2KB unauthorized append.",
    icon: ShieldCheck,
  },
  {
    stepIndex: 2,
    route: "entities",
    title: "Step 3: Identity Resolution & Shield",
    badge: "STAGE 02",
    caption: "Disparate UPI handles and phone numbers merge into suspect clusters while protecting commercial merchant accounts.",
    highlightText: "Vikram Shah aliases (vikramshah@okaxis & vikram.pay@okaxis) linked; QuickPay preserved under Hard-Veto Shield.",
    icon: Users,
  },
  {
    stepIndex: 3,
    route: "taint-engine",
    title: "Step 4: Money Trail & LIBR Lien",
    badge: "STAGE 03",
    caption: "Lowest Intermediate Balance Rule (LIBR) traces ₹5,00,000 victim outflow across 3 layering hops in real time.",
    highlightText: "₹3,80,000 still recoverable across 3 mule accounts under statutory Dinic min-cut.",
    icon: GitMerge,
  },
  {
    stepIndex: 4,
    route: "network",
    title: "Step 5: Mule Network & Explainable Scores",
    badge: "STAGE 04",
    caption: "Graph analytics isolate the Poco X5 hotspot linking 4 mule accounts, with explainable feature contributions for each score.",
    highlightText: "Accomplice Wi-Fi hotspot (BSSID 74:DA:38:A2:11:BC) and shared JA4 TLS fingerprint unmask controllers.",
    icon: Network,
  },
  {
    stepIndex: 5,
    route: "report",
    title: "Step 6: Freeze Orders & Court Certificate",
    badge: "STAGE 06",
    caption: "Auto-drafts BNSS §106/§107 bank debit freeze directives and BSA §63(4) evidence certificate ready for court filing.",
    highlightText: "5 statutory freeze orders and full chain of custody exportable as light A4 PDF & machine-readable JSON.",
    icon: Scale,
    actionLabel: "Print / Export Dossier",
  },
];

const STEP_DURATION_SECONDS = 25; // 6 steps * 25s = 2.5 minutes (ideal 3-minute judge demo)

export const JudgeModeWalkthrough: React.FC = () => {
  const { setActiveRoute, activeCaseId } = useTarkaGlobal();
  const {
    judgeDemoActive,
    judgeDemoStep,
    judgeDemoAutoPlay,
    stopJudgeDemo,
    nextJudgeDemoStep,
    prevJudgeDemoStep,
    setJudgeDemoStep,
    toggleJudgeDemoAutoPlay,
    setReconstructedInvestigation,
  } = useTarkaUiStore();

  const [secondsRemaining, setSecondsRemaining] = useState<number>(STEP_DURATION_SECONDS);

  const currentStep = DEMO_STEPS[judgeDemoStep] || DEMO_STEPS[0];

  // Navigate route when step changes
  useEffect(() => {
    if (judgeDemoActive && currentStep) {
      setActiveRoute(currentStep.route);
      setSecondsRemaining(STEP_DURATION_SECONDS);
    }
  }, [judgeDemoActive, judgeDemoStep, currentStep, setActiveRoute]);

  // Autoplay countdown timer
  useEffect(() => {
    if (!judgeDemoActive || !judgeDemoAutoPlay) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (judgeDemoStep < DEMO_STEPS.length - 1) {
            nextJudgeDemoStep();
            return STEP_DURATION_SECONDS;
          } else {
            // Reached end of demo
            toast.success("Judge Walkthrough complete! All 6 stages verified.", {
              description: "5 statutory freeze orders and court certificate ready.",
            });
            stopJudgeDemo();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [judgeDemoActive, judgeDemoAutoPlay, judgeDemoStep, nextJudgeDemoStep, stopJudgeDemo]);

  if (!judgeDemoActive) return null;

  const handleUseSampleEvidence = async () => {
    try {
      const bridge = CaseSyncBridge.getInstance();
      const bundle = await bridge.getCaseBundle(activeCaseId || "CASE-2026-001");
      if (bundle) {
        setReconstructedInvestigation(bundle);
        toast.success("Loaded Canonical Evidence for CASE-2026-001", {
          description: "CBS Ledger, UPI XML, and CDR logs parsed with SHA-256 CAS verification.",
        });
      }
    } catch {
      toast.info("Offline sample evidence active.");
    }
  };

  const Icon = currentStep.icon;
  const progressPct = ((STEP_DURATION_SECONDS - secondsRemaining) / STEP_DURATION_SECONDS) * 100;

  return (
    <div
      className="judge-walkthrough-overlay fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-end p-4 md:p-6"
      style={{
        background: "radial-gradient(circle at 50% 30%, transparent 60%, rgba(15, 23, 42, 0.65) 100%)",
      }}
    >
      {/* Floating Spotlight Card */}
      <div
        className="pointer-events-auto max-w-2xl w-full mx-auto rounded-2xl shadow-2xl p-5 text-slate-100 border transition-all duration-300"
        style={{
          background: "rgba(15, 23, 42, 0.94)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(34, 211, 238, 0.4)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(6, 182, 212, 0.25)",
        }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Judges & Investigators 3-Min Walkthrough
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Step {judgeDemoStep + 1} of {DEMO_STEPS.length}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                <Icon className="w-4 h-4 text-cyan-400 inline" />
                {currentStep.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleJudgeDemoAutoPlay}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                judgeDemoAutoPlay
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              }`}
              title={judgeDemoAutoPlay ? "Pause Auto-Advance" : "Auto-Play Walkthrough"}
            >
              {judgeDemoAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{judgeDemoAutoPlay ? `Auto (${secondsRemaining}s)` : "Play"}</span>
            </button>

            <button
              type="button"
              onClick={stopJudgeDemo}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Close Walkthrough"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timer Bar */}
        {judgeDemoAutoPlay && (
          <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Step Explanation & Highlight */}
        <div className="my-3 space-y-2">
          <p className="text-sm font-medium text-slate-200 leading-relaxed">
            {currentStep.caption}
          </p>
          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-cyan-300 flex items-start gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>{currentStep.highlightText}</span>
          </div>
        </div>

        {/* Footer Navigation & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 flex-wrap gap-2">
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {DEMO_STEPS.map((s, idx) => (
              <button
                key={s.stepIndex}
                type="button"
                onClick={() => setJudgeDemoStep(idx)}
                className={`w-6 h-6 rounded-md text-[11px] font-bold font-mono transition-all flex items-center justify-center ${
                  idx === judgeDemoStep
                    ? "bg-cyan-500 text-slate-950 shadow-md scale-105"
                    : idx < judgeDemoStep
                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
                }`}
                title={s.title}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {judgeDemoStep === 0 && (
              <button
                type="button"
                onClick={handleUseSampleEvidence}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
              >
                ⚡ Use Sample Evidence
              </button>
            )}

            <button
              type="button"
              disabled={judgeDemoStep === 0}
              onClick={prevJudgeDemoStep}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {judgeDemoStep < DEMO_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextJudgeDemoStep}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-md transition-all active:scale-95"
              >
                <span>Next Step</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={stopJudgeDemo}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all active:scale-95"
              >
                <span>Finish Demo ✓</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
