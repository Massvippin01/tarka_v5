import React, { useState, useEffect, useCallback } from 'react';
import { TarkaParticleOrb, type OrbState } from '../voice/TarkaParticleOrb';
import { tarkaVoiceEngine, type VoiceAudioTelemetry, type SpeechProviderType } from '../voice/TarkaVoiceEngine';
import { useCaseStore } from '../../store/useCaseStore';
import { resolveNavigationIntent } from '../navigation/tarkaNavigationRegistry';
import { highlightController } from '../highlight/semanticRegistry';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';

export const ParticleHomeScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();

  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [providerMode, setProviderMode] = useState<SpeechProviderType>('SARVAM_CLOUD');
  const cycleLanguage = useCallback(() => {
    const langs = ['en-IN', 'ta-IN', 'hi-IN', 'te-IN', 'kn-IN', 'ml-IN', 'bn-IN'];
    setSelectedLanguage((prev) => {
      const nextIdx = (langs.indexOf(prev) + 1) % langs.length;
      const next = langs[nextIdx];
      tarkaVoiceEngine.setLanguage(next);
      setStatusMessage(`SPOKEN LANGUAGE: ${next.toUpperCase()}`);
      return next;
    });
  }, []);

  // Permission & Privacy States
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean>(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Status & Transcript HUD
  const [statusMessage, setStatusMessage] = useState<string>('INITIALIZING INTELLIGENCE FIELD...');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [executedActionNotice, setExecutedActionNotice] = useState<string | null>(null);

  // Fallback keyboard query input (opened via '/')
  const [showCommandInput, setShowCommandInput] = useState<boolean>(false);
  const [manualQuery, setManualQuery] = useState<string>('');

  const effectiveCaseId = activeCaseId || 'CASE-2026-001';

  // Process completed voice utterance or text command
  const handleProcessUtterance = useCallback(async (utterance: string) => {
    if (!utterance.trim()) return;

    setOrbState('processing');
    setStatusMessage(`INTERPRETING: "${utterance}"`);

    // 1. Check Autonomous Navigation Registry first
    const navMatch = resolveNavigationIntent(utterance);
    if (navMatch && navMatch.confidence >= 0.6) {
      const targetView = navMatch.route.canonicalView;
      setOrbState('investigating');
      setStatusMessage(`NAVIGATING TO: ${navMatch.route.displayName.toUpperCase()}`);

      if (providerMode === 'SARVAM_CLOUD') {
        tarkaVoiceEngine.speak(`Navigating to ${navMatch.route.displayName}`);
      }

      // Briefly present execution feedback, then navigate
      setTimeout(() => {
        setActiveView(targetView);
      }, 700);
      return;
    }

    // 2. Contextual Object / Highlighting triggers
    const lower = utterance.toLowerCase();
    if (lower.includes('discrepancy') || lower.includes('rrn') || lower.includes('402918273645')) {
      setStatusMessage('LOCATING DISPUTED RRN 402918273645 IN CBS LEDGER...');
      setTimeout(() => {
        setActiveView('ledger');
        highlightController.highlightElement('el-ledger-row-rrn-402918273645', 'warning', 7000);
      }, 700);
      return;
    }

    if (lower.includes('mule') || lower.includes('hub') || lower.includes('syndicate')) {
      setStatusMessage('ISOLATING SYNDICATE HUB IN FRAUD NETWORK...');
      setTimeout(() => {
        setActiveView('network');
        highlightController.highlightElement('el-graph-node-mule-1', 'error', 7000);
      }, 700);
      return;
    }

    if (lower.includes('cgnat') || lower.includes('tower') || lower.includes('imei')) {
      setStatusMessage('OPENING CARRIER CGNAT DEMULTIPLEXING FUNNEL...');
      setTimeout(() => {
        setActiveView('device');
        highlightController.highlightElement('el-device-cgnat-funnel', 'info', 7000);
      }, 700);
      return;
    }

    // 3. Analytical Task Execution via Backend Orchestration
    try {
      setStatusMessage('EXECUTING AUTHORIZED FORENSIC WORKFLOW...');
      const resp = await fetch(`/api/v1/cases/${effectiveCaseId}/agent/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: utterance,
          language_code: selectedLanguage,
          session_id: 'VS-HOME',
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setOrbState('speaking');

        if (data.navigation_view) {
          setStatusMessage(`ACTION COMPLETED • OPENING ${data.navigation_view.toUpperCase()}`);
          setTimeout(() => {
            setActiveView(data.navigation_view);
          }, 1200);
        } else {
          const summary = data.presentation?.summary || data.intent_summary || 'Analysis complete.';
          setStatusMessage(summary);
          setExecutedActionNotice(summary);
        }

        // Spoken response STRICTLY in connected Sarvam mode; ZERO in offline mode
        if (providerMode === 'SARVAM_CLOUD' && data.spoken_text) {
          tarkaVoiceEngine.speak(data.spoken_text, () => setOrbState('speaking'), () => setOrbState('listening'));
        } else {
          // Offline mode: keep visual feedback and return to listening
          setTimeout(() => setOrbState('listening'), 2500);
        }
      } else {
        setOrbState('error');
        setStatusMessage('ANALYSIS PIPELINE RETURNED AN ERROR. CHECKING LOCAL ENGINE.');
        setTimeout(() => setOrbState('listening'), 2000);
      }
    } catch (err) {
      console.warn('[ParticleHomeScreen] Orchestration error:', err);
      setOrbState('error');
      setStatusMessage('OFFLINE: COMMAND LOGGED LOCALLY.');
      setTimeout(() => setOrbState('listening'), 2000);
    }
  }, [effectiveCaseId, selectedLanguage, providerMode, setActiveView]);

  // Audio Telemetry Handler from Web Audio Analyser
  const handleAudioTelemetry = useCallback((telemetry: VoiceAudioTelemetry) => {
    setAudioLevel(telemetry.rmsEnergy);
    setFrequencyData(telemetry.frequencyData);

    if (tarkaVoiceEngine.getIsSynthesizing()) {
      setOrbState('speaking');
    } else if (telemetry.isSpeaking) {
      setOrbState('listening');
      setStatusMessage('LISTENING (SPEECH DETECTED)...');
    } else if (telemetry.vadState === 'turn_evaluating') {
      setStatusMessage('EVALUATING PAUSE...');
    }
  }, []);

  // Initialize Microphone & Start Hands-Free Listening
  const initializeHandsFreeListening = useCallback(async () => {
    try {
      tarkaVoiceEngine.setLanguage(selectedLanguage);
      tarkaVoiceEngine.setProvider(providerMode);

      const success = await tarkaVoiceEngine.startListening(
        (res) => {
          if (res.transcript) {
            setLiveTranscript(res.transcript);
          }
        },
        handleAudioTelemetry,
        (turnTranscript) => {
          handleProcessUtterance(turnTranscript);
        }
      );

      if (success) {
        setMicPermissionGranted(true);
        setShowPermissionPrompt(false);
        setOrbState('listening');
        setStatusMessage('READY • SPEAK NATURALLY');
      } else {
        setPermissionError('Microphone access was denied or hardware is unavailable.');
        setShowPermissionPrompt(true);
      }
    } catch (err: any) {
      console.error('[ParticleHomeScreen] Audio init exception:', err);
      setPermissionError(err?.message || 'Failed to initialize audio capture.');
      setShowPermissionPrompt(true);
    }
  }, [selectedLanguage, providerMode, handleAudioTelemetry, handleProcessUtterance]);

  // Automatic activation on mount
  useEffect(() => {
    // Check if permission was already granted previously
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((perm) => {
          if (perm.state === 'granted') {
            initializeHandsFreeListening();
          } else {
            setShowPermissionPrompt(true);
            setStatusMessage('AWAITING EXPLICIT MICROPHONE PERMISSION');
          }
        })
        .catch(() => {
          setShowPermissionPrompt(true);
        });
    } else {
      setShowPermissionPrompt(true);
    }

    return () => {
      tarkaVoiceEngine.stopListening();
      tarkaVoiceEngine.stopSpeaking();
    };
  }, [initializeHandsFreeListening]);

  // Global Keyboard Shortcuts (Space to talk, W/Enter for workspace, M for mute, O for offline, / for command)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in manual input
      if (showCommandInput && e.key !== 'Escape' && e.key !== 'Enter') {
        return;
      }

      // Space: Toggle or trigger speech listening
      if (e.code === 'Space' && !showCommandInput) {
        e.preventDefault();
        if (!micPermissionGranted) {
          initializeHandsFreeListening();
        } else if (orbState === 'listening') {
          setStatusMessage('LISTENING (SPACEBAR HELD)...');
        }
        return;
      }

      // 'w' or 'W' or 'Enter': Jump to Tactical Workspace
      if ((e.key.toLowerCase() === 'w' || e.key === 'Enter') && !showCommandInput) {
        e.preventDefault();
        setActiveView('workspace');
        return;
      }

      // 'm' or 'M': Mute / Unmute
      if (e.key.toLowerCase() === 'm' && !showCommandInput) {
        e.preventDefault();
        if (tarkaVoiceEngine.getIsListening()) {
          tarkaVoiceEngine.stopListening();
          setOrbState('offline');
          setStatusMessage('MICROPHONE MUTED (PRESS M TO UNMUTE)');
        } else {
          initializeHandsFreeListening();
        }
        return;
      }

      // 'o' or 'O': Toggle Offline Local vs Sarvam Connected
      if (e.key.toLowerCase() === 'o' && !showCommandInput) {
        e.preventDefault();
        const nextMode = providerMode === 'SARVAM_CLOUD' ? 'OFFLINE_LOCAL' : 'SARVAM_CLOUD';
        setProviderMode(nextMode);
        tarkaVoiceEngine.setProvider(nextMode);
        setStatusMessage(
          nextMode === 'SARVAM_CLOUD'
            ? 'SWITCHED TO: SARVAM AI CONNECTED (SPOKEN RESPONSES ACTIVE)'
            : 'SWITCHED TO: 100% LOCAL OFFLINE (ZERO SPOKEN AUDIO)'
        );
        return;
      }

      // 'l' or 'L': Cycle spoken language
      if (e.key.toLowerCase() === 'l' && !showCommandInput) {
        e.preventDefault();
        cycleLanguage();
        return;
      }

      // '/': Open minimal keyboard command bar
      if (e.key === '/' && !showCommandInput) {
        e.preventDefault();
        setShowCommandInput(true);
        return;
      }

      // Escape: Close command bar or cancel
      if (e.key === 'Escape') {
        setShowCommandInput(false);
        setLiveTranscript('');
        setStatusMessage('READY • SPEAK NATURALLY');
        tarkaVoiceEngine.stopSpeaking();
        setOrbState('listening');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandInput, micPermissionGranted, orbState, providerMode, initializeHandsFreeListening, setActiveView]);

  return (
    <div
      className="relative w-screen h-screen flex flex-col justify-between items-center text-slate-100 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #0D1424 0%, #07090D 65%, #020305 100%)',
      }}
      tabIndex={0}
      aria-label="TARKA Autonomous Particle Intelligence Interface"
    >
      {/* 1. Subtle, Minimal Top Identity & Status (Pure HUD, No Navbar) */}
      <header className="w-full max-w-5xl px-8 pt-8 flex items-center justify-between z-10 pointer-events-none">
        {/* Minimal Wordmark */}
        <div className="flex items-baseline gap-3">
          <span
            className="text-2xl font-bold tracking-[0.25em] text-white/90"
            style={{ fontFamily: "'Cinzel', 'IBM Plex Serif', Georgia, serif" }}
          >
            TARKA
          </span>
          <span className="text-sm font-semibold text-sky-400 tracking-wider">
            तर्क
          </span>
          <span className="text-[11px] font-mono text-slate-500 tracking-widest uppercase border-l border-slate-800 pl-3">
            SUTRAM 2026 • DIGITAL FORENSICS
          </span>
        </div>

        {/* Minimal Connection & Privacy Indicator */}
        <div className="flex items-center gap-4 text-xs font-mono tracking-wider">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800/80">
            <span
              className={`w-2 h-2 rounded-full ${
                orbState === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : orbState === 'speaking'
                  ? 'bg-sky-400'
                  : orbState === 'processing'
                  ? 'bg-purple-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-300">
              {providerMode === 'SARVAM_CLOUD' ? 'SARVAM AI CONNECTED' : '100% OFFLINE ENCLAVE'}
            </span>
          </div>

          <button
            type="button"
            onClick={cycleLanguage}
            className="text-slate-400 hover:text-sky-300 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 bg-slate-900/40 pointer-events-auto transition cursor-pointer"
            title="Click or press 'L' to cycle Indic language"
          >
            {selectedLanguage.toUpperCase()}
          </button>
        </div>
      </header>

      {/* 2. Central Immersive Particle Intelligence Field */}
      <main className="relative flex-1 w-full flex flex-col items-center justify-center z-10">
        <TarkaParticleOrb
          state={orbState}
          audioLevel={audioLevel}
          frequencyData={frequencyData}
          size={460}
          onClick={() => {
            if (!micPermissionGranted) {
              initializeHandsFreeListening();
            }
          }}
        />

        {/* Minimal Contextual Text Line (Communicates What was Heard & Current Action) */}
        <div className="mt-4 text-center max-w-2xl px-6 pointer-events-none">
          <div className="text-xs font-mono tracking-widest text-sky-400/90 mb-1">
            {statusMessage}
          </div>

          {liveTranscript && (
            <div className="text-base font-medium text-slate-200 tracking-wide font-sans animate-fade-in">
              &ldquo;{liveTranscript}&rdquo;
            </div>
          )}

          {executedActionNotice && (
            <div className="mt-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded px-3 py-1 inline-block">
              {executedActionNotice}
            </div>
          )}
        </div>
      </main>

      {/* 3. Minimal Ambient Footer & Keyboard Controls Guide */}
      <footer className="w-full max-w-4xl px-8 pb-8 flex items-center justify-between text-[11px] font-mono text-slate-600 z-10 pointer-events-none">
        <div className="flex items-center gap-2 text-slate-500">
          <Lock size={12} className="text-slate-600" />
          <span>BSA §63 HASH LOCKDOWN ACTIVE • CASE: {effectiveCaseId}</span>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-slate-500">
          <span>[SPACE] PUSH-TO-TALK</span>
          <span>[W] WORKSPACE</span>
          <span>[O] TOGGLE OFFLINE</span>
          <span>[/] COMMAND</span>
          <span>[M] MUTE</span>
        </div>
      </footer>

      {/* 4. Explicit First-Use Microphone Permission Modal (Only shown until approved) */}
      {showPermissionPrompt && !micPermissionGranted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0F141F] border border-slate-700/80 shadow-2xl text-center select-text">
            <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center mx-auto mb-4 text-sky-400">
              <ShieldCheck size={24} />
            </div>

            <h3 className="text-lg font-bold text-white mb-2 tracking-wide font-serif">
              Enable Sovereign Voice Intelligence
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-sans">
              TARKA requires explicit microphone authorization to process hands-free voice interrogation and forensic commands. Audio is processed according to statutory evidentiary safeguards.
            </p>

            {permissionError && (
              <div className="mb-4 text-xs font-mono text-rose-400 bg-rose-950/50 border border-rose-800/50 p-2.5 rounded text-left flex items-start gap-2">
                <AlertCircle size={14} className="flex-none mt-0.5" />
                <span>{permissionError}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={initializeHandsFreeListening}
                className="px-6 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold tracking-wider transition shadow-lg cursor-pointer"
              >
                AUTHORIZE MICROPHONE
              </button>

              <button
                onClick={() => {
                  setShowPermissionPrompt(false);
                  setActiveView('workspace');
                }}
                className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs tracking-wider transition cursor-pointer"
              >
                PROCEED TO WORKSPACE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Minimal Keyboard Command Bar (Triggered via '/') */}
      {showCommandInput && (
        <div className="absolute bottom-16 w-full max-w-xl px-6 z-40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowCommandInput(false);
              handleProcessUtterance(manualQuery);
              setManualQuery('');
            }}
            className="flex items-center gap-3 p-3 rounded-full bg-slate-900/90 border border-sky-500/50 shadow-2xl backdrop-blur-xl"
          >
            <span className="text-xs font-mono text-sky-400 pl-3">TARKA &gt;</span>
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Type command or question (e.g. 'show fraud network', 'explain discrepancy')..."
              autoFocus
              className="flex-1 bg-transparent text-sm text-white focus:outline-none font-sans"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white tracking-wider cursor-pointer"
            >
              EXECUTE
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
