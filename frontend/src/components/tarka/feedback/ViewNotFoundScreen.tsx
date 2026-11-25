import React from "react";
import { AlertTriangle, Home, FileText, Activity, Settings } from "lucide-react";
import { useCaseStore } from "../../../store/useCaseStore";

interface ViewNotFoundScreenProps {
  view: string;
}

export const ViewNotFoundScreen: React.FC<ViewNotFoundScreenProps> = ({ view }) => {
  const navigateTo = (newView: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", newView);
    window.history.pushState({}, "", url.toString());
    useCaseStore.getState().setActiveView(newView as any);
  };

  return (
    <div
      data-testid="view-not-found"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "40px 20px",
        textAlign: "center",
        color: "#1E293B",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          background: "#FEF2F2",
          border: "1px solid #FECACA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          color: "#DC2626",
        }}
      >
        <AlertTriangle size={28} />
      </div>

      <span
        style={{
          fontSize: "11px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#DC2626",
          background: "#FEE2E2",
          padding: "3px 10px",
          borderRadius: "12px",
          marginBottom: "12px",
        }}
      >
        Error 404 · Module Not Found
      </span>

      <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px 0", color: "#0F172A" }}>
        Workspace View &apos;{view}&apos; Does Not Exist
      </h2>
      <p style={{ fontSize: "14px", color: "#64748B", maxWidth: "480px", margin: "0 0 24px 0", lineHeight: 1.5 }}>
        The requested screen module route <code style={{ fontFamily: "var(--font-mono)", background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>?view={view}</code> is not a registered analytical screen in TARKA.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => navigateTo("workspace")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#0284C7",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(2, 132, 199, 0.3)",
          }}
        >
          <Home size={15} />
          <span>Return to Command Hub</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("intake")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#FFFFFF",
            color: "#334155",
            border: "1px solid #CBD5E1",
            borderRadius: "8px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <FileText size={15} />
          <span>Evidence & Intake</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("health")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#FFFFFF",
            color: "#334155",
            border: "1px solid #CBD5E1",
            borderRadius: "8px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Activity size={15} />
          <span>System Health</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("settings")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#FFFFFF",
            color: "#334155",
            border: "1px solid #CBD5E1",
            borderRadius: "8px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};
