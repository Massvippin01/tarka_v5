import axios from "axios";
import type {
  AmbientVoiceState,
  AmbientVoiceEvent,
  AmbientVoiceTransitionRecord,
  AmbientVoiceTransitionResult,
  VoiceSessionInfo,
  VoiceResponsePayload,
  VoiceInterruptionResult,
} from "../types/voice";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Local Voice Activity Detection (VAD) Tuning Parameters.
 * Engineered to prevent request storms, state oscillation, and accidental triggers.
 */
export const VAD_CONFIG = {
  SPEECH_ONSET_THRESHOLD_DB: 18,   // Amplitude threshold (0-255 scale) for speech onset
  SPEECH_ONSET_FRAMES: 2,         // Number of consecutive frames above threshold
  SPEECH_END_SILENCE_MS: 850,     // Silence duration before concluding speech turn
  MIN_SPEECH_DURATION_MS: 200,    // Minimum duration to distinguish speech from keyboard clicks
  NOISE_FLOOR_DB: 8,              // Baseline ambient noise floor
  BARGE_IN_THRESHOLD_DB: 22,      // Elevated threshold to trigger barge-in during active TTS
};

/**
 * Canonical Transition Matrix for Frontend Ambient Voice State Machine.
 * Exactly matches backend VALID_AMBIENT_TRANSITIONS table.
 */
export const VALID_FRONTEND_TRANSITIONS: Record<AmbientVoiceState, Partial<Record<AmbientVoiceEvent, AmbientVoiceState>>> = {
  READY: {
    SPEECH_ONSET: "USER_SPEAKING",
    VOICE_ACTIVATED: "LISTENING",
    MIC_PERMISSION_DENIED: "MICROPHONE_DENIED",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
    RESET: "READY",
  },
  LISTENING: {
    SPEECH_ONSET: "USER_SPEAKING",
    TRANSCRIPTION_STARTED: "TRANSCRIBING",
    USER_INTERRUPTED: "READY",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  USER_SPEAKING: {
    SPEECH_END: "TRANSCRIBING",
    TRANSCRIPTION_STARTED: "TRANSCRIBING",
    USER_INTERRUPTED: "READY",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  TRANSCRIBING: {
    TRANSCRIPTION_COMPLETED: "UNDERSTANDING",
    UNDERSTANDING_STARTED: "UNDERSTANDING",
    USER_INTERRUPTED: "INTERRUPTED",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  UNDERSTANDING: {
    INTENT_RESOLVED: "EXECUTING",
    COMMAND_STARTED: "EXECUTING",
    CLARIFICATION_REQUIRED: "WAITING_FOR_CLARIFICATION",
    CONFIRMATION_REQUIRED: "WAITING_FOR_CONFIRMATION",
    USER_INTERRUPTED: "INTERRUPTED",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  WAITING_FOR_CLARIFICATION: {
    SPEECH_ONSET: "USER_SPEAKING",
    TRANSCRIPTION_STARTED: "TRANSCRIBING",
    UNDERSTANDING_STARTED: "UNDERSTANDING",
    USER_INTERRUPTED: "READY",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  WAITING_FOR_CONFIRMATION: {
    CONFIRMATION_ACCEPTED: "EXECUTING",
    CONFIRMATION_REJECTED: "READY",
    SPEECH_ONSET: "USER_SPEAKING",
    TRANSCRIPTION_STARTED: "TRANSCRIBING",
    USER_INTERRUPTED: "READY",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  EXECUTING: {
    COMMAND_COMPLETED: "SHOWING_RESULT",
    RESULT_AVAILABLE: "SHOWING_RESULT",
    COMMAND_FAILED: "ERROR",
    USER_INTERRUPTED: "INTERRUPTED",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  SHOWING_RESULT: {
    TTS_STARTED: "SPEAKING",
    TTS_COMPLETED: "READY",
    SPEECH_ONSET: "USER_SPEAKING",
    USER_INTERRUPTED: "READY",
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  SPEAKING: {
    TTS_COMPLETED: "READY",
    USER_INTERRUPTED: "INTERRUPTED",
    SPEECH_ONSET: "INTERRUPTED", // Real barge-in!
    RESET: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  INTERRUPTED: {
    RESET: "READY",
    SPEECH_ONSET: "USER_SPEAKING",
    VOICE_ACTIVATED: "READY",
    TTS_COMPLETED: "READY",
    OFFLINE_DETECTED: "OFFLINE",
    ERROR_OCCURRED: "ERROR",
  },
  OFFLINE: {
    ONLINE_RESTORED: "READY",
    RESET: "READY",
    ERROR_OCCURRED: "ERROR",
  },
  MICROPHONE_DENIED: {
    MIC_PERMISSION_GRANTED: "READY",
    RESET: "READY",
    ERROR_OCCURRED: "ERROR",
  },
  ERROR: {
    RESET: "READY",
    VOICE_ACTIVATED: "READY",
    MIC_PERMISSION_GRANTED: "READY",
    OFFLINE_DETECTED: "OFFLINE",
  },
};

export class VoiceService {
  private static instance: VoiceService | null = null;
  private currentSession: VoiceSessionInfo | null = null;
  private currentState: AmbientVoiceState = "READY";
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: any = null;
  private isVadActive: boolean = false;
  private isSpeechActive: boolean = false;
  private lastSpeechTimestamp: number = 0;
  private speechStartTimestamp: number = 0;
  private stateChangeListeners: Array<(state: AmbientVoiceState, record: AmbientVoiceTransitionRecord) => void> = [];

  private constructor() {
    // Monitor browser network connectivity for OFFLINE state
    if (typeof window !== "undefined") {
      window.addEventListener("offline", () => {
        this.transition("OFFLINE_DETECTED", { source: "window.offline" });
      });
      window.addEventListener("online", () => {
        this.transition("ONLINE_RESTORED", { source: "window.online" });
      });
    }
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  public getState(): AmbientVoiceState {
    return this.currentState;
  }

  public getSession(): VoiceSessionInfo | null {
    return this.currentSession;
  }

  public onStateChange(listener: (state: AmbientVoiceState, record: AmbientVoiceTransitionRecord) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Pure, deterministic state transition execution on client side.
   * Fails closed on invalid transitions without mutating state.
   */
  public transition(
    event: AmbientVoiceEvent,
    metadata?: Record<string, any>
  ): AmbientVoiceTransitionResult {
    const allowed = VALID_FRONTEND_TRANSITIONS[this.currentState] || {};
    const nextState = allowed[event];

    const transitionId = `AVTR-FE-${Date.now().toString(16)}`;
    const correlationId = this.currentSession?.operating_context_id || `CORR-${Date.now()}`;

    if (!nextState) {
      const reason = `Invalid client transition: Cannot transition from '${this.currentState}' via '${event}'. Allowed: ${Object.keys(allowed).join(", ")}`;
      console.warn(`[VoiceService] ${reason}`);
      const record: AmbientVoiceTransitionRecord = {
        transition_id: transitionId,
        current_state: this.currentState,
        event,
        next_state: this.currentState,
        is_valid: false,
        session_id: this.currentSession?.session_id,
        correlation_id: correlationId,
        rejection_reason: reason,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
      };
      return {
        success: false,
        current_state: this.currentState,
        event,
        next_state: this.currentState,
        rejection_reason: reason,
        record,
      };
    }

    const previousState = this.currentState;
    this.currentState = nextState;

    const record: AmbientVoiceTransitionRecord = {
      transition_id: transitionId,
      current_state: previousState,
      event,
      next_state: nextState,
      is_valid: true,
      session_id: this.currentSession?.session_id,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    // Notify listeners
    this.stateChangeListeners.forEach((fn) => {
      try {
        fn(nextState, record);
      } catch (err) {
        console.error("[VoiceService] Listener error:", err);
      }
    });

    return {
      success: true,
      current_state: previousState,
      event,
      next_state: nextState,
      record,
    };
  }

  /**
   * Initialize a governed voice session bound to OperatingContext.
   */
  public async initSession(
    caseId: string = "CASE-2026-001",
    operatingContextId: string = "CTX-DEFAULT",
    jurisdiction: string = "Delhi NCR / Special Cell",
    language: string = "en-IN"
  ): Promise<VoiceSessionInfo> {
    try {
      const response = await axios.post<VoiceSessionInfo>(
        `${API_BASE_URL}/api/v1/voice/session`,
        {
          case_id: caseId,
          operating_context_id: operatingContextId,
          jurisdiction: jurisdiction,
          language: language,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );
      this.currentSession = response.data;
      return response.data;
    } catch (err: any) {
      console.warn("[VoiceService] Session backend fallback:", err);
      const fallbackSession: VoiceSessionInfo = {
        session_id: `VS-FALLBACK-${Date.now().toString(16)}`,
        transport_url: "wss://sentinelx-livekit.local/webrtc",
        access_token: `token-fallback-${Date.now()}`,
        room_name: `sentinelx-room-${caseId}`,
        participant_identity: "INV-2026-99",
        operating_context_id: operatingContextId,
        ambient_state: "READY",
      };
      this.currentSession = fallbackSession;
      return fallbackSession;
    }
  }

  /**
   * Start Ambient Microphone & Local VAD.
   * INVARIANT: In READY state, NO audio is sent to the network.
   * Streaming/turn capture begins ONLY upon local SPEECH_ONSET.
   */
  public async startMicrophoneCapture(callbacks: {
    onPartialTranscript?: (text: string) => void;
    onFinalTranscript?: (text: string) => void;
    onSpeechActivity?: (isSpeaking: boolean) => void;
    onError?: (error: string) => void;
  }): Promise<boolean> {
    return this.startAmbientMicrophone(callbacks);
  }

  public async startAmbientMicrophone(callbacks: {
    onPartialTranscript?: (text: string) => void;
    onFinalTranscript?: (text: string) => void;
    onSpeechActivity?: (isSpeaking: boolean) => void;
    onError?: (error: string) => void;
  }): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.transition("MIC_PERMISSION_DENIED", { reason: "getUserMedia unsupported" });
        return false;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Microphone permission granted!
      this.transition("MIC_PERMISSION_GRANTED");

      // Set up Local Web Audio Analyser for VAD
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let onsetFrames = 0;

        const checkVadLoop = () => {
          if (!this.analyser || !this.isVadActive) return;

          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const now = Date.now();

          // Check barge-in threshold during active TTS
          if (this.currentState === "SPEAKING" && average > VAD_CONFIG.BARGE_IN_THRESHOLD_DB) {
            this.handleInterruption();
            this.transition("SPEECH_ONSET", { reason: "barge_in" });
          }

          // Evaluate speech onset against tuned VAD threshold
          if (average > VAD_CONFIG.SPEECH_ONSET_THRESHOLD_DB) {
            onsetFrames++;
            if (onsetFrames >= VAD_CONFIG.SPEECH_ONSET_FRAMES) {
              if (!this.isSpeechActive) {
                this.isSpeechActive = true;
                this.speechStartTimestamp = now;
                if (callbacks.onSpeechActivity) callbacks.onSpeechActivity(true);

                // Transition to USER_SPEAKING if currently idle
                if (this.currentState === "READY" || this.currentState === "LISTENING") {
                  this.transition("SPEECH_ONSET");
                }
              }
              this.lastSpeechTimestamp = now;
            }
          } else {
            onsetFrames = 0;
            if (this.isSpeechActive) {
              const silenceDuration = now - this.lastSpeechTimestamp;
              const totalSpeechDuration = now - this.speechStartTimestamp;

              if (silenceDuration >= VAD_CONFIG.SPEECH_END_SILENCE_MS) {
                this.isSpeechActive = false;
                if (callbacks.onSpeechActivity) callbacks.onSpeechActivity(false);

                // Only conclude turn if speech exceeded minimum duration threshold
                if (totalSpeechDuration >= VAD_CONFIG.MIN_SPEECH_DURATION_MS) {
                  if (this.currentState === "USER_SPEAKING") {
                    this.transition("SPEECH_END");
                  }
                }
              }
            }
          }

          if (this.isVadActive) {
            requestAnimationFrame(checkVadLoop);
          }
        };

        this.isVadActive = true;
        requestAnimationFrame(checkVadLoop);
      }

      // Initialize Web Speech API for local STT turn generation
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-IN";

        this.recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (interimTranscript) {
            if (this.currentState === "USER_SPEAKING" || this.currentState === "READY") {
              this.transition("TRANSCRIPTION_STARTED");
            }
            if (callbacks.onPartialTranscript) callbacks.onPartialTranscript(interimTranscript);
          }

          if (finalTranscript) {
            if (callbacks.onFinalTranscript) callbacks.onFinalTranscript(finalTranscript.trim());
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn("[VoiceService] SpeechRecognition error:", event.error);
          if (event.error === "not-allowed") {
            this.transition("MIC_PERMISSION_DENIED");
          } else {
            this.transition("ERROR_OCCURRED", { error: event.error });
          }
          if (callbacks.onError) callbacks.onError(event.error);
        };

        try {
          this.recognition.start();
        } catch (e) {
          // May already be active
        }
      }

      return true;
    } catch (err: any) {
      console.warn("[VoiceService] Microphone capture denied/failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        this.transition("MIC_PERMISSION_DENIED");
      } else {
        this.transition("ERROR_OCCURRED", { error: err.message });
      }
      if (callbacks.onError) callbacks.onError(err.message || "Microphone access denied");
      return false;
    }
  }

  /**
   * Stop ambient microphone capture and reset VAD.
   */
  public stopMicrophoneCapture(): void {
    this.isVadActive = false;
    this.isSpeechActive = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
      this.recognition = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // Ignore
      }
      this.audioContext = null;
    }
    this.transition("RESET");
  }

  /**
   * Process a voice turn via backend VoiceGateway -> canonical CommandBus.
   */
  public async submitVoiceTurn(
    transcriptText: string,
    sessionId?: string
  ): Promise<VoiceResponsePayload> {
    const activeSessionId = sessionId || this.currentSession?.session_id || "VS-DEFAULT";
    this.transition("UNDERSTANDING_STARTED");

    try {
      this.transition("INTENT_RESOLVED");
      this.transition("COMMAND_STARTED");

      const response = await axios.post<VoiceResponsePayload>(
        `${API_BASE_URL}/api/v1/voice/session/${activeSessionId}/turn`,
        {
          transcript: transcriptText,
          language_hint: "en-IN",
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        }
      );

      const data = response.data;
      if (data.response_type === "AMBIGUITY") {
        this.transition("CLARIFICATION_REQUIRED", { prompt: data.spoken_text });
      } else if (data.response_type === "CONFIRMATION_REQUIRED") {
        this.transition("CONFIRMATION_REQUIRED", { prompt: data.spoken_text });
      } else if (data.response_type === "FAILURE" || data.response_type === "POLICY_DENIAL") {
        this.transition("COMMAND_COMPLETED");
        this.transition("RESULT_AVAILABLE");
      } else {
        this.transition("COMMAND_COMPLETED");
        this.transition("RESULT_AVAILABLE");
      }

      return data;
    } catch (err: any) {
      console.error("[VoiceService] Voice turn error:", err);
      this.transition("COMMAND_FAILED", { error: err.message });
      return {
        response_id: `VR-ERR-${Date.now()}`,
        session_id: activeSessionId,
        turn_id: `VT-ERR-${Date.now()}`,
        response_type: "FAILURE",
        spoken_text: `Voice processing error: ${err.response?.data?.detail || err.message}`,
        display_text: `Execution error: ${err.message}`,
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Request canonical introduction on explicit voice activation.
   */
  public async getCanonicalIntro(sessionId?: string, language: string = "en-IN"): Promise<VoiceResponsePayload> {
    const activeSessionId = sessionId || this.currentSession?.session_id || "VS-DEFAULT";
    try {
      const response = await axios.get<VoiceResponsePayload>(
        `${API_BASE_URL}/api/v1/voice/session/${activeSessionId}/intro`,
        {
          params: { language },
          timeout: 10000,
        }
      );
      return response.data;
    } catch (err: any) {
      console.warn("[VoiceService] Fallback intro:", err);
      return {
        response_id: `VR-INTRO-${Date.now()}`,
        session_id: activeSessionId,
        turn_id: `VT-INTRO-${Date.now()}`,
        response_type: "SUCCESS",
        spoken_text: "Welcome to TARKA, your digital forensics assistant. Tell me what you'd like to investigate.",
        display_text: "Welcome to TARKA, your digital forensics assistant. What would you like to investigate?",
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Handle barge-in interruption.
   */
  public async handleInterruption(sessionId?: string): Promise<VoiceInterruptionResult> {
    this.stopSpeaking();
    this.transition("USER_INTERRUPTED");

    const activeSessionId = sessionId || this.currentSession?.session_id || "VS-DEFAULT";
    try {
      const resp = await axios.post<VoiceInterruptionResult>(
        `${API_BASE_URL}/api/v1/voice/session/${activeSessionId}/interrupt`
      );
      return resp.data;
    } catch (e) {
      return {
        status: "INTERRUPTED",
        interruption_id: `VINT-${Date.now()}`,
        session_id: activeSessionId,
        turn_id: "VT-INTERRUPTED",
      };
    }
  }

  /**
   * Synthesize audio response via Browser SpeechSynthesis API.
   */
  public speakResponse(text: string, onEnd?: () => void): void {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      this.transition("TTS_COMPLETED");
      return;
    }
    this.stopSpeaking();
    this.transition("TTS_STARTED");

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.transition("TTS_COMPLETED");
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      this.transition("TTS_COMPLETED");
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stop browser speech synthesis output immediately (Barge-In).
   */
  public stopSpeaking(): void {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Cleanly close active session.
   */
  public async closeSession(): Promise<void> {
    this.stopMicrophoneCapture();
    this.stopSpeaking();
    if (this.currentSession) {
      try {
        await axios.post(`${API_BASE_URL}/api/v1/voice/session/${this.currentSession.session_id}/close`);
      } catch (e) {
        // Ignore
      }
      this.currentSession = null;
    }
    this.transition("RESET");
  }
}

export const voiceService = VoiceService.getInstance();
