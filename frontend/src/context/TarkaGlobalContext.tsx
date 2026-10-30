import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export type TarkaRoute = "intake" | "attribution" | "taint-engine" | "court-proof" | "workstation" | "workflow";

export interface ActiveMutations {
  balanceJumpFraud: boolean;      // Injects +₹1,00,000 fraud jump into CBS Ledger
  cgnatPortCollision: boolean;    // Injects port collision, widening CGNAT candidates from 1 to 6
  clockSkewTamper: boolean;       // Rolls back handset clock by -14m, triggering Z3 SMT unsat
  ledgerBitFlip: boolean;         // Alters 1 byte in custody ledger, breaking Merkle hash @ seq #4
}

export interface StatutoryPeriodInfo {
  code: "GOLDEN_HOUR" | "INTER_BANK_TAINT" | "MAGISTRATE_ATTACHMENT";
  label: string;
  badgeClass: string;
  statutoryRef: string;
  description: string;
  hoursRemaining: number;
}

interface TarkaGlobalContextType {
  activeRoute: TarkaRoute;
  setActiveRoute: (route: TarkaRoute) => void;
  activeCaseId: string;
  setActiveCaseId: (caseId: string) => void;
  timeOffsetHours: number;
  setTimeOffsetHours: (hours: number | ((prev: number) => number)) => void;
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
}

const DEFAULT_MUTATIONS: ActiveMutations = {
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
    setMutations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const resetAllMutations = useCallback(() => {
    setMutations(DEFAULT_MUTATIONS);
  }, []);

  const activeMutationsCount = useMemo(() => {
    return Object.values(mutations).filter(Boolean).length;
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
        badgeClass: "lg-badge-coral",
        statutoryRef: "BNSS § 106 & MHA SOP",
        description: "Emergency administrative debit freeze mandatory across Layer-1 & Layer-2 mule accounts.",
        hoursRemaining: Math.max(0, parseFloat((2.0 - timeOffsetHours).toFixed(1))),
      };
    }
    if (timeOffsetHours <= 24.0) {
      return {
        code: "INTER_BANK_TAINT",
        label: "INTER-BANK REQUISITION WINDOW",
        badgeClass: "lg-badge-amber",
        statutoryRef: "Section 106 BNSS 24h Nodal Notice",
        description: "Tracing Layer 2 to Layer 4 mule cashout paths across NPCI Switch & RTGS gateways.",
        hoursRemaining: Math.max(0, parseFloat((24.0 - timeOffsetHours).toFixed(1))),
      };
    }
    return {
      code: "MAGISTRATE_ATTACHMENT",
      label: "STATUTORY COURT ATTACHMENT",
      badgeClass: "lg-badge-blue",
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
