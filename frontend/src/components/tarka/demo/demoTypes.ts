/**
 * TARKA Autonomous Demo Director - Type Definitions
 * Strict state machine, scene schema, preflight validation, and narration structure.
 */

export type DemoState =
  | "IDLE"
  | "PREFLIGHT"
  | "READY"
  | "RUNNING"
  | "PAUSED"
  | "RECOVERING"
  | "COMPLETED"
  | "FAILED";

export type WorkstationTab =
  | "landing"
  | "overview"
  | "inbox"
  | "evidence"
  | "visual"
  | "timeline"
  | "contradictions"
  | "hypotheses"
  | "provenance"
  | "gaps"
  | "robustness"
  | "reports"
  | "system";

export interface LaymanExplanation {
  /** 1. What the viewer is seeing on the screen right now */
  whatViewerSees: string;
  /** 2. Plain-language everyday analogy or meaning */
  plainMeaning: string;
  /** 3. Why this matters to an actual investigation or court case */
  investigativeSignificance: string;
  /** 4. What TARKA actually computed or executed */
  tarkaAction: string;
  /** 5. What this result proves, and what it does NOT prove */
  statutoryLimits: string;
}

export interface DemoScene {
  /** Unique scene identifier (e.g. "SCENE_01_INTAKE") */
  id: string;
  /** Numeric act number (1 to 8) */
  act: number;
  /** Plain-language scene title */
  title: string;
  /** Short summary displayed on the card header */
  subtitle: string;
  /** Target workstation tab to navigate to */
  targetTab: WorkstationTab;
  /** Primary CSS selector to spotlight and point the arrow to */
  targetSelector: string;
  /** Fallback CSS selectors if primary is delayed */
  fallbackSelectors?: string[];
  /** Preferred placement of the caption relative to target */
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  /** Layman-friendly structured narration */
  explanation: LaymanExplanation;
  /** Complete plain-text script read aloud by voice engine */
  spokenScript: string;
  /** Real backend or UI action to execute in this scene */
  autoAction?: "VERIFY_BITSTREAM" | "EXPAND_CONTRADICTION" | "EXCLUDE_AND_RECOMPUTE" | "OPEN_REPORT_MODAL" | "VERIFY_REPORT" | "SWITCH_TAB";
  /** Minimum scene duration in milliseconds (if voice is muted) */
  minDurationMs: number;
  /** Maximum wait duration in milliseconds before entering recovery */
  maxWaitDurationMs: number;
}

export interface PreflightCheckResult {
  id: string;
  label: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "WARNING";
  details?: string;
}

export interface PreflightStatus {
  passed: boolean;
  running: boolean;
  checks: PreflightCheckResult[];
  error?: string;
}

export interface DemoDirectorControls {
  state: DemoState;
  currentSceneIndex: number;
  currentScene: DemoScene | null;
  totalScenes: number;
  progressPercent: number;
  isVoiceActive: boolean;
  voiceEngineName: string;
  isMuted: boolean;
  playbackSpeed: number;
  preflight: PreflightStatus;
  startDemo: () => Promise<void>;
  pauseDemo: () => void;
  resumeDemo: () => void;
  stopDemo: () => void;
  restartDemo: () => void;
  nextScene: () => void;
  prevScene: () => void;
  toggleMute: () => void;
  setSpeed: (speed: number) => void;
  runPreflight: () => Promise<boolean>;
}
