import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { CommandCenter } from "./components/CommandCenter";
import { EntityDossier } from "./components/EntityDossier";
import { AICopilotDrawer } from "./components/AICopilotDrawer";
import GraphExplorer from "./features/graph/GraphExplorer";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("command");
  const [selectedEntity, setSelectedEntity] = useState("P001");
  const [searchQuery, setSearchQuery] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState("");

  const handleSelectEntity = (id: string) => {
    setSelectedEntity(id);
    setActiveTab("dossier");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedEntity(searchQuery.trim());
      setActiveTab("dossier");
    }
  };

  const handleRunCopilotQuery = (q: string) => {
    setCopilotQuery(q);
    setCopilotOpen(true);
  };

  return (
    <main className="sentinel-app">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        toggleCopilot={() => setCopilotOpen(!copilotOpen)}
        copilotOpen={copilotOpen}
      />

      <div className="sentinel-content" style={{ height: "calc(100vh - 64px)" }}>
        {activeTab === "command" && (
          <CommandCenter
            onSelectEntity={handleSelectEntity}
            onRunCopilotQuery={handleRunCopilotQuery}
          />
        )}

        {activeTab === "dossier" && (
          <EntityDossier
            entityId={selectedEntity}
            onSelectEntity={handleSelectEntity}
          />
        )}

        {activeTab === "network" && (
          <div style={{ width: "100%", height: "100%" }}>
            <GraphExplorer />
          </div>
        )}

        {activeTab === "cases" && (
          <div style={{ padding: "20px", color: "#f8fafc" }}>
            <h2>INVESTIGATION CASE WORKSPACE</h2>
            <p style={{ color: "#94a3b8" }}>Active Criminal & Cybercrime Investigations</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
              <div
                style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", padding: "16px", borderRadius: "8px", cursor: "pointer" }}
                onClick={() => handleSelectEntity("C102")}
              >
                <div style={{ color: "#34d399", fontSize: "0.7rem", fontWeight: 700 }}>CASE C102 | FIR-2026-C102</div>
                <h3 style={{ margin: "4px 0" }}>Delhi Cyber Syndicate UPI Fraud</h3>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Primary Suspect: Vikram Singh (P001) | Status: OPEN | Priority: HIGH</p>
              </div>
              <div
                style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", padding: "16px", borderRadius: "8px", cursor: "pointer" }}
                onClick={() => handleSelectEntity("C481")}
              >
                <div style={{ color: "#f43f5e", fontSize: "0.7rem", fontWeight: 700 }}>CASE C481 | FIR-2026-C481</div>
                <h3 style={{ margin: "4px 0" }}>Gurugram Inter-State Auto Theft & Bank Laundering</h3>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Primary Suspect: Rahul Verma (P044) | Status: OPEN | Priority: CRITICAL</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cyber" && (
          <div style={{ padding: "20px", color: "#f8fafc" }}>
            <h2>CYBER & FINANCIAL INTELLIGENCE DASHBOARD</h2>
            <p style={{ color: "#94a3b8" }}>UPI Mule Fraud & CDR Linkages</p>
            <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", padding: "16px", borderRadius: "8px", marginTop: "16px" }}>
              <h4>FLAGGED MONEY MULE TRANSFERS</h4>
              <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginTop: "8px" }}>
                <div>• Transaction TXN001: ₹1,25,000 from SBI ACC992 (Vikram Singh) to HDFC ACC481 (Rahul Verma)</div>
                <div>• Flag Reason: Cross-bank suspicious mule transfer between co-conspirators</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "quality" && (
          <div style={{ padding: "20px", color: "#f8fafc" }}>
            <h2>DATA QUALITY & GOVERNANCE DASHBOARD</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "16px" }}>
              <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>COMPLETENESS</span>
                <h3 style={{ color: "#34d399", margin: "4px 0" }}>98.0%</h3>
              </div>
              <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>ER MATCH RATE</span>
                <h3 style={{ color: "#38bdf8", margin: "4px 0" }}>94.0%</h3>
              </div>
              <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>PROVENANCE COVERAGE</span>
                <h3 style={{ color: "#34d399", margin: "4px 0" }}>100.0%</h3>
              </div>
              <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>ORPHAN RELATIONSHIPS</span>
                <h3 style={{ color: "#34d399", margin: "4px 0" }}>0</h3>
              </div>
            </div>
          </div>
        )}
      </div>

      <AICopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onSelectEntity={handleSelectEntity}
        initialQuery={copilotQuery}
      />
    </main>
  );
}

export default App;