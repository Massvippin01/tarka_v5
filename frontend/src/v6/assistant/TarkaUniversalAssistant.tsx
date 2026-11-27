import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  Maximize2,
  Minimize2,
  X,
  Shield,
  FileText,
  ExternalLink,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Globe,
  Radio,
} from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import apiClient from '../../api/client';
import { useV6Theme } from '../shell/useV6Theme';
import { TarkaParticleOrb, type OrbState } from '../voice/TarkaParticleOrb';
import { answerCaseQuestion, answerLangFor, getCaseWelcome, getSuggestedQuestions } from './caseAssistantEngine';
import { MiniMarkdown } from './MiniMarkdown';
import {
  TarkaButton,
  TarkaStatus,
} from '../ui';

/* =====================================================================
   TARKA UNIVERSAL MULTILINGUAL ASSISTANT
   Orchestration: 7 Specialist Capabilities
   Supported Languages: EN, TA, HI, TE, KN, ML, BN, MR, GU, PA, OR, Tanglish, Hinglish
   Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
   ===================================================================== */

export interface EvidenceCitation {
  artifactId: string;
  filename: string;
  tier: string;
  sha256: string;
  source: string;
  relevance: string;
}

export interface OrchestrationStep {
  specialist:
    | 'Evidence Analyst'
    | 'Financial Analyst'
    | 'Temporal Analyst'
    | 'Entity and Network Analyst'
    | 'Forensic Reasoning Analyst'
    | 'Report Analyst'
    | 'Voice and Language Service';
  tool: string;
  status: 'invoked' | 'verified' | 'skipped';
  durationMs: number;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  language: string;
  specialistUsed?: string;
  requestId?: string;
  citations?: EvidenceCitation[];
  observedFacts?: string[];
  inferences?: string[];
  uncertainties?: string[];
  contradictions?: string[];
  suggestedAction?: {
    label: string;
    action: string;
    targetView?: string;
  };
  orchestrationSteps?: OrchestrationStep[];
}

export interface TarkaUniversalAssistantProps {
  mode?: 'drawer' | 'fullscreen';
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  onOpenVoice?: () => void;
  className?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', label: 'English' },
  { code: 'ta-IN', name: 'தமிழ் (Tamil)', label: 'Tamil' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', label: 'Hindi' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', label: 'Telugu' },
  { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', label: 'Kannada' },
  { code: 'ml-IN', name: 'മലയാളം (Malayalam)', label: 'Malayalam' },
  { code: 'bn-IN', name: 'বাংলা (Bengali)', label: 'Bengali' },
  { code: 'mr-IN', name: 'मराठी (Marathi)', label: 'Marathi' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', label: 'Gujarati' },
  { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)', label: 'Punjabi' },
  { code: 'or-IN', name: 'ଓଡ଼ିଆ (Odia)', label: 'Odia' },
  { code: 'ta-IN-en', name: 'Tanglish (Tamil + English)', label: 'Tanglish' },
  { code: 'hi-IN-en', name: 'Hinglish (Hindi + English)', label: 'Hinglish' },
];

export const TarkaUniversalAssistant: React.FC<TarkaUniversalAssistantProps> = ({
  mode = 'drawer',
  onClose,
  onToggleFullscreen,
  onOpenVoice,
  className = '',
}) => {
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { caseWorkspaces } = useTarkaGlobal();
  const { setVoiceModalOpen } = useTarkaUiStore();
  const { profile } = useSettingsStore();
  const { theme } = useV6Theme();

  const urlCaseId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('case') : null;
  const caseId = activeCaseId || urlCaseId || caseWorkspaces[0]?.caseId || 'CASE-2026-001';

  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechActive, setSpeechActive] = useState(true);
  const [ollama, setOllama] = useState<{ available: boolean; model: string | null }>({ available: false, model: null });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    apiClient
      .get<{ available: boolean; model: string | null }>('/api/v1/forensics/assistant/ollama-status')
      .then((res) => {
        if (alive && res.data) {
          setOllama({ available: Boolean(res.data.available), model: res.data.model ?? null });
        }
      })
      .catch(() => {
        if (alive) setOllama({ available: false, model: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  const orbState: OrbState = isLoading ? 'processing' : isSpeaking ? 'speaking' : 'idle';
  const orbTheme = theme === 'dark' ? 'obsidian-glass' : 'porcelain';

  const contextualPrompts = useMemo(() => getSuggestedQuestions(caseId, activeView), [activeView, caseId]);

  const buildWelcome = (): AssistantMessage => {
    const w = getCaseWelcome(caseId, activeView, profile.name || 'Inspector');
    return {
      id: 'msg-welcome-' + caseId,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: 'en-IN',
      text: w.text,
      specialistUsed: 'Forensic Reasoning Analyst',
      observedFacts: w.observedFacts,
    };
  };
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [buildWelcome()]);

  // Case isolation: switching case discards the previous case's conversation.
  useEffect(() => {
    setMessages([buildWelcome()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Listen for custom dispatch events from other views
  const sendRef = useRef<(q?: string) => void>(() => {});
  useEffect(() => {
    sendRef.current = (q) => { void handleSendMessage(q); };
  });
  useEffect(() => {
    const handlePromptEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      if (customEvent.detail?.prompt) {
        sendRef.current(customEvent.detail.prompt);
      }
    };
    window.addEventListener('tarka-prompt-select', handlePromptEvent);
    return () => window.removeEventListener('tarka-prompt-select', handlePromptEvent);
  }, []);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Speech synthesis for assistant voice replies
  const speakText = (textToSpeak: string, langCode: string) => {
    if (!speechActive || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleaned = textToSpeak
        .replace(/[*_#`]/g, '')
        .replace(/₹/g, 'Rupees ')
        .replace(/\bBSA §63\b/g, 'Section 63 of Bharatiya Sakshya Adhiniyam');

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = langCode.startsWith('ta') ? 'ta-IN' : langCode.startsWith('hi') ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Dispatch message through live Ollama (strict DATA_ONLY) or deterministic fallback
  const handleSendMessage = async (queryText?: string) => {
    const text = (queryText || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    stopSpeaking();

    const userMessage: AssistantMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: selectedLanguage,
      text,
    };

    const recentHistory = messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text }));
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (ollama.available) {
      try {
        const res = await apiClient.post<{
          available: boolean;
          provider: string;
          model?: string;
          text?: string;
          observed_facts?: string[];
        }>(
          `/api/v1/forensics/cases/${encodeURIComponent(caseId)}/assistant/chat`,
          {
            query: text,
            language: selectedLanguage,
            active_view: activeView,
            model: ollama.model,
            history: recentHistory,
          },
          { timeout: 45000 }
        );
        if (res.data?.available && res.data.text) {
          const modelLabel = res.data.model || ollama.model || 'llama3.1:8b';
          const assistantMessage: AssistantMessage = {
            id: `ast-${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            language: selectedLanguage,
            text: res.data.text,
            specialistUsed: `Ollama · ${modelLabel}`,
            requestId: `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
            observedFacts: res.data.observed_facts,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
          speakText(res.data.text, selectedLanguage);
          return;
        }
      } catch {
        // Fall through to deterministic local engine cleanly
      }
    }

    const ans = answerCaseQuestion(caseId, text, answerLangFor(selectedLanguage));
    const specialist: OrchestrationStep['specialist'] =
      ans.intent === 'timeline' ? 'Temporal Analyst'
      : ans.intent === 'mules' || ans.intent === 'recoverable' ? 'Financial Analyst'
      : 'Forensic Reasoning Analyst';
    const assistantMessage: AssistantMessage = {
      id: `ast-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: selectedLanguage,
      text: ans.text,
      specialistUsed: specialist,
      requestId: `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
      observedFacts: ans.observedFacts,
      suggestedAction: ans.suggestedAction,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
    speakText(ans.text, selectedLanguage);
  };

  const handleActionClick = (action?: AssistantMessage['suggestedAction']) => {
    if (!action) return;
    if (action.targetView) {
      setActiveView(action.targetView);
      if (onClose) onClose();
    }
  };

  return (
    <div
      data-testid="tarka-universal-assistant"
      className={`h-full flex flex-col bg-[var(--surface-1)] text-[var(--fg-1)] ${className}`}
    >
      {/* 1. Header with Live Orb, Model Badge & Controls */}
      <div className="px-4 py-3 border-b border-[var(--line)] bg-[var(--surface-2)]/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex size-10 items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--line)] shadow-2xs shrink-0 overflow-hidden">
            <TarkaParticleOrb state={orbState} size={40} theme={orbTheme} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13.5px] font-bold text-[var(--fg-1)] truncate">TARKA Assistant</h2>
              <TarkaStatus status="safe" label={ollama.available && ollama.model ? ollama.model : 'BSA §63'} />
            </div>
            <p className="text-[11px] text-[var(--fg-2)] truncate">
              <span className="font-mono">{caseId}</span> · <strong className="text-[var(--accent)]">{activeView.toUpperCase()}</strong>
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Compact Language Selector */}
          <div className="relative flex items-center">
            <Globe className="size-3.5 text-[var(--fg-3)] absolute left-2 pointer-events-none" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              aria-label="Select Assistant Language"
              className="w-[104px] text-[11.5px] font-semibold text-[var(--fg-1)] bg-[var(--surface-1)] border border-[var(--line)] rounded-lg pl-6.5 pr-2 py-1 cursor-pointer hover:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] truncate"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Interrogation Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenVoice) onOpenVoice();
              else setVoiceModalOpen(true);
            }}
            title="Switch to Real-Time Multilingual Voice Interrogation (Press 'V')"
            className="size-8 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-bg)]/50 text-[var(--accent)] hover:bg-[var(--accent-bg)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Mic className="size-3.5" />
          </button>

          {/* Speech Audio Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setSpeechActive(!speechActive);
            }}
            title={speechActive ? 'Spoken explanations active (click to mute)' : 'Speech muted (click to enable)'}
            className="size-8 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] text-[var(--fg-2)] hover:text-[var(--fg-1)] flex items-center justify-center transition-colors cursor-pointer"
          >
            {isSpeaking ? (
              <Radio className="size-3.5 text-[var(--accent)] animate-pulse" />
            ) : speechActive ? (
              <Volume2 className="size-3.5 text-[var(--safe)]" />
            ) : (
              <VolumeX className="size-3.5 text-[var(--fg-3)]" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={mode === 'fullscreen' ? 'Exit fullscreen' : 'Expand to fullscreen review'}
              className="size-8 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] text-[var(--fg-2)] hover:text-[var(--fg-1)] flex items-center justify-center transition-colors cursor-pointer"
            >
              {mode === 'fullscreen' ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          )}

          {/* Close */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
              aria-label="Close assistant"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Security Banner & Governance Doctrine */}
      <div className="px-4 py-1.5 bg-[var(--surface-2)]/60 border-b border-[var(--line)] flex items-center justify-between gap-2 text-[11px] text-[var(--fg-2)] shrink-0">
        <div className="flex items-center gap-1.5 font-medium truncate">
          <Shield className="size-3.5 text-[var(--safe)] shrink-0" />
          <span className="truncate">
            {ollama.available && ollama.model ? `Ollama (${ollama.model})` : 'Local Engine'} · <strong>DATA_ONLY</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] shrink-0 whitespace-nowrap">
          <span className="text-[var(--accent)] font-bold">AI PROPOSES</span>
          <span>→</span>
          <span className="text-[var(--safe)] font-bold">EVIDENCE VERIFIES</span>
          <span>→</span>
          <span className="text-[var(--fg-1)] font-bold">HUMAN DECIDES</span>
        </div>
      </div>

      {/* 3. Conversation Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[var(--surface-1)]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
          >
            <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--fg-3)]">
              <span className="font-semibold text-[var(--fg-2)]">
                {msg.sender === 'user' ? (profile.name || 'Investigator') : 'TARKA Copilot'}
              </span>
              <span>·</span>
              <span>{msg.timestamp}</span>
              {msg.specialistUsed && (
                <>
                  <span>·</span>
                  <span className="text-[var(--accent)] font-bold bg-[var(--accent-bg)] px-1.5 py-0.2 rounded text-[10.5px]">
                    {msg.specialistUsed}
                  </span>
                </>
              )}
              {msg.requestId && (
                <span className="font-mono text-[10px] text-[var(--fg-3)]">[{msg.requestId}]</span>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[90%] rounded-2xl p-4 transition-all ${
                msg.sender === 'user'
                  ? 'bg-[#1B3478] text-[#FFFFFF] rounded-tr-xs shadow-xs'
                  : 'tarka-panel bg-[var(--surface-1)] border border-[var(--line)] rounded-tl-xs shadow-sm space-y-3'
              }`}
            >
              {/* Main Text Content */}
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                <MiniMarkdown text={msg.text} />
              </div>

              {/* Observed Facts (Verified Truth) */}
              {msg.observedFacts && msg.observedFacts.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--safe)] text-[11.5px] uppercase tracking-wider">
                    <CheckCircle2 className="size-3.5" />
                    Observed Facts (Bitstream Proven)
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[var(--fg-1)]">
                    {msg.observedFacts.map((fact, idx) => (
                      <li key={idx} className="leading-snug">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contradictions & Discrepancies */}
              {msg.contradictions && msg.contradictions.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--risk-bg)] border border-[var(--risk)]/30 space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--risk)] text-[11.5px] uppercase tracking-wider">
                    <AlertTriangle className="size-3.5" />
                    Contradictions Detected
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[var(--fg-1)]">
                    {msg.contradictions.map((c, idx) => (
                      <li key={idx} className="leading-snug">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inferences (AI Proposals) */}
              {msg.inferences && msg.inferences.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--line)] space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--accent)] text-[11.5px] uppercase tracking-wider">
                    <Sparkles className="size-3.5" />
                    Hypothesized Inferences (Requires Human Confirmation)
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[var(--fg-2)]">
                    {msg.inferences.map((inf, idx) => (
                      <li key={idx} className="leading-snug">
                        {inf}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clickable Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-[var(--line)]/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                    Supporting Evidentiary Citations:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((cit) => (
                      <button
                        key={cit.artifactId}
                        type="button"
                        onClick={() => {
                          setActiveView('evidence');
                          if (onClose) onClose();
                        }}
                        title={`Click to inspect bitstream: ${cit.filename} (${cit.sha256})`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-mono bg-[var(--surface-2)] border border-[var(--line)] text-[var(--fg-1)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]/30 transition-colors cursor-pointer group"
                      >
                        <FileText className="size-3 text-[var(--accent)]" />
                        <span className="font-bold">{cit.artifactId}</span>
                        <ExternalLink className="size-2.5 text-[var(--fg-3)] group-hover:text-[var(--accent)]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Next Action */}
              {msg.suggestedAction && (
                <div className="pt-2 flex items-center justify-between gap-3">
                  <TarkaButton
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="size-3.5" />}
                    iconPosition="right"
                    onClick={() => handleActionClick(msg.suggestedAction)}
                  >
                    {msg.suggestedAction.label}
                  </TarkaButton>
                  <span className="text-[11px] text-[var(--fg-3)] font-mono">
                    Requires Human Confirmation
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--accent)]/25 bg-[var(--surface-2)]/70 shadow-sm max-w-sm">
            <div className="relative flex size-10 items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--accent)]/30 shrink-0 overflow-hidden">
              <TarkaParticleOrb state="processing" size={40} theme={orbTheme} />
            </div>
            <div className="min-w-0">
              <span className="text-[12.5px] font-bold text-[var(--fg-1)] block truncate">
                {ollama.available && ollama.model ? `Reasoning with ${ollama.model}…` : 'Evaluating case evidence…'}
              </span>
              <p className="text-[11px] text-[var(--fg-2)] truncate">
                Strictly grounded in DATA_ONLY artifacts
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Contextual Guided Prompts Tray */}
      <div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--surface-2)]/60 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-[var(--fg-2)] px-0.5 font-semibold">
          <span>Suggested for {activeView.toUpperCase()}</span>
          <span className="text-[var(--accent)] font-mono text-[10.5px]">{selectedLanguage}</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {contextualPrompts.map((cp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(cp.q)}
              className="text-[11.5px] font-medium text-[var(--fg-1)] bg-[var(--surface-1)] border border-[var(--line)] rounded-full px-3 py-1.5 whitespace-nowrap hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]/20 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              {cp.q}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Input Bar with Live Orb & Voice Trigger */}
      <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--surface-1)] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => {
              if (onOpenVoice) onOpenVoice();
              else setVoiceModalOpen(true);
            }}
            title={isLoading ? 'TARKA Orb: reasoning…' : isSpeaking ? 'TARKA Orb: speaking…' : 'Click orb for Voice Interrogation'}
            className="relative flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 transition-colors cursor-pointer shrink-0 overflow-hidden shadow-2xs"
          >
            <TarkaParticleOrb state={orbState} size={38} theme={orbTheme} />
          </button>

          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${ollama.available && ollama.model ? ollama.model : 'TARKA'} about this case…`}
              className="w-full text-[13px] bg-[var(--surface-2)] border border-[var(--line)] rounded-xl px-3.5 py-2.5 text-[var(--fg-1)] placeholder:text-[var(--fg-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenVoice) onOpenVoice();
              else setVoiceModalOpen(true);
            }}
            title="Speak query via microphone"
            className="size-10 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--fg-2)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <Mic className="size-4" />
          </button>

          <TarkaButton
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputText.trim() || isLoading}
            icon={<Send className="size-4" />}
            title="Send query to TARKA Copilot"
            className="h-10 px-4 rounded-xl shrink-0"
          >
            Send
          </TarkaButton>
        </form>
      </div>
    </div>
  );
};
