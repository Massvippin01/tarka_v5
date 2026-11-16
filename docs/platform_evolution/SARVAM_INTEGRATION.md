# TARKA | SARVAM AI INTEGRATION ARCHITECTURE
## Sovereign Cloud AI Adapter, Saaras STT, Bulbul v4 TTS & Policy Safeguards

**Backend Service:** `backend/app/intelligence/sarvam_voice_service.py`  
**API Endpoints:** `backend/app/api/voice_api.py`  
**Official Reference:** https://docs.sarvam.ai  

---

## 1. Security & Sovereignty Safeguards

Connecting an investigative forensic workstation to any cloud provider requires strict legal and cryptographic boundaries:

1. **Zero Secret Egress**: The `SARVAM_API_KEY` is strictly retained in backend server environment variables (`settings.SARVAM_API_KEY`). It is never transmitted to or embedded in frontend client bundles.
2. **Zero Raw Evidence Transmission**: No raw evidence files, forensic dumps, bank statement PDFs, or unhashed bitstreams are ever transmitted to Sarvam AI. Only sanitized spoken query transcripts and acoustic speech synthesis prompts are processed.
3. **Explicit Policy Consent**: Cloud mode is disabled by default. Transitioning from **Offline Local** to **Sarvam Enhanced** requires explicit user confirmation and supervisor role credentials.

```
┌──────────────────────────────────────────────────────────┐
│                     FRONTEND CLIENT                      │
│   • Audio Capture (Web Audio API)                        │
│   • FFT Energy Telemetry (28-Bar Visualizer)             │
│   • Zero API Keys in Client Code                         │
└────────────────────────────┬─────────────────────────────┘
                             │ Audio PCM / Text Query
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   TARKA BACKEND GATEWAY                  │
│   • Policy Gateway & Consequential Action Guardrails     │
│   • Data Sanitizer (Strips Raw Bitstreams & Case PII)    │
│   • SARVAM_API_KEY Vault Injection                       │
└──────────────┬────────────────────────────┬──────────────┘
               │ Mode: OFFLINE_LOCAL        │ Mode: SARVAM_ENHANCED
               ▼                            ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  AIR-GAPPED OFFLINE ENCLAVE  │ │       SARVAM AI CLOUD        │
│ • Faster-Whisper int8 (CPU)  │ │ • Saaras Realtime STT        │
│ • Physics-Based Formant TTS  │ │ • Bulbul v4 Flash Neural TTS │
│ • 0 KB External Egress       │ │ • Sub-400ms Streaming Latency│
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## 2. Speech-to-Text: Saaras Streaming API

- **Endpoint**: Official streaming speech-to-text API supporting 22 Indian languages.
- **Transcoding**: Audio is encoded as 16,000 Hz single-channel 16-bit linear PCM.
- **Interim vs Final Transcripts**: Emits partial speculative transcripts for conversational immediacy, followed by final confidence-scored transcripts for claim compilation.
- **Code-Mixing Support**: Native understanding of English mixed with Hindi, Tamil, Telugu, and Bengali.

---

## 3. Speech Synthesis: Bulbul v4 Flash API

- **Model**: `bulbul:v4-flash`
- **Output Quality**: 24,000 Hz neural speech audio with natural Indic prosody and pitch variations.
- **Pronunciation Normalization**: Pre-processes numbers, Indian rupee denominations (e.g., ₹85,00,000 $\to$ *"eighty-five lakh rupees"*), and legal statutory references (e.g., BSA §63 $\to$ *"Section 63 of the Bharatiya Sakshya Adhiniyam"*) prior to synthesis.

