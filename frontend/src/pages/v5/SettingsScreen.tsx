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
  const { data: healthData, refetch: refetchHealth } = useQuery({
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

  return (
    <div
      data-testid="settings-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "#F8FAFC",
        color: "#0F172A",
      }}
    >
      {/* ===================================================================== */}
      {/* HEADER & OPERATIONAL CONTEXT */}
      {/* ===================================================================== */}
      <div
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              {t("nav.settings")}
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                background:
                  profile.role === "ADMIN"
                    ? "#FEF2F2"
                    : profile.role === "SUPERVISOR"
                    ? "#EFF6FF"
                    : "#ECFDF5",
                color:
                  profile.role === "ADMIN"
                    ? "#DC2626"
                    : profile.role === "SUPERVISOR"
                    ? "#2563EB"
                    : "#059669",
                border:
                  profile.role === "ADMIN"
                    ? "1px solid #FECACA"
                    : profile.role === "SUPERVISOR"
                    ? "1px solid #BFDBFE"
                    : "1px solid #A7F3D0",
              }}
            >
              {profile.role === "ADMIN"
                ? t("role.admin")
                : profile.role === "SUPERVISOR"
                ? t("role.supervisor")
                : t("role.investigator")}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
            Station letterhead, role permissions, algorithm weights, and system architecture.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => saveToBackendMutation.mutate()}
            disabled={saveToBackendMutation.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              background: "#0284C7",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              cursor: saveToBackendMutation.isPending ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(2, 132, 199, 0.2)",
            }}
          >
            <Check size={14} />
            <span>{saveToBackendMutation.isPending ? "Saving..." : t("action.save")}</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN TWO-COLUMN LAYOUT: TABS ON LEFT, SECTION DETAIL ON RIGHT */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Navigation Sidebar */}
        <div
          style={{
            width: "240px",
            background: "#FFFFFF",
            borderRight: "1px solid #E2E8F0",
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          {[
            { id: "profile" as SettingsSection, label: t("settings.profile_role"), icon: User },
            { id: "station" as SettingsSection, label: t("settings.station_jurisdiction"), icon: Building },
            { id: "appearance" as SettingsSection, label: t("settings.appearance"), icon: Palette },
            { id: "investigation" as SettingsSection, label: t("settings.investigation_defaults"), icon: Sliders },
            { id: "ai" as SettingsSection, label: t("settings.ai_scoring"), icon: Cpu },
            { id: "data" as SettingsSection, label: t("settings.data_demo"), icon: Database },
            { id: "notifications" as SettingsSection, label: t("settings.notifications"), icon: Bell },
            { id: "shortcuts" as SettingsSection, label: t("settings.shortcuts"), icon: Keyboard },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: isSelected ? "#F0F9FF" : "transparent",
                  color: isSelected ? "#0284C7" : "#475569",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "12.5px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <Icon size={16} color={isSelected ? "#0284C7" : "#64748B"} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section Detail Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 32px",
            maxWidth: "960px",
          }}
        >
          {/* --------------------------------------------------------------- */}
          {/* SECTION 1: PROFILE & ROLE */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.profile_role")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Configure your officer identity and toggle role scopes for the hackathon evaluation.
                </p>
              </div>

              {/* Role Selector Card */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase" }}>
                  Operational Role (UI Permissions Scope)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  {[
                    {
                      role: "INVESTIGATOR" as UserRole,
                      title: t("role.investigator"),
                      desc: "Execute evidence intake, graph analysis, and statutory freeze orders under §106/§107.",
                    },
                    {
                      role: "SUPERVISOR" as UserRole,
                      title: t("role.supervisor"),
                      desc: "All investigator rights + permission to reassign IOs, close, and archive cases.",
                    },
                    {
                      role: "ADMIN" as UserRole,
                      title: t("role.admin"),
                      desc: "Full permissions + configure detection scoring weights and manage system database.",
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
                        style={{
                          border: isCurrent ? "2px solid #0284C7" : "1px solid #E2E8F0",
                          borderRadius: "8px",
                          padding: "12px",
                          background: isCurrent ? "#F0F9FF" : "#FFFFFF",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "13px", fontWeight: 800, color: isCurrent ? "#0284C7" : "#0F172A" }}>
                            {r.title}
                          </span>
                          {isCurrent && <Check size={16} color="#0284C7" />}
                        </div>
                        <p style={{ margin: 0, fontSize: "11px", color: "#64748B", lineHeight: 1.4 }}>
                          {r.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Profile Details Form */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Officer Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => updateProfile({ name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Official Rank
                  </label>
                  <input
                    type="text"
                    value={profile.rank}
                    onChange={(e) => updateProfile({ rank: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Badge / Personnel ID
                  </label>
                  <input
                    type="text"
                    value={profile.badgeNo}
                    onChange={(e) => updateProfile({ badgeNo: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Official CCTNS Email
                  </label>
                  <input
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) => updateProfile({ email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 2: STATION & JURISDICTION */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "station" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.station_jurisdiction")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Customizes formal police letterhead titles, state jurisdictions, and official notices.
                </p>
              </div>

              {/* Station Form */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Police Station Name
                  </label>
                  <input
                    type="text"
                    value={station.stationName}
                    onChange={(e) => updateStation({ stationName: e.target.value })}
                    placeholder="e.g. Noida Cyber Crime PS, UP"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Police District
                  </label>
                  <input
                    type="text"
                    value={station.district}
                    onChange={(e) => updateStation({ district: e.target.value })}
                    placeholder="e.g. Gautam Buddha Nagar"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    State / UT Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={station.state}
                    onChange={(e) => updateStation({ state: e.target.value })}
                    placeholder="e.g. Uttar Pradesh"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Letterhead Banner Title
                  </label>
                  <input
                    type="text"
                    value={station.letterheadTitle}
                    onChange={(e) => updateStation({ letterheadTitle: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Letterhead Subtitle / Commission
                  </label>
                  <input
                    type="text"
                    value={station.letterheadSubtitle}
                    onChange={(e) => updateStation({ letterheadSubtitle: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Live Letterhead Preview Card */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "2px dashed #CBD5E1",
                  borderRadius: "10px",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Live Letterhead Preview (Formal A4 Report & Court Dossier)
                </span>
                <div style={{ marginTop: "12px", padding: "16px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A", letterSpacing: "0.5px" }}>
                    {station.letterheadTitle || "CYBER CRIME POLICE STATION"}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", marginTop: "2px" }}>
                    {station.letterheadSubtitle || "POLICE DEPARTMENT"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                    Station: {station.stationName} · District: {station.district} · State: {station.state}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 3: APPEARANCE & LANGUAGE */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.appearance")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Select visual theme, UI layout density, and interface language.
                </p>
              </div>

              {/* Language Switch */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase" }}>
                  Interface Language (भाषा)
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  {[
                    { id: "en" as UiLanguage, title: "English (EN)", sub: "Default Operational Terminology" },
                    { id: "hi" as UiLanguage, title: "हिन्दी (HI)", sub: "राजभाषा पुलिस कार्यप्रणाली" },
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
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          borderRadius: "8px",
                          border: isSelected ? "2px solid #0284C7" : "1px solid #E2E8F0",
                          background: isSelected ? "#F0F9FF" : "#FFFFFF",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: 800, color: isSelected ? "#0284C7" : "#0F172A" }}>
                          {lang.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{lang.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Selector */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase" }}>
                  Visual Theme
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  {[
                    { id: "paper" as UiTheme, title: "Paper Light", desc: "Clean legal white, high legibility for court dossiers" },
                    { id: "dark" as UiTheme, title: "Command Dark", desc: "Low-light NOC command room cyber dark aesthetic" },
                    { id: "contrast" as UiTheme, title: "High Contrast", desc: "Max contrast borders for sunlight & mobile field tablets" },
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
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          border: isSelected ? "2px solid #0284C7" : "1px solid #E2E8F0",
                          background: isSelected ? "#F0F9FF" : "#FFFFFF",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: 800, color: isSelected ? "#0284C7" : "#0F172A" }}>
                          {thm.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px", lineHeight: 1.3 }}>
                          {thm.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Density Toggle */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>UI Layout Density</div>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>
                    Compact mode increases table rows and graph node density on laptop screens.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["comfortable", "compact"] as UiDensity[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateAppearance({ density: d })}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: appearance.density === d ? "2px solid #0284C7" : "1px solid #CBD5E1",
                        background: appearance.density === d ? "#F0F9FF" : "#FFFFFF",
                        color: appearance.density === d ? "#0284C7" : "#475569",
                        fontWeight: 700,
                        fontSize: "12px",
                        textTransform: "capitalize",
                        cursor: "pointer",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 4: INVESTIGATION DEFAULTS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "investigation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.investigation_defaults")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Statutory golden hour timers, alert thresholds, and currency formatting.
                </p>
              </div>

              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Golden Hour SLA Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    value={investigation.goldenHourSlaMins}
                    onChange={(e) => updateInvestigation({ goldenHourSlaMins: Number(e.target.value) || 180 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Default: 180 min (3.0 hours statutory P0 lien window)</span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Mule Score Alert Threshold (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={investigation.muleAlertThreshold}
                    onChange={(e) => updateInvestigation({ muleAlertThreshold: Number(e.target.value) || 75 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Accounts &gt;= 75 flagged for mandatory freeze</span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    High-Value Transaction Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={investigation.highValueThresholdInr}
                    onChange={(e) => updateInvestigation({ highValueThresholdInr: Number(e.target.value) || 100000 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Triggers priority NPCI XML switch tracing</span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Timezone & Currency Format
                  </label>
                  <input
                    type="text"
                    disabled
                    value="IST (UTC+05:30) · ₹ INR (Lakh/Crore)"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      background: "#F1F5F9",
                      fontSize: "12px",
                      color: "#64748B",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Canonical enforcement per Prompt 0</span>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 5: AI & MULE SCORING WEIGHTS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "ai" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.ai_scoring")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Mule scoring feature contributions and local Ollama model runtime diagnostics.
                </p>
              </div>

              {/* Ollama Health Card */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: healthData?.ollama?.status === "ACTIVE" ? "#10B981" : "#F59E0B",
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
                      Local Ollama Model: {healthData?.ollama?.model || "llama3.2:latest"}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "3px" }}>
                    Endpoint: {ai.ollamaEndpoint} · Latency: {healthData?.ollama?.latency_ms || "380"} ms ·{" "}
                    Status: {healthData?.ollama?.status || "ACTIVE"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    refetchHealth();
                    toast.success("Pinged Ollama endpoint");
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Test Ping
                </button>
              </div>

              {/* Voice Narration Toggle */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                    Ambient Voice AI Narration
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>
                    Speak aloud forensic findings and court alerts using local Web Speech / Sarvam synthesis.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ai.enableVoiceNarration}
                  onChange={(e) => updateAi({ enableVoiceNarration: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </div>

              {/* Scoring Weights Sliders (Admin only to edit) */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase" }}>
                      Mule Scoring Algorithm Weights
                    </label>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      {isAdmin ? "Editable (Changes are cryptographically signed)" : "View only (Requires Administrator Role to edit)"}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        resetWeightsToDefault();
                        toast.success("Mule scoring weights reset to baseline defaults.");
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "#0284C7",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>{t("action.reset_defaults")}</span>
                    </button>
                  )}
                </div>

                {[
                  { key: "velocity" as const, label: "Drain Velocity (Transit Speed)", val: ai.scoringWeights.velocity },
                  { key: "fanOut" as const, label: "Fan-out / Graph Centrality", val: ai.scoringWeights.fanOut },
                  { key: "structuring" as const, label: "Smurfing / Structuring Pattern", val: ai.scoringWeights.structuring },
                  { key: "accountTenure" as const, label: "New Account Tenure Penalty", val: ai.scoringWeights.accountTenure },
                ].map((w) => (
                  <div key={w.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{w.label}</span>
                      <span style={{ fontWeight: 800, color: "#0284C7", fontFamily: "var(--font-mono)" }}>
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
                      style={{ width: "100%", cursor: isAdmin ? "pointer" : "not-allowed" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 6: DATA & DEMO MANAGEMENT */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "data" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.data_demo")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Demo lifecycle recovery, case bundle import/export, and presentation mode controls.
                </p>
              </div>

              {/* Reset Demo Data Card */}
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#991B1B" }}>
                      Reset Canonical Demo Data
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#7F1D1D", lineHeight: 1.4 }}>
                    Restores CASE-001 through CASE-004 to pristine seed states and clears transient demo changes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(true)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    background: "#DC2626",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {t("action.reset_demo")}
                </button>
              </div>

              {/* Case Bundle Export & Presentation Tools */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={handleExportCase}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <Download size={14} color="#0284C7" />
                  <span>{t("action.export_json")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    startJudgeDemo();
                    toast.success("Judge Mode Guided Walkthrough started");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={14} color="#4F46E5" />
                  <span>Launch Judge Demo Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    togglePresentationMode();
                    toast.info(`Presenter mode: ${presentationMode ? "Off" : "On"}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <ExternalLink size={14} color="#059669" />
                  <span>Toggle Presenter Mode</span>
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 7: NOTIFICATIONS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "notifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.notifications")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Configure real-time audio and banner alert triggers.
                </p>
              </div>

              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#1E293B" }}>{item.title}</div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => updateNotifications({ [item.key]: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SECTION 8: KEYBOARD SHORTCUTS */}
          {/* --------------------------------------------------------------- */}
          {activeSection === "shortcuts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {t("settings.shortcuts")}
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Frontline investigator keyboard hotkeys for rapid cyber response.
                </p>
              </div>

              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: idx < 5 ? "1px solid #F1F5F9" : "none",
                      background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#334155", fontWeight: 500 }}>{s.action}</span>
                    <kbd
                      style={{
                        padding: "3px 8px",
                        borderRadius: "5px",
                        background: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        fontSize: "11px",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "#0F172A",
                      }}
                    >
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CONFIRMATION MODAL: RESET DEMO DATA */}
      {/* ===================================================================== */}
      {resetConfirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "440px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#FEF2F2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#DC2626",
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>
                  Confirm Demo Data Reset
                </h4>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748B" }}>
                  Restores canonical cases and re-indexes SQLite graph.
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
              This will reset cases <strong>CASE-2026-001</strong> through <strong>CASE-2026-004</strong> to
              their clean seed benchmarks. Any temporary test cases created during testing will be removed.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                disabled={isResettingDemo}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("action.cancel")}
              </button>

              <button
                type="button"
                onClick={handleResetDemoData}
                disabled={isResettingDemo}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#DC2626",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isResettingDemo ? "not-allowed" : "pointer",
                }}
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
