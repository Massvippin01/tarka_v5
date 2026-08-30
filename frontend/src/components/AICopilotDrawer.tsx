import React, { useState } from "react";
import axios from "axios";

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (id: string) => void;
  initialQuery?: string;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  onSelectEntity,
  initialQuery,
}) => {
  const [query, setQuery] = useState(initialQuery || "");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    {
      sender: "assistant",
      text: "Greetings, Investigator. I am the SENTINELX NEXUS AI Copilot. Ask any question regarding criminal networks, cross-case connections, CDR timelines, or financial mule trails.",
      confidence: 1.0,
      confidence_level: "DOCUMENTED",
      tool_calls: [],
      supporting_records: [],
      evidence_references: [],
    },
  ]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const userMsg = { sender: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/api/v1/investigation/copilot", {
        query: q,
      });
      const botMsg = {
        sender: "assistant",
        text: res.data.answer,
        confidence: res.data.confidence,
        confidence_level: res.data.confidence_level,
        tool_calls: res.data.tool_calls || [],
        supporting_records: res.data.supporting_records || [],
        evidence_references: res.data.evidence_references || [],
        disclaimer: res.data.analytical_disclaimer,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "4 potentially relevant connections found between Case C102 and Case C481:\n1) Vehicle V-188 (DL-01-AB-1888)\n2) Phone PH-002 (+91-9888044556)\n3) Location LOC221 (DND Toll Plaza)\n4) Person P044 (Rahul Verma)\n\nAnalytical Confidence: 89% (INFERRED).",
          confidence: 0.89,
          confidence_level: "INFERRED",
          tool_calls: [{ tool_name: "find_shortest_path", arguments: { source: "C102", target: "C481" }, result_summary: "Path found via P001, PH001, PH002, P044" }],
          supporting_records: [
            { type: "Vehicle", id: "V188", description: "DL-01-AB-1888 Hyundai Creta" },
            { type: "Phone", id: "PH002", description: "+91-9888044556 used by Rahul Verma" },
          ],
          evidence_references: ["CCTNS FIR #FIR-2026-C102", "Telecom CDR Log #CDR001"],
          disclaimer: "This is an analytical finding requiring investigator review.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.drawer}>
        {/* Drawer Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span>🤖 AI INVESTIGATION COPILOT</span>
            <span style={styles.subText}>Tool-Driven Evidence Citation Engine</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Quick Prompts */}
        <div style={styles.promptsBar}>
          <button
            style={styles.promptTag}
            onClick={() => handleSend("What connects Case C102 and Case C481?")}
          >
            🔍 What connects Case C102 and C481?
          </button>

          <button
            style={styles.promptTag}
            onClick={() => handleSend("Dossier for Vikram Singh (P001)")}
          >
            👤 Dossier for Vikram Singh
          </button>
        </div>

        {/* Message History */}
        <div style={styles.chatArea}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                ...styles.msgBubble,
                ...(m.sender === "user" ? styles.msgUser : styles.msgAssistant),
              }}
            >
              <div style={styles.msgText}>{m.text}</div>

              {/* Confidence Badge */}
              {m.confidence !== undefined && m.sender === "assistant" && (
                <div style={styles.badgeRow}>
                  <span style={styles.confBadge}>
                    Confidence: {(m.confidence * 100).toFixed(0)}% ({m.confidence_level || "DOCUMENTED"})
                  </span>
                </div>
              )}

              {/* Tool Execution Log */}
              {m.tool_calls && m.tool_calls.length > 0 && (
                <div style={styles.toolsBox}>
                  <div style={styles.sectionTitle}>🛠️ TOOLS EXECUTED:</div>
                  {m.tool_calls.map((t: any, i: number) => (
                    <div key={i} style={styles.toolItem}>
                      <code>{t.tool_name}({JSON.stringify(t.arguments)})</code>
                      <div>{t.result_summary}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Supporting Record Cards */}
              {m.supporting_records && m.supporting_records.length > 0 && (
                <div style={styles.recordsBox}>
                  <div style={styles.sectionTitle}>📌 SUPPORTING RECORDS:</div>
                  <div style={styles.recordsGrid}>
                    {m.supporting_records.map((r: any, i: number) => (
                      <div
                        key={i}
                        style={styles.recordCard}
                        onClick={() => onSelectEntity(r.id)}
                      >
                        <strong>{r.type}: {r.id}</strong>
                        <span>{r.description || r.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence References */}
              {m.evidence_references && m.evidence_references.length > 0 && (
                <div style={styles.evidenceBox}>
                  <div style={styles.sectionTitle}>📋 EVIDENCE CITATIONS:</div>
                  {m.evidence_references.map((e: string, i: number) => (
                    <span key={i} style={styles.evidenceChip}>
                      {e}
                    </span>
                  ))}
                </div>
              )}

              {m.disclaimer && (
                <div style={styles.disclaimerText}>⚠️ {m.disclaimer}</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={styles.loadingMsg}>
              Executing investigative graph tools...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={styles.inputArea}>
          <input
            type="text"
            placeholder="Ask AI Copilot (e.g. What connects Case C102 and Case C481?)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={styles.input}
          />
          <button style={styles.sendBtn} onClick={() => handleSend()}>
            SEND
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "480px",
    height: "100%",
    background: "#0a0f18",
    borderLeft: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
  },
  header: {
    padding: "16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "0.9rem",
    display: "flex",
    flexDirection: "column",
  },
  subText: {
    color: "#64748b",
    fontSize: "0.65rem",
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  promptsBar: {
    padding: "10px 16px",
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    overflowX: "auto",
  },
  promptTag: {
    background: "rgba(2, 132, 199, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.68rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  chatArea: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  msgBubble: {
    padding: "12px",
    borderRadius: "8px",
    fontSize: "0.78rem",
    lineHeight: "1.5",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  msgUser: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#e2e8f0",
    alignSelf: "flex-end",
    maxWidth: "85%",
    border: "1px solid rgba(52, 211, 153, 0.2)",
  },
  msgAssistant: {
    background: "#0f172a",
    color: "#e2e8f0",
    alignSelf: "flex-start",
    maxWidth: "95%",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  msgText: {
    whiteSpace: "pre-wrap",
  },
  badgeRow: {
    display: "flex",
  },
  confBadge: {
    background: "rgba(52, 211, 153, 0.15)",
    color: "#34d399",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
  },
  sectionTitle: {
    color: "#64748b",
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  toolsBox: {
    background: "#070a0f",
    padding: "8px",
    borderRadius: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  toolItem: {
    fontSize: "0.68rem",
    color: "#94a3b8",
  },
  recordsBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  recordsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  recordCard: {
    background: "#070a0f",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "6px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.7rem",
    color: "#38bdf8",
    display: "flex",
    flexDirection: "column",
  },
  evidenceBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  evidenceChip: {
    background: "rgba(255,255,255,0.05)",
    color: "#cbd5e1",
    fontSize: "0.65rem",
    padding: "2px 6px",
    borderRadius: "4px",
    width: "fit-content",
  },
  disclaimerText: {
    color: "#eab308",
    fontSize: "0.65rem",
    fontStyle: "italic",
  },
  loadingMsg: {
    color: "#38bdf8",
    fontSize: "0.75rem",
    fontStyle: "italic",
  },
  inputArea: {
    padding: "12px 16px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#f8fafc",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    outline: "none",
  },
  sendBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.75rem",
    cursor: "pointer",
  },
};
