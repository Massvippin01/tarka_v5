import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { OperatingContext } from "../types/operatingContext";
import { OperatingContextService } from "../services/operatingContextService";
import { commandBus } from "../services/commandBusService";
import { executeUIActions } from "../services/uiActionExecutor";
import type {
  CommandExecutionResult,
  DispatchCommandRequest,
  UIActionType,
} from "../types/command";

export type CanvasMode = "2D" | "3D" | "GIS";
export type RightTab = "dossier" | "gaps" | "hypotheses" | "inspector" | "signals" | "claim" | "impact";
export type RealtimeConnectionState = "LIVE" | "RECONNECTING" | "OFFLINE" | "STALE";

export type NavRoute =
  | "command"
  | "cases"
  | "evidence"
  | "entities"
  | "timeline"
  | "contradictions"
  | "gaps"
  | "proof"
  | "sources"
  | "memory"
  | "reports"
  | "audit"
  | "investigations"
  | "search"
  | "network"
  | "alerts"
  | "watchlists"
  | "analytics"
  | "health"
  | "admin"
  | "help";

export type WorkspaceLens =
  | "Overview"
  | "Network"
  | "Timeline"
  | "Map"
  | "Evidence"
  | "Entities"
  | "Findings";

export type DomainEventType =
  | "ENTITY_SELECTED"
  | "RELATIONSHIP_SELECTED"
  | "EVIDENCE_SELECTED"
  | "EVENT_SELECTED"
  | "LOCATION_SELECTED"
  | "HYPOTHESIS_SELECTED"
  | "CASE_CHANGED"
  | "TIME_RANGE_CHANGED"
  | "FILTER_CHANGED"
  | "GRAPH_EXPANDED"
  | "GRAPH_RESET"
  | "REALTIME_EVENT_RECEIVED"
  | "NAVIGATED";

export interface DomainEvent {
  type: DomainEventType;
  payload: Record<string, any>;
  timestamp: string;
}

export interface NavigationHistoryItem {
  nav: NavRoute;
  lens: WorkspaceLens;
  caseId: string;
  entityId: string | null;
  timestamp: string;
}

export type ExperienceLevel = 0 | 1 | 2 | 3 | 4;

export interface InvestigationContextType {
  activeCaseId: string;
  experienceLevel: ExperienceLevel;
  setExperienceLevel: (level: ExperienceLevel) => void;
  returnToCommandSurface: () => void;
  activeNav: NavRoute;
  activeLens: WorkspaceLens;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  selectedEvidenceId: string | null;
  selectedClaimId: string | null;
  proofDrawerClaimId: string | null;
  activeWorkspaceView: "graph" | "timeline" | "contradictions" | "gaps" | "delta";
  selectedEventId: string | null;
  selectedLocationId: string | null;
  selectedHypothesisId: string | null;
  timeRange: [string, string];
  jurisdiction: string;
  entityFilters: string[];
  relationshipFilters: string[];
  confidenceFilter: number;
  canvasMode: CanvasMode;
  activeRightTab: RightTab;
  copilotOpen: boolean;
  copilotQuery: string;
  dataFreshness: string;
  syntheticDataStatus: boolean;
  realtimeState: RealtimeConnectionState;
  newEvidenceAlert: boolean;
  lastSequenceNumber: number;
  isLeftRailCollapsed: boolean;
  historyStack: NavigationHistoryItem[];
  queryBounds: {
    maxNodes: number;
    jurisdiction: string;
    timeWindow: string;
  };
  lastEvent: DomainEvent | null;
  isOnboarding: boolean;
  operatingContext: OperatingContext | null;
  dismissOnboarding: () => void;
  reopenOnboarding: () => void;

  selectCase: (caseId: string, route?: string) => void;
  selectEntity: (entityId: string) => void;
  selectRelationship: (relId: string) => void;
  selectEvidence: (evidenceId: string) => void;
  selectClaim: (claimId: string | null) => void;
  openProofDrawer: (claimId: string | null) => void;
  setActiveWorkspaceView: (v: "graph" | "timeline" | "contradictions" | "gaps" | "delta") => void;
  selectEvent: (eventId: string, entityId?: string) => void;
  selectLocation: (locationId: string, entityId?: string) => void;
  selectHypothesis: (hypothesisId: string) => void;
  setTimeRange: (range: [string, string]) => void;
  setJurisdiction: (j: string) => void;
  setEntityFilters: (types: string[]) => void;
  setRelationshipFilters: (types: string[]) => void;
  setConfidenceFilter: (conf: number) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setActiveRightTab: (tab: RightTab) => void;
  setActiveNav: (nav: NavRoute) => void;
  setActiveLens: (lens: WorkspaceLens) => void;
  toggleLeftRail: () => void;
  goBack: () => void;
  navigateTo: (nav: NavRoute, lens?: WorkspaceLens) => void;
  toggleCopilot: (open?: boolean) => void;
  runCopilotQuery: (query: string) => void;
  dismissNewEvidenceAlert: () => void;
  dispatchCommand: (req: Partial<DispatchCommandRequest>) => Promise<CommandExecutionResult>;
  dispatchUIAction: (actionType: UIActionType, args?: Record<string, any>) => Promise<CommandExecutionResult>;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const InvestigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const storedSessionActive = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sentinelx_session_active") : null;
  const storedCaseId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sentinelx_case_id") : null;
  const initialCaseParam = initialParams.get("case");

  const hasExistingSession = !!(initialCaseParam || (storedSessionActive === "true" && storedCaseId));

  const initialLevelParam = initialParams.get("level");
  const parsedLevel = initialLevelParam !== null ? parseInt(initialLevelParam, 10) : null;
  const initialExperienceLevel: ExperienceLevel =
    parsedLevel !== null && [0, 1, 2, 3, 4].includes(parsedLevel as any)
      ? (parsedLevel as ExperienceLevel)
      : 0;

  const [experienceLevel, setExperienceLevelState] = useState<ExperienceLevel>(initialExperienceLevel);

  const setExperienceLevel = (level: ExperienceLevel) => {
    setExperienceLevelState(level);
    dispatchEvent("NAVIGATED", { experienceLevel: level });
  };

  const returnToCommandSurface = () => {
    setExperienceLevel(0);
  };

  const [isOnboarding, setIsOnboarding] = useState<boolean>(!hasExistingSession);
  const [operatingContext, setOperatingContext] = useState<OperatingContext | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string>(initialCaseParam || storedCaseId || "CASE-2026-001");

  const [activeNav, setActiveNavState] = useState<NavRoute>(
    (initialParams.get("nav") as NavRoute) || "investigations"
  );
  const [activeLens, setActiveLensState] = useState<WorkspaceLens>(
    (initialParams.get("lens") as WorkspaceLens) || "Network"
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(initialParams.get("entity") || "P001");
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(initialParams.get("rel") || null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(initialParams.get("evidence") || null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initialParams.get("loc") || null);
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>("HYP-001");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [proofDrawerClaimId, setProofDrawerClaimId] = useState<string | null>(null);
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<"graph" | "timeline" | "contradictions" | "gaps" | "delta">("graph");
  const [timeRange, setTimeRangeState] = useState<[string, string]>(["2026-08-01", "2026-08-30"]);
  const [jurisdiction, setJurisdiction] = useState("Delhi NCR / Gurugram");
  const [entityFilters, setEntityFiltersState] = useState<string[]>([]);
  const [relationshipFilters, setRelationshipFiltersState] = useState<string[]>([]);
  const [confidenceFilter, setConfidenceFilterState] = useState<number>(0.0);
  const [canvasMode, setCanvasModeState] = useState<CanvasMode>((initialParams.get("mode") as CanvasMode) || "2D");
  const [activeRightTab, setActiveRightTab] = useState<RightTab>(
    (initialParams.get("tab") as RightTab) || "dossier"
  );
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState("");
  const [lastEvent, setLastEvent] = useState<DomainEvent | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>("LIVE");
  const [newEvidenceAlert, setNewEvidenceAlert] = useState(false);
  const [lastSequenceNumber, setLastSequenceNumber] = useState(1);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
  const [historyStack, setHistoryStack] = useState<NavigationHistoryItem[]>([
    { nav: "investigations", lens: "Network", caseId: "C102", entityId: "P001", timestamp: new Date().toISOString() },
  ]);

  const queryBounds = {
    maxNodes: 500,
    jurisdiction: jurisdiction,
    timeWindow: `${timeRange[0]} to ${timeRange[1]}`,
  };

  // Safe Operating Context & Environment Negotiation
  useEffect(() => {
    const service = OperatingContextService.getInstance();
    service
      .negotiateOperatingContext(hasExistingSession ? (initialCaseParam || storedCaseId || undefined) : undefined)
      .then((res) => {
        setOperatingContext(res.context);
        if (res.context.current_case_id) {
          setActiveCaseId(res.context.current_case_id);
        }
      })
      .catch((err) => console.warn("Context negotiation error:", err));
  }, []);

  // URL Sync Effect

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (activeCaseId) params.set("case", activeCaseId);
    if (activeNav) params.set("nav", activeNav);
    if (activeLens) params.set("lens", activeLens);
    if (selectedEntityId) params.set("entity", selectedEntityId);
    if (selectedRelationshipId) params.set("rel", selectedRelationshipId);
    if (canvasMode) params.set("mode", canvasMode);
    if (activeRightTab) params.set("tab", activeRightTab);
    params.set("level", String(experienceLevel));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [activeCaseId, activeNav, activeLens, selectedEntityId, selectedRelationshipId, canvasMode, activeRightTab, experienceLevel]);

  // Realtime Server-Sent Events (SSE) Listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`http://localhost:8000/api/v1/investigation/events/stream?case_id=${activeCaseId}`);

      eventSource.onopen = () => {
        setRealtimeState("LIVE");
      };

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.sequence_number) {
            setLastSequenceNumber(parsed.sequence_number);
          }
          if (parsed.event_type === "EVIDENCE_ADDED") {
            setNewEvidenceAlert(true);
          }
          dispatchEvent("REALTIME_EVENT_RECEIVED", parsed);
        } catch (err) {
          console.error("Failed to parse SSE event", err);
        }
      };

      eventSource.onerror = () => {
        setRealtimeState("RECONNECTING");
      };
    } catch (e) {
      setRealtimeState("OFFLINE");
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [activeCaseId]);

  const dispatchEvent = (type: DomainEventType, payload: Record<string, any>) => {
    setLastEvent({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  };

  const navigateTo = (nav: NavRoute, lens?: WorkspaceLens) => {
    const targetLens = lens || activeLens;
    setHistoryStack((prev) => [
      ...prev,
      { nav, lens: targetLens, caseId: activeCaseId, entityId: selectedEntityId, timestamp: new Date().toISOString() },
    ]);
    setActiveNavState(nav);
    if (lens) setActiveLensState(lens);
    dispatchEvent("NAVIGATED", { nav, lens: targetLens });
  };

  const goBack = () => {
    if (historyStack.length > 1) {
      const updated = [...historyStack];
      updated.pop(); // remove current state
      const prev = updated[updated.length - 1];
      setHistoryStack(updated);
      setActiveNavState(prev.nav);
      setActiveLensState(prev.lens);
      if (prev.entityId) setSelectedEntityId(prev.entityId);
      if (prev.caseId) setActiveCaseId(prev.caseId);
      dispatchEvent("NAVIGATED", { nav: prev.nav, lens: prev.lens, isBack: true });
    }
  };

  const setActiveNav = (nav: NavRoute) => {
    navigateTo(nav);
  };

  const setActiveLens = (lens: WorkspaceLens) => {
    setActiveLensState(lens);
    // Map lens to canvas mode or tab if needed
    if (lens === "Network") setCanvasModeState("2D");
    else if (lens === "Map") setCanvasModeState("GIS");
  };

  const toggleLeftRail = () => {
    setIsLeftRailCollapsed((prev) => !prev);
  };

  const selectCase = (caseId: string, route: string = "command") => {
    const isDifferentCase = caseId !== activeCaseId;
    setActiveCaseId(caseId);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("sentinelx_session_active", "true");
      sessionStorage.setItem("sentinelx_case_id", caseId);
    }
    if (isDifferentCase) {
      setSelectedEntityId(null);
      setSelectedRelationshipId(null);
      setSelectedEvidenceId(null);
      setSelectedClaimId(null);
      setSelectedEventId(null);
      setSelectedLocationId(null);
      setEntityFiltersState([]);
      setRelationshipFiltersState([]);
    }
    if (route === "focus") {
      setExperienceLevel(1);
    } else if (route === "graph") {
      setActiveNavState("network");
      setActiveWorkspaceView("graph");
      setActiveLensState("Network");
      setExperienceLevel(2);
    } else if (route === "evidence") {
      setActiveNavState("evidence");
      setActiveLensState("Evidence");
      setExperienceLevel(2);
    } else if (route === "search") {
      setActiveNavState("search");
      setExperienceLevel(2);
    } else {
      setActiveNavState("command");
    }
    setIsOnboarding(false);
    dispatchEvent("CASE_CHANGED", { caseId, route, resetScope: isDifferentCase });
  };

  const dismissOnboarding = () => {
    setIsOnboarding(false);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("sentinelx_session_active", "true");
    }
  };

  const reopenOnboarding = () => {
    setIsOnboarding(true);
  };


  const selectEntity = (entityId: string) => {
    setSelectedEntityId(entityId);
    setSelectedRelationshipId(null);
    setActiveRightTab("dossier");
    dispatchEvent("ENTITY_SELECTED", { entityId });
  };

  const selectRelationship = (relId: string) => {
    setSelectedRelationshipId(relId);
    setActiveRightTab("inspector");
    dispatchEvent("RELATIONSHIP_SELECTED", { relId });
  };

  const selectEvidence = (evidenceId: string) => {
    setSelectedEvidenceId(evidenceId);
    setActiveRightTab("gaps");
    dispatchEvent("EVIDENCE_SELECTED", { evidenceId });
  };

  const selectEvent = (eventId: string, entityId?: string) => {
    setSelectedEventId(eventId);
    if (entityId) {
      setSelectedEntityId(entityId);
      setActiveRightTab("dossier");
    }
    dispatchEvent("EVENT_SELECTED", { eventId, entityId });
  };

  const selectLocation = (locationId: string, entityId?: string) => {
    setSelectedLocationId(locationId);
    if (entityId) {
      setSelectedEntityId(entityId);
      setActiveRightTab("dossier");
    }
    dispatchEvent("LOCATION_SELECTED", { locationId, entityId });
  };

  const selectHypothesis = (hypothesisId: string) => {
    setSelectedHypothesisId(hypothesisId);
    setActiveRightTab("gaps");
    dispatchEvent("HYPOTHESIS_SELECTED", { hypothesisId });
  };

  const setTimeRange = (range: [string, string]) => {
    setTimeRangeState(range);
    dispatchEvent("TIME_RANGE_CHANGED", { timeRange: range });
  };

  const setEntityFilters = (types: string[]) => {
    setEntityFiltersState(types);
    dispatchEvent("FILTER_CHANGED", { entityFilters: types });
  };

  const setRelationshipFilters = (types: string[]) => {
    setRelationshipFiltersState(types);
    dispatchEvent("FILTER_CHANGED", { relationshipFilters: types });
  };

  const setConfidenceFilter = (conf: number) => {
    setConfidenceFilterState(conf);
    dispatchEvent("FILTER_CHANGED", { confidenceFilter: conf });
  };

  const setCanvasMode = (mode: CanvasMode) => {
    setCanvasModeState(mode);
  };

  const runCopilotQuery = (q: string) => {
    setCopilotQuery(q);
    setCopilotOpen(true);
  };

  const toggleCopilot = (open?: boolean) => {
    setCopilotOpen(open !== undefined ? open : !copilotOpen);
  };

  const dismissNewEvidenceAlert = () => {
    setNewEvidenceAlert(false);
  };

  const dispatchCommand = useCallback(
    async (req: Partial<DispatchCommandRequest>): Promise<CommandExecutionResult> => {
      const fullReq: DispatchCommandRequest = {
        source: req.source || "UI",
        intent: req.intent || "OPEN_GRAPH",
        case_id: req.case_id || activeCaseId,
        selected_entity_id: req.selected_entity_id !== undefined ? req.selected_entity_id : selectedEntityId,
        selected_claim_id: req.selected_claim_id !== undefined ? req.selected_claim_id : selectedClaimId,
        arguments: req.arguments || {},
        requested_actions: req.requested_actions,
        risk_class: req.risk_class || "READ",
        confirmation_token: req.confirmation_token,
        correlation_id: req.correlation_id,
      };

      const result = await commandBus.dispatch(fullReq);
      if (result.ui_actions && result.ui_actions.length > 0) {
        executeUIActions(result.ui_actions, {
          selectCase,
          selectEntity,
          selectRelationship,
          selectEvidence,
          selectClaim: (claimId: string | null) => {
            setSelectedClaimId(claimId);
            if (claimId) setActiveRightTab("claim");
          },
          openProofDrawer: (claimId: string | null) => {
            setProofDrawerClaimId(claimId);
          },
          setActiveWorkspaceView,
          setActiveNav,
          setActiveLens,
          setActiveRightTab,
          setEntityFilters,
          toggleCopilot,
          setExperienceLevel,
          returnToCommandSurface,
        });
      }
      return result;
    },
    [
      activeCaseId,
      selectedEntityId,
      selectedClaimId,
      selectCase,
      selectEntity,
      selectRelationship,
      selectEvidence,
      setActiveWorkspaceView,
      setActiveNav,
      setActiveLens,
      setActiveRightTab,
      setEntityFilters,
      toggleCopilot,
      setExperienceLevel,
      returnToCommandSurface,
    ]
  );

  const dispatchUIAction = useCallback(
    async (actionType: UIActionType, args: Record<string, any> = {}): Promise<CommandExecutionResult> => {
      return dispatchCommand({
        source: "UI",
        intent: actionType,
        requested_actions: [actionType],
        arguments: args,
      });
    },
    [dispatchCommand]
  );

  return (
    <InvestigationContext.Provider
      value={{
        activeCaseId,
        experienceLevel,
        setExperienceLevel,
        returnToCommandSurface,
        activeNav,
        activeLens,
        selectedEntityId,
        selectedRelationshipId,
        selectedEvidenceId,
        selectedEventId,
        selectedLocationId,
        selectedHypothesisId,
        timeRange,
        jurisdiction,
        entityFilters,
        relationshipFilters,
        confidenceFilter,
        canvasMode,
        activeRightTab,
        copilotOpen,
        copilotQuery,
        dataFreshness: "CURRENT (SYNTHETIC SIMULATION)",
        syntheticDataStatus: true,
        realtimeState,
        newEvidenceAlert,
        lastSequenceNumber,
        isLeftRailCollapsed,
        historyStack,
        queryBounds,
        lastEvent,
        selectedClaimId,
        proofDrawerClaimId,
        activeWorkspaceView,
        isOnboarding,
        operatingContext,
        dismissOnboarding,
        reopenOnboarding,

        selectCase,
        selectEntity,
        selectRelationship,
        selectEvidence,
        selectClaim: (claimId: string | null) => {
          setSelectedClaimId(claimId);
          if (claimId) setActiveRightTab("claim");
        },
        openProofDrawer: (claimId: string | null) => {
          setProofDrawerClaimId(claimId);
        },
        setActiveWorkspaceView,
        selectEvent,
        selectLocation,
        selectHypothesis,
        setTimeRange,
        setJurisdiction,
        setEntityFilters,
        setRelationshipFilters,
        setConfidenceFilter,
        setCanvasMode,
        setActiveRightTab,
        setActiveNav,
        setActiveLens,
        toggleLeftRail,
        goBack,
        navigateTo,
        toggleCopilot,
        runCopilotQuery,
        dismissNewEvidenceAlert,
        dispatchCommand,
        dispatchUIAction,
      }}
    >
      {children}
    </InvestigationContext.Provider>
  );
};

export const useInvestigation = () => {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error("useInvestigation must be used within an InvestigationProvider");
  }
  return context;
};

