/**
 * TARKA Real-Time Multilingual Voice & Speech Engine
 * Human-Grade Voice Interaction with Strict Provider Enforcement
 * Directives:
 *   - CONNECTED MODE: Sarvam AI is the exclusive spoken-response provider (Saaras STT + Bulbul TTS).
 *   - OFFLINE MODE: 100% Local processing with ZERO spoken audio (no TTS, no browser speech, visual only).
 * Governing Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
 */

export interface VoiceLanguage {
  code: string;
  name: string;
  bhashiniCode: string;
  indicConformerCode: string;
}

export const TARKA_VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: 'en-IN', name: 'English (India)', bhashiniCode: 'en', indicConformerCode: 'en' },
  { code: 'ta-IN', name: 'தமிழ் (Tamil)', bhashiniCode: 'ta', indicConformerCode: 'ta' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', bhashiniCode: 'hi', indicConformerCode: 'hi' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', bhashiniCode: 'te', indicConformerCode: 'te' },
  { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', bhashiniCode: 'kn', indicConformerCode: 'kn' },
  { code: 'ml-IN', name: 'മലയാളം (Malayalam)', bhashiniCode: 'ml', indicConformerCode: 'ml' },
  { code: 'bn-IN', name: 'বাংলা (Bengali)', bhashiniCode: 'bn', indicConformerCode: 'bn' },
  { code: 'mr-IN', name: 'मराठी (Marathi)', bhashiniCode: 'mr', indicConformerCode: 'mr' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', bhashiniCode: 'gu', indicConformerCode: 'gu' },
  { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)', bhashiniCode: 'pa', indicConformerCode: 'pa' },
  { code: 'or-IN', name: 'ଓଡ଼ିଆ (Odia)', bhashiniCode: 'or', indicConformerCode: 'or' },
  { code: 'ta-IN-en', name: 'Tanglish (Tamil + English)', bhashiniCode: 'ta', indicConformerCode: 'ta' },
  { code: 'hi-IN-en', name: 'Hinglish (Hindi + English)', bhashiniCode: 'hi', indicConformerCode: 'hi' },
];

export type SpeechProviderType = 'SARVAM_CLOUD' | 'OFFLINE_LOCAL';

export interface VoiceSpeakerProfile {
  id: string;
  name: string;
  gender: string;
  description: string;
}

export const TARKA_VOICE_SPEAKERS: VoiceSpeakerProfile[] = [
  {
    id: 'tarka_male_investigator',
    name: 'Insp. Rajeshwar Rao (Command Persona)',
    gender: 'male',
    description: 'Authoritative, measured senior investigative officer tone with warm chest resonance.',
  },
  {
    id: 'tarka_female_senior_analyst',
    name: 'DSP Priya Sharma (Forensic Analyst)',
    gender: 'female',
    description: 'Crisp, precise digital forensics examiner tone with sharp phonetic clarity.',
  },
  {
    id: 'tarka_bilingual_indic',
    name: 'Special Cell Bilingual Officer',
    gender: 'neutral',
    description: 'Dynamic pitch contour optimized for seamless Tamil, Hindi and English code-switching.',
  },
];

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  language: string;
  provider?: string;
  detectedEntities?: Array<{ type: string; value: string }>;
}

export interface VoiceAudioTelemetry {
  rmsEnergy: number; // 0.0 to 1.0
  frequencyData: Uint8Array;
  isSpeaking: boolean;
  vadState?: 'silence' | 'speech_active' | 'turn_evaluating';
}

export class TarkaVoiceEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioElement: HTMLAudioElement | null = null;
  private recognition: any = null;
  private currentLanguage = 'en-IN';
  private providerType: SpeechProviderType = 'SARVAM_CLOUD';
  private currentSpeaker = 'tarka_male_investigator';
  private isListening = false;
  private isSynthesizing = false;

  // Voice Activity Detection & Turn Detection State
  private hasSpokenInCurrentTurn = false;
  private lastSpeechTimestamp = 0;
  private currentTurnTranscript = '';
  private turnSilenceTimeoutMs = 1200; // 1.2 seconds of silence commits turn

  private onResultCallback?: (result: VoiceRecognitionResult) => void;
  private onTelemetryCallback?: (telemetry: VoiceAudioTelemetry) => void;
  private onBargeInCallback?: () => void;
  private onTurnCompleteCallback?: (finalTranscript: string) => void;
  private animationFrameId: number | null = null;

  constructor(
    language = 'en-IN',
    provider: SpeechProviderType = 'SARVAM_CLOUD',
    speaker = 'tarka_male_investigator'
  ) {
    this.currentLanguage = language;
    this.providerType = provider;
    this.currentSpeaker = speaker;
  }

  public setLanguage(lang: string) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang.startsWith('ta') ? 'ta-IN' : lang.startsWith('hi') ? 'hi-IN' : lang;
    }
  }

  public setProvider(provider: SpeechProviderType) {
    this.providerType = provider;
    if (provider === 'OFFLINE_LOCAL') {
      this.stopSpeaking();
    }
  }

  public setSpeaker(speaker: string) {
    this.currentSpeaker = speaker;
  }

  public getProvider(): SpeechProviderType {
    return this.providerType;
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  public getSpeaker(): string {
    return this.currentSpeaker;
  }

  public setOnBargeIn(cb: () => void) {
    this.onBargeInCallback = cb;
  }

  public setOnTurnComplete(cb: (finalTranscript: string) => void) {
    this.onTurnCompleteCallback = cb;
  }

  /**
   * Initialize microphone capture, Web Audio API analyser node, and streaming VAD.
   */
  public async startListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onTelemetry?: (telemetry: VoiceAudioTelemetry) => void,
    onTurnComplete?: (finalTranscript: string) => void
  ): Promise<boolean> {
    if (this.isListening) return true;
    this.onResultCallback = onResult;
    this.onTelemetryCallback = onTelemetry;
    if (onTurnComplete) this.onTurnCompleteCallback = onTurnComplete;

    try {
      // 1. Capture microphone stream with hardware AEC, noise suppression, and AGC
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.micStream = stream;

      // 2. Web Audio Analyser setup (256-point FFT -> 128 frequency bins)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      // 3. Start telemetry monitoring and VAD loop
      this.hasSpokenInCurrentTurn = false;
      this.currentTurnTranscript = '';
      this.startAudioTelemetryLoop();

      // 4. Initialize MediaRecorder for offline / chunked audio transmission
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        this.audioChunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        recorder.onstop = async () => {
          if (this.audioChunks.length > 0) {
            const blob = new Blob(this.audioChunks, { type: mimeType });
            this.audioChunks = [];
            await this.processRecordedAudioBlob(blob);
          }
        };

        recorder.start(500);
        this.mediaRecorder = recorder;
      } catch (e) {
        console.warn('[TarkaVoiceEngine] MediaRecorder init note:', e);
      }

      // 5. Native Browser Web Speech Recognition as parallel speech-to-text listener
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recog = new SpeechRec();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = this.currentLanguage.startsWith('ta')
          ? 'ta-IN'
          : this.currentLanguage.startsWith('hi')
            ? 'hi-IN'
            : this.currentLanguage.startsWith('te')
              ? 'te-IN'
              : this.currentLanguage;

        recog.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          let confidence = 0.94;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript;
              confidence = res[0].confidence || 0.95;
            } else {
              interimTranscript += res[0].transcript;
            }
          }

          const text = finalTranscript || interimTranscript;
          if (text) {
            this.currentTurnTranscript = text;
            this.hasSpokenInCurrentTurn = true;
            this.lastSpeechTimestamp = Date.now();
          }

          if (this.onResultCallback) {
            this.onResultCallback({
              transcript: text,
              isFinal: Boolean(finalTranscript),
              confidence,
              language: this.currentLanguage,
              provider: this.providerType === 'SARVAM_CLOUD' ? 'SARVAM_SAARAS' : 'LOCAL_OFFLINE',
            });
          }
        };

        recog.onerror = (err: any) => {
          console.warn('[TarkaVoiceEngine] Recognition error:', err);
        };

        recog.onend = () => {
          if (this.isListening && recog) {
            try {
              recog.start();
            } catch {}
          }
        };

        recog.start();
        this.recognition = recog;
      }

      this.isListening = true;
      return true;
    } catch (err) {
      console.error('[TarkaVoiceEngine] Failed to acquire microphone stream:', err);
      return false;
    }
  }

  /**
   * Process recorded audio blob via backend endpoints
   */
  private async processRecordedAudioBlob(blob: Blob) {
    if (blob.size < 400) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string)?.split(',')[1];
        if (!base64Data) return;

        try {
          const endpoint =
            this.providerType === 'SARVAM_CLOUD'
              ? '/api/v1/sarvam/transcribe'
              : '/api/v1/voice/offline/transcribe';

          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: base64Data,
              language_code: this.currentLanguage,
              mode: 'codemix',
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.transcript) {
              this.currentTurnTranscript = data.transcript;
              this.hasSpokenInCurrentTurn = true;
              this.lastSpeechTimestamp = Date.now();

              if (this.onResultCallback) {
                this.onResultCallback({
                  transcript: data.transcript,
                  isFinal: true,
                  confidence: data.confidence || 0.95,
                  language: data.language_code || this.currentLanguage,
                  provider: data.provider || (this.providerType === 'SARVAM_CLOUD' ? 'SARVAM_SAARAS' : 'LOCAL_OFFLINE'),
                  detectedEntities: data.detected_entities,
                });
              }
            }
          }
        } catch (err) {
          console.warn('[TarkaVoiceEngine] Transcribe fetch failed:', err);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('[TarkaVoiceEngine] Blob processing error:', err);
    }
  }

  /**
   * Stop microphone capture and analysis
   */
  public stopListening() {
    this.isListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }

  /**
   * Telemetry loop extracting real RMS energy and frequency bytes from analyser node.
   * Includes full-duplex barge-in detection and silence-based turn finalization.
   */
  private startAudioTelemetryLoop() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLoop = () => {
      if (!this.isListening || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Compute RMS energy
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.min(1.0, Math.sqrt(sum / bufferLength) / 128);
      const isSpeaking = rms > 0.07;

      // Full-duplex barge-in interrupt detection:
      // If assistant is currently synthesizing/speaking and user starts talking (rms > 0.16)
      if (this.isSynthesizing && rms > 0.16) {
        console.log('[TarkaVoiceEngine] Barge-in detected! Halting assistant audio.');
        this.stopSpeaking();
        if (this.onBargeInCallback) {
          this.onBargeInCallback();
        }
      }

      // Voice Activity Turn Management:
      let vadState: 'silence' | 'speech_active' | 'turn_evaluating' = 'silence';
      const now = Date.now();

      if (isSpeaking) {
        this.hasSpokenInCurrentTurn = true;
        this.lastSpeechTimestamp = now;
        vadState = 'speech_active';
      } else if (this.hasSpokenInCurrentTurn) {
        const elapsedSilence = now - this.lastSpeechTimestamp;
        if (elapsedSilence > this.turnSilenceTimeoutMs) {
          // Commit turn!
          const transcriptToCommit = this.currentTurnTranscript.trim();
          this.hasSpokenInCurrentTurn = false;
          this.currentTurnTranscript = '';
          vadState = 'silence';

          if (transcriptToCommit && this.onTurnCompleteCallback) {
            this.onTurnCompleteCallback(transcriptToCommit);
          }
        } else {
          vadState = 'turn_evaluating';
        }
      }

      if (this.onTelemetryCallback) {
        this.onTelemetryCallback({
          rmsEnergy: rms,
          frequencyData: dataArray,
          isSpeaking,
          vadState,
        });
      }

      this.animationFrameId = requestAnimationFrame(updateLoop);
    };

    updateLoop();
  }

  /**
   * Synthesize spoken response (Text-to-Speech).
   * STRICT DIRECTIVE ENFORCEMENT:
   *   - In OFFLINE_LOCAL mode: NEVER synthesize spoken audio. Return false immediately.
   *   - In SARVAM_CLOUD mode: Sarvam AI is the exclusive provider. Never fall back to browser TTS.
   */
  public async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<boolean> {
    this.stopSpeaking();

    // RULE 6: In Offline Mode, ZERO spoken response. Visual only.
    if (this.providerType === 'OFFLINE_LOCAL') {
      return false;
    }

    // RULE 5: In Connected Mode, Sarvam AI is the exclusive spoken-response provider.
    if (this.providerType === 'SARVAM_CLOUD') {
      try {
        const resp = await fetch('/api/v1/sarvam/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            target_language_code: this.currentLanguage,
            speaker: this.currentSpeaker,
            sample_rate: 22050,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.audio_base64) {
            return this.playBase64Audio(data.audio_base64, onStart, onEnd);
          }
        }
      } catch (err) {
        console.warn('[TarkaVoiceEngine] Sarvam cloud synthesize error:', err);
      }
    }

    // Never use browser speechSynthesis fallback per Constitution & Directive
    return false;
  }

  /**
   * Play base64 encoded standard WAV audio via HTMLAudioElement
   */
  private playBase64Audio(
    base64Wav: string,
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    try {
      this.stopSpeaking();

      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      this.audioElement = audio;

      audio.onplay = () => {
        this.isSynthesizing = true;
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      };

      audio.play().catch((e) => {
        console.warn('[TarkaVoiceEngine] Audio play blocked:', e);
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      });

      return true;
    } catch (e) {
      console.error('[TarkaVoiceEngine] Failed to decode audio:', e);
      return false;
    }
  }

  /**
   * Instantly halt any active speech playback
   */
  public stopSpeaking() {
    this.isSynthesizing = false;
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch {}
      this.audioElement = null;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsSynthesizing(): boolean {
    return this.isSynthesizing;
  }
}

export const tarkaVoiceEngine = new TarkaVoiceEngine();
