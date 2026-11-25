# TARKA × SENTINELX — PARTICLE VOICE RESTORATION

**Status:** RESTORED & VERIFIED  
**Date:** 2026-11-26  
**Scope:** 8,800-Point Fibonacci Spherical Particle Field, Multilingual Voice Interrogation Station, Audio FFT Telemetry, and Barge-In Controls.

---

## 1. Executive Summary

In accordance with founder and constitutional requirements, the voice interrogation experience in TARKA has been elevated from a flat 2D 28-bar equalizer waveform to the canonical, human-art-directed **8,800-Point Fibonacci Spherical Particle Field** (`TarkaParticleOrb`).

This restores TARKA's signature visual and acoustic presence across the multilingual voice interrogation station (`TarkaVoiceModal.tsx`) and the sovereign particle HUD (`ParticleHomeScreen.tsx`).

---

## 2. Particle Field Architecture & Mathematics

Located in: `frontend/src/v6/voice/TarkaParticleOrb.tsx`

### 2.1 Spherical Topology
- **Point Density:** 8,800 discrete particles distributed on a 3D sphere using the golden-angle Fibonacci spherical distribution ($n = 8800$, $\theta = \pi (3 - \sqrt{5})$).
- **Surface Harmonics:** Modulated in real-time by multi-octave harmonic functions ($h_1 \dots h_4$) capturing subtle vocal timbre and acoustic energy.
- **Volumetric Depth:** Perspective projection ($z$-depth scaling, limb brightening, and atmospheric glint particles).
- **Reduced Motion Support:** Automatically steps down to 2,200 points when `prefers-reduced-motion` is detected in the operating environment.

### 2.2 Orb State Machine
The particle field smoothly transitions across operational states:
- `idle`: Gentle organic rotation with low-frequency surface breathing.
- `listening`: Expanded corona, amber/terracotta resonance reacting directly to Web Audio Analyser RMS and FFT frequency bins.
- `processing`: Coherent internal nodal convergence (deep slate blue).
- `speaking`: Forest green harmonic ripples synchronized to speech synthesis phoneme playback.
- `interrupted`: Brief red/orange dispersion acknowledging investigator barge-in.
- `confirmation_required`: High-visibility amber pulsing demanding human statutory confirmation.

---

## 3. Modal Integration Details

In `frontend/src/v6/voice/TarkaVoiceModal.tsx`:
1. Replaced the flat HTML5 canvas with `<TarkaParticleOrb />` configured with:
   - `size={260}`
   - `theme="porcelain"` (warm ivory / linen skeuomorphic palette matching V6 tokens)
   - `audioLevel={telemetry.rmsEnergy}`
   - `frequencyData={telemetry.frequencyData}`
   - `onClick`: Direct touch/click to begin or conclude interrogation turns.
2. Eliminated the legacy 28-bar draw loop and unneeded canvas references.
3. Connected live networking indicator: `AIR-GAPPED OFFLINE` for Local Neural Engine, `ONLINE` for Sarvam AI Bulbul / Sovereign Enclave.

---

## 4. Verification Evidence

- `frontend/src/v6/__tests__/autonomousParticleVoiceAndNavigation.test.ts`: Passed (9/9).
- `frontend/src/v6/__tests__/productionAuthAndParticleVoice.test.ts`: Passed (5/5).
- Full Vitest suite: 26 passed, 148 passed.
- Production build: Succeeded with 0 errors.
