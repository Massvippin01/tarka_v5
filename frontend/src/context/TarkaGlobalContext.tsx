import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export type TarkaRoute = "intake" | "attribution" | "taint-engine" | "court-proof" | "workstation" | "workflow";

export interface ActiveMutations {
  // 6 Core Forensic Mutations
  alterBankRow14: boolean;            // 1. CBS Ledger balance jump (+₹1,00,000 fraud / conservation failure @ row 14)
  forgeRrnTimestamp: boolean;         // 2. UPI RRN timestamp drift (+15m mismatch with bank CBS clock)
  dropCgnatSourcePort: boolean;       // 3. Drop CGNAT source port, exploding subscriber candidate pool (1 -> 6 -> 41 -> 340)
  triggerHotspotCollision: boolean;   // 4. Wi-Fi hotspot tethering TTL decrement (64 -> 63) & BSSID MAC collision
  injectMerchantCleanDeposit: boolean;// 5. Inject ₹2,50,000 clean commercial deposit to test LIBR vs FIFO divergence
  flipCustodyByte: boolean;           // 6. Flip 1 bit in digital custody ledger, breaking Merkle verification @ seq #4

  // Backward-compatible aliases
  balanceJumpFraud?: boolean;
  cgnatPortCollision?: boolean;
  clockSkewTamper?: boolean;
  ledgerBitFlip?: boolean;
}

export interface StatutoryPeriodInfo {
  code: "GOLDEN_HOUR" | "INTER_BANK_TAINT" | "MAGISTRATE_ATTACHMENT";
  label: string;
  badgeClass: string;
  statutoryRef: string;
  description: string;
  hoursRemaining: number;
}

export interface IntakeGateInvariant {
  id: "I1" | "I2" | "I3" | "I4" | "I5";
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  expectedVsObserved: string;
  executionTimeMs: number;
}

export interface IntakeGateState {
  isHalted: boolean;
  haltedAt?: string;
  invariants: IntakeGateInvariant[];
  totalMs: number;
}

interface TarkaGlobalContextType {
  activeRoute: TarkaRoute;
  setActiveRoute: (route: TarkaRoute) => void;
  activeCaseId: string;
  setActiveCaseId: (caseId: string) => void;
  timeOffsetHours: number;
  setTimeOffsetHours: (hours: number | ((prev: number) => number)) => void;
  clockMinutes: number;
  setClockMinutes: (minutes: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  simulatedDateTimeStr: string;
  statutoryPeriod: StatutoryPeriodInfo;
  mutations: ActiveMutations;
  toggleMutation: (key: keyof ActiveMutations) => void;
  resetAllMutations: () => void;
  activeMutationsCount: number;
  intakeGate: IntakeGateState;
  setIntakeGate: (gate: IntakeGateState | ((prev: IntakeGateState) => IntakeGateState)) => void;
}

const DEFAULT_INTAKE_GATE: IntakeGateState = {
  isHalted: false,
  invariants: [
    { id: "I1", name: "Balance conservation", status: "PASS", expectedVsObserved: "Exact 0.00 error across 6 rows", executionTimeMs: 1.2 },
    { id: "I2", name: "RRN grammar & clock", status: "PASS", expectedVsObserved: "Julian day 265 · Drift +14.0s (±180s)", executionTimeMs: 0.8 },
    { id: "I3", name: "Cross-source agreement", status: "PASS", expectedVsObserved: "Receipt ₹15k vs True CBS ₹2.15L flagged", executionTimeMs: 0.9 },
    { id: "I4", name: "PDF XRef integrity", status: "PASS", expectedVsObserved: "2 %%EOF markers detected (Canva layer)", executionTimeMs: 1.4 },
    { id: "I5", name: "Merkle inclusion & privacy", status: "PASS", expectedVsObserved: "9,996 citizens masked · Root 0xb189...", executionTimeMs: 1.1 },
  ],
  totalMs: 5.4,
};

const DEFAULT_MUTATIONS: ActiveMutations = {
  alterBankRow14: false,
  forgeRrnTimestamp: false,
  dropCgnatSourcePort: false,
  triggerHotspotCollision: false,
  injectMerchantCleanDeposit: false,
  flipCustodyByte: false,
  balanceJumpFraud: false,
  cgnatPortCollision: false,
  clockSkewTamper: false,
  ledgerBitFlip: false,
};

const BASE_INCIDENT_TIMESTAMP = new Date("2026-09-22T09:30:00+05:30").getTime();

const TarkaGlobalContext = createContext<TarkaGlobalContextType | undefined>(undefined);

export const TarkaGlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialRoute = (): TarkaRoute => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") || params.get("screen");
      if (view === "attribution" || path.includes("attribution")) return "attribution";
      if (view === "taint-engine" || view === "taint" || path.includes("taint")) return "taint-engine";
      if (view === "court-proof" || view === "court" || path.includes("court")) return "court-proof";
      if (view === "workstation" || view === "tarka" || path.includes("workstation")) return "workstation";
      if (view === "workflow" || path.includes("workflow")) return "workflow";
      if (view === "intake" || path.includes("intake")) return "intake";
    }
    return "intake";
  };

  const [activeRoute, setActiveRouteState] = useState<TarkaRoute>(getInitialRoute);
  const [activeCaseId, setActiveCaseIdState] = useState<string>("CASE-2026-001");
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(2.5); // T+2.5h default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [mutations, setMutations] = useState<ActiveMutations>(DEFAULT_MUTATIONS);
  const [intakeGate, setIntakeGate] = useState<IntakeGateState>(DEFAULT_INTAKE_GATE);

  const clockMinutes = useMemo(() => Math.round(timeOffsetHours * 60), [timeOffsetHours]);

  const setClockMinutes = useCallback((minutes: number) => {
    setTimeOffsetHours(Math.max(0, Math.min(48, parseFloat((minutes / 60).toFixed(2)))));
  }, []);

  const setActiveRoute = useCallback((route: TarkaRoute) => {
    setActiveRouteState(route);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", route);
      window.history.pushState({}, "", url.toString());
    }
  }, []);

  const setActiveCaseId = useCallback((caseId: string) => {
    setActiveCaseIdState(caseId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("case", caseId);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Playback timer (T+0 to T+48h)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeOffsetHours((prev) => {
        if (prev >= 48) {
          setIsPlaying(false);
          return 48;
        }
        return Math.min(48, parseFloat((prev + 0.25 * playbackSpeed).toFixed(2)));
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const toggleMutation = useCallback((key: keyof ActiveMutations) => {
    setMutations((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };

      // Sync backward-compatible aliases
      if (key === "alterBankRow14") updated.balanceJumpFraud = nextVal;
      if (key === "balanceJumpFraud") updated.alterBankRow14 = nextVal;
      if (key === "dropCgnatSourcePort") updated.cgnatPortCollision = nextVal;
      if (key === "cgnatPortCollision") updated.dropCgnatSourcePort = nextVal;
      if (key === "flipCustodyByte") updated.ledgerBitFlip = nextVal;
      if (key === "ledgerBitFlip") updated.flipCustodyByte = nextVal;

      return updated;
    });
  }, []);

  const resetAllMutations = useCallback(() => {
    setMutations(DEFAULT_MUTATIONS);
  }, []);

  const activeMutationsCount = useMemo(() => {
    const coreKeys: (keyof ActiveMutations)[] = [
      "alterBankRow14",
      "forgeRrnTimestamp",
      "dropCgnatSourcePort",
      "triggerHotspotCollision",
      "injectMerchantCleanDeposit",
      "flipCustodyByte",
    ];
    return coreKeys.filter((k) => mutations[k]).length;
  }, [mutations]);

  // Compute simulated timestamp: Base + Offset hours
  const simulatedDateTimeStr = useMemo(() => {
    const epochMs = BASE_INCIDENT_TIMESTAMP + timeOffsetHours * 3600 * 1000;
    const date = new Date(epochMs);
    return date.toISOString().replace("T", " ").substring(0, 19) + " IST";
  }, [timeOffsetHours]);

  // Statutory legal window calculation
  const statutoryPeriod: StatutoryPeriodInfo = useMemo(() => {
    if (timeOffsetHours <= 2.0) {
      return {
        code: "GOLDEN_HOUR",
        label: "CRITICAL GOLDEN HOUR",
        badgeClass: "bento-badge-coral",
        statutoryRef: "BNSS § 106 & MHA SOP",
        description: "Emergency administrative debit freeze mandatory across Layer-1 & Layer-2 mule accounts.",
        hoursRemaining: Math.max(0, parseFloat((2.0 - timeOffsetHours).toFixed(1))),
      };
    }
    if (timeOffsetHours <= 24.0) {
      return {
        code: "INTER_BANK_TAINT",
        label: "INTER-BANK REQUISITION WINDOW",
        badgeClass: "bento-badge-amber",
        statutoryRef: "Section 106 BNSS 24h Nodal Notice",
        description: "Tracing Layer 2 to Layer 4 mule cashout paths across NPCI Switch & RTGS gateways.",
        hoursRemaining: Math.max(0, parseFloat((24.0 - timeOffsetHours).toFixed(1))),
      };
    }
    return {
      code: "MAGISTRATE_ATTACHMENT",
      label: "STATUTORY COURT ATTACHMENT",
      badgeClass: "bento-badge-blue",
      statutoryRef: "BNSS § 107 Statutory Expiry (48h)",
      description: "Police report & application for formal attachment before Judicial Magistrate First Class.",
      hoursRemaining: Math.max(0, parseFloat((48.0 - timeOffsetHours).toFixed(1))),
    };
  }, [timeOffsetHours]);

  return (
    <TarkaGlobalContext.Provider
      value={{
        activeRoute,
        setActiveRoute,
        activeCaseId,
        setActiveCaseId,
        timeOffsetHours,
        setTimeOffsetHours,
        clockMinutes,
        setClockMinutes,
        isPlaying,
        setIsPlaying,
        playbackSpeed,
        setPlaybackSpeed,
        simulatedDateTimeStr,
        statutoryPeriod,
        mutations,
        toggleMutation,
        resetAllMutations,
        activeMutationsCount,
        intakeGate,
        setIntakeGate,
      }}
    >
      {children}
    </TarkaGlobalContext.Provider>
  );
};

export const useTarkaGlobal = (): TarkaGlobalContextType => {
  const context = useContext(TarkaGlobalContext);
  if (!context) {
    throw new Error("useTarkaGlobal must be used within a TarkaGlobalProvider");
  }
  return context;
};
