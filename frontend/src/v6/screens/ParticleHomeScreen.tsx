import React, { useState, useEffect } from 'react';
import {
  Mic,
  Globe,
  LayoutGrid,
  ChevronRight,
  ShieldCheck,
  Lock,
  Volume2,
} from 'lucide-react';
import { TarkaParticleOrb, type OrbState } from '../voice/TarkaParticleOrb';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { getCanonicalCase } from '../../fixtures/cases';

export const ParticleHomeScreen: React.FC = () => {
  const { activeCaseId, setActiveCaseId, setActiveView } = useCaseStore();
  const { setVoiceModalOpen, setAskTarkaOpen } = useTarkaUiStore();

  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [showCaseSelector, setShowCaseSelector] = useState<boolean>(false);
  const [voiceProviderMode, setVoiceProviderMode] = useState<'OFFLINE_LOCAL' | 'SARVAM_ENHANCED'>('OFFLINE_LOCAL');

  // Simulated or live audio waveform energy loop for the particle orb
  useEffect(() => {
    let interval: any;
    if (orbState === 'listening' || orbState === 'speaking') {
      interval = setInterval(() => {
        setAudioLevel(0.2 + Math.random() * 0.55);
      }, 120);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [orbState]);

  const effectiveCaseId = activeCaseId || 'CASE-2026-001';
  const canonicalCase = getCanonicalCase(effectiveCaseId);

  const samplePrompts = [
    {
      label: 'Summarize this investigation',
      query: 'Provide an executive summary of this investigation, including total loss, key suspects, and admitted evidence.',
    },
    {
      label: 'Explain the financial discrepancy',
      query: 'Explain the payment ledger discrepancy between the complainant statement and the bank CBS export.',
    },
    {
      label: 'Identify contradictions in admitted evidence',
      query: 'Check for statutory and temporal contradictions across all admitted artifacts using the Z3 solver.',
    },
    {
      label: 'Explain the timeline',
      query: 'Reconstruct the chronological timeline of events leading up to the fraud and highlight the Golden Hour window.',
    },
    {
      label: 'Examine suspicious transaction cluster',
      query: 'Analyze the mule ring transaction velocity and pinpoint the Layer-1 mule accounts.',
    },
    {
      label: 'Prepare evidence-referenced briefing',
      query: 'Draft a Section 63 BSA compliant digital evidence certificate briefing with SHA-256 hashes.',
    },
  ];

  const languageOptions = [
    { code: 'en-IN', label: 'Indian English (en-IN)' },
    { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
    { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
    { code: 'bn-IN', label: 'Bengali (বাংলা)' },
    { code: 'te-IN', label: 'Telugu (తెలుగు)' },
    { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
    { code: 'mr-IN', label: 'Marathi (मराठी)' },
    { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  ];

  const handleLaunchVoice = () => {
    setVoiceModalOpen(true);
    setOrbState('listening');
  };

  const handleExecutePrompt = (query: string) => {
    setAskTarkaOpen(true);
    window.dispatchEvent(new CustomEvent('tarka-prompt-select', { detail: { prompt: query } }));
  };

  return (
    <div
      className="relative w-full min-h-screen flex flex-col justify-between items-center text-slate-100 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 35%, #0D131F 0%, #06080D 70%, #030407 100%)',
      }}
    >
      {/* 1. Header Toolbar */}
      <header className="w-full max-w-7xl px-6 sm:px-8 pt-6 pb-4 flex items-center justify-between z-20">
        {/* Brand Identity */}
        <div className="flex items-baseline gap-3">
          <span
            className="text-2xl font-bold tracking-[0.2em] text-white"
            style={{ fontFamily: "'Cinzel', 'IBM Plex Serif', Georgia, serif" }}
          >
            TARKA
          </span>
          <span className="text-base font-semibold text-sky-400 tracking-wider">
            तर्क
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 tracking-wider ml-2 pl-3 border-l border-slate-700/60">
            SUTRAM 2026 • DIGITAL FORENSICS WORKSTATION
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Active Case Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCaseSelector(!showCaseSelector)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition-colors shadow-sm"
              title="Select active forensic case"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>{effectiveCaseId}</span>
              <ChevronRight
                className={`w-3 h-3 text-slate-400 transition-transform ${
                  showCaseSelector ? 'rotate-90' : ''
                }`}
              />
            </button>

            {showCaseSelector && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-mono tracking-wider font-semibold text-slate-400">
                  FORENSIC CASE WORKSPACES
                </div>
                {['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].map((cid) => {
                  const c = getCanonicalCase(cid);
                  const isCurrent = cid === effectiveCaseId;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => {
                        setActiveCaseId(cid);
                        setShowCaseSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{cid}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[190px]">
                          {c.title}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Language Selection Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-slate-900/80 border border-slate-700/60 text-slate-300">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 outline-none cursor-pointer"
            >
              {languageOptions.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-slate-900 text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Mode Toggle (Air-Gapped vs Cloud) */}
          <button
            type="button"
            onClick={() => {
              setVoiceProviderMode((prev) =>
                prev === 'OFFLINE_LOCAL' ? 'SARVAM_ENHANCED' : 'OFFLINE_LOCAL'
              );
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 transition-colors"
            title="Toggle Voice Engine: Air-Gapped Local vs Sarvam Cloud"
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-mono">
              {voiceProviderMode === 'OFFLINE_LOCAL' ? 'Offline Local (0 Egress)' : 'Sarvam Cloud'}
            </span>
          </button>

          {/* Open Command Centre Shortcut Button */}
          <button
            type="button"
            onClick={() => setActiveView('workspace')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-950/40 border border-amber-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Open Command Centre</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Main Stage with Particle Orb */}
      <main className="w-full max-w-4xl px-4 flex flex-col items-center justify-center text-center my-auto z-10 py-4">
        {/* The Canonical TARKA Particle Orb */}
        <div className="relative mb-6">
          <TarkaParticleOrb
            state={orbState}
            audioLevel={audioLevel}
            size={380}
            theme="obsidian-glass"
            onClick={handleLaunchVoice}
          />

          {/* Floating Start Conversation Action Pill */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleLaunchVoice}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-xl shadow-sky-950/60 border border-sky-400/40 transition-all hover:scale-105 active:scale-95"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Start Conversation</span>
            </button>
          </div>
        </div>

        {/* Primary Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white mb-3 mt-4">
          Indigenous Multilingual Conversational Forensics
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed mb-6 font-normal">
          Speak naturally in Indian English, Tamil, Hindi, or Bengali. TARKA resolves mathematical contradictions using Z3 SMT logic and traces provenance directly down to raw evidence bytes.
        </p>

        {/* Active Case Context Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-slate-900/80 border border-slate-700/60 text-slate-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Case: <b>{effectiveCaseId}</b></span>
          <span className="text-slate-500">•</span>
          <span className="truncate max-w-[280px]">{canonicalCase.title}</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-300 font-semibold">Stage 4/6</span>
        </div>

        {/* Suggested Investigative Questions */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
          {samplePrompts.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExecutePrompt(item.query)}
              className="group text-left px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-sky-500/50 shadow-sm transition-all"
            >
              <span className="text-sky-400 mr-1.5 group-hover:inline-block transition-transform">"</span>
              <span>{item.label}</span>
              <span className="text-sky-400 ml-1.5">"</span>
            </button>
          ))}
        </div>
      </main>

      {/* 3. Footer Telemetry & Sub-navigation */}
      <footer className="w-full max-w-7xl px-6 sm:px-8 py-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 z-20 gap-4">
        {/* Engine Telemetry */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] text-slate-300">Z3 SMT Solver v4.12: Active</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-sky-400" />
            <span className="text-slate-300">Section 63 BSA Hash Lockdown</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-amber-400" />
            <span className="text-slate-300">Faster-Whisper int8 CPU + Formant Acoustic</span>
          </div>
        </div>

        {/* Quick Route Shortcuts */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveView('evidence')}
            className="hover:text-white transition-colors"
          >
            Evidence Ledger
          </button>
          <span className="text-slate-700">•</span>
          <button
            type="button"
            onClick={() => setActiveView('money')}
            className="hover:text-white transition-colors"
          >
            Financial Reconstruction
          </button>
          <span className="text-slate-700">•</span>
          <button
            type="button"
            onClick={() => setActiveView('network')}
            className="hover:text-white transition-colors"
          >
            Fraud Network
          </button>
          <span className="text-slate-700">•</span>
          <button
            type="button"
            onClick={() => setActiveView('actions')}
            className="hover:text-white transition-colors"
          >
            Statutory Reports
          </button>
        </div>
      </footer>
    </div>
  );
};

