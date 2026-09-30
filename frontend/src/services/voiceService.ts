import axios from "axios";
import type {
  VoiceSessionInfo,
  VoiceResponsePayload,
  VoiceInterruptionResult,
} from "../types/voice";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export class VoiceService {
  private static instance: VoiceService | null = null;
  private currentSession: VoiceSessionInfo | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recognition: any = null;
  private isListening: boolean = false;

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  public getSession(): VoiceSessionInfo | null {
    return this.currentSession;
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
      console.warn("[VoiceService] LiveKit session backend unreachable, using fallback session:", err);
      const fallbackSession: VoiceSessionInfo = {
        session_id: `VS-FALLBACK-${Date.now().toString(16)}`,
        transport_url: "wss://sentinelx-livekit.local/webrtc",
        access_token: `token-fallback-${Date.now()}`,
        room_name: `sentinelx-room-${caseId}`,
        participant_identity: "INV-2026-99",
        operating_context_id: operatingContextId,
      };
      this.currentSession = fallbackSession;
      return fallbackSession;
    }
  }

  /**
   * Request real microphone capture and attach VAD / Web Speech recognition.
   */
  public async startMicrophoneCapture(callbacks: {
    onPartialTranscript?: (text: string) => void;
    onFinalTranscript?: (text: string) => void;
    onSpeechActivity?: (isSpeaking: boolean) => void;
    onError?: (error: string) => void;
  }): Promise<boolean> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Initialize AudioContext for VAD (Voice Activity Detection)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);

          // Monitor volume for VAD
          const bufferLength = this.analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          let speakingCounter = 0;

          const checkVad = () => {
            if (!this.analyser || !this.isListening) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const isSpeaking = average > 18; // Silence threshold

            if (isSpeaking) {
              speakingCounter++;
              if (speakingCounter >= 2 && callbacks.onSpeechActivity) {
                callbacks.onSpeechActivity(true);
              }
            } else {
              if (speakingCounter > 0) {
                speakingCounter = 0;
                if (callbacks.onSpeechActivity) callbacks.onSpeechActivity(false);
              }
            }

            if (this.isListening) {
              requestAnimationFrame(checkVad);
            }
          };
          this.isListening = true;
          requestAnimationFrame(checkVad);
        }
      }

      // Initialize Web Speech API for real in-browser streaming STT
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

          if (interimTranscript && callbacks.onPartialTranscript) {
            callbacks.onPartialTranscript(interimTranscript);
          }
          if (finalTranscript && callbacks.onFinalTranscript) {
            callbacks.onFinalTranscript(finalTranscript.trim());
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn("[VoiceService] SpeechRecognition error:", event.error);
          if (callbacks.onError) callbacks.onError(event.error);
        };

        try {
          this.recognition.start();
        } catch (e) {
          // May already be started
        }
      }

      this.isListening = true;
      return true;
    } catch (err: any) {
      console.warn("[VoiceService] Microphone access denied or unavailable:", err);
      if (callbacks.onError) callbacks.onError(err.message || "Microphone access denied");
      return false;
    }
  }

  /**
   * Stop microphone capture.
   */
  public stopMicrophoneCapture(): void {
    this.isListening = false;
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
  }

  /**
   * Process a voice turn via backend VoiceGateway -> canonical CommandBus.
   */
  public async submitVoiceTurn(
    transcriptText: string,
    sessionId?: string
  ): Promise<VoiceResponsePayload> {
    const activeSessionId = sessionId || this.currentSession?.session_id || "VS-DEFAULT";
    try {
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
      return response.data;
    } catch (err: any) {
      console.error("[VoiceService] Voice turn error:", err);
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
   * Handle barge-in interruption.
   */
  public async handleInterruption(sessionId?: string): Promise<VoiceInterruptionResult> {
    this.stopSpeaking();
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
      return;
    }
    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
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
  }
}

export const voiceService = VoiceService.getInstance();
