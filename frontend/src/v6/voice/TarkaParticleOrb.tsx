import React, { useEffect, useRef } from "react";

export type OrbState =
  | "idle"
  | "listening"
  | "processing"
  | "investigating"
  | "speaking"
  | "interrupted"
  | "confirmation_required"
  | "offline"
  | "error";

export interface TarkaParticleOrbProps {
  state: OrbState;
  audioLevel?: number; // 0.0 to 1.0 from Web Audio AnalyserNode
  frequencyData?: Uint8Array; // Full spectral FFT bins
  size?: number; // in pixels, default 380
  onClick?: () => void;
  className?: string;
  theme?: "obsidian-glass" | "porcelain" | "midnight-teal" | "high-contrast" | string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  theta: number;
  phi: number;
  speed: number;
  size: number;
  alpha: number;
  isCorona: boolean;
  isGlint: boolean;
}

export const TarkaParticleOrb: React.FC<TarkaParticleOrbProps> = ({
  state,
  audioLevel = 0,
  frequencyData,
  size = 380,
  onClick,
  className = "",
  theme = "obsidian-glass",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateRef = useRef<OrbState>(state);
  const audioLevelRef = useRef<number>(audioLevel);
  const frequencyDataRef = useRef<Uint8Array | undefined>(frequencyData);
  const themeRef = useRef(theme);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    frequencyDataRef.current = frequencyData;
  }, [frequencyData]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Detect reduced motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // High DPI scaling (capped at 2.0 to conserve GPU bandwidth)
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.0) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const sphereRadius = size * 0.38;

    // Generate high-density spherical particles matching the canonical TARKA forensic orb (~8,800 points)
    const particleCount = prefersReducedMotion ? 2200 : 8800;
    const particles: Particle[] = [];

    // Golden angle for Fibonacci spherical distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.39996323

    // 1. Shell particles (base volumetric topography with organic wrinkles/crests)
    const shellCount = Math.floor(particleCount * 0.80);
    for (let i = 0; i < shellCount; i++) {
      const y = 1 - (2 * i) / (shellCount - 1);
      const phi = Math.acos(Math.max(-1, Math.min(1, y)));
      const theta = i * goldenAngle;

      // Multi-octave surface perturbation for organic folds/ridges
      const h1 = Math.sin(6 * theta + 4 * phi) * 0.042;
      const h2 = Math.cos(12 * theta - 5 * phi) * 0.026;
      const h3 = Math.sin(22 * theta + 11 * phi) * 0.016;
      const h4 = Math.cos(34 * theta - 17 * phi) * 0.009;
      const perturbation = 1 + h1 + h2 + h3 + h4;

      const baseR = sphereRadius * perturbation;

      // Point size distribution: mostly fine 0.75px-1.1px dots with ~3.5% glints
      const isGlint = Math.random() < 0.035;
      const pSize = isGlint ? 1.6 + Math.random() * 0.7 : 0.75 + Math.random() * 0.75;

      particles.push({
        x: 0,
        y: 0,
        z: 0,
        baseRadius: baseR,
        theta,
        phi,
        speed: (0.0003 + Math.random() * 0.0005) * (i % 2 === 0 ? 1 : -1),
        size: pSize,
        alpha: isGlint ? 0.98 : 0.3 + Math.random() * 0.55,
        isCorona: false,
        isGlint,
      });
    }

    // 2. Turbulent outer corona rim particles (irregular fringed boundary)
    const rimCount = particleCount - shellCount;
    for (let i = 0; i < rimCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      // Clustered near the tangent limb/equator with jitter
      const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.85;

      // Angular turbulent flaring and wisps
      const flare =
        Math.pow(Math.sin(5 * theta + 0.3) + Math.cos(11 * theta + 0.7) + Math.sin(23 * theta + 1.1), 2) / 4.2;
      const rJitter = 0.94 + flare * 0.20 + (Math.random() - 0.5) * 0.09;
      const baseR = sphereRadius * rJitter;

      particles.push({
        x: 0,
        y: 0,
        z: 0,
        baseRadius: baseR,
        theta,
        phi,
        speed: (0.0005 + Math.random() * 0.0008) * (i % 2 === 0 ? 1 : -1),
        size: 0.85 + Math.random() * 1.25,
        alpha: 0.65 + Math.random() * 0.35,
        isCorona: true,
        isGlint: Math.random() < 0.05,
      });
    }

    let rotX = 0.25;
    let rotY = 0.35;
    let pulseScale = 1;
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Throttle when document tab is hidden
      if (typeof document !== "undefined" && document.hidden) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, size, size);

      const currentState = stateRef.current;
      const currentAudio = audioLevelRef.current;
      const currentTheme = themeRef.current;
      const freq = frequencyDataRef.current;

      // Calculate 3-band spectral energy from real FFT bins
      let bassEnergy = 0;
      let midEnergy = 0;
      let trebleEnergy = 0;

      if (freq && freq.length > 0) {
        const binCount = freq.length;
        const bassEnd = Math.floor(binCount * 0.15);
        const midEnd = Math.floor(binCount * 0.60);

        let bSum = 0;
        for (let i = 0; i < bassEnd; i++) bSum += freq[i];
        bassEnergy = bSum / (bassEnd * 255);

        let mSum = 0;
        for (let i = bassEnd; i < midEnd; i++) mSum += freq[i];
        midEnergy = mSum / ((midEnd - bassEnd) * 255);

        let tSum = 0;
        for (let i = midEnd; i < binCount; i++) tSum += freq[i];
        trebleEnergy = tSum / ((binCount - midEnd) * 255);
      } else {
        bassEnergy = currentAudio * 0.8;
        midEnergy = currentAudio * 0.6;
        trebleEnergy = currentAudio * 0.4;
      }

      // Base rotation and state behavior
      let rotSpeed = 0.12;
      let pulseTarget = 1.0;
      let turbulenceScale = 1.0;

      switch (currentState) {
        case "idle":
          rotSpeed = 0.08;
          pulseTarget = 1.0;
          turbulenceScale = 1.0;
          break;
        case "listening":
          rotSpeed = 0.22;
          pulseTarget = 1.02 + bassEnergy * 0.28;
          turbulenceScale = 1.0 + midEnergy * 2.2;
          break;
        case "processing":
        case "investigating":
          rotSpeed = 0.75;
          pulseTarget = 0.95 + Math.sin(time * 0.008) * 0.03;
          turbulenceScale = 0.85;
          break;
        case "speaking":
          rotSpeed = 0.16;
          pulseTarget = 1.04 + Math.sin(time * 0.006) * 0.04 + bassEnergy * 0.22;
          turbulenceScale = 1.1 + midEnergy * 1.6;
          break;
        case "confirmation_required":
          rotSpeed = 0.06;
          pulseTarget = 1.02;
          break;
        case "offline":
          rotSpeed = 0.07;
          pulseTarget = 0.98;
          turbulenceScale = 0.9;
          break;
        case "error":
          rotSpeed = 0.04;
          pulseTarget = 0.96;
          break;
        case "interrupted":
          rotSpeed = 0.05;
          pulseTarget = 0.95;
          break;
      }

      if (prefersReducedMotion) {
        rotSpeed = 0.02;
        pulseTarget = 1.0;
      }

      pulseScale += (pulseTarget - pulseScale) * 0.14;
      rotX += rotSpeed * delta * 0.45;
      rotY += rotSpeed * delta * 0.8;

      // Trigonometric projection constants
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Color scheme setup based on state and theme
      let baseR = 210, baseG = 225, baseB = 245; // Cool ivory steel-blue default
      let glintR = 255, glintG = 255, glintB = 255;
      let haloR = 71, haloG = 109, haloB = 145;

      if (currentState === "speaking") {
        baseR = 140; baseG = 195; baseB = 255; // Vibrant cyan/sky
        haloR = 56; haloG = 189; haloB = 248;
      } else if (currentState === "listening") {
        baseR = 175; baseG = 230; baseB = 210; // Emerald cyan responsiveness
        haloR = 16; haloG = 185; haloB = 129;
      } else if (currentState === "processing" || currentState === "investigating") {
        baseR = 215; baseG = 170; baseB = 255; // Electric violet intelligence
        haloR = 168; haloG = 85; haloB = 247;
      } else if (currentState === "confirmation_required") {
        baseR = 255; baseG = 200; baseB = 120; // Amber notice
        haloR = 245; haloG = 158; haloB = 11;
      } else if (currentState === "error") {
        baseR = 255; baseG = 120; baseB = 120; // Rose alert
        haloR = 239; haloG = 68; haloB = 68;
      } else if (currentState === "offline") {
        baseR = 190; baseG = 190; baseB = 195; // Silver graphite local
        haloR = 148; haloG = 163; haloB = 184;
      }

      if (currentTheme === "porcelain") {
        baseR = 90; baseG = 110; baseB = 140;
      }

      // Draw subtle background radial glow halo
      const haloRadius = sphereRadius * (1.18 + bassEnergy * 0.25);
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        sphereRadius * 0.25,
        centerX,
        centerY,
        haloRadius
      );
      grad.addColorStop(0, `rgba(${haloR}, ${haloG}, ${haloB}, 0.16)`);
      grad.addColorStop(0.65, `rgba(${haloR}, ${haloG}, ${haloB}, 0.05)`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Transform, sort, and render each particle with 3D depth
      const len = particles.length;
      for (let i = 0; i < len; i++) {
        const p = particles[i];

        // Orbit update
        p.theta += p.speed;

        // Apply dynamic wave / frequency displacement
        let dynamicRadius = p.baseRadius * pulseScale;
        if (p.isCorona) {
          dynamicRadius += trebleEnergy * sphereRadius * 0.18 * Math.sin(p.theta * 7) * turbulenceScale;
        } else {
          dynamicRadius += midEnergy * sphereRadius * 0.08 * Math.cos(p.phi * 5) * turbulenceScale;
        }

        // Spherical to 3D Cartesian coordinates
        const sinPhi = Math.sin(p.phi);
        const cosPhi = Math.cos(p.phi);
        const sinTheta = Math.sin(p.theta);
        const cosTheta = Math.cos(p.theta);

        const x0 = dynamicRadius * sinPhi * cosTheta;
        const y0 = dynamicRadius * cosPhi;
        const z0 = dynamicRadius * sinPhi * sinTheta;

        // Y-axis rotation
        const x1 = x0 * cosY + z0 * sinY;
        const y1 = y0;
        const z1 = -x0 * sinY + z0 * cosY;

        // X-axis rotation
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Perspective projection
        const cameraDist = sphereRadius * 3.4;
        const perspective = cameraDist / (cameraDist - z2);
        const screenX = centerX + x2 * perspective;
        const screenY = centerY + y2 * perspective;

        // Depth culling & limb brightening: particles facing camera or on the tangent edge are highlighted
        const depthFactor = (z2 + sphereRadius) / (sphereRadius * 2); // 0 (back) to 1 (front)
        if (depthFactor < 0.08 && !p.isCorona) {
          continue; // Back culling for performance and clarity
        }

        const edgeFactor = Math.abs(z2) / sphereRadius;
        const limbGlow = 1.0 - Math.min(1.0, edgeFactor * 0.5);

        const finalAlpha = Math.max(
          0.05,
          Math.min(1.0, p.alpha * depthFactor * limbGlow * (0.65 + currentAudio * 0.4))
        );
        const finalSize = Math.max(0.4, p.size * perspective * (0.85 + depthFactor * 0.3));

        if (p.isGlint) {
          ctx.fillStyle = `rgba(${glintR}, ${glintG}, ${glintB}, ${Math.min(1.0, finalAlpha * 1.4)})`;
        } else {
          ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${finalAlpha})`;
        }

        ctx.fillRect(screenX, screenY, finalSize, finalSize);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [size]);

  return (
    <div
      className={`tarka-particle-orb-container relative flex items-center justify-center select-none cursor-pointer ${className}`}
      onClick={onClick}
      style={{ width: `${size}px`, height: `${size}px` }}
      title="TARKA Voice Intelligence Field"
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
