import React from "react";
import { TarkaLogo } from "./common/TarkaLogo";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  toggleCopilot: () => void;
  copilotOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  toggleCopilot,
  copilotOpen,
}) => {
  return (
    <header style={styles.header}>
      <div style={styles.brandGroup}>
        <TarkaLogo variant="icon" theme="light" height={28} width={28} />
        <div>
          <div style={styles.title}>TARKA FORENSICS</div>
          <div style={styles.subtitle}>INDIGENOUS DIGITAL FORENSICS PLATFORM • SUTRAM 2026</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {[
          { id: "command", label: "COMMAND CENTER" },
          { id: "cases", label: "INVESTIGATION WORKSPACE" },
          { id: "dossier", label: "ENTITY DOSSIER" },
          { id: "network", label: "NETWORK EXPLORER" },
          { id: "gaps", label: "GAPS & HYPOTHESES" },
          { id: "gis", label: "GIS SURVEILLANCE" },
          { id: "cyber", label: "CYBER & FINANCIAL" },
          { id: "quality", label: "DATA QUALITY & GOVERNANCE" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              ...styles.navButton,
              ...(activeTab === item.id ? styles.navButtonActive : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div style={styles.actions}>
        <form onSubmit={onSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search Person, FIR, Plate, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </form>

        <button
          onClick={toggleCopilot}
          style={{
            ...styles.copilotButton,
            ...(copilotOpen ? styles.copilotButtonActive : {}),
          }}
        >
           AI COPILOT
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "#0a0f18",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    height: "64px",
  },
  brandGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoBadge: {
    background: "linear-gradient(135deg, #10b981, #065f46)",
    color: "#fff",
    fontWeight: "bold",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    letterSpacing: "1px",
  },
  title: {
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "1.1rem",
    letterSpacing: "0.5px",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "0.62rem",
    fontWeight: 600,
    letterSpacing: "0.8px",
  },
  nav: {
    display: "flex",
    gap: "6px",
  },
  navButton: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#94a3b8",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "0.72rem",
    fontWeight: 600,
    letterSpacing: "0.5px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  navButtonActive: {
    background: "rgba(16, 185, 129, 0.12)",
    color: "#34d399",
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  searchForm: {
    display: "flex",
  },
  searchInput: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    color: "#f8fafc",
    padding: "7px 12px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    width: "220px",
    outline: "none",
  },
  copilotButton: {
    background: "linear-gradient(135deg, #0284c7, #0369a1)",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.75rem",
    cursor: "pointer",
    boxShadow: "0 0 12px rgba(2, 132, 199, 0.3)",
  },
  copilotButtonActive: {
    boxShadow: "0 0 16px rgba(52, 211, 153, 0.6)",
  },
};
