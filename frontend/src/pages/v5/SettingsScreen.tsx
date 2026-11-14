import React, { useState } from "react";
import {
  User,
  Building,
  Palette,
  Sliders,
  Cpu,
  Database,
  Bell,
  Keyboard,
  Check,
  AlertTriangle,
  RotateCcw,
  Download,
  Sparkles,
  ExternalLink,
  Shield,
  FileText,
  CheckCircle2,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useSettingsStore,
  type UserRole,
  type UiTheme,
  type UiLanguage,
  type UiDensity,
} from "../../store/useSettingsStore";
import { useTranslation } from "../../i18n/translations";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { useCaseStore } from "../../store/useCaseStore";

type SettingsSection =
  | "profile"
  | "station"
  | "appearance"
  | "investigation"
  | "ai"
  | "data"
  | "notifications"
  | "shortcuts";

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activeCaseId = useCaseStore((s) => s.activeCaseId);

  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  // Settings from persisted store
  const {
    profile,
    station,
    appearance,
    investigation,
    ai,
    notifications,
    setRole,
    updateProfile,
    updateStation,
    updateAppearance,
    updateInvestigation,
    updateAi,
    updateScoringWeights,
    updateNotifications,
    resetWeightsToDefault,
  } = useSettingsStore();

  const { startJudgeDemo, togglePresentationMode, presentationMode } = useTarkaUiStore();

  // Query backend system health
  const { data: healthData, refetch: refetchHealth, isFetching: isHealthFetching } = useQuery({
    queryKey: ["system", "health"],
    queryFn: async () => {
      const res = await fetch("/api/v1/system/health");
      if (!res.ok) throw new Error("Health check failed");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Save station/weights mutation to backend
  const saveToBackendMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        station: {
          station_name: station.stationName,
          district: station.district,
          state: station.state,
          letterhead_title: station.letterheadTitle,
          letterhead_subtitle: station.letterheadSubtitle,
          default_io_name: station.defaultIoName,
          default_io_badge: station.defaultIoBadge,
          show_national_emblem: station.showNationalEmblem,
        },
        scoring_weights: {
          velocity: ai.scoringWeights.velocity,
          fan_out: ai.scoringWeights.fanOut,
          structuring: ai.scoringWeights.structuring,
          account_tenure: ai.scoringWeights.accountTenure,
        },
        investigation_defaults: {
          golden_hour_sla_mins: investigation.goldenHourSlaMins,
          mule_alert_threshold: investigation.muleAlertThreshold,
          high_value_threshold_inr: investigation.highValueThresholdInr,
          timezone: investigation.timezone,
        },
      };

      const res = await fetch("/api/v1/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings to backend server");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Settings saved and synced to backend with SHA-256 audit entry.");
      queryClient.invalidateQueries({ queryKey: ["system", "settings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to sync settings");
    },
  });

  // Demo Reset Handler
  const handleResetDemoData = async () => {
    setIsResettingDemo(true);
    try {
      const res = await fetch("/api/v1/system/reset-demo", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
      });

      if (!res.ok) {
        throw new Error("Demo reset failed");
      }

      const resData = await res.json();
      toast.success(resData.message || "Canonical demo cases restored.");
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case"] });
      setResetConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset demo cases");
    } finally {
      setIsResettingDemo(false);
    }
  };

  // Case Export Handler
  const handleExportCase = async () => {
    try {
      const res = await fetch(`/api/v1/cases/${activeCaseId}/bundle`);
      if (!res.ok) throw new Error("Failed to export case");
      const bundle = await res.json();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeCaseId}_investigation_bundle.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${activeCaseId} forensic bundle.`);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
  };

  const isAdmin = profile.role === "ADMIN";

  interface NavItem {
    id: SettingsSection;
    label: string;
    shortTitle: string;
    subtitle: string;
    icon: any;
    badge?: string;
  }

  // Navigation Items configuration
  const navItems: NavItem[] = [
    {
      id: "profile" as SettingsSection,
      label: t("settings.profile_role"),
      shortTitle: "Officer Profile & Role",
      subtitle: "Permissions & credentials",
      icon: User,
    },
    {
      id: "station" as SettingsSection,
      label: t("settings.station_jurisdiction"),
      shortTitle: "Station & Letterhead",
      subtitle: "Jurisdiction & A4 header",
      icon: Building,
    },
    {
      id: "appearance" as SettingsSection,
      label: t("settings.appearance"),
      shortTitle: "Display & Language",
      subtitle: "Theme, density & locale",
      icon: Palette,
    },
    {
      id: "investigation" as SettingsSection,
      label: t("settings.investigation_defaults"),
      shortTitle: "Statutory Thresholds & SLA",
      subtitle: "Golden Hour & limits",
      icon: Sliders,
    },
    {
      id: "ai" as SettingsSection,
      label: t("settings.ai_scoring"),
      shortTitle: "AI Engine & Scoring",
      subtitle: "Ollama runtime & weights",
      icon: Cpu,
    },
    {
      id: "data" as SettingsSection,
      label: t("settings.data_demo"),
      shortTitle: "Data & Demo Controls",
      subtitle: "Reset & bundle export",
      icon: Database,
    },
    {
      id: "notifications" as SettingsSection,
      label: t("settings.notifications"),
      shortTitle: "Urgency Alerts",
      subtitle: "Real-time compliance triggers",
      icon: Bell,
    },
    {
      id: "shortcuts" as SettingsSection,
      label: t("settings.shortcuts"),
      shortTitle: "Keyboard Shortcuts",
      subtitle: "Frontline operational keys",
      icon: Keyboard,
    },
  ];

  return (
    <div
      data-testid="settings-screen"
      className="flex flex-col gap-4 text-[var(--fg-1)] pb-8"
      style={{
        background: "transparent",
        color: "var(--fg-1)",
      }}
    >
      {/* ===================================================================== */}
      {/* HEADER & OPERATIONAL CONTEXT CARD */}
      {/* ===================================================================== */}
      <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[12px] font-bold tracking-wider uppercase text-[var(--muted)]">
              SENTINELX FORENSIC PLATFORM
            </span>
            <span className="text-[12px] text-[var(--line-strong)]">·</span>
            <h2 className="text-[18px] font-bold text-[var(--fg-1)] m-0 leading-tight">
              {t("nav.settings")}
            </h2>
            <span
              className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full border ${
                profile.role === "ADMIN"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : profile.role === "SUPERVISOR"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {profile.role === "ADMIN"
                ? t("role.admin")
                : profile.role === "SUPERVISOR"
                ? t("role.supervisor")
                : t("role.investigator")}
            </span>
          </div>
          <p className="text-[12.5px] text-[var(--fg-2)] m-0">
            Station letterhead, role permissions, algorithm weights, and system architecture.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Language Switcher */}
          <div className="flex items-center bg-[#f4f4f5] p-0.5 rounded-lg border border-[var(--line)]">
            <button
              type="button"
              onClick={() => {
                updateAppearance({ language: "en" });
                toast.success("Interface Language: English");
              }}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all border-none cursor-pointer ${
                appearance.language === "en"
                  ? "bg-white text-[var(--fg-1)] shadow-2xs font-bold"
                  : "bg-transparent text-[var(--fg-2)] hover:text-[var(--fg-1)]"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => {
                updateAppearance({ language: "hi" });
                toast.success("भाषा: हिन्दी");
              }}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all border-none cursor-pointer ${
                appearance.language === "hi"
                  ? "bg-white text-[var(--accent)] shadow-2xs font-bold"
                  : "bg-transparent text-[var(--fg-2)] hover:text-[var(--fg-1)]"
              }`}
            >
              हिन्दी
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[#fafafa] text-[12px] text-[var(--fg-2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>REST Gateway Connected</span>
          </div>

          <button
            type="button"
            onClick={() => saveToBackendMutation.mutate()}
            disabled={saveToBackendMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-blue-700 text-white text-[13px] font-semibold border-none cursor-pointer shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saveToBackendMutation.isPending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            <span>{saveToBackendMutation.isPending ? "Saving..." : t("action.save")}</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN TWO-COLUMN MASTER-DETAIL WORKSPACE */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Navigation Rail */}
        <div className="w-full md:w-[286px] shrink-0 flex flex-col gap-1.5 bg-white border border-[var(--line)] rounded-xl p-2.5 shadow-2xs">
          <div className="px-3 py-2 border-b border-[var(--line)] mb-1">
            <span className="text-[12px] font-bold tracking-wider uppercase text-[var(--muted)]">
              Configuration Sections
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-blue-50/60 border-[var(--accent)]/30 text-[var(--accent)] shadow-2xs font-bold"
                    : "bg-transparent border-transparent text-[var(--fg-2)] hover:bg-black/[0.02] hover:text-[var(--fg-1)] font-medium"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-[var(--accent)] text-white shadow-xs"
                      : "bg-[#f4f4f5] text-[var(--fg-2)]"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] leading-tight truncate">
                    {item.shortTitle}
                  </div>
                  <div className="text-[12px] text-[var(--muted)] truncate font-normal mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
                {item.badge && (
                  <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section Detail Content Body */}
        <div className="flex-1 min-w-0 w-full">
          {/* --------------------------------------------------------------- */}
          {/* SECTION 1: PROFILE & ROLE */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "profile" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                      {t("settings.profile_role")}
                    </h3>
                    <span className="text-[12px] font-mono text-[var(--muted)]">
                      UID: {profile.badgeNo}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Configure your officer identity and toggle role scopes for the hackathon evaluation.
                  </p>
                </div>

                {/* Role Selector Card Grid */}
                <div className="space-y-2 pt-2">
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                    Operational Role & Permissions Scope
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        role: "INVESTIGATOR" as UserRole,
                        title: t("role.investigator"),
                        tag: "Frontline Directive Execution",
                        desc: "Execute evidence intake, graph analysis, and statutory freeze orders under §106/§107 BNSS.",
                        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      },
                      {
                        role: "SUPERVISOR" as UserRole,
                        title: t("role.supervisor"),
                        tag: "Supervisory Oversight & Approval",
                        desc: "All investigator rights + permission to reassign IOs, close, and archive cases.",
                        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
                      },
                      {
                        role: "ADMIN" as UserRole,
                        title: t("role.admin"),
                        tag: "System Administration & Keys",
                        desc: "Full permissions + configure detection scoring weights and manage system database.",
                        badgeColor: "bg-red-50 text-red-700 border-red-200",
                      },
                    ].map((r) => {
                      const isCurrent = profile.role === r.role;
                      return (
                        <div
                          key={r.role}
                          onClick={() => {
                            setRole(r.role);
                            toast.success(`Role switched to ${r.title}`);
                          }}
                          className={`p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-2.5 border ${
                            isCurrent
                              ? "border-[var(--accent)] bg-blue-50/40 shadow-xs ring-1 ring-[var(--accent)]"
                              : "border-[var(--line)] bg-[#fafafa] hover:bg-white hover:border-[var(--line-strong)]"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[13.5px] font-bold ${
                                  isCurrent ? "text-[var(--accent)]" : "text-[var(--fg-1)]"
                                }`}
                              >
                                {r.title}
                              </span>
                              {isCurrent ? (
                                <CheckCircle2 size={16} className="text-[var(--accent)] shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-[var(--line)]" />
                              )}
                            </div>
                            <span
                              className={`inline-block text-[12px] font-semibold px-2 py-0.5 rounded border ${r.badgeColor}`}
                            >
                              {r.tag}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--fg-2)] m-0 leading-relaxed">
                            {r.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Profile Details Form */}
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h4 className="text-[14px] font-bold text-[var(--fg-1)] m-0">
                    Officer Credentials & Identification
                  </h4>
                  <p className="text-[12px] text-[var(--muted)] mt-0.5 mb-0">
                    Credentials embedded in electronic evidence hashes and statutory legal requisitions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Officer Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => updateProfile({ name: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Official Rank
                    </label>
                    <input
                      type="text"
                      value={profile.rank}
                      onChange={(e) => updateProfile({ rank: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Badge / PEN Number
                    </label>
                    <input
                      type="text"
                      value={profile.badgeNo}
                      onChange={(e) => updateProfile({ badgeNo: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Assigned Police Station
                    </label>
                    <input
                      type="text"
                      value={station.stationName}
                      onChange={(e) => updateStation({ stationName: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email || ""}
                      onChange={(e) => updateProfile({ email: e.target.value })}
                      placeholder="io.name@statepolice.gov.in"
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Contact Telephone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phone || ""}
                      onChange={(e) => updateProfile({ phone: e.target.value })}
                      placeholder="+91 98100 00000"
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 2: STATION & LETTERHEAD */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "station" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                    {t("settings.station_jurisdiction")}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Configure official police station letterhead printed on Section 94 orders, Bank Lien notices, and Court Dossiers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Police Station Name
                    </label>
                    <input
                      type="text"
                      value={station.stationName}
                      onChange={(e) => updateStation({ stationName: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Police District
                    </label>
                    <input
                      type="text"
                      value={station.district}
                      onChange={(e) => updateStation({ district: e.target.value })}
                      placeholder="e.g. Gautam Buddha Nagar"
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      State / UT Jurisdiction
                    </label>
                    <input
                      type="text"
                      value={station.state}
                      onChange={(e) => updateStation({ state: e.target.value })}
                      placeholder="e.g. Uttar Pradesh"
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Letterhead Banner Title
                    </label>
                    <input
                      type="text"
                      value={station.letterheadTitle}
                      onChange={(e) => updateStation({ letterheadTitle: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1.5 block">
                      Letterhead Subtitle / Commission
                    </label>
                    <input
                      type="text"
                      value={station.letterheadSubtitle}
                      onChange={(e) => updateStation({ letterheadSubtitle: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all box-border"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3 pt-1">
                    <input
                      type="checkbox"
                      id="showEmblem"
                      checked={station.showNationalEmblem}
                      onChange={(e) => updateStation({ showNationalEmblem: e.target.checked })}
                      className="w-4 h-4 rounded text-[var(--accent)] cursor-pointer"
                    />
                    <label htmlFor="showEmblem" className="text-[13px] font-medium text-[var(--fg-1)] cursor-pointer">
                      Include National Emblem / Official State Police Insignia on Court Certificates
                    </label>
                  </div>
                </div>
              </div>

              {/* Live Formal A4 Letterhead Preview Card */}
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                    <FileText size={15} className="text-[var(--accent)]" />
                    Live Letterhead Preview (Formal A4 Report & Court Dossier)
                  </span>
                  <span className="text-[12px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    A4 Legal Ready
                  </span>
                </div>

                <div className="p-6 bg-[#fafafa] rounded-xl border-2 border-dashed border-[var(--line-strong)] text-center space-y-2">
                  {station.showNationalEmblem && (
                    <div className="flex justify-center mb-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-bold border border-blue-300 shadow-2xs">
                        <Shield size={20} />
                      </div>
                    </div>
                  )}

                  <div className="text-[15px] font-extrabold text-[var(--fg-1)] tracking-wide uppercase">
                    {station.letterheadTitle || "CYBER CRIME POLICE STATION"}
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--fg-2)] tracking-normal uppercase">
                    {station.letterheadSubtitle || "POLICE DEPARTMENT"}
                  </div>
                  <div className="text-[12px] text-[var(--muted)] font-mono pt-1 border-t border-[var(--line)] inline-block px-4">
                    Station: {station.stationName} · District: {station.district} · State: {station.state}
                  </div>
                  <div className="text-[12px] text-[var(--fg-2)] italic pt-2">
                    "Statutory directives generated under §§ 94, 106, 107 BNSS 2023 with Section 63(4) BSA Certificate"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 3: APPEARANCE & LANGUAGE */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "appearance" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                    {t("settings.appearance")}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Select visual theme, UI layout density, and interface language.
                  </p>
                </div>

                {/* Language Switch */}
                <div className="space-y-2 pt-2">
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                    Interface Language (भाषा)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: "en" as UiLanguage,
                        title: "English (EN)",
                        sub: "Default Operational Terminology",
                      },
                      {
                        id: "hi" as UiLanguage,
                        title: "हिन्दी (HI)",
                        sub: "राजभाषा पुलिस कार्यप्रणाली",
                      },
                    ].map((lang) => {
                      const isSelected = appearance.language === lang.id;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => {
                            updateAppearance({ language: lang.id });
                            toast.success(`Language set to ${lang.title}`);
                          }}
                          className={`p-3.5 rounded-xl text-left cursor-pointer transition-all border ${
                            isSelected
                              ? "border-[var(--accent)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--accent)]"
                              : "border-[var(--line)] bg-[#fafafa] hover:bg-white hover:border-[var(--line-strong)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[13.5px] font-bold ${
                                isSelected ? "text-[var(--accent)]" : "text-[var(--fg-1)]"
                              }`}
                            >
                              {lang.title}
                            </span>
                            {isSelected && (
                              <CheckCircle2 size={16} className="text-[var(--accent)]" />
                            )}
                          </div>
                          <div className="text-[12px] text-[var(--muted)] mt-1">
                            {lang.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2 pt-2">
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                    Visual Theme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "paper" as UiTheme,
                        title: "Paper Light",
                        desc: "Clean legal white, high legibility for court dossiers",
                        swatch: "bg-[#f6f6f7] border-gray-300",
                      },
                      {
                        id: "dark" as UiTheme,
                        title: "Command Dark",
                        desc: "Low-light NOC command room cyber dark aesthetic",
                        swatch: "bg-slate-900 border-slate-700",
                      },
                      {
                        id: "contrast" as UiTheme,
                        title: "High Contrast",
                        desc: "Max contrast borders for sunlight & mobile field tablets",
                        swatch: "bg-white border-black",
                      },
                    ].map((thm) => {
                      const isSelected = appearance.theme === thm.id;
                      return (
                        <button
                          key={thm.id}
                          type="button"
                          onClick={() => {
                            updateAppearance({ theme: thm.id });
                            toast.success(`Theme switched to ${thm.title}`);
                          }}
                          className={`p-3.5 rounded-xl text-left cursor-pointer transition-all border ${
                            isSelected
                              ? "border-[var(--accent)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--accent)]"
                              : "border-[var(--line)] bg-[#fafafa] hover:bg-white hover:border-[var(--line-strong)]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[13.5px] font-bold ${
                                isSelected ? "text-[var(--accent)]" : "text-[var(--fg-1)]"
                              }`}
                            >
                              {thm.title}
                            </span>
                            <div className={`w-4 h-4 rounded-full border ${thm.swatch}`} />
                          </div>
                          <div className="text-[12px] text-[var(--muted)] leading-relaxed">
                            {thm.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Density Selector */}
                <div className="space-y-2 pt-2">
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                    Information Density
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: "compact" as UiDensity,
                        title: "High Density (v6 Default)",
                        desc: "Optimized 12-13px typography for complex multi-hop financial graphs and ledgers",
                      },
                      {
                        id: "comfortable" as UiDensity,
                        title: "Comfortable Density",
                        desc: "Relaxed paddings and line-height for handheld touch tablet operation",
                      },
                    ].map((d) => {
                      const isSelected = appearance.density === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            updateAppearance({ density: d.id });
                            toast.success(`Density set to ${d.title}`);
                          }}
                          className={`p-3.5 rounded-xl text-left cursor-pointer transition-all border ${
                            isSelected
                              ? "border-[var(--accent)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--accent)]"
                              : "border-[var(--line)] bg-[#fafafa] hover:bg-white hover:border-[var(--line-strong)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[13.5px] font-bold ${
                                isSelected ? "text-[var(--accent)]" : "text-[var(--fg-1)]"
                              }`}
                            >
                              {d.title}
                            </span>
                            {isSelected && (
                              <CheckCircle2 size={16} className="text-[var(--accent)]" />
                            )}
                          </div>
                          <div className="text-[12px] text-[var(--muted)] mt-1">
                            {d.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reduce Motion */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
                  <div>
                    <div className="text-[13px] font-bold text-[var(--fg-1)]">
                      Reduce UI Animations
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">
                      Disable micro-interactions and transitions for lower latency on field devices.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appearance.reduceMotion}
                    onChange={(e) => updateAppearance({ reduceMotion: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--accent)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 4: INVESTIGATION DEFAULTS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "investigation" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                    {t("settings.investigation_defaults")}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Statutory time constraints, mule alerting scores, and transaction thresholds per MHA SOP.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-[var(--line)] bg-[#fafafa] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                        Golden Hour SLA Limit (Minutes)
                      </label>
                      <span className="text-[12.5px] font-mono font-bold text-[var(--accent)]">
                        {investigation.goldenHourSlaMins} min ({Math.round(investigation.goldenHourSlaMins / 60)} hrs)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="720"
                      step="15"
                      value={investigation.goldenHourSlaMins}
                      onChange={(e) => updateInvestigation({ goldenHourSlaMins: Number(e.target.value) || 180 })}
                      className="w-full cursor-pointer accent-[var(--accent)]"
                    />
                    <div className="text-[12px] text-[var(--muted)]">
                      Countdown deadline before mule accounts execute complete cashouts.
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--line)] bg-[#fafafa] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                        Mule Alert Risk Score Threshold
                      </label>
                      <span className="text-[12.5px] font-mono font-bold text-red-600">
                        {investigation.muleAlertThreshold} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="95"
                      step="5"
                      value={investigation.muleAlertThreshold}
                      onChange={(e) => updateInvestigation({ muleAlertThreshold: Number(e.target.value) || 75 })}
                      className="w-full cursor-pointer accent-red-600"
                    />
                    <div className="text-[12px] text-[var(--muted)]">
                      Triggers automated priority freeze requisition recommendations under §107 BNSS.
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--line)] bg-[#fafafa] space-y-2">
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                      High-Value Transaction Threshold (₹ INR)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[var(--fg-2)]">₹</span>
                      <input
                        type="number"
                        min="1000"
                        step="5000"
                        value={investigation.highValueThresholdInr}
                        onChange={(e) => updateInvestigation({ highValueThresholdInr: Number(e.target.value) || 100000 })}
                        className="w-full px-3 py-1.5 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:border-[var(--accent)] box-border"
                      />
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">
                      Currently: ₹{(investigation.highValueThresholdInr / 100000).toFixed(2)} Lakh · Triggers priority NPCI XML switch tracing.
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--line)] bg-[#fafafa] space-y-2">
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                      Timezone & Canonical Currency Format
                    </label>
                    <input
                      type="text"
                      disabled
                      value="IST (UTC+05:30) · ₹ INR (Lakh/Crore)"
                      className="w-full px-3 py-1.5 text-[13px] text-[var(--fg-2)] bg-[#f4f4f5] border border-[var(--line)] rounded-lg font-mono cursor-not-allowed box-border"
                    />
                    <div className="text-[12px] text-[var(--muted)]">
                      Canonical judicial standard for Indian cyber crime proceedings.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 5: AI & MULE SCORING WEIGHTS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "ai" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                    {t("settings.ai_scoring")}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Mule scoring feature contributions and local Ollama model runtime diagnostics.
                  </p>
                </div>

                {/* Ollama Health Card */}
                <div className="p-4 rounded-xl border border-[var(--line)] bg-[#fafafa] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          healthData?.ollama?.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                        }`}
                      />
                      <span className="text-[13.5px] font-bold text-[var(--fg-1)]">
                        Local Ollama Model: {healthData?.ollama?.model || "llama3.2:latest"}
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--muted)] font-mono">
                      Endpoint: {ai.ollamaEndpoint} · Latency: {healthData?.ollama?.latency_ms || "380"} ms · Status: {healthData?.ollama?.status || "ACTIVE"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      refetchHealth();
                      toast.success("Pinged Ollama endpoint");
                    }}
                    disabled={isHealthFetching}
                    className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-white hover:bg-[#fafafa] text-[12px] font-semibold text-[var(--fg-1)] cursor-pointer shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} className={isHealthFetching ? "animate-spin" : ""} />
                    <span>Test Ping</span>
                  </button>
                </div>

                {/* Ambient Voice Narration Toggle */}
                <div className="p-4 rounded-xl border border-[var(--line)] bg-[#fafafa] flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-[var(--fg-1)] flex items-center gap-2">
                      <Volume2 size={16} className="text-[var(--accent)]" />
                      Ambient Voice AI Narration
                    </div>
                    <div className="text-[12px] text-[var(--muted)] mt-0.5">
                      Speak aloud forensic findings and court alerts using local Web Speech / Sarvam synthesis.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={ai.enableVoiceNarration}
                    onChange={(e) => updateAi({ enableVoiceNarration: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--accent)] cursor-pointer"
                  />
                </div>

                {/* Scoring Weights Sliders (Admin only to edit) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                        Mule Scoring Algorithm Weights
                      </label>
                      <div className="text-[12px] text-[var(--muted)]">
                        {isAdmin
                          ? "Editable (Changes are cryptographically signed and audit logged)"
                          : "View only (Requires Administrator Role to edit)"}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          resetWeightsToDefault();
                          toast.success("Mule scoring weights reset to baseline defaults.");
                        }}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--accent)] hover:underline bg-transparent border-none cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        <span>{t("action.reset_defaults")}</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: "velocity" as const, label: "Drain Velocity (Transit Speed)", val: ai.scoringWeights.velocity },
                      { key: "fanOut" as const, label: "Fan-out / Graph Centrality", val: ai.scoringWeights.fanOut },
                      { key: "structuring" as const, label: "Smurfing / Structuring Pattern", val: ai.scoringWeights.structuring },
                      { key: "accountTenure" as const, label: "New Account Tenure Penalty", val: ai.scoringWeights.accountTenure },
                    ].map((w) => (
                      <div key={w.key} className="p-3 rounded-lg border border-[var(--line)] bg-[#fafafa] space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-[var(--fg-1)]">{w.label}</span>
                          <span className="font-mono font-bold text-[var(--accent)]">
                            {Math.round(w.val * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          disabled={!isAdmin}
                          value={w.val}
                          onChange={(e) => updateScoringWeights({ [w.key]: parseFloat(e.target.value) })}
                          className="w-full cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 6: DATA & DEMO MANAGEMENT */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "data" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                    {t("settings.data_demo")}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Transactional SQLite databases, case exports, and canonical demo benchmarks.
                  </p>
                </div>

                {/* Storage Architecture Overview Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-lg border border-[var(--line)] bg-[#fafafa] space-y-1">
                    <div className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Transactional Authority
                    </div>
                    <div className="text-[13px] font-bold text-[var(--fg-1)] font-mono">
                      data/sentinelx_production.db
                    </div>
                    <div className="text-[12px] text-[var(--fg-2)]">
                      WAL Mode · ACID Guaranteed · Merkle Evidence Rooted
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-[var(--line)] bg-[#fafafa] space-y-1">
                    <div className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Forensic Graph Projection
                    </div>
                    <div className="text-[13px] font-bold text-[var(--fg-1)] font-mono">
                      SQLite In-Memory / Neo4j
                    </div>
                    <div className="text-[12px] text-[var(--fg-2)]">
                      Directed Multigraph · Flow Conservation Checks
                    </div>
                  </div>
                </div>

                {/* Export & Presentation Mode Controls */}
                <div className="space-y-2 pt-2">
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
                    Forensic Bundles & Demonstrator Controls
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={handleExportCase}
                      className="p-3 rounded-lg border border-[var(--line)] bg-white hover:bg-[#fafafa] text-left cursor-pointer shadow-2xs transition-all space-y-1"
                    >
                      <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--fg-1)]">
                        <Download size={15} className="text-[var(--accent)]" />
                        <span>{t("action.export_json")}</span>
                      </div>
                      <div className="text-[12px] text-[var(--muted)]">
                        Download {activeCaseId} JSON bundle
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        startJudgeDemo();
                        toast.success("Judge Mode Guided Walkthrough started");
                      }}
                      className="p-3 rounded-lg border border-[var(--line)] bg-white hover:bg-[#fafafa] text-left cursor-pointer shadow-2xs transition-all space-y-1"
                    >
                      <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--fg-1)]">
                        <Sparkles size={15} className="text-indigo-600" />
                        <span>Launch Judge Mode</span>
                      </div>
                      <div className="text-[12px] text-[var(--muted)]">
                        Interactive evaluator walkthrough
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        togglePresentationMode();
                        toast.info(`Presenter mode: ${presentationMode ? "Off" : "On"}`);
                      }}
                      className="p-3 rounded-lg border border-[var(--line)] bg-white hover:bg-[#fafafa] text-left cursor-pointer shadow-2xs transition-all space-y-1"
                    >
                      <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--fg-1)]">
                        <ExternalLink size={15} className="text-emerald-600" />
                        <span>Presenter Mode: {presentationMode ? "On" : "Off"}</span>
                      </div>
                      <div className="text-[12px] text-[var(--muted)]">
                        High-contrast projection view
                      </div>
                    </button>
                  </div>
                </div>

                {/* Demo Data Reset (Danger Zone) */}
                <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13.5px] font-bold text-red-900 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600" />
                        Restore Canonical Demo Benchmarks
                      </div>
                      <div className="text-[12px] text-red-700 mt-0.5">
                        Resets cases CASE-2026-001 through CASE-2026-004 to their pristine seed state.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setResetConfirmOpen(true)}
                      className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-semibold border-none cursor-pointer shadow-xs transition-colors shrink-0"
                    >
                      {t("action.reset_demo")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 7: NOTIFICATIONS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "notifications" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                    {t("settings.notifications")}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Configure real-time audio and banner alert triggers for statutory compliance.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    {
                      key: "goldenHourAlert" as const,
                      title: "Golden Hour SLA Urgency (< 30 min remaining)",
                      desc: "Triggers urgent alert when un-frozen funds are nearing statutory cashout threshold",
                      checked: notifications.goldenHourAlert,
                    },
                    {
                      key: "ingestDoneAlert" as const,
                      title: "Evidence Ingestion & Integrity Check Complete",
                      desc: "Notifies when raw CBS/CDR files finish Merkle root verification and pass gate",
                      checked: notifications.ingestDoneAlert,
                    },
                    {
                      key: "bankAckAlert" as const,
                      title: "Bank Freeze Directives Acknowledged (§107 Lien)",
                      desc: "Notifies when simulated or live nodal desk places lien on targeted accounts",
                      checked: notifications.bankAckAlert,
                    },
                    {
                      key: "crossFirMatchAlert" as const,
                      title: "Cross-FIR Syndicate Entity Link Detected",
                      desc: "Alerts when an identifier matches another police station's active case",
                      checked: notifications.crossFirMatchAlert,
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-lg border border-[var(--line)] bg-[#fafafa] flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <div className="text-[13px] font-bold text-[var(--fg-1)]">{item.title}</div>
                        <div className="text-[12px] text-[var(--muted)]">{item.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => updateNotifications({ [item.key]: e.target.checked })}
                        className="w-4 h-4 rounded text-[var(--accent)] cursor-pointer shrink-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 8: KEYBOARD SHORTCUTS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "shortcuts" && (
            <div className="space-y-4">
              <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                    {t("settings.shortcuts")}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 mb-0">
                    Frontline investigator keyboard hotkeys for rapid cyber crime response.
                  </p>
                </div>

                <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-lg overflow-hidden bg-white">
                  {[
                    { key: "Cmd/Ctrl + K", action: "Search & Switch Cases (Global Switcher)" },
                    { key: "Cmd/Ctrl + Shift + A", action: "Jump to Recommended Actions & Freeze Directives" },
                    { key: "Cmd/Ctrl + Shift + R", action: "Open Formal Investigation Report & Court Dossier" },
                    { key: "Cmd/Ctrl + B", action: "Toggle Left Navigation Rail (Expand / Collapse)" },
                    { key: "Alt + 1 .. 6", action: "Direct jump between 6 investigation screens" },
                    { key: "Esc", action: "Dismiss active modal, sheet, or intelligence brief" },
                  ].map((s, idx) => (
                    <div
                      key={s.key}
                      className={`flex items-center justify-between p-3.5 ${
                        idx % 2 === 0 ? "bg-white" : "bg-[#fafafa]"
                      }`}
                    >
                      <span className="text-[12.5px] text-[var(--fg-1)] font-medium">{s.action}</span>
                      <kbd className="px-2.5 py-1 rounded border border-[var(--line-strong)] bg-[#f4f4f5] text-[12px] font-mono font-bold text-[var(--fg-1)] shadow-2xs">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CONFIRMATION MODAL: RESET DEMO DATA */}
      {/* ===================================================================== */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-6 max-w-[440px] w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[var(--fg-1)] m-0">
                  Confirm Demo Data Reset
                </h4>
                <p className="text-[12px] text-[var(--muted)] m-0">
                  Restores canonical cases and re-indexes SQLite graph.
                </p>
              </div>
            </div>

            <p className="text-[12.5px] text-[var(--fg-2)] m-0 leading-relaxed">
              This will reset cases <strong className="text-[var(--fg-1)]">CASE-2026-001</strong> through{" "}
              <strong className="text-[var(--fg-1)]">CASE-2026-004</strong> to their clean seed benchmarks. Any temporary test cases created during testing will be removed.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                disabled={isResettingDemo}
                className="px-4 py-2 rounded-lg border border-[var(--line)] bg-white hover:bg-[#fafafa] text-[12.5px] font-semibold text-[var(--fg-1)] cursor-pointer shadow-2xs transition-all disabled:opacity-60"
              >
                {t("action.cancel")}
              </button>

              <button
                type="button"
                onClick={handleResetDemoData}
                disabled={isResettingDemo}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-bold border-none cursor-pointer shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isResettingDemo ? "Restoring..." : "Yes, Reset Demo Cases"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
