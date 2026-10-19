import axios from "axios";
import type {
  ClientEnvironmentReport,
  ContextNegotiateResponse,
  MicPermissionState,
  OperatingContext,
} from "../types/operatingContext";

const API_BASE = "http://localhost:8000/api/v1/context";

export class OperatingContextService {
  private static instance: OperatingContextService | null = null;

  public static getInstance(): OperatingContextService {
    if (!OperatingContextService.instance) {
      OperatingContextService.instance = new OperatingContextService();
    }
    return OperatingContextService.instance;
  }

  /**
   * Safely detect client device/browser capabilities without intrusive hardware fingerprinting.
   */
  public detectClientEnvironment(): ClientEnvironmentReport {
    const hasMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const lang = typeof navigator !== "undefined" ? navigator.language || "en-IN" : "en-IN";

    let micState: MicPermissionState = "NOT_REQUESTED";
    if (!hasMedia) {
      micState = "UNSUPPORTED";
    }

    return {
      client_session_id: typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sentinelx_session_id") || undefined : undefined,
      has_audio_input: hasMedia,
      mic_permission: micState,
      browser_family: typeof navigator !== "undefined" ? navigator.userAgent.split(" ")[0] || "Browser" : "Standard Web Browser",
      preferred_language: lang,
      is_mobile_viewport: isMobile,
    };
  }

  /**
   * Negotiate operating context upon first open or application launch.
   */
  public async negotiateOperatingContext(requestedCaseId?: string): Promise<ContextNegotiateResponse> {
    const report = this.detectClientEnvironment();
    const storedSession = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sentinelx_session_id") : null;

    try {
      const res = await axios.post<ContextNegotiateResponse>(`${API_BASE}/negotiate`, {
        session_id: storedSession || undefined,
        requested_case_id: requestedCaseId || undefined,
        client_report: report,
      });

      if (res.data?.context?.session_id && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("sentinelx_session_id", res.data.context.session_id);
      }

      return res.data;
    } catch (err) {
      console.warn("Operating context negotiation failed, falling back to local defaults:", err);
      // Graceful offline fallback
      const fallbackCtx: OperatingContext = {
        session_id: storedSession || "CTX-LOCAL-OFFLINE",
        is_authenticated: true,
        investigator_id: "usr-delhi-01",
        display_name: "Insp. Vikramaditya (Delhi Cell)",
        badge_number: "POL-DEL-102",
        role: "INVESTIGATOR",
        clearance: "RESTRICTED",
        permissions: ["READ_CASE", "READ_ENTITY", "READ_EVIDENCE", "USE_VOICE"],
        allowed_cases: [
          {
            case_id: "CASE-2026-001",
            title: "Operation Triad Nexus",
            description: "Multi-Source Telecom/ANPR/Hawala cross-jurisdictional syndicate (Golden Case)",
            jurisdiction: "Delhi NCR / Special Cell",
          },
          {
            case_id: "C102",
            title: "Hawala Syndicate - NCR",
            description: "Cross-border illicit hawala money transfer network linking Delhi and Gurugram",
            jurisdiction: "Delhi NCR / Gurugram",
          },
        ],
        jurisdiction_scope: ["Delhi NCR / Special Cell", "Delhi NCR / Gurugram"],
        voice_capability: {
          supported: true,
          transport: "WEBRTC_LIVEKIT",
          stt: "STREAMING_STT",
          languages: ["en-IN", "hi-IN", "hinglish"],
        },
        microphone_state: "NOT_REQUESTED",
        supported_interaction_modes: ["KEYBOARD", "POINTER", "VOICE", "UI_DIRECT"],
        current_case_id: requestedCaseId || null,
        current_route: requestedCaseId ? "command" : "onboarding",
        is_first_open: !requestedCaseId,
        established_at: new Date().toISOString(),
      };

      return {
        context: fallbackCtx,
        onboarding: {
          is_first_open: !requestedCaseId,
          greeting_title: "Welcome to TARKA.",
          greeting_prompt: "What would you like to investigate?",
          action_options: [
            {
              intent_code: "START_INVESTIGATION",
              title: "Start Investigation",
              description: "Initiate a new forensic docket and register formal statutory scope.",
              suggested_action: "CREATE_CASE",
              requires_input: true,
              input_placeholder: "Enter FIR / Crime Case reference (e.g. FIR 182/2026 Special Cell)",
              target_route: "command",
            },
            {
              intent_code: "OPEN_CASE",
              title: "Open Case",
              description: "Access an authorized active docket and explore its intelligence graph.",
              suggested_action: "OPEN_CASE",
              requires_input: false,
              available_targets: fallbackCtx.allowed_cases,
              target_route: "graph",
            },
            {
              intent_code: "SEARCH_ENTITY",
              title: "Search Entity",
              description: "Query suspect, phone identifier, vehicle tag, or bank account.",
              suggested_action: "SEARCH_ENTITY",
              requires_input: true,
              input_placeholder: "Enter phone, plate number, person name, or IMEI",
              target_route: "search",
            },
            {
              intent_code: "REVIEW_EVIDENCE",
              title: "Review Evidence",
              description: "Audit ingested CAS forensic artifacts, verify SHA-256 hashes and custody.",
              suggested_action: "REVIEW_EVIDENCE",
              requires_input: false,
              target_route: "evidence",
            },
            {
              intent_code: "CONTINUE_INVESTIGATION",
              title: "Continue Investigation",
              description: "Resume the last active docket and inspect recent material changes.",
              suggested_action: "CONTINUE_INVESTIGATION",
              requires_input: false,
              available_targets: fallbackCtx.allowed_cases.slice(0, 1),
              target_route: "command",
            },
            {
              intent_code: "OTHER",
              title: "Natural Language Objective",
              description: "State any complex investigative goal via typed query or authorized voice command.",
              suggested_action: "DISPATCH_INTENT",
              requires_input: true,
              input_placeholder: "What would you like to investigate? (e.g. 'Identify connections for phone PH002')",
              target_route: "command",
            },
          ],
          default_case_scope: "CASE-2026-001",
          recommended_intent: "OPEN_CASE",
        },
      };
    }
  }

  /**
   * Activate an authorized investigation scope.
   */
  public async activateCaseScope(
    sessionId: string,
    caseId: string,
    route: string = "command"
  ): Promise<OperatingContext> {
    try {
      const res = await axios.post<OperatingContext>(`${API_BASE}/activate-case`, {
        session_id: sessionId,
        case_id: caseId,
        route,
      });
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("sentinelx_session_active", "true");
        sessionStorage.setItem("sentinelx_case_id", caseId);
      }
      return res.data;
    } catch (err) {
      console.warn("Failed to activate case scope on backend, applying locally:", err);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("sentinelx_session_active", "true");
        sessionStorage.setItem("sentinelx_case_id", caseId);
      }
      return {
        session_id: sessionId,
        is_authenticated: true,
        investigator_id: "usr-delhi-01",
        display_name: "Insp. Vikramaditya (Delhi Cell)",
        badge_number: "POL-DEL-102",
        role: "INVESTIGATOR",
        clearance: "RESTRICTED",
        permissions: ["READ_CASE", "READ_ENTITY", "READ_EVIDENCE"],
        allowed_cases: [],
        jurisdiction_scope: ["Delhi NCR / Special Cell"],
        voice_capability: { supported: true, transport: "WEBRTC_LIVEKIT", stt: "STREAMING_STT", languages: ["en-IN"] },
        microphone_state: "NOT_REQUESTED",
        supported_interaction_modes: ["KEYBOARD", "POINTER", "VOICE", "UI_DIRECT"],
        current_case_id: caseId,
        current_route: route,
        is_first_open: false,
        established_at: new Date().toISOString(),
      };
    }
  }
}
