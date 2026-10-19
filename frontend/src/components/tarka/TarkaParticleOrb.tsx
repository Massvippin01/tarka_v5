import React, { useEffect, useRef } from "react";

export type OrbState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "interrupted"
  | "confirmation_required"
  | "error";

interface TarkaParticleOrbProps {
  state: OrbState;
  audioLevel?: number; // 0.0 to 1.0 from Web Audio AnalyserNode
  size?: number; // in pixels, default 240
  onClick?: () => void;
  className?: string;
  theme?: "obsidian-glass" | "porcelain" | "midnight-teal" | "high-contrast";
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
}

export const TarkaParticleOrb: React.FC<TarkaParticleOrbProps> = ({
  state,
  audioLevel = 0,
  size = 240,
  onClick,
  className = "",
  theme = "obsidian-glass",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateRef = useRef<OrbState>(state);
  const audioLevelRef = useRef<number>(audioLevel);
  const themeRef = useRef(theme);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

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

    // High DPI scaling
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const sphereRadius = size * 0.40;

    // Generate high-density spherical particles matching the reference image (~6,800 points)
    const particleCount = prefersReducedMotion ? 1800 : 6800;
    const particles: Particle[] = [];

    // Golden angle for Fibonacci spherical distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.39996323

    // 1. Shell particles (base volumetric topography with organic wrinkles/crests)
    const shellCount = Math.floor(particleCount * 0.78);
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

      // Point size distribution: mostly fine 0.7px-1.1px dots with ~3% glints
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
      });
    }

    // 2. Turbulent outer corona rim particles (irregular fringed boundary matching reference)
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
      });
    }

    let rotX = 0.25;
    let rotY = 0.35;
    let pulseScale = 1;
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Pause or reduce when tab is hidden
      if (typeof document !== "undefined" && document.hidden) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, size, size);

      const currentState = stateRef.current;
      const currentAudio = audioLevelRef.current;
      const currentTheme = themeRef.current;

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
          pulseTarget = 1.03 + currentAudio * 0.25;
          turbulenceScale = 1.0 + currentAudio * 1.8;
          break;
        case "processing":
          rotSpeed = 0.85;
          pulseTarget = 0.94;
          turbulenceScale = 0.85;
          break;
        case "speaking":
          rotSpeed = 0.16;
          pulseTarget = 1.04 + Math.sin(time * 0.006) * 0.04 + currentAudio * 0.15;
          turbulenceScale = 1.1 + currentAudio * 1.2;
          break;
        case "confirmation_required":
          rotSpeed = 0.06;
          pulseTarget = 1.02;
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

      pulseScale += (pulseTarget - pulseScale) * 0.12;
      rotX += rotSpeed * delta * 0.45;
      rotY += rotSpeed * delta * 0.8;

      // Trigonometric projection constants
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const fov = 380;

      // Semantic status indicators: in confirmation_required, render a restrained amber border outside canvas
      if (currentState === "confirmation_required") {
        ctx.save();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, sphereRadius * 1.18 * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (currentState === "error") {
        ctx.save();
        ctx.strokeStyle = "rgba(244, 63, 94, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sphereRadius * 1.18 * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Iterate and render particles
      const len = particles.length;
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        p.theta += p.speed;

        // Subtle organic surface wave modulation
        const wave =
          Math.sin(time * 0.001 + p.theta * 3 + p.phi * 2) * 1.5 * turbulenceScale;
        const r = (p.baseRadius + wave) * pulseScale;

        // 3D Spherical Coordinate -> Cartesian
        const sinPhi = Math.sin(p.phi);
        const cosPhi = Math.cos(p.phi);
        const x0 = r * sinPhi * Math.cos(p.theta);
        const y0 = r * sinPhi * Math.sin(p.theta);
        const z0 = r * cosPhi;

        // 3D Rotations (around Y then X)
        const x1 = x0 * cosY + z0 * sinY;
        const z1 = -x0 * sinY + z0 * cosY;
        const y2 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;

        // Depth culling: Back hemisphere is heavily attenuated or culled so interior stays quiet and dark
        const normZ = z2 / sphereRadius;
        if (normZ < -0.15) {
          // Skip particles on far back hemisphere to preserve hollow dark center
          if (normZ < -0.45 || i % 3 !== 0) continue;
        }

        // Perspective Projection
        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        // Limb brightening calculation:
        // As normZ approaches 0 (tangent rim), particle path through shell is thickest -> bright white
        // As normZ approaches 1 (center facing camera), particles are dimmer silver/slate
        const absZ = Math.abs(normZ);
        const rimFactor = Math.pow(Math.max(0, 1 - absZ), 1.8); // 0 at center, 1 at rim

        const isLight = currentTheme === "porcelain";
        let red = isLight ? 30 : 245;
        let green = isLight ? 41 : 250;
        let blue = isLight ? 59 : 255;
        let alpha = p.alpha;
        let dotSize = p.size * scale;

        if (rimFactor > 0.55) {
          // Outer rim: Brilliant pure silver-white (or deep obsidian on light themes)
          red = isLight ? 15 : 255;
          green = isLight ? 23 : 255;
          blue = isLight ? 42 : 255;
          alpha = Math.min(1.0, 0.75 + rimFactor * 0.25);
          dotSize = Math.max(1.0, p.size * scale * 1.25);
        } else {
          // Center / interior: Dimmer silver-grey to maintain visually quiet, dark center
          const depthRatio = Math.max(0.15, normZ);
          if (isLight) {
            red = Math.round(71 + 30 * (1 - depthRatio));
            green = Math.round(85 + 30 * (1 - depthRatio));
            blue = Math.round(105 + 30 * (1 - depthRatio));
          } else {
            red = Math.round(140 + 75 * depthRatio);
            green = Math.round(155 + 75 * depthRatio);
            blue = Math.round(175 + 75 * depthRatio);
          }
          alpha = (0.2 + 0.35 * depthRatio) * p.alpha;
          dotSize = Math.max(0.7, p.size * scale * 0.95);
        }

        // Color override in error or confirmation states if needed, otherwise strict monochromatic
        if (currentState === "error") {
          red = 244;
          green = 63;
          blue = 94;
        } else if (currentState === "confirmation_required") {
          red = 251;
          green = 191;
          blue = 36;
        }

        // Render point with sub-pixel rect for razor-sharp stippling (10x faster than ctx.arc)
        ctx.fillStyle = `rgba(${red}, ${green}, blue, ${alpha})`.replace("blue", `${blue}`);
        ctx.fillRect(projX - dotSize / 2, projY - dotSize / 2, dotSize, dotSize);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [size, theme]);

  const stateLabels: Record<OrbState, string> = {
    idle: "TARKA Assistant Ready • Click or speak to activate",
    listening: "Listening • Speak naturally to interrupt or ask",
    processing: "Analyzing evidence with deterministic Z3 solver",
    speaking: "Spoken Response Active • Speak anytime to barge in",
    confirmation_required: "Human Confirmation Required for Consequential Statutory Action",
    error: "Voice connection error • Using fallback interface",
    interrupted: "Interrupted • Assistant silenced",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`TARKA Voice Sphere: ${stateLabels[state]}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`tarka-particle-orb-container ${className}`}
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      {/* Screen-reader only live status - strictly visually hidden */}
      <span
        className="sr-only"
        aria-live="polite"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {stateLabels[state]}
      </span>
    </div>
  );
};
