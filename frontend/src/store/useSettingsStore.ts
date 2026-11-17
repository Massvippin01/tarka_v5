import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserRole = "INVESTIGATOR" | "SUPERVISOR" | "ADMIN";
export type UiTheme = "paper" | "dark" | "contrast";
export type UiDensity = "comfortable" | "compact";
export type UiTextSize = "default" | "large" | "compact";
export type UiLanguage = "en" | "hi";

export interface UserProfile {
  name: string;
  rank: string;
  badgeNo: string;
  role: UserRole;
  phone?: string;
  email?: string;
}

export interface StationConfig {
  stationName: string;
  district: string;
  state: string;
  letterheadTitle: string;
  letterheadSubtitle: string;
  defaultIoName: string;
  defaultIoBadge: string;
  showNationalEmblem: boolean;
}

export interface AppearanceConfig {
  theme: UiTheme;
  density: UiDensity;
  textSize: UiTextSize;
  reduceMotion: boolean;
  language: UiLanguage;
}

export interface InvestigationDefaults {
  goldenHourSlaMins: number;
  muleAlertThreshold: number;
  highValueThresholdInr: number;
  currencyFormat: "INR";
  timezone: string;
}

export interface ScoringWeights {
  velocity: number;
  fanOut: number;
  structuring: number;
  accountTenure: number;
}

export interface AiConfig {
  ollamaEndpoint: string;
  defaultModel: string;
  enableVoiceNarration: boolean;
  scoringWeights: ScoringWeights;
}

export interface NotificationPreferences {
  goldenHourAlert: boolean;
  ingestDoneAlert: boolean;
  bankAckAlert: boolean;
  crossFirMatchAlert: boolean;
}

export interface SettingsState {
  profile: UserProfile;
  station: StationConfig;
  appearance: AppearanceConfig;
  investigation: InvestigationDefaults;
  ai: AiConfig;
  notifications: NotificationPreferences;

  // Actions
  setRole: (role: UserRole) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateStation: (patch: Partial<StationConfig>) => void;
  updateAppearance: (patch: Partial<AppearanceConfig>) => void;
  updateInvestigation: (patch: Partial<InvestigationDefaults>) => void;
  updateAi: (patch: Partial<AiConfig>) => void;
  updateScoringWeights: (patch: Partial<ScoringWeights>) => void;
  updateNotifications: (patch: Partial<NotificationPreferences>) => void;
  resetWeightsToDefault: () => void;
  resetAllSettings: () => void;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  velocity: 0.35,
  fanOut: 0.25,
  structuring: 0.20,
  accountTenure: 0.20,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: "Insp. Rajeshwar Rao",
  rank: "Inspector of Police",
  badgeNo: "DL-CY-4091",
  role: "INVESTIGATOR",
  phone: "+91 98102 94812",
  email: "io.rajeshwar@delhipolice.gov.in",
};

export const DEFAULT_STATION: StationConfig = {
  stationName: "Noida Cyber Crime PS, UP",
  district: "Gautam Buddha Nagar",
  state: "Uttar Pradesh",
  letterheadTitle: "CYBER CRIME POLICE STATION",
  letterheadSubtitle: "COMMISSIONERATE GAUTAM BUDDHA NAGAR, UTTAR PRADESH",
  defaultIoName: "Insp. Rajeshwar Rao",
  defaultIoBadge: "UP-CY-4091",
  showNationalEmblem: true,
};

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  theme: "paper",
  density: "comfortable",
  textSize: "default",
  reduceMotion: false,
  language: "en",
};

export const DEFAULT_INVESTIGATION: InvestigationDefaults = {
  goldenHourSlaMins: 180,
  muleAlertThreshold: 75,
  highValueThresholdInr: 100000,
  currencyFormat: "INR",
  timezone: "Asia/Kolkata (IST)",
};

export const DEFAULT_AI: AiConfig = {
  ollamaEndpoint: "http://127.0.0.1:11434",
  defaultModel: "llama3.2:latest",
  enableVoiceNarration: false,
  scoringWeights: { ...DEFAULT_WEIGHTS },
};

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  goldenHourAlert: true,
  ingestDoneAlert: true,
  bankAckAlert: true,
  crossFirMatchAlert: true,
};

/**
 * Checks whether the current active role has permission to perform a sensitive action.
 */
export function hasPermission(
  role: UserRole,
  action: "archive" | "reassign" | "editWeights" | "resetDemo" | "actOnFreeze"
): boolean {
  if (role === "ADMIN") return true;
  if (role === "SUPERVISOR") {
    // Supervisor can archive, reassign, act on freeze, but cannot edit algorithm weights or reset system DB
    return action === "archive" || action === "reassign" || action === "actOnFreeze";
  }
  // Frontline Investigator
  return action === "actOnFreeze";
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      profile: { ...DEFAULT_PROFILE },
      station: { ...DEFAULT_STATION },
      appearance: { ...DEFAULT_APPEARANCE },
      investigation: { ...DEFAULT_INVESTIGATION },
      ai: { ...DEFAULT_AI },
      notifications: { ...DEFAULT_NOTIFICATIONS },

      setRole: (role) =>
        set((state) => ({
          profile: { ...state.profile, role },
        })),

      updateProfile: (patch) =>
        set((state) => ({
          profile: { ...state.profile, ...patch },
        })),

      updateStation: (patch) =>
        set((state) => ({
          station: { ...state.station, ...patch },
        })),

      updateAppearance: (patch) =>
        set((state) => ({
          appearance: { ...state.appearance, ...patch },
        })),

      updateInvestigation: (patch) =>
        set((state) => ({
          investigation: { ...state.investigation, ...patch },
        })),

      updateAi: (patch) =>
        set((state) => ({
          ai: { ...state.ai, ...patch },
        })),

      updateScoringWeights: (patch) =>
        set((state) => ({
          ai: {
            ...state.ai,
            scoringWeights: { ...state.ai.scoringWeights, ...patch },
          },
        })),

      updateNotifications: (patch) =>
        set((state) => ({
          notifications: { ...state.notifications, ...patch },
        })),

      resetWeightsToDefault: () =>
        set((state) => ({
          ai: { ...state.ai, scoringWeights: { ...DEFAULT_WEIGHTS } },
        })),

      resetAllSettings: () =>
        set(() => ({
          profile: { ...DEFAULT_PROFILE },
          station: { ...DEFAULT_STATION },
          appearance: { ...DEFAULT_APPEARANCE },
          investigation: { ...DEFAULT_INVESTIGATION },
          ai: { ...DEFAULT_AI },
          notifications: { ...DEFAULT_NOTIFICATIONS },
        })),
    }),
    {
      name: "tarka-settings-storage",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && window.localStorage
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);
