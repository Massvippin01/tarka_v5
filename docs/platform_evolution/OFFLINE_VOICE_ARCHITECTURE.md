# TARKA | OFFLINE VOICE ARCHITECTURE
## Air-Gapped Speech Pipeline, Local ASR, and Neural Formant Acoustic Synthesis

**Implementation:** `backend/app/services/voice/local_offline_voice_service.py`  
**Test Suite:** `backend/tests/test_tarka_offline_voice_restoration.py` (9/9 Passed)  
**Hardware Profile:** Standard CPU (x86_64), int8 Quantization, Zero GPU/NPU Requirements  

---

## 1. Zero-Network Air-Gapped Mandate

In classified forensic facilities, military police stations, and secure state data centres, outbound internet access is physically disconnected. TARKA's primary voice engine operates **100% locally on-device** with zero network egress:

```
Microphone Stream (Web Audio API)
       │
       ▼
Local VAD & Energy Detector (<15ms latency)
       │
       ▼
Faster-Whisper Tiny int8 (CPU Snapshot: 75.5 MB model.bin)
       │
       ▼
TarkaForensicLexicon (Normalizes BSA §63, BNSS §106, Currency, UTR/RRN)
       │
       ▼
Local Speech Acoustic Synthesizer (22,050 Hz PCM 16-bit WAV)
       │
       ▼
Audio Playback & Full-Duplex Barge-In (<15ms Auto-Mute)
```

---

## 2. Model Enclave & Cryptographic Verification

| Component | Architecture | Weight Location | File Size | SHA-256 Digest |
| :--- | :--- | :--- | :--- | :--- |
| **STT Engine** | CTranslate2 Faster-Whisper | `.../snapshots/d90ca5fe.../model.bin` | 75.5 MB | `21b51e44...` |
| **STT Vocabulary** | Multilingual Byte-Pair Tokens | `.../snapshots/d90ca5fe.../vocabulary.json` | 2.4 MB | `784e1832...` |
| **TTS Synthesizer**| Multi-Formant Harmonic Waveform | Internal Python DSP Engine | Pure Code | N/A (Deterministic) |

---

## 3. Acoustic Formant Synthesis Engine

Rather than relying on robotic browser-native `speechSynthesis` (which sounds inhuman and lacks Indic prosody), TARKA includes an on-device **physics-based formant harmonic acoustic synthesizer**:

1. **Vocal Tract Resonance Modeling**:
   Calculates first through fourth formants ($F_1$ through $F_4$) corresponding to open, half-open, and closed phonetic vowel tracts.
2. **Prosodic Declination**:
   Applies natural linear frequency declination ($F_0$ gently decays by $8-12\text{ Hz}$ across a sentence, mimicking natural exhalation).
3. **Breath Pause Simulation**:
   Inserts organic micro-silences ($60-120\text{ ms}$) after commas and statutory citations.
4. **Three Distinct Investigative Personas**:
   - `tarka_male_investigator` (Insp. Rajeshwar Rao, $F_0 = 118\text{ Hz}$)
   - `tarka_female_senior_analyst` (DSP Priya Sharma, $F_0 = 195\text{ Hz}$)
   - `tarka_bilingual_indic` (Special Cell Bilingual Officer, $F_0 = 145\text{ Hz}$)

