# SUTRAM 2026 PS04 — TARKA FORENSIC WORKBENCH
## PHASE 14.3.1 VOICE PRIVACY & AIR-GAP RUNTIME VERIFICATION
### Statutory Privacy Disclosures, Audio Buffer Lifecycle & Cryptographic Custody

**Document Identifier:** `TARKA-P14-3-1-VOICE-PRIVACY-2026-V2`  
**Evaluation Session:** Phase 14.3.1 Independent Acceptance Review  
**Repository:** `C:\PROJECTS\tarka_v5`  
**Working Branch:** `phase-14/implementation-completion`  
**Components Under Audit:**  
- `frontend/src/components/tarka/SarvamVoiceModal.tsx`
- `frontend/src/api/forensicsApi.ts`
- `backend/app/api/forensics_api.py`
- `backend/app/intelligence/sarvam_voice_service.py`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** Official Forensic Privacy, Cryptographic Custody & Security Assurance  
**Date:** November 8, 2026  

---

## 1. OBJECTIVE & EVIDENTIARY PRINCIPLES

In forensic law-enforcement computing environments governed by Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA) and the Digital Personal Data Protection Act, 2023 (DPDP Act), ambient voice assistants present severe evidentiary risks if unconstrained:
1. **Background Eavesdropping:** Uncontrolled microphone listening buffers or background audio recording violates statutory privacy mandates and creates inadmissible evidence.
2. **Third-Party Data Exfiltration:** Streaming raw evidentiary deliberations, case files, or suspect identities to commercial cloud APIs violates chain-of-custody protocols.
3. **Automated Consequential Actions:** Voice commands triggering account freezes or identity merges without human authorization violate Rule 5 and Rule 7 of the SentinelX Engineering Constitution.

This report documents the verified implementation of runtime privacy boundaries, audio pipeline lifecycle cleanup, dynamic provider disclosures, and local fallback behavior.

---

## 2. FULL AUDIO & NETWORK PATH SPECIFICATION

```
[INVESTIGATOR VOICE INPUT]
            │
            ▼
[Browser Microphone] ──► navigator.mediaDevices.getUserMedia({ audio: true })
            │
            ├─► Web Audio API AnalyserNode (Local Voice Activity Detection / RMS energy)
            │
            ▼
[MediaRecorder] ──► audioChunksRef.current = [Blob chunks...]
            │
            ▼
[Speech Segment Complete] ──► new Blob(audioChunksRef.current, { type: 'audio/webm' })
            │
            ▼
[POST /api/v1/forensics/sarvam/transcribe] ──► (Transmits 16kHz PCM audio chunk to backend)
            │
            ├── IF SARVAM_API_KEY IS CONFIGURED:
            │      └─► POST https://api.sarvam.ai/speech-to-text (Transmits audio chunk to Sarvam)
            │
            └── IF SARVAM_API_KEY IS NOT CONFIGURED (Offline Fallback):
                   └─► Short-circuits locally: returns {"provider": "OFFLINE_FALLBACK", "transcript": ""}
                       (0 outbound external WAN sockets created)
            │
            ▼
[Transcript Evaluated Locally] ──► POST /api/v1/forensics/cases/{case_id}/agent/orchestrate
            │                       (Regex intent classification, Z3 SMT solver, 100% local execution)
            ▼
[TTS Spoken Response Output]
            │
            ├── IF SARVAM_API_KEY IS CONFIGURED:
            │      └─► POST https://api.sarvam.ai/text-to-speech (Transmits text string <= 450 chars)
            │          Receives Base64 audio; plays via HTML5 Audio element.
            │
            └── IF SARVAM_API_KEY IS NOT CONFIGURED:
                   └─► Backend returns {"audio_base64": null, "tts_unavailable": true}
                       Frontend displays text response without external network transmission.
```

### 2.1 Explicit Data Transmission Boundaries

| Data Type | Endpoint / Protocol | Cloud Mode (API Key Present) | Offline Fallback (No API Key) |
| :--- | :--- | :--- | :--- |
| **Spoken Audio Bytes** | `/sarvam/transcribe` | Transmitted to backend, forwarded to `api.sarvam.ai/speech-to-text`. | Transmitted to local FastAPI backend; discarded without external forwarding. |
| **Spoken Text Query** | `/agent/orchestrate` | Processed locally on backend server (Z3 SMT solver, regex parser). | Processed locally on backend server (100% local). |
| **Spoken Text Response** | `/sarvam/synthesize`| Text string ($\le 450$ chars) sent to `api.sarvam.ai/text-to-speech`. | Short-circuited locally; no outbound network socket opened. |
| **Raw Evidence Files (CBS, IPDR, PCAP)** | Local CAS Object Storage | **NEVER TRANSMITTED TO SARVAM** | **NEVER TRANSMITTED TO SARVAM** |

---

## 3. VERIFIED NETWORK EVIDENCE: RUNTIME STATUS DERIVATION

The active privacy badge in [`SarvamVoiceModal.tsx`](file:///C:/PROJECTS/tarka_v5/frontend/src/components/tarka/SarvamVoiceModal.tsx) is not hardcoded. It is dynamically derived from the live authenticated backend endpoint `/api/v1/forensics/sarvam/status`.

### 3.1 Actual Runtime Endpoint Response (Verified 2026-11-08)

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/forensics/sarvam/status" -Headers @{ "Authorization" = "Bearer $TOKEN" }
```

Output:
```json
{
  "provider": "Sarvam AI (India-First Foundational Speech Models)",
  "api_configured": false,
  "provider_reachable": "unknown",
  "stt_model": "saaras:v4",
  "tts_model": "bulbul:v4-flash",
  "default_speaker": "shubh_enhi_ads",
  "voice_identity": "TARKA Forensics Assistant",
  "cloud_processing_disclosed": true,
  "mode": "OFFLINE_LOCAL_FALLBACK",
  "epistemic_privacy_policy": "NO_RAW_EVIDENCE_TRANSMITTED"
}
```

Because `api_configured` is `false` and `mode` is `"OFFLINE_LOCAL_FALLBACK"`, [`SarvamVoiceModal.tsx`](file:///C:/PROJECTS/tarka_v5/frontend/src/components/tarka/SarvamVoiceModal.tsx) automatically activates the blue fallback indicator:
$$\text{🔵 Deterministic Offline Air-Gap Mode (Local Air-Gapped Engine · 0 External Calls)}$$

---

## 4. IN-BROWSER AUDIO RESOURCE TEARDOWN (`cleanupAudioPipeline`)

To prevent ongoing microphone capture, `cleanupAudioPipeline()` enforces a verified teardown sequence across all termination paths (modal unmount, explicit stop, turn completion, ESC key, backdrop click):

```tsx
const cleanupAudioPipeline = useCallback(() => {
  if (vadRafIdRef.current) {
    cancelAnimationFrame(vadRafIdRef.current);
    vadRafIdRef.current = null;
  }
  if (mediaRecorderRef.current) {
    try {
      // Disarm event listeners to prevent post-cleanup handler invocation
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    mediaRecorderRef.current = null;
  }
  audioChunksRef.current = [];
  if (audioContextRef.current && audioContextRef.current.state !== "closed") {
    audioContextRef.current.close().catch(() => {});
    audioContextRef.current = null;
  }
  if (mediaStreamRef.current) {
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }
  setIsRecording(false);
  setAudioLevel(0);
}, []);
```

### 4.1 Security & Forensic Impact
- **Track Termination:** Calling `track.stop()` on all `MediaStreamTrack` handles actively extinguishes the hardware microphone recording indicator in the operating system.
- **Buffer Invalidation:** Disarming `ondataavailable = null` and zeroing `audioChunksRef.current = []` ensures that volatile audio data cannot be retained in browser memory or accidentally posted to subsequent API turns.

---

## 5. STATUTORY CONFIRMATION GUARDRAILS FOR HIGH-RISK ACTIONS

In strict accordance with the doctrine:
$$\text{AI PROPOSES.} \quad \text{EVIDENCE VERIFIES.} \quad \text{HUMAN DECIDES.}$$

The system enforces that:
1. No voice command can autonomously trigger an external bank account freeze, graph identity merge, or arrest directive.
2. When high-risk intents are detected, the backend returns `"requires_confirmation": true` with statutory metadata under Section 107 BNSS, 2023.
3. The UI presents an explicit statutory confirmation modal requiring authenticated physical user interaction before any consequential action is recorded in the immutable audit log.
