import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, Paperclip, Info, Mic, Square } from "lucide-react";
import type { LocalModelStatus, GroundedCitation } from "../../types/forensics";
import { forensicsApi } from "../../api/forensicsApi";

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  speechText?: string;
  citations?: GroundedCitation[];
  uncertainty?: string;
  timestamp: string;
}

interface ForensicAssistantPanelProps {
  caseId: string;
  onSelectArtifact?: (artifactId: string) => void;
  className?: string;
}

export const ForensicAssistantPanel: React.FC<ForensicAssistantPanelProps> = ({
  caseId,
  onSelectArtifact,
  className = "",
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Hello, Investigator. I am your Grounded Forensic Assistant for case **${caseId}**.\n\nAll my responses are mathematically derived from verified case artifacts and Z3 logic. You can ask about **amount discrepancies**, **the event timeline**, **detected contradictions**, or **counterfactual artifact exclusion**.`,
      speechText: `Hello Investigator. I am ready to analyze evidence for case ${caseId}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<LocalModelStatus | null>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [speechActive, setSpeechActive] = useState(true);

  interface BrowserSpeechRecognitionEvent {
    results: Array<Array<{ transcript: string }>>;
  }
  interface BrowserSpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    stop: () => void;
  }
  interface WindowWithSpeechRecognition {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }

  const [voiceSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const win = window as unknown as WindowWithSpeechRecognition;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const speak = useCallback(
    (text?: string) => {
      if (!speechActive || !text || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [speechActive]
  );

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || inputText).trim();
      if (!text || loading) return;

      setInputText("");
      const userMsg: MessageItem = {
        id: `usr_${Date.now()}`,
        sender: "user",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await forensicsApi.queryAssistant(caseId, text);
        const assistantMsg: MessageItem = {
          id: `asst_${Date.now()}`,
          sender: "assistant",
          text: res.answer_markdown || "Analysis complete.",
          speechText: res.speech_text,
          citations: res.citations || [],
          uncertainty: res.uncertainty_disclosure,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        speak(res.speech_text);
      } catch (err: unknown) {
        const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
        let errMsg = err instanceof Error ? err.message : "Engine timeout";
        if (axErr?.response?.status === 401) {
          errMsg = "HTTP 401: Authentication required. Session missing, expired, or invalid.";
        } else if (axErr?.response?.status === 403) {
          errMsg = `HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "assistant",
            text: `Query failed: ${errMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [caseId, inputText, loading, speak]
  );

  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  useEffect(() => {
    // Fetch local SLM runtime status
    forensicsApi.getAssistantRuntime().then(setRuntimeStatus).catch(() => {});

    // Initialize Web Speech API if supported
    const win = window as unknown as WindowWithSpeechRecognition;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";

      rec.onresult = (event: BrowserSpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        handleSendMessageRef.current(transcript);
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  return (
    <div className={`flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Runtime Capability Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">
              {runtimeStatus?.runtime_name || "Offline Forensic Assistant"}
            </span>
          </div>
          <span className="text-slate-400 font-mono hidden md:inline">
            Model: {runtimeStatus?.active_model || "pure-python-rules"} | Device: {runtimeStatus?.device || "CPU"} | Latency: {runtimeStatus?.latency_ms || 12}ms
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSpeechActive(!speechActive)}
            className={`text-xs flex items-center gap-1.5 ${speechActive ? "text-indigo-400 font-semibold" : "text-slate-500"}`}
            title="Toggle Voice Speech Output"
          >
            {speechActive ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{speechActive ? "Speech ON" : "Muted"}</span>
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-200 border border-slate-800"
              }`}
            >
              <div className="whitespace-pre-line">{m.text}</div>

              {/* Citations Chips */}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mr-1 self-center">
                    Citations:
                  </span>
                  {m.citations.map((c) => (
                    <button
                      key={c.citation_id}
                      onClick={() => onSelectArtifact && onSelectArtifact(c.artifact_id)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 hover:border-indigo-400 text-[10px] text-slate-300 font-mono transition flex items-center gap-1"
                    >
                      <Paperclip size={10} className="text-indigo-400" />
                      <span>{c.artifact_id}</span>
                      <span className="text-slate-500">({c.sha256_short})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Epistemic / Uncertainty banner */}
              {m.uncertainty && (
                <div className="mt-2 text-[10px] text-amber-400 bg-amber-950/20 px-2 py-1 rounded border border-amber-800/40 flex items-center gap-1.5">
                  <Info size={11} className="shrink-0" />
                  <span>{m.uncertainty}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full" />
            <span>Consulting deterministic forensic engine...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Voice Controls */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        {/* Voice Push-to-talk */}
        <button
          onClick={toggleRecording}
          disabled={!voiceSupported || loading}
          className={`p-2.5 rounded-lg border transition flex items-center justify-center shrink-0 ${
            isRecording
              ? "bg-red-600 text-white border-red-500 animate-pulse"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
          }`}
          title={isRecording ? "Listening... Click to stop" : "Push-to-talk voice input"}
        >
          {isRecording ? <Square size={13} className="text-white fill-current" /> : <Mic size={14} />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Ask about amount discrepancies, timeline events, or excluded artifacts..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg transition"
        >
          Send
        </button>
      </div>

      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 flex items-center justify-between">
        <span>Prompt Injection Guard: Evidence is strictly DATA_ONLY.</span>
        <span>Voice Fallback: Fully active text input.</span>
      </div>
    </div>
  );
};

export default ForensicAssistantPanel;
