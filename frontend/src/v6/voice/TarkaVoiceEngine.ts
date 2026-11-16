/**
 * TARKA Real-Time Multilingual Voice & Speech Engine
 * Human-Grade Offline Voice Restoration & Upgrade
 * Architecture: Provider-independent speech-to-speech with genuine Web Audio API analyser
 * Providers:
 *   - OFFLINE_LOCAL: 100% Offline Local Neural Engine (Faster-Whisper ASR + Local Formant/Harmonic Synthesizer)
 *   - AI4BHARAT: On-Premises Sovereign Enclave (IndicConformer / Indic-TTS)
 *   - SARVAM_CLOUD: Sarvam AI Benchmark (Saaras STT + Bulbul v4 TTS)
 *   - LOCAL_BROWSER: Browser Web Speech API Fallback
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

export type SpeechProviderType = 'OFFLINE_LOCAL' | 'AI4BHARAT' | 'SARVAM_CLOUD' | 'LOCAL_BROWSER';

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
  private providerType: SpeechProviderType = 'OFFLINE_LOCAL';
  private currentSpeaker = 'tarka_male_investigator';
  private isListening = false;
  private isSynthesizing = false;
  private onResultCallback?: (result: VoiceRecognitionResult) => void;
  private onTelemetryCallback?: (telemetry: VoiceAudioTelemetry) => void;
  private onBargeInCallback?: () => void;
  private animationFrameId: number | null = null;

  constructor(
    language = 'en-IN',
    provider: SpeechProviderType = 'OFFLINE_LOCAL',
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

  /**
   * Initialize microphone capture, Web Audio API analyser node, and streaming VAD
   */
  public async startListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onTelemetry?: (telemetry: VoiceAudioTelemetry) => void
  ): Promise<boolean> {
    if (this.isListening) return true;
    this.onResultCallback = onResult;
    this.onTelemetryCallback = onTelemetry;

    try {
      // 1. Audio stream capture with echo cancellation & noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.micStream = stream;

      // 2. Web Audio Analyser setup (64-point FFT -> 32 frequency bins)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      // 3. Start telemetry monitoring and VAD loop
      this.startAudioTelemetryLoop();

      // 4. Initialize MediaRecorder for offline audio chunking
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
          if (this.audioChunks.length > 0 && this.providerType === 'OFFLINE_LOCAL') {
            const blob = new Blob(this.audioChunks, { type: mimeType });
            this.audioChunks = [];
            await this.processRecordedAudioBlob(blob);
          }
        };

        recorder.start(250);
        this.mediaRecorder = recorder;
      } catch (e) {
        console.warn('[TarkaVoiceEngine] MediaRecorder init note:', e);
      }

      // 5. Speech Recognition setup (if supported in browser as parallel stream)
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec && this.providerType !== 'OFFLINE_LOCAL') {
        const recog = new SpeechRec();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = this.currentLanguage.startsWith('ta')
          ? 'ta-IN'
          : this.currentLanguage.startsWith('hi')
            ? 'hi-IN'
            : this.currentLanguage;

        recog.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          let confidence = 0.92;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript;
              confidence = res[0].confidence || 0.95;
            } else {
              interimTranscript += res[0].transcript;
            }
          }

          if (this.onResultCallback) {
            this.onResultCallback({
              transcript: finalTranscript || interimTranscript,
              isFinal: Boolean(finalTranscript),
              confidence,
              language: this.currentLanguage,
              provider: this.providerType,
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
            } catch { }
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
   * Process recorded audio blob via offline local backend endpoint
   */
  private async processRecordedAudioBlob(blob: Blob) {
    if (blob.size < 400) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string)?.split(',')[1];
        if (!base64Data) return;

        try {
          const resp = await fetch('/api/v1/voice/offline/transcribe', {
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
            if (data.transcript && this.onResultCallback) {
              this.onResultCallback({
                transcript: data.transcript,
                isFinal: true,
                confidence: data.confidence || 0.95,
                language: data.language_code || this.currentLanguage,
                provider: data.provider || 'OFFLINE_LOCAL_WHISPER',
                detectedEntities: data.detected_entities,
              });
            }
          }
        } catch (err) {
          console.warn('[TarkaVoiceEngine] Offline transcribe fetch failed:', err);
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
      } catch { }
      this.mediaRecorder = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch { }
      this.recognition = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch { }
      this.audioContext = null;
    }
  }

  /**
   * Telemetry loop extracting real RMS energy and frequency bytes from analyser node.
   * Includes full-duplex barge-in detection (user speech during assistant playback).
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
      const isSpeaking = rms > 0.08;

      // Full-duplex barge-in interrupt detection:
      // If assistant is currently synthesizing/speaking and user starts talking (rms > 0.16)
      if (this.isSynthesizing && rms > 0.16) {
        console.log('[TarkaVoiceEngine] Barge-in detected! Halting assistant audio.');
        this.stopSpeaking();
        if (this.onBargeInCallback) {
          this.onBargeInCallback();
        }
      }

      if (this.onTelemetryCallback) {
        this.onTelemetryCallback({
          rmsEnergy: rms,
          frequencyData: dataArray,
          isSpeaking,
        });
      }

      this.animationFrameId = requestAnimationFrame(updateLoop);
    };

    updateLoop();
  }

  /**
   * Synthesize spoken response (Text-to-Speech)
   * If OFFLINE_LOCAL: calls /api/v1/voice/offline/synthesize and plays PCM WAV directly.
   * If SARVAM_CLOUD: calls /api/v1/sarvam/synthesize.
   * If LOCAL_BROWSER: falls back to window.speechSynthesis.
   */
  public async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<boolean> {
    this.stopSpeaking();

    // 1. Primary Offline Local Neural Pipeline
    if (this.providerType === 'OFFLINE_LOCAL') {
      try {
        const resp = await fetch('/api/v1/voice/offline/synthesize', {
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
        console.warn('[TarkaVoiceEngine] Offline synthesize API error, trying fallback:', err);
      }
    }

    // 2. Sarvam Cloud Benchmark Pipeline
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

    // 3. Browser Speech Synthesis Fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const cleaned = text
        .replace(/[*_#`]/g, '')
        .replace(/₹/g, 'Rupees ')
        .replace(/\bBSA §63\b/g, 'Section 63 of Bharatiya Sakshya Adhiniyam');

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = this.currentLanguage.startsWith('ta')
        ? 'ta-IN'
        : this.currentLanguage.startsWith('hi')
          ? 'hi-IN'
          : 'en-IN';
      utterance.rate = 1.05;

      utterance.onstart = () => {
        this.isSynthesizing = true;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
      return true;
    }

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
      if (!this.audioElement) {
        this.audioElement = new Audio();
      }

      const audio = this.audioElement;
      audio.src = `data:audio/wav;base64,${base64Wav}`;

      audio.onplay = () => {
        this.isSynthesizing = true;
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        console.warn('[TarkaVoiceEngine] Audio element playback error:', e);
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      };

      audio.play().catch((err) => {
        console.warn('[TarkaVoiceEngine] audio.play() prevented:', err);
        this.isSynthesizing = false;
        if (onEnd) onEnd();
      });

      return true;
    } catch (err) {
      console.error('[TarkaVoiceEngine] playBase64Audio failed:', err);
      return false;
    }
  }

  /**
   * Stop speech immediately (Full-Duplex Barge-in Interrupt)
   */
  public stopSpeaking() {
    // 1. Stop audio element playback
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch { }
    }

    // 2. Stop browser speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch { }
    }

    this.isSynthesizing = false;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsSpeaking(): boolean {
    return this.isSynthesizing;
  }
}
