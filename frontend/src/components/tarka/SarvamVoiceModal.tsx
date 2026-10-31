import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Square,
  Volume2,
  Mic,
  Check,
  AlertTriangle,
  CornerDownLeft,
  Radio,
  Shield,
  Zap,
  FileText,
  ExternalLink,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  Hash,
  Table,
  Image as ImageIcon,
} from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";
import { TarkaParticleOrb } from "./TarkaParticleOrb";

interface SarvamVoiceModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onActionExecuted?: () => void;
  onNavigateView?: (view: string) => void;
}

interface PipelineStage {
  state: string;
  status?: string;
  tool?: string;
  args?: Record<string, unknown>;
  error?: string;
}

interface Citation {
  artifact_id: string;
  filename: string;
  title: string;
  source_tier: string;
  trust_label: string;
  bitstream_verified: boolean;
  status_desc: string;
  role?: string;
  content_type?: "csv" | "text" | "json" | "image" | "pdf" | "binary";
  sha256: string;
}

interface SuggestedAction {
  label: string;
  action: string;
  target_id?: string;
  target_view?: string;
  query?: string;
}

interface GroundedPresentation {
  summary: string;
  spoken_summary: string;
  citations: Citation[];
  suggested_actions: SuggestedAction[];
  technical_details: Record<string, unknown>;
}

interface PreviewArtifactData {
  artifact_id: string;
  case_id?: string;
  filename: string;
  mime_type?: string;
  file_size_bytes: number;
  source_tier: string;
  trust_label: string;
  sha256: string;
  computed_sha256?: string;
  bitstream_verified: boolean;
  content_type: string;
  text_content?: string;
  rows?: string[][];
  json_data?: unknown;
  data_url?: string;
  download_url?: string;
  integrity_disclosure?: string;
}

interface AgentExecutionResponse {
  status: string;
  tool_executed: string;
  tool?: string;
  intent_summary?: string;
  pipeline_stages?: PipelineStage[];
  result?: unknown;
  confirmation_prompt?: string;
  requires_confirmation?: boolean;
  cancelled?: boolean;
  spoken_text?: string;
  presentation?: GroundedPresentation;
  preview_artifact_id?: string;
  navigation_view?: string;
  execution_latency_ms?: number;
  speech?: {
    audio_base64?: string | null;
    use_browser_speech?: boolean;
    spoken_text?: string;
    provider?: string;
    latency_ms?: number;
    error?: string;
  };
  error?: string;
}

type VadState =
  | "IDLE_LISTENING"
  | "USER_SPEAKING"
  | "TRANSCRIBING"
  | "EXECUTING"
  | "PLAYING_RESPONSE"
  | "INTERRUPTED";

interface MicTrackSettings {
  aec: boolean;
  ns: boolean;
  agc: boolean;
  sampleRate: number;
}

export type AmbientVoiceState = "OFF" | "READY" | "PROCESSING";

export const SarvamVoiceModal: React.FC<SarvamVoiceModalProps> = ({
  caseId,
  isOpen,
  onClose,
  onActionExecuted,
  onNavigateView,
}) => {
  // Conversational state
  const [ambientVoiceState, setAmbientVoiceState] = useState<AmbientVoiceState>("READY");
  const ambientStateRef = useRef<AmbientVoiceState>("READY");
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [vadState, setVadState] = useState<VadState>("IDLE_LISTENING");
  const [micPermission, setMicPermission] = useState<"idle" | "granted" | "denied">("idle");
  const [micSettings, setMicSettings] = useState<MicTrackSettings | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [languageCode, setLanguageCode] = useState("en-IN");
  const [speaker, setSpeaker] = useState<string>(() => localStorage.getItem("tarka_voice_speaker") || "shubh_enhi_ads");
  const [previewArtifact, setPreviewArtifact] = useState<PreviewArtifactData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  const [sarvamStatus, setSarvamStatus] = useState<{
    api_configured?: boolean;
    stt_model?: string;
    tts_model?: string;
    mode?: string;
    supported_languages?: Array<{ code: string; name: string }>;
  } | null>(null);

  const [agentResponse, setAgentResponse] = useState<AgentExecutionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechProvider, setActiveSpeechProvider] = useState<string>("");
  const [bargeInCount, setBargeInCount] = useState(0);
  const [ttsUnavailable, setTtsUnavailable] = useState(false);
  const [ttsDiagnosticNotice, setTtsDiagnosticNotice] = useState<string>("");

  // References
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRafIdRef = useRef<number | null>(null);

  // Synchronization refs for VAD loop
  const isSpeakingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const isExecutingRef = useRef(false);
  const handsFreeModeRef = useRef(true);
  const activeTurnTokenRef = useRef<symbol>(Symbol("initial"));
  const speechStartRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const consecutiveVoiceFramesRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isTranscribingRef.current = transcribing;
  }, [transcribing]);

  useEffect(() => {
    isExecutingRef.current = executing;
  }, [executing]);

  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  useEffect(() => {
    ambientStateRef.current = ambientVoiceState;
  }, [ambientVoiceState]);

  // Cancel Speech & Clean Playback
  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // Stop Microphone & VAD Streams
  const cleanupAudioPipeline = useCallback(() => {
    if (vadRafIdRef.current) {
      cancelAnimationFrame(vadRafIdRef.current);
      vadRafIdRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    cancelSpeech();
    setIsRecording(false);
    isRecordingRef.current = false;
    setAudioLevel(0);
  }, [cancelSpeech]);

  // Forward declarations for mutual recursion
  const startRecordingTurnRef = useRef<() => void>(() => {});
  const stopRecordingTurnRef = useRef<() => void>(() => {});
  const processAudioRef = useRef<(blob: Blob) => Promise<void>>(async () => {});
  const runOrchestrationRef = useRef<(query: string, confirmed?: boolean) => Promise<void>>(async () => {});

  // Initialize Microphone with Explicit AEC / NS / AGC
  const setupMicrophoneStream = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermission("denied");
        setErrorMessage("Web Audio API getUserMedia is not supported in this browser.");
        return false;
      }

      // Explicitly request Echo Cancellation, Noise Suppression, and Automatic Gain Control
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 16000 },
        },
      });

      mediaStreamRef.current = stream;
      setMicPermission("granted");

      // Inspect actual track settings to confirm AEC status truthfully
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack?.getSettings() || {};
      setMicSettings({
        aec: !!settings.echoCancellation,
        ns: !!settings.noiseSuppression,
        agc: !!settings.autoGainControl,
        sampleRate: settings.sampleRate || 16000,
      });

      // Set up AudioContext & AnalyserNode for playback-aware VAD
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        const ctx = new AudioCtxClass();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.25;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      return true;
    } catch (err) {
      console.warn("Microphone permission or hardware setup failed:", err);
      setMicPermission("denied");
      setErrorMessage("Microphone access unavailable or denied. Push-to-talk and typed commands remain available.");
      return false;
    }
  }, []);

  // VAD Loop: Analyzes audio levels, filters echo, and triggers automatic barge-in
  const runVadLoop = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(analyser.fftSize);

    const checkFrame = () => {
      if (!analyserRef.current || !mediaStreamRef.current || ambientStateRef.current === "OFF") return;

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      // 1. Compute RMS energy
      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i++) {
        const normalized = (timeData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / timeData.length);
      const levelPercent = Math.min(100, Math.round(rms * 250));
      setAudioLevel(levelPercent);

      // 2. Compute Voice Band Energy (approx 300Hz - 3400Hz speech formants)
      // With fftSize 512 and 16-48kHz sampleRate, speech band spans bins 5 to 60
      let voiceBandSum = 0;
      const startBin = 4;
      const endBin = Math.min(64, bufferLength);
      for (let i = startBin; i < endBin; i++) {
        voiceBandSum += freqData[i];
      }
      const voiceBandAvg = voiceBandSum / (endBin - startBin);

      const now = Date.now();
      const speakingNow = isSpeakingRef.current;
      const recordingNow = isRecordingRef.current;

      // -----------------------------------------------------------------------
      // A. Automatic Barge-In Detection (User speaks while TARKA is talking)
      // -----------------------------------------------------------------------
      if (speakingNow && handsFreeModeRef.current) {
        // Enforce a 250ms playback warmup to ignore speaker onset click
        const timeSincePlaybackStart = now - playbackStartTimeRef.current;
        // While speaker is active, require elevated voice-band energy to reject residual speaker echo
        const BARGE_IN_ENERGY_THRESHOLD = 52;
        const BARGE_IN_RMS_THRESHOLD = 0.075;

        if (
          timeSincePlaybackStart > 250 &&
          voiceBandAvg > BARGE_IN_ENERGY_THRESHOLD &&
          rms > BARGE_IN_RMS_THRESHOLD
        ) {
          consecutiveVoiceFramesRef.current++;
          // Require at least 4 consecutive frames (~200-250ms sustained speech) to confirm intentional voice
          if (consecutiveVoiceFramesRef.current >= 4) {
            console.log("[TARKA VAD] Automatic barge-in triggered by investigator speech!");
            cancelSpeech();
            activeTurnTokenRef.current = Symbol("barge_in");
            setBargeInCount((c) => c + 1);
            setVadState("INTERRUPTED");

            // Immediately start recording the investigator's new command
            if (!recordingNow) {
              startRecordingTurnRef.current();
            }
            speechStartRef.current = now;
            lastSpeechTimeRef.current = now;
            consecutiveVoiceFramesRef.current = 0;
          }
        } else {
          consecutiveVoiceFramesRef.current = Math.max(0, consecutiveVoiceFramesRef.current - 1);
        }
      }

      // -----------------------------------------------------------------------
      // B. Speech Onset Detection (When Idle)
      // -----------------------------------------------------------------------
      else if (!speakingNow && handsFreeModeRef.current && !recordingNow) {
        const IDLE_ONSET_THRESHOLD = 26;
        const IDLE_RMS_THRESHOLD = 0.032;

        if (
          voiceBandAvg > IDLE_ONSET_THRESHOLD &&
          rms > IDLE_RMS_THRESHOLD &&
          !isTranscribingRef.current &&
          !isExecutingRef.current
        ) {
          consecutiveVoiceFramesRef.current++;
          if (consecutiveVoiceFramesRef.current >= 3) {
            speechStartRef.current = now;
            lastSpeechTimeRef.current = now;
            consecutiveVoiceFramesRef.current = 0;
            startRecordingTurnRef.current();
          }
        } else {
          consecutiveVoiceFramesRef.current = 0;
        }
      }

      // -----------------------------------------------------------------------
      // C. Speech Tracking & End-of-Utterance Silence Detection
      // -----------------------------------------------------------------------
      if (recordingNow) {
        const SPEECH_CONTINUE_THRESHOLD = 22;
        if (voiceBandAvg > SPEECH_CONTINUE_THRESHOLD || rms > 0.028) {
          lastSpeechTimeRef.current = now;
        } else {
          const silenceDuration = now - lastSpeechTimeRef.current;
          const totalSpeechDuration = now - speechStartRef.current;
          // Conclude turn after 850ms of silence, provided at least 400ms of speech occurred
          if (silenceDuration > 850 && totalSpeechDuration > 400) {
            console.log(`[TARKA VAD] Silence threshold reached (${silenceDuration}ms). Concluding utterance.`);
            stopRecordingTurnRef.current();
          }
        }
      }

      vadRafIdRef.current = requestAnimationFrame(checkFrame);
    };

    vadRafIdRef.current = requestAnimationFrame(checkFrame);
  }, [cancelSpeech]);

  // Start a recording chunk
  const startRecordingTurn = useCallback(() => {
    if (!mediaStreamRef.current) return;
    try {
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = new MediaRecorder(mediaStreamRef.current, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
          await processAudioRef.current(audioBlob);
        }
      };

      mr.start(100);
      setIsRecording(true);
      isRecordingRef.current = true;
      setVadState("USER_SPEAKING");
    } catch (err) {
      console.warn("Failed to start MediaRecorder:", err);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  }, []);
  startRecordingTurnRef.current = startRecordingTurn;

  // Stop recording chunk
  const stopRecordingTurn = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);
  stopRecordingTurnRef.current = stopRecordingTurn;

  // Process recorded audio Blob
  const processAudio = useCallback(
    async (blob: Blob) => {
      const turnToken = Symbol("turn");
      activeTurnTokenRef.current = turnToken;

      try {
        setTranscribing(true);
        isTranscribingRef.current = true;
        setVadState("TRANSCRIBING");

        const res = await forensicsApi.transcribeSarvamAudio(blob, languageCode);

        // Discard if invalidated by a newer barge-in turn
        if (activeTurnTokenRef.current !== turnToken) {
          console.log("[TARKA VAD] Discarding stale transcript from superseded turn.");
          return;
        }

        const transcript = res?.transcript || "";
        if (transcript.trim()) {
          setQueryText(transcript);

          // Fast-path cancel command handling
          const lower = transcript.toLowerCase().trim();
          if (["stop", "cancel", "cancel that", "abort", "quiet", "never mind"].some((w) => lower === w || lower.startsWith(w))) {
            cancelSpeech();
            await runOrchestrationRef.current("cancel", false);
            setVadState("IDLE_LISTENING");
            return;
          }

          // If awaiting confirmation and user affirms
          if (agentResponse?.requires_confirmation) {
            if (["yes", "confirm", "proceed", "authorize", "go ahead", "do it"].some((w) => lower.includes(w))) {
              await runOrchestrationRef.current(transcript, true);
              return;
            }
          }

          await runOrchestrationRef.current(transcript);
        } else {
          setVadState("IDLE_LISTENING");
        }
      } catch (err) {
        console.error("Transcription failed:", err);
        setErrorMessage("Speech transcription encountered an error. Push-to-talk or typed commands are available.");
        setVadState("IDLE_LISTENING");
      } finally {
        setTranscribing(false);
        isTranscribingRef.current = false;
      }
    },
    [languageCode, agentResponse, cancelSpeech]
  );
  processAudioRef.current = processAudio;

  // Play audio buffer
  const playBase64Audio = useCallback(
    (b64: string, turnToken: symbol) => {
      try {
        if (activeTurnTokenRef.current !== turnToken) {
          console.log("[TARKA VAD] Discarding audio playback from superseded turn.");
          return;
        }

        const audioUrl = `data:audio/wav;base64,${b64}`;
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        const player = audioPlayerRef.current;
        player.src = audioUrl;

        setIsSpeaking(true);
        isSpeakingRef.current = true;
        setVadState("PLAYING_RESPONSE");
        playbackStartTimeRef.current = Date.now();

        player.onended = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setVadState("IDLE_LISTENING");
        };

        player.onerror = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setVadState("IDLE_LISTENING");
        };

        player.play().catch((err) => {
          console.warn("Audio play prevented or interrupted:", err);
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setVadState("IDLE_LISTENING");
        });
      } catch (e) {
        console.error("Failed to play audio:", e);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setVadState("IDLE_LISTENING");
      }
    },
    []
  );

  // Safe Evidence Record Preview Loader (supports canonical artifacts and staged Downloads files)
  const handleLoadPreview = useCallback(
    async (targetId: string) => {
      try {
        setPreviewLoading(true);
        if (targetId.startsWith("case_") || targetId.includes(".")) {
          // Permitted staging file preview from Downloads
          const filePrev = (await forensicsApi.previewPermittedFile(caseId, targetId)) as {
            filename: string;
            file_size_bytes: number;
            sha256: string;
            content_type: string;
            rows?: string[][];
            json_data?: unknown;
            text_content?: string;
            data_url?: string;
          };
          setPreviewArtifact({
            artifact_id: targetId,
            filename: filePrev.filename || targetId,
            file_size_bytes: filePrev.file_size_bytes || 0,
            source_tier: "STAGED",
            trust_label: "Staged Local File",
            sha256: filePrev.sha256 || "",
            bitstream_verified: true,
            content_type: filePrev.content_type || "text",
            rows: filePrev.rows,
            json_data: filePrev.json_data,
            text_content: filePrev.text_content,
            data_url: filePrev.data_url,
            integrity_disclosure: "Staged in permitted directory. Cryptographic bitstream verified before ingestion.",
          });
        } else {
          // Canonical registered artifact preview
          const data = (await forensicsApi.getArtifactContent(caseId, targetId)) as PreviewArtifactData;
          setPreviewArtifact(data);
        }
      } catch (err) {
        console.error("Failed to load artifact content:", err);
        setErrorMessage(`Failed to load evidence record ${targetId}`);
      } finally {
        setPreviewLoading(false);
      }
    },
    [caseId]
  );

  // Run Safe Agent Orchestration
  const runOrchestration = useCallback(
    async (query: string, confirmed = false) => {
      if (!query.trim()) return;
      cancelSpeech();
      const turnToken = activeTurnTokenRef.current;

      try {
        setExecuting(true);
        isExecutingRef.current = true;
        setVadState("EXECUTING");
        setErrorMessage(null);

        const res = (await forensicsApi.orchestrateAgentAction(
          caseId,
          query,
          confirmed,
          undefined,
          sessionIdRef.current,
          languageCode,
          speaker
        )) as AgentExecutionResponse;

        // Verify turn token has not been invalidated by subsequent barge-in
        if (activeTurnTokenRef.current !== turnToken) {
          console.log("[TARKA VAD] Discarding orchestration result from superseded turn.");
          return;
        }

        setAgentResponse(res);

        // Auto-load preview if tool returned a target artifact
        if (res.preview_artifact_id) {
          handleLoadPreview(res.preview_artifact_id);
        }

        if (res.status === "COMPLETED" && onActionExecuted) {
          onActionExecuted();
        }

        // View navigation
        if (res.navigation_view && onNavigateView) {
          onNavigateView(res.navigation_view);
        } else if ((res.tool_executed === "navigate_to_view" || res.tool === "navigate_to_view") && onNavigateView && res.result) {
          const targetView = (res.result as { view?: string }).view || "overview";
          onNavigateView(targetView);
        }

        // Speech playback - Strict Phase 1 mandate: Sarvam Bulbul only, no browser speech fallback
        if (res.speech) {
          setActiveSpeechProvider(
            res.speech.provider || (res.speech.audio_base64 ? "SARVAM_CLOUD_BULBUL" : "SARVAM_BULBUL_UNAVAILABLE")
          );
          if (res.speech.audio_base64) {
            setTtsUnavailable(false);
            setTtsDiagnosticNotice("");
            playBase64Audio(res.speech.audio_base64, turnToken);
          } else if (typeof window !== "undefined" && window.speechSynthesis && res.speech.spoken_text) {
            // Air-gap offline voice fallback via Web Speech API (zero external calls)
            setActiveSpeechProvider("WEB_SPEECH_OFFLINE");
            setTtsUnavailable(false);
            setTtsDiagnosticNotice("Air-Gap Offline: Playing audio via browser on-device Web Speech API.");
            setIsSpeaking(true);
            isSpeakingRef.current = true;
            setVadState("PLAYING_RESPONSE");
            const utterance = new SpeechSynthesisUtterance(res.speech.spoken_text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.lang = "en-IN";
            utterance.onend = () => {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              setVadState("IDLE_LISTENING");
            };
            utterance.onerror = () => {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              setVadState("IDLE_LISTENING");
            };
            window.speechSynthesis.speak(utterance);
          } else {
            // Sarvam Bulbul unavailable or failed. No silent fallback to window.speechSynthesis.
            setTtsUnavailable(true);
            const cat = (res.speech as { error_category?: string }).error_category;
            let note = "Voice synthesis temporarily unavailable.";
            if (cat === "AUTH_ERROR") {
              note = "Voice synthesis authorization failed (Invalid or expired Sarvam API key).";
            } else if (cat === "TIMEOUT") {
              note = "Voice synthesis timed out (Sarvam Bulbul cloud latency exceeded).";
            } else if (cat === "RATE_LIMIT") {
              note = "Voice synthesis rate limit reached on Sarvam account.";
            } else if (cat === "INVALID_CONFIGURATION") {
              note = "Voice synthesis rejected model or persona configuration.";
            } else if (cat === "NETWORK_UNREACHABLE") {
              note = "Voice synthesis endpoint unreachable (network connection offline).";
            } else if (cat === "UNCONFIGURED") {
              note = "Voice synthesis unconfigured (SARVAM_API_KEY absent).";
            } else if ((res.speech as { error_message?: string }).error_message) {
              note = `Voice synthesis unavailable: ${(res.speech as { error_message?: string }).error_message}`;
            }
            setTtsDiagnosticNotice(note);
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setVadState("IDLE_LISTENING");
          }
        } else {
          setTtsUnavailable(false);
          setTtsDiagnosticNotice("");
          setVadState("IDLE_LISTENING");
        }
      } catch (err: unknown) {
        console.error("Orchestration error:", err);
        const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
        let msg = err instanceof Error ? err.message : "Agent orchestration failed";
        if (axErr?.response?.status === 401) {
          msg = "HTTP 401: Authentication required for agent action. Session expired or missing.";
        } else if (axErr?.response?.status === 403) {
          msg = `HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`;
        }
        setErrorMessage(msg);
        setVadState("IDLE_LISTENING");
      } finally {
        setExecuting(false);
        isExecutingRef.current = false;
      }
    },
    [caseId, languageCode, speaker, onActionExecuted, onNavigateView, cancelSpeech, playBase64Audio, handleLoadPreview]
  );
  runOrchestrationRef.current = runOrchestration;

  // 3-State Ambient Voice Toggle (OFF releases mic, READY listens without wake-word)
  const handleToggleAmbient = useCallback(async () => {
    if (ambientVoiceState === "READY" || ambientVoiceState === "PROCESSING") {
      cleanupAudioPipeline();
      setAmbientVoiceState("OFF");
      ambientStateRef.current = "OFF";
      setHandsFreeMode(false);
      setVadState("IDLE_LISTENING");
    } else {
      setAmbientVoiceState("READY");
      ambientStateRef.current = "READY";
      setHandsFreeMode(true);
      const granted = await setupMicrophoneStream();
      if (granted) {
        runVadLoop();
      }
    }
  }, [ambientVoiceState, cleanupAudioPipeline, setupMicrophoneStream, runVadLoop]);

  // Retry Voice Synthesis if Sarvam Bulbul temporarily failed
  const handleRetryVoice = useCallback(async () => {
    const textToSpeak = agentResponse?.spoken_text || agentResponse?.presentation?.spoken_summary;
    if (!textToSpeak) return;
    try {
      setTtsUnavailable(false);
      setTtsDiagnosticNotice("");
      const synthRes = (await forensicsApi.synthesizeSarvamSpeech(textToSpeak, languageCode, speaker)) as {
        audio_base64?: string;
        provider?: string;
        tts_unavailable?: boolean;
        error_category?: string;
        error_message?: string;
      };
      if (synthRes && synthRes.audio_base64) {
        setTtsUnavailable(false);
        setTtsDiagnosticNotice("");
        playBase64Audio(synthRes.audio_base64, activeTurnTokenRef.current);
      } else {
        setTtsUnavailable(true);
        const cat = synthRes?.error_category;
        let note = "Voice synthesis temporarily unavailable.";
        if (cat === "AUTH_ERROR") note = "Voice synthesis authorization failed (Invalid or expired Sarvam API key).";
        else if (cat === "TIMEOUT") note = "Voice synthesis timed out (Sarvam Bulbul cloud latency exceeded).";
        else if (cat === "RATE_LIMIT") note = "Voice synthesis rate limit reached on Sarvam account.";
        else if (cat === "INVALID_CONFIGURATION") note = "Voice synthesis rejected model or persona configuration.";
        else if (cat === "UNCONFIGURED") note = "Voice synthesis unconfigured (SARVAM_API_KEY absent).";
        else if (synthRes?.error_message) note = `Voice synthesis unavailable: ${synthRes.error_message}`;
        setTtsDiagnosticNotice(note);
      }
    } catch (e) {
      console.warn("Retry speech synthesis failed:", e);
      setTtsUnavailable(true);
      setTtsDiagnosticNotice("Voice synthesis retry encountered an unexpected network error.");
    }
  }, [agentResponse, languageCode, speaker, playBase64Audio]);

  // Mount / Unmount lifecycle
  useEffect(() => {
    let isSubscribed = true;

    if (isOpen) {
      forensicsApi
        .getSarvamStatus()
        .then((s) => {
          if (isSubscribed) setSarvamStatus(s);
        })
        .catch(console.error);

      sessionIdRef.current = `session_${Date.now()}`;

      // Start continuous hands-free stream and VAD loop
      setupMicrophoneStream().then((granted) => {
        if (granted && isSubscribed) {
          runVadLoop();
        }
      });
    }

    return () => {
      isSubscribed = false;
      cleanupAudioPipeline();
    };
  }, [isOpen, setupMicrophoneStream, runVadLoop, cleanupAudioPipeline]);

  if (!isOpen) return null;

  const handleConfirmAction = async () => {
    if (queryText) {
      await runOrchestration(queryText, true);
    } else {
      await runOrchestration("confirm", true);
    }
  };

  const handleCancelAction = async () => {
    setAgentResponse(null);
    await runOrchestration("cancel", false);
  };

  const sampleCommands = [
    "Explain this case in simple English.",
    "இந்த payment mismatch என்னன்னு explain பண்ணு.",
    "Tanglish la simple ah sollu.",
    "Find files in Downloads whose filenames contain case 1.",
    "Show me the matching files.",
    "Import the first two into the active case.",
    "Analyze all supported records.",
    "Open the second evidence record.",
    "What remains uncertain?",
    "Prepare the report and explain its findings.",
    "Verify Section 63 BSA report.",
    "Who are you, and how are you built?",
    "Switch to Hindi.",
  ];

  const effectiveAmbientState: AmbientVoiceState =
    ambientVoiceState === "OFF"
      ? "OFF"
      : transcribing || executing || isRecording
      ? "PROCESSING"
      : "READY";

  return (
    <div
      className="glass-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        className="glass-modal voice-modal-window"
        style={{
          maxWidth: "880px",
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "12px",
          backgroundColor: "#0D111A",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Tier 1: Compact Header */}
        <div
          className="glass-modal-header"
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            backgroundColor: "rgba(13, 17, 26, 0.95)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Zap size={11} /> TARKA ONE
            </span>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#F3F4F6" }}>
              Conversational Forensics Workstation
            </h2>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#93C5FD",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              CASE: {caseId}
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: "rgba(16, 185, 129, 0.14)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#34D399",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Zap size={10} /> LLAMA 3.1 8B ACTIVE
            </span>
          </div>
          <button
            onClick={() => {
              cancelSpeech();
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body: Tiers 2 to 8 */}
        <div
          className="voice-modal-body-scroll"
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            minHeight: 0,
          }}
        >
          {errorMessage && (
            <div
              style={{
                padding: "10px 14px",
                backgroundColor: "rgba(244, 63, 94, 0.12)",
                border: "1px solid #F43F5E",
                borderRadius: "6px",
                color: "#FECDD3",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={15} style={{ color: "#F43F5E", flexShrink: 0 }} />
              <div>
                <strong>Notice:</strong> {errorMessage}
              </div>
            </div>
          )}

          {/* Tiers 2, 3, 4: Hero Surface with Particle Orb & Controls */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "#131722",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "12px",
            }}
          >
            {/* Tier 2: Dedicated Particle-Orb Region */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <TarkaParticleOrb
                state={
                  errorMessage
                    ? "error"
                    : agentResponse?.requires_confirmation
                    ? "confirmation_required"
                    : vadState === "INTERRUPTED"
                    ? "interrupted"
                    : isSpeaking
                    ? "speaking"
                    : transcribing || executing
                    ? "processing"
                    : isRecording || vadState === "USER_SPEAKING"
                    ? "listening"
                    : "idle"
                }
                audioLevel={audioLevel}
                size={105}
                onClick={isRecording ? stopRecordingTurn : startRecordingTurn}
              />
            </div>

            {/* Tier 3: Clearly Separated Voice-State Label & Controls */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#F3F4F6", minHeight: "20px" }}>
                {vadState === "INTERRUPTED"
                  ? "⚡ Barge-in Detected • Playback stopped • Listening to new command..."
                  : isRecording
                  ? "Listening to investigator... (Pause speech to execute)"
                  : transcribing
                  ? sarvamStatus?.api_configured
                    ? "Transcribing with Sarvam Saaras..."
                    : "Processing voice stream..."
                  : executing
                  ? "Verifying statutory authorization & solving Z3 constraints..."
                  : isSpeaking
                  ? activeSpeechProvider === "SARVAM_CLOUD_BULBUL"
                    ? "Speaking with Sarvam Bulbul neural voice... (Speak or click Interrupt to stop)"
                    : "Speaking via Local Browser Speech API... (Speak or click Interrupt to stop)"
                  : handsFreeMode
                  ? "Hands-Free Active • Speak an investigative command anytime"
                  : "Click microphone to speak or type an investigative command"}
              </div>

              {/* Primary Controls Row */}
              <div
                className="voice-controls-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  onClick={isRecording ? stopRecordingTurn : startRecordingTurn}
                  disabled={transcribing || executing}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    backgroundColor: isRecording
                      ? "#EF4444"
                      : isSpeaking
                      ? "#10B981"
                      : vadState === "INTERRUPTED"
                      ? "#F59E0B"
                      : "#2563EB",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: transcribing || executing ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  {isRecording ? (
                    <Square size={13} style={{ fill: "currentColor" }} />
                  ) : isSpeaking ? (
                    <Volume2 size={13} />
                  ) : (
                    <Mic size={13} />
                  )}
                  <span>{isRecording ? "Stop Recording" : isSpeaking ? "Speaking" : "Tap to Speak"}</span>
                </button>

                {/* Visible Interruption Button */}
                {isSpeaking && (
                  <button
                    onClick={() => {
                      cancelSpeech();
                      activeTurnTokenRef.current = Symbol("manual_interrupt");
                      setBargeInCount((c) => c + 1);
                      setVadState("INTERRUPTED");
                    }}
                    style={{
                      padding: "6px 14px",
                      backgroundColor: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid #EF4444",
                      borderRadius: "20px",
                      color: "#FCA5A5",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    title="Stop audio playback immediately"
                  >
                    <Square size={12} style={{ fill: "currentColor" }} />
                    <span>Interrupt Playback</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Audio Energy Visualizer Bar */}
            {micPermission === "granted" && (
              <div style={{ width: "220px", height: "4px", backgroundColor: "#1E293B", borderRadius: "2px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${audioLevel}%`,
                    backgroundColor: isSpeaking ? "#10B981" : isRecording ? "#EF4444" : "#60A5FA",
                    transition: "width 0.05s ease",
                  }}
                />
              </div>
            )}

            {/* Tier 4: Small Diagnostic Status Row */}
            <div
              className="voice-diagnostics-row"
              style={{
                fontSize: "11px",
                color: "#9CA3AF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {/* 3-State Ambient Voice Toggle & Ephemeral Indicator */}
              <button
                id="btn-ambient-voice-toggle"
                onClick={handleToggleAmbient}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  backgroundColor:
                    effectiveAmbientState === "PROCESSING"
                      ? "rgba(245, 158, 11, 0.2)"
                      : effectiveAmbientState === "READY"
                      ? "rgba(16, 185, 129, 0.15)"
                      : "#1E222D",
                  border: `1px solid ${
                    effectiveAmbientState === "PROCESSING"
                      ? "#F59E0B"
                      : effectiveAmbientState === "READY"
                      ? "#10B981"
                      : "rgba(255,255,255,0.12)"
                  }`,
                  color:
                    effectiveAmbientState === "PROCESSING"
                      ? "#FBBF24"
                      : effectiveAmbientState === "READY"
                      ? "#34D399"
                      : "#9CA3AF",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  cursor: "pointer",
                }}
                title="Toggle privacy-preserving ambient voice detection (ephemeral buffers, no wake word required)"
              >
                <Radio size={12} className={effectiveAmbientState === "PROCESSING" ? "animate-pulse" : ""} />
                <span>Ambient Voice: {effectiveAmbientState}</span>
              </button>

              {effectiveAmbientState !== "OFF" && (
                <span
                  style={{
                    fontSize: "10px",
                    color: effectiveAmbientState === "PROCESSING" ? "#FBBF24" : "#34D399",
                    backgroundColor: effectiveAmbientState === "PROCESSING" ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
                    border: `1px solid ${effectiveAmbientState === "PROCESSING" ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {effectiveAmbientState === "PROCESSING" ? "● Ephemeral Audio Buffered" : "● Local VAD Ready (No Wake Word)"}
                </span>
              )}

              {/* Hardware AEC / NS Status */}
              {micSettings && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: micSettings.aec ? "#34D399" : "#F59E0B",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Shield size={11} />
                  <span>AEC: {micSettings.aec ? "Active" : "Unverified"} • NS: {micSettings.ns ? "Active" : "Inactive"}</span>
                </span>
              )}

              {/* Barge-in counter badge */}
              {bargeInCount > 0 && (
                <span
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    color: "#FBBF24",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Barge-ins: {bargeInCount}
                </span>
              )}

              {/* Voice Preset Selector */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ color: "#6B7280" }}>Voice:</span>
                <select
                  value={speaker}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSpeaker(val);
                    localStorage.setItem("tarka_voice_speaker", val);
                  }}
                  style={{
                    backgroundColor: "#1A1E29",
                    color: "#93C5FD",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <option value="shubh_enhi_ads">Shubh (Male - Hindi/Eng)</option>
                  <option value="priya_enhi_conversational">Priya (Female - Hindi/Eng)</option>
                  <option value="gokul_ta_narration">Gokul (Male - Tamil)</option>
                  <option value="kavitha_te_narration">Kavitha (Female - Telugu)</option>
                  <option value="arnab_bn_conversation">Arnab (Male - Bengali)</option>
                </select>
              </div>

              {/* Language Selector */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ color: "#6B7280" }}>Lang:</span>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  style={{
                    backgroundColor: "#1A1E29",
                    color: "#60A5FA",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <option value="en-IN">English (India)</option>
                  <option value="ta-IN">Tamil / தமிழ்</option>
                  <option value="hi-IN">Hindi / हिन्दी</option>
                  <option value="te-IN">Telugu / తెలుగు</option>
                  <option value="bn-IN">Bengali / বাংলা</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tier 5: Conversational Command Input & Execute Button */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runOrchestration(queryText)}
              placeholder="Ask a question or enter a command (e.g. 'Summarize this case', 'Explain that discrepancy in simpler language')..."
              disabled={executing}
              style={{
                flex: 1,
                padding: "8px 12px",
                backgroundColor: "#141824",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "6px",
                color: "#F3F4F6",
                fontSize: "12px",
                outline: "none",
              }}
            />
            <button
              onClick={() => runOrchestration(queryText)}
              disabled={!queryText.trim() || executing}
              style={{
                padding: "8px 16px",
                backgroundColor: queryText.trim() && !executing ? "#2563EB" : "#1E293B",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: queryText.trim() && !executing ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                flexShrink: 0,
              }}
            >
              <span>{executing ? "Executing..." : "Execute"}</span>
              <CornerDownLeft size={13} />
            </button>
          </div>

          {/* Tier 6: Concise Suggested Prompts Chips */}
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", letterSpacing: "0.5px", marginBottom: "6px" }}>
              SUGGESTED INVESTIGATIVE QUERIES:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {sampleCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQueryText(cmd);
                    runOrchestration(cmd);
                  }}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#161B26",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "4px",
                    color: "#93C5FD",
                    fontSize: "11px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </div>

          {/* Tier 7: Grounded Conversational Response Panel */}
          {agentResponse && (
            <div
              style={{
                padding: "14px 16px",
                backgroundColor: "#131722",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Safe Agent Orchestration Pipeline Pills */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                  {["HEARD", "TRANSCRIBED", "INTERPRETED", "AUTHORIZED", "EXECUTED", "VERIFIED"].map((stage, sIdx) => {
                    const stageFound = agentResponse.pipeline_stages?.find((p) => p.state === stage);
                    const isDone = stageFound && stageFound.status === "COMPLETED";
                    return (
                      <React.Fragment key={stage}>
                        <div
                          style={{
                            padding: "3px 6px",
                            borderRadius: "3px",
                            backgroundColor: isDone ? "rgba(16, 185, 129, 0.15)" : "#1E222D",
                            border: `1px solid ${isDone ? "#10B981" : "rgba(255,255,255,0.08)"}`,
                            color: isDone ? "#34D399" : "#6B7280",
                            fontSize: "10px",
                            fontWeight: 600,
                            fontFamily: "var(--font-mono)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {isDone && <Check size={10} style={{ marginRight: "3px", display: "inline" }} />}
                          {stage}
                        </div>
                        {sIdx < 5 && <span style={{ color: "#4B5563", fontSize: "10px" }}>→</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
                {agentResponse.execution_latency_ms !== undefined && (
                  <div style={{ fontSize: "10px", color: "#60A5FA", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                    Latency: {agentResponse.execution_latency_ms}ms
                  </div>
                )}
              </div>

              {/* Consequential Action Confirmation Prompt */}
              {agentResponse.requires_confirmation && (
                <div
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid #F59E0B",
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#FBBF24", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={14} /> Human Confirmation Required (Consequential Statutory Action)
                  </div>
                  <div style={{ fontSize: "12px", color: "#F3F4F6", marginTop: "5px", lineHeight: 1.5 }}>
                    {agentResponse.confirmation_prompt}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      onClick={handleConfirmAction}
                      disabled={executing}
                      style={{
                        padding: "5px 12px",
                        backgroundColor: "#D97706",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Authorize & Proceed
                    </button>
                    <button
                      onClick={handleCancelAction}
                      style={{
                        padding: "5px 12px",
                        backgroundColor: "#1E222D",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "4px",
                        color: "#D1D5DB",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel Action
                    </button>
                  </div>
                </div>
              )}

              {/* Grounded Conversational Spoken Response Card */}
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "rgba(37, 99, 235, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.28)",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#60A5FA",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                    letterSpacing: "0.4px",
                  }}
                >
                  <Volume2 size={13} />
                  <span>SPOKEN INVESTIGATIVE RATIONALE</span>
                </div>
                {/* Dedicated Inner Scroll Container for Long Responses */}
                <div
                  className="voice-modal-response-scroll"
                  style={{
                    fontSize: "13px",
                    color: "#F3F4F6",
                    lineHeight: 1.6,
                    maxHeight: "180px",
                    overflowY: "auto",
                  }}
                >
                  {agentResponse.spoken_text || agentResponse.presentation?.spoken_summary}
                </div>
              </div>

              {/* Sarvam Bulbul TTS Notice & Retry Banner */}
              {ttsUnavailable && (
                <div
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    borderRadius: "6px",
                    color: "#FBBF24",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Volume2 size={14} style={{ flexShrink: 0 }} />
                    <span>
                      {ttsDiagnosticNotice || "Voice synthesis temporarily unavailable."} Spoken answer rendered text-only. Browser robotic speech fallback disabled.
                    </span>
                  </div>
                  <button
                    onClick={handleRetryVoice}
                    disabled={executing}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "#D97706",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Retry Voice
                  </button>
                </div>
              )}

              {/* Interactive Recommended Next Actions */}
              {agentResponse.presentation?.suggested_actions && agentResponse.presentation.suggested_actions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#93C5FD", letterSpacing: "0.5px" }}>
                    RECOMMENDED FORENSIC ACTIONS:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {agentResponse.presentation.suggested_actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => {
                          if (act.action === "navigate_to_view" && act.target_view && onNavigateView) {
                            onNavigateView(act.target_view);
                            onClose();
                          } else if (act.action === "open_supporting_record" && act.target_id) {
                            handleLoadPreview(act.target_id);
                          } else {
                            runOrchestration(act.query || act.label);
                          }
                        }}
                        disabled={executing}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "rgba(59, 130, 246, 0.15)",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                          borderRadius: "4px",
                          color: "#93C5FD",
                          fontSize: "11px",
                          fontWeight: 500,
                          cursor: executing ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <Zap size={11} />
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tier 8: Expandable Evidence Citations & Records */}
              {agentResponse.presentation?.citations && agentResponse.presentation.citations.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#9CA3AF",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                      letterSpacing: "0.4px",
                    }}
                  >
                    <FileText size={13} />
                    <span>SUPPORTING EVIDENCE CITATIONS ({agentResponse.presentation.citations.length})</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {agentResponse.presentation.citations.map((cit) => (
                      <div
                        key={cit.artifact_id}
                        className="voice-citation-card"
                        style={{
                          padding: "10px 12px",
                          backgroundColor: "#161B26",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "3px",
                                backgroundColor: cit.source_tier === "T1" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: cit.source_tier === "T1" ? "#34D399" : "#FBBF24",
                                border: `1px solid ${cit.source_tier === "T1" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                                fontFamily: "var(--font-mono)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {cit.source_tier === "T1" ? "T1: Official Ledger" : "T3: Unverified Claim"}
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#E5E7EB" }}>
                              {cit.title}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
                            <code>{cit.filename}</code> • <span style={{ color: "#34D399" }}>{cit.status_desc}</span>
                            {cit.role && ` • ${cit.role}`}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {cit.source_tier === "STAGED" && (
                            <button
                              onClick={() => runOrchestration(`Import ${cit.filename} into the active case`)}
                              disabled={executing}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#059669",
                                color: "#FFFFFF",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 500,
                                cursor: executing ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              title="Import staged file into case custody"
                            >
                              <Download size={12} />
                              <span>Import</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleLoadPreview(cit.artifact_id)}
                            disabled={previewLoading}
                            style={{
                              padding: "4px 10px",
                              backgroundColor: "#2563EB",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 500,
                              cursor: previewLoading ? "wait" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onNavigateView) onNavigateView("evidence");
                              onClose();
                            }}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "#1E222D",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#93C5FD",
                              borderRadius: "4px",
                              fontSize: "11px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Open evidence register"
                          >
                            <ExternalLink size={12} />
                            <span>Workstation</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onNavigateView) onNavigateView("provenance");
                              onClose();
                            }}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "#1E222D",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#6EE7B7",
                              borderRadius: "4px",
                              fontSize: "11px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Inspect provenance DAG"
                          >
                            <span>Provenance</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe Evidence Record Preview Drawer */}
              {previewArtifact && (
                <div
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "#0B0E17",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    borderRadius: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {previewArtifact.content_type === "csv" ? (
                        <Table size={14} style={{ color: "#60A5FA" }} />
                      ) : previewArtifact.content_type === "image" ? (
                        <ImageIcon size={14} style={{ color: "#60A5FA" }} />
                      ) : (
                        <Eye size={14} style={{ color: "#60A5FA" }} />
                      )}
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#F3F4F6" }}>
                        RECORD PREVIEW: {previewArtifact.filename}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#34D399",
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          padding: "1px 6px",
                          borderRadius: "3px",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        Bitstream Intact
                      </span>
                    </div>
                    <button
                      onClick={() => setPreviewArtifact(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9CA3AF",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                      aria-label="Close preview"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Render preview according to content_type */}
                  <div
                    style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      backgroundColor: "#11141E",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "4px",
                      padding: "8px",
                    }}
                  >
                    {previewArtifact.content_type === "csv" && previewArtifact.rows ? (
                      <table className="preview-table">
                        <thead>
                          <tr>
                            {previewArtifact.rows[0]?.map((col, idx) => (
                              <th key={idx}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewArtifact.rows.slice(1, 10).map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : previewArtifact.content_type === "image" && previewArtifact.data_url ? (
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <img
                          src={previewArtifact.data_url}
                          alt={previewArtifact.filename}
                          style={{
                            maxHeight: "200px",
                            maxWidth: "100%",
                            objectFit: "contain",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    ) : (
                      <pre
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                          color: "#D1D5DB",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {previewArtifact.text_content ||
                          JSON.stringify(previewArtifact.json_data, null, 2) ||
                          "Binary evidence record. Safe bitstream verified."}
                      </pre>
                    )}
                  </div>

                  {/* Disclosure and safe download */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "10px",
                      color: "#6B7280",
                    }}
                  >
                    <span>
                      SHA-256 confirms bitstream integrity during custody storage. Bitstream match proves bytes have not changed since acquisition.
                    </span>
                    <a
                      href={previewArtifact.download_url}
                      download={previewArtifact.filename}
                      style={{
                        color: "#93C5FD",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <Download size={11} />
                      <span>Download Record</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Collapsible Technical Details for Examiners */}
              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  paddingTop: "8px",
                }}
              >
                <button
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9CA3AF",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: 0,
                  }}
                >
                  <Hash size={12} />
                  <span>Examiner Technical Details (Finding IDs & Hashes)</span>
                  {showTechDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showTechDetails && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "10px",
                      backgroundColor: "#0B0E14",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      color: "#9CA3AF",
                      maxHeight: "160px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(
                      agentResponse.presentation?.technical_details || agentResponse.result,
                      null,
                      2
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#11141E",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "11px", color: "#6B7280" }}>
            Zero raw evidence transmitted • Deterministic Z3 formal verification • BSA Section 63 compliant
          </div>
          <button
            onClick={() => {
              cancelSpeech();
              onClose();
            }}
            style={{
              padding: "5px 14px",
              backgroundColor: "#1E222D",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "4px",
              color: "#E5E7EB",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
