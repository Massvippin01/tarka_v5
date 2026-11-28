# TARKA | MULTILINGUAL VOICE & REAL-TIME SPEECH-TO-SPEECH ARCHITECTURE

**Component:** `frontend/src/v6/voice/TarkaVoiceEngine.ts` & `frontend/src/v6/voice/TarkaVoiceModal.tsx`  
**Backend Service:** `backend/app/services/voice/local_offline_voice_service.py` & `backend/app/api/voice_api.py`  
**Pipeline:** Microphone $\rightarrow$ Web Audio Capture $\rightarrow$ VAD $\rightarrow$ Local Faster-Whisper ASR $\rightarrow$ Language ID $\rightarrow$ Governed Forensic Orchestrator $\rightarrow$ Neural Formant Synthesizer $\rightarrow$ 22,050 Hz PCM WAV $\rightarrow$ HTMLAudioElement Playback  
**Supported Languages:** 13 Languages (Tamil, Hindi, English, Tanglish, Hinglish, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Odia)  
**Providers:**
1. `OFFLINE_LOCAL`: 100% Offline Local Neural Engine (Faster-Whisper Tiny/Base + Local Harmonic Synthesizer)
2. `AI4BHARAT`: On-Premises Sovereign Enclave (IndicConformer / Indic-TTS)
3. `SARVAM_CLOUD`: Sarvam AI Benchmark (Saaras STT + Bulbul v4 TTS)
4. `LOCAL_BROWSER`: Browser Web Speech API Fallback

---

## 1. SPEECH PIPELINE ARCHITECTURE

The TARKA Voice Interrogation Station provides a real-time, bidirectional conversational speech interface allowing investigators to conduct verbal forensic inquiries directly in air-gapped forensic stations or connected workstations.

```
+───────────────────────────────────────────────────────────────────────────────────+
|                        BIDIRECTIONAL VOICE INTERROGATION STATION                  |
|                                                                                   |
|  [ BROWSER MICROPHONE ]                                                           |
|         │                                                                         |
|         ▼                                                                         |
|  [ WEB AUDIO ANALYSER ] ◄─── 64-point FFT / 28-Bar Real-Time Frequency Canvas     |
|         │                                                                         |
|         ▼                                                                         |
|  [ STREAMING / VAD ] ──────▶ [ Full-Duplex Barge-In Interrupt Handler ]           |
|         │                                                                         |
|         ▼                                                                         |
|  [ ASR ENGINE ] ──────────── [ Interchangeable Provider Abstraction ]             |
|         │                    • OFFLINE_LOCAL: Faster-Whisper (int8 CPU)           |
|         │                    • AI4BHARAT: IndicConformer                          |
|         │                    • SARVAM_CLOUD: Saaras Cloud Benchmark               |
|         │                    • LOCAL_BROWSER: Web Speech API Fallback             |
|         ▼                                                                         |
|  [ FORENSIC PROMPT ] ─────── UPI, NEFT, IMPS, RTGS, RRN, IFSC, NPCI, CGNAT, BSA    |
|         │                                                                         |
|         ▼                                                                         |
|  [ CLAIM COMPILER ] ──────── Context: LIBR, Gate I1 Discrepancy, Section 63 BSA   |
|         │                                                                         |
|         ▼                                                                         |
|  [ PRONUNCIATION LEXICON ] ─ Expands ₹85,00,000, CASE-2026-001, RRN digits        |
|         │                                                                         |
|         ▼                                                                         |
|  [ TTS SYNTHESIZER ] ─────── [ Interchangeable Provider Abstraction ]             |
|         │                    • OFFLINE_LOCAL: Neural Formant Synthesizer          |
|         │                    • SARVAM_CLOUD: Bulbul v4 Cloud Benchmark            |
|         │                    • LOCAL_BROWSER: SpeechSynthesis Utterance           |
|         ▼                                                                         |
|  [ AUDIO PLAYBACK ] ──────── 22,050 Hz PCM 16-bit WAV (data:audio/wav;base64)     |
+───────────────────────────────────────────────────────────────────────────────────+
```

---

## 2. SUPPORTED LANGUAGES & CODE-MIXED HANDLING

TARKA prioritizes India's multilingual cyber-crime investigative landscape:

| Language | Locale Code | Script | Offline ASR Engine | Offline Neural TTS | Code-Mixing Support |
|---|---|---|---|---|---|
| **English (India)** | `en-IN` | Latin | Faster-Whisper int8 | Local Harmonic Synthesizer | Technical banking terms |
| **Tamil (தமிழ்)** | `ta-IN` | Tamil | Faster-Whisper int8 | Local Harmonic Synthesizer | **Tanglish (Tamil + English)** |
| **Hindi (हिन्दी)** | `hi-IN` | Devanagari | Faster-Whisper int8 | Local Harmonic Synthesizer | **Hinglish (Hindi + English)** |
| **Telugu (తెలుగు)** | `te-IN` | Telugu | Faster-Whisper int8 | Local Harmonic Synthesizer | Telugu + English financial terms |
| **Kannada (ಕನ್ನಡ)** | `kn-IN` | Kannada | Faster-Whisper int8 | Local Harmonic Synthesizer | Kannada + English financial terms |
| **Malayalam (മലയാളം)** | `ml-IN` | Malayalam | Faster-Whisper int8 | Local Harmonic Synthesizer | Malayalam + English terms |
| **Bengali (বাংলা)** | `bn-IN` | Bengali | Faster-Whisper int8 | Local Harmonic Synthesizer | Bengali + English terms |
| **Marathi (मराठी)** | `mr-IN` | Devanagari | Faster-Whisper int8 | Local Harmonic Synthesizer | Marathi + English terms |
| **Gujarati (ગુજરાતી)** | `gu-IN` | Gujarati | Faster-Whisper int8 | Local Harmonic Synthesizer | Gujarati + English terms |
| **Punjabi (ਪੰਜਾਬੀ)** | `pa-IN` | Gurmukhi | Faster-Whisper int8 | Local Harmonic Synthesizer | Punjabi + English terms |
| **Odia (ଓଡ଼ିଆ)** | `or-IN` | Odia | Faster-Whisper int8 | Local Harmonic Synthesizer | Odia + English terms |
| **Tanglish** | `ta-IN-en` | Latin/Tamil | Faster-Whisper int8 | Local Bilingual Synthesizer | Seamless conversational code-mix |
| **Hinglish** | `hi-IN-en` | Latin/Devanagari | Faster-Whisper int8 | Local Bilingual Synthesizer | Seamless conversational code-mix |

---

## 3. FULL-DUPLEX CONVERSATIONAL TURN MANAGEMENT & BARGE-IN

A major limitation of generic voicebots is rigid half-duplex turn-taking where the user is forced to wait for long assistant audio to finish. TARKA implements full-duplex conversational turn management:

1. **Continuous Voice Activity Detection (VAD):** The Web Audio API analyser continuously tracks input RMS acoustic energy.
2. **Instant Barge-In Interruption:** When the assistant is synthesizing audio or playing through the HTML `<audio>` element, if the investigator begins speaking ($RMS > 0.16$), the audio playback is immediately halted (`audio.pause(); audio.currentTime = 0;`), any pending audio queue is flushed, and the state transitions to `LISTENING`.
3. **Turn Mode Toggle:** Investigators can toggle between **Hands-Free Continuous VAD Mode** (hands-free conversational flow) and **Push-to-Talk Manual Mode** (for high-noise police precinct environments).

---

## 4. INVESTIGATIVE SPEAKER PERSONAS

The offline neural acoustic synthesizer features three calibrated voice profiles:
1. **`tarka_male_investigator` (Command Persona):** Insp. Rajeshwar Rao persona with $F_0 = 118\text{ Hz}$ fundamental pitch, warm chest resonance, and measured statutory cadence.
2. **`tarka_female_senior_analyst` (Forensic Persona):** DSP Priya Sharma persona with $F_0 = 195\text{ Hz}$ fundamental pitch, sharp formant articulation, and precise numeric cadence.
3. **`tarka_bilingual_indic` (Special Cell Persona):** Tuned for rapid code-switching with dynamic prosodic inflections across Indic-English transitions.

---

## 5. LOCAL MODEL MANAGEMENT & VERIFICATION

A dedicated management enclave is available directly inside the Voice Interrogation Station:
- **Inventory Reporting:** Lists installed model IDs, sizes, quantization (int8 CPU), and supported languages.
- **SHA-256 Bitstream Integrity Check:** One-click verification validating that local model weights match authoritative cryptographic hashes before deployment.
- **Benchmark Comparative Matrix:** Live side-by-side audit of Fully Local Offline Mode vs Sarvam Cloud Mode across latency, privacy, and air-gapped readiness.

---

## 6. TELEPHONY-READY ARCHITECTURE

The voice pipeline is architected with modular transport adapters ready for future telephony integration:
- **8 kHz Telephony Sampling:** Synthesizer and ASR adapters support downsampling/resampling for standard G.711 / AMR-WB codecs.
- **WebRTC / LiveKit Transport:** `backend/app/services/voice/livekit_transport.py` and `backend/app/api/voice_api.py` manage WebRTC room tokens and session contexts.
- **Call Recording Policy & Statutory Warning:** Automated consent injection and non-repudiation logging into the WORM Flight Recorder prior to call session admission.
