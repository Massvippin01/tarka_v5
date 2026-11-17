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
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useSettingsStore } from '../../store/useSettingsStore';
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
  const { setVoiceModalOpen } = useTarkaUiStore();
  const { profile } = useSettingsStore();

  const caseId = activeCaseId || 'CASE-2026-001';

  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechActive, setSpeechActive] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Dispatch message through governed orchestrator
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

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate multi-agent governed specialist orchestration (1.0s to 1.8s for realism)
    setTimeout(() => {
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
    }, 300);
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
      {/* 1. Header with Language Selector & Specialist Badge */}
      <div className="px-5 py-3.5 border-b border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--fg-1)]">TARKA Assistant</h2>
              <TarkaStatus status="safe" label="BSA §63 Copilot" />
            </div>
            <p className="text-[11.5px] text-[var(--fg-2)] truncate">
              {caseId} · View: <strong className="text-[var(--accent)]">{activeView.toUpperCase()}</strong>
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Multilingual Selector */}
          <div className="relative flex items-center">
            <Globe className="size-3.5 text-[var(--fg-2)] absolute left-2 pointer-events-none" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              aria-label="Select Assistant Language"
              className="text-[12px] font-semibold text-[var(--fg-1)] bg-[var(--surface-1)] border border-[var(--line)] rounded-lg pl-7 pr-3 py-1 cursor-pointer hover:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-2xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
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
            <Mic className="size-4" />
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
              <Radio className="size-4 text-[var(--accent)] animate-pulse" />
            ) : speechActive ? (
              <Volume2 className="size-4 text-[var(--safe)]" />
            ) : (
              <VolumeX className="size-4 text-[var(--fg-3)]" />
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
              {mode === 'fullscreen' ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
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
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Security Banner & Governance Doctrine */}
      <div className="px-5 py-2 bg-[var(--surface-2)] border-b border-[var(--line)] flex items-center justify-between text-[11.5px] text-[var(--fg-2)] shrink-0">
        <div className="flex items-center gap-1.5 font-medium">
          <Shield className="size-3.5 text-[var(--safe)]" />
          <span>Local Engine · Evidence strictly <strong>DATA_ONLY</strong> · Zero Prompt-Injection</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
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
                  ? 'bg-[#49362E] text-[#FFFDF8] rounded-tr-xs shadow-xs'
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
          <div className="flex items-center gap-3 p-4 rounded-xl tarka-panel bg-[var(--surface-1)] max-w-sm">
            <Sparkles className="size-4 text-[var(--accent)] animate-spin" />
            <div className="space-y-1">
              <span className="text-[12.5px] font-bold text-[var(--fg-1)]">Orchestrator Evaluating...</span>
              <p className="text-[11.5px] text-[var(--fg-2)]">
                Invoking Specialist & Validating Bitstream Lineage
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Contextual Guided Prompts Tray */}
      <div className="p-3 border-t border-[var(--line)] bg-[var(--surface-2)] space-y-1.5 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-[var(--fg-2)] px-1 font-semibold">
          <span>Suggested Questions for {activeView.toUpperCase()}:</span>
          <span className="text-[var(--accent)]">{selectedLanguage}</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {contextualPrompts.map((cp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(cp.q)}
              className="text-[12px] font-medium text-[var(--fg-1)] bg-[var(--surface-1)] border border-[var(--line)] rounded-lg px-3 py-1.5 whitespace-nowrap hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]/20 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              {cp.q}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Input Bar & Voice Trigger */}
      <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-1)] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask TARKA Assistant in ${SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.label || 'any language'}...`}
              className="w-full text-[13px] bg-[var(--surface-2)] border border-[var(--line)] rounded-xl px-4 py-2.5 text-[var(--fg-1)] placeholder-[#978B7F] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
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
            <Mic className="size-4.5" />
          </button>

          <TarkaButton
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputText.trim() || isLoading}
            icon={<Send className="size-4" />}
            title="Send query to TARKA Copilot"
            className="h-10 px-4 rounded-xl"
          >
            Send
          </TarkaButton>
        </form>
      </div>
    </div>
  );
};
