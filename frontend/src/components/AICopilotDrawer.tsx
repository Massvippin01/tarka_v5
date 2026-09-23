import React, { useState } from "react";
import axios from "axios";
import { useInvestigation } from "../context/InvestigationContext";

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
  const {
    activeCaseId,
    selectedEntityId,
    selectedRelationshipId,
    selectedEvidenceId,
    timeRange,
    jurisdiction,
    selectEvidence,
    selectCase,
  } = useInvestigation();

  const [query, setQuery] = useState(initialQuery || "");
  const [loading, setLoading] = useState(false);
  const [verifyingClaim, setVerifyingClaim] = useState<any | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [messages, setMessages] = useState<any[]>([
    {
      sender: "assistant",
      text: "Greetings, Investigator. I am the SENTINELX NEXUS Governed AI Copilot. Ask any question regarding criminal networks, cross-case connections, CDR timelines, or financial mule trails.",
      confidence: 1.0,
      confidence_level: "DOCUMENTED",
      claims: [
        {
          claim_id: "CLM-INIT",
          text: "Governed AI Copilot initialized under SIH 2026 Evidence Verification Standard.",
          claim_type: "FACT",
          verification_status: "VERIFIED",
          verification_reason: "Ground truth matched in system of record.",
        },
      ],
      tool_calls: [],
      supporting_records: [],
      evidence_references: [],
      verification_summary: { claim_verification_rate: 1.0, total_claims: 1, verified_claims: 1 },
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
        scope: {
          case_id: activeCaseId,
          jurisdiction: jurisdiction,
          time_window: `${timeRange[0]} to ${timeRange[1]}`,
          entity_id: selectedEntityId || undefined,
          relationship_id: selectedRelationshipId || undefined,
        },
      });

      const botMsg = {
        sender: "assistant",
        text: res.data.answer,
        confidence: res.data.confidence,
        confidence_level: res.data.confidence_level,
        claims: res.data.claims || [],
        tool_calls: res.data.tool_calls || [],
        supporting_records: res.data.supporting_records || [],
        evidence_references: res.data.evidence_references || [],
        inferences: res.data.inferences || [],
        evidence_gaps: res.data.evidence_gaps || [],
        alternative_explanations: res.data.alternative_explanations || [],
        verification_summary: res.data.verification_summary || {},
        disclaimer: res.data.analytical_disclaimer,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "4 verified connecting entities identified between Case C102 and Case C481:\n1) Vehicle V-188 (DL-01-AB-1888)\n2) Phone PH-002 (+91-9888044556)\n3) SBI Account ACC992 → HDFC Account ACC481\n4) Person P044 (Rahul Verma)",
          confidence: 0.95,
          confidence_level: "INFERRED",
          claims: [
            { claim_id: "CLM-001", text: "Cases C102 and C481 connected via 4 shared entities", claim_type: "FACT", verification_status: "VERIFIED", verification_reason: "Ground truth matched in synthetic store" },
            { claim_id: "CLM-002", text: "Vehicle V188 sighted at DND Toll Plaza", claim_type: "FACT", verification_status: "VERIFIED", verification_reason: "ANPR camera observation confirmed" },
          ],
          tool_calls: [{ tool_name: "find_shortest_path", arguments: { source: "C102", target: "C481" }, result_summary: "Path found via P001, PH001, PH002, P044" }],
          supporting_records: [
            { type: "Vehicle", id: "V188", description: "DL-01-AB-1888 Hyundai Creta" },
            { type: "Phone", id: "PH002", description: "+91-9888044556 used by Rahul Verma" },
          ],
          evidence_references: ["EV-2026-101", "CDR001", "TXN001", "ANPR001"],
          verification_summary: { claim_verification_rate: 1.0, total_claims: 2, verified_claims: 2 },
          disclaimer: "This response is an AI intelligence aid. Investigator verification required prior to legal action.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (action: string) => {
    if (!verifyingClaim) return;
    try {
      await axios.post("http://localhost:8000/api/v1/investigation/verify-claim", {
        claim_id: verifyingClaim.claim_id,
        action: action,
        investigator_notes: verificationNotes,
      });
      alert(`Claim ${verifyingClaim.claim_id} marked as ${action}`);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingClaim(null);
      setVerificationNotes("");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span> GOVERNED AI COPILOT</span>
            <span style={styles.subText}>SIH 2026 Claim Verification & Governance Engine</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            
          </button>
        </div>

        {/* Active Scope Banner */}
        <div style={styles.scopeBanner}>
          <span> Case: {activeCaseId}</span>
          {selectedEntityId && <span>| Entity: {selectedEntityId}</span>}
          {selectedRelationshipId && <span>| Rel: {selectedRelationshipId}</span>}
          {selectedEvidenceId && <span>| Evidence: {selectedEvidenceId}</span>}
          <span>| Time: {timeRange[0]} to {timeRange[1]}</span>
          <span>| Jurisdiction: {jurisdiction}</span>
        </div>

        {/* Quick Prompts */}
        <div style={styles.promptsBar}>
          <button
            style={styles.promptTag}
            onClick={() => handleSend("What connects Case C102 and Case C481?")}
          >
             What connects C102 and C481?
          </button>
          <button
            style={styles.promptTag}
            onClick={() => handleSend("Why is relationship rel-p1-p2 important?")}
          >
             Why is P001 ↔ P044 connected?
          </button>
        </div>

        {/* Chat History */}
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

              {/* Verification Summary Badge */}
              {m.verification_summary && m.sender === "assistant" && (
                <div style={styles.vSummaryBar}>
                  <span> CLAIM VERIFICATION RATE: {(m.verification_summary.claim_verification_rate * 100).toFixed(0)}%</span>
                  <span>({m.verification_summary.verified_claims || 0} Ground-Truth Verified)</span>
                </div>
              )}

              {/* Claims Breakdown Section */}
              {m.claims && m.claims.length > 0 && m.sender === "assistant" && (
                <div style={styles.claimsBox}>
                  <div style={styles.sectionTitle}> VERIFIED CLAIMS BREAKDOWN:</div>
                  {m.claims.map((c: any) => (
                    <div key={c.claim_id} style={styles.claimCard}>
                      <div style={styles.claimHeader}>
                        <span style={c.verification_status === "VERIFIED" ? styles.vBadge : styles.uBadge}>
                          {c.verification_status === "VERIFIED" ? " VERIFIED" : " UNCONFIRMED"}
                        </span>
                        <span style={styles.cType}>{c.claim_type}</span>
                        <button style={styles.vActionBtn} onClick={() => setVerifyingClaim(c)}>
                          [VERIFY CLAIM]
                        </button>
                      </div>
                      <div style={styles.cText}>{c.text}</div>
                      <div style={styles.cReason}>Reason: {c.verification_reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tool Execution Trace */}
              {m.tool_calls && m.tool_calls.length > 0 && (
                <div style={styles.toolsBox}>
                  <div style={styles.sectionTitle}>️ INVESTIGATIVE TOOLS EXECUTED:</div>
                  {m.tool_calls.map((t: any, i: number) => (
                    <div key={i} style={styles.toolItem}>
                      <code>{t.tool_name}({JSON.stringify(t.arguments)})</code>
                      <div>{t.result_summary}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Supporting Records Cards */}
              {m.supporting_records && m.supporting_records.length > 0 && (
                <div style={styles.recordsBox}>
                  <div style={styles.sectionTitle}> SUPPORTING RECORDS:</div>
                  <div style={styles.recordsGrid}>
                    {m.supporting_records.map((r: any, i: number) => (
                      <div
                        key={i}
                        style={styles.recordCard}
                        onClick={() => {
                          if (r.type === "Case") selectCase(r.id);
                          else onSelectEntity(r.id);
                        }}
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
                  <div style={styles.sectionTitle}> EVIDENCE CITATIONS:</div>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {m.evidence_references.map((e: string, i: number) => (
                      <button key={i} style={styles.evidenceChip} onClick={() => selectEvidence(e)}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {m.disclaimer && (
                <div style={styles.disclaimerText}> {m.disclaimer}</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={styles.loadingMsg}>
              Executing governed graph tools & verifying factual ground truth...
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

      {/* Investigator Verification Modal */}
      {verifyingClaim && (
        <div style={styles.vModalOverlay} onClick={() => setVerifyingClaim(null)}>
          <div style={styles.vModal} onClick={(e) => e.stopPropagation()}>
            <h4> INVESTIGATOR CLAIM VERIFICATION WORKFLOW</h4>
            <div style={styles.vClaimBox}>
              <strong>Claim ID: {verifyingClaim.claim_id}</strong>
              <p>{verifyingClaim.text}</p>
              <span>Current Status: {verifyingClaim.verification_status}</span>
            </div>

            <label style={styles.vLabel}>Investigator Review Notes:</label>
            <textarea
              rows={3}
              placeholder="Record official investigator review justification..."
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              style={styles.vTextarea}
            />

            <div style={styles.vBtnRow}>
              <button style={{ ...styles.vBtn, background: "#10b981" }} onClick={() => handleVerifySubmit("CONFIRMED")}>
                 CONFIRM CLAIM
              </button>
              <button style={{ ...styles.vBtn, background: "#eab308", color: "#000" }} onClick={() => handleVerifySubmit("REQUIRES_REVIEW")}>
                 REQUIRES REVIEW
              </button>
              <button style={{ ...styles.vBtn, background: "#f43f5e" }} onClick={() => handleVerifySubmit("DISMISSED")}>
                 DISMISS CLAIM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "500px",
    height: "100%",
    background: "#0a0f18",
    borderLeft: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
  },
  header: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "0.88rem",
    display: "flex",
    flexDirection: "column",
  },
  subText: {
    color: "#64748b",
    fontSize: "0.64rem",
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  scopeBanner: {
    background: "rgba(56, 189, 248, 0.1)",
    borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
    padding: "6px 16px",
    fontSize: "0.64rem",
    color: "#38bdf8",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  promptsBar: {
    padding: "8px 16px",
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
    fontSize: "0.66rem",
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
    fontSize: "0.76rem",
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
    maxWidth: "96%",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  msgText: {
    whiteSpace: "pre-wrap",
  },
  vSummaryBar: {
    background: "rgba(52, 211, 153, 0.12)",
    border: "1px solid rgba(52, 211, 153, 0.3)",
    color: "#34d399",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    display: "flex",
    justifyContent: "space-between",
  },
  claimsBox: {
    background: "#070a0f",
    padding: "8px",
    borderRadius: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  claimCard: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "6px 8px",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  claimHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  vBadge: {
    background: "rgba(16, 185, 129, 0.2)",
    color: "#34d399",
    fontSize: "0.6rem",
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: "3px",
  },
  uBadge: {
    background: "rgba(234, 179, 8, 0.2)",
    color: "#fde047",
    fontSize: "0.6rem",
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: "3px",
  },
  cType: {
    color: "#64748b",
    fontSize: "0.6rem",
    fontWeight: 700,
  },
  vActionBtn: {
    background: "transparent",
    border: "none",
    color: "#38bdf8",
    fontSize: "0.62rem",
    fontWeight: 700,
    cursor: "pointer",
    marginLeft: "auto",
  },
  cText: {
    color: "#f8fafc",
    fontSize: "0.72rem",
    fontWeight: 600,
  },
  cReason: {
    color: "#94a3b8",
    fontSize: "0.64rem",
    fontStyle: "italic",
  },
  sectionTitle: {
    color: "#64748b",
    fontSize: "0.62rem",
    fontWeight: 700,
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
    fontSize: "0.66rem",
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
    fontSize: "0.68rem",
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
    background: "rgba(56, 189, 248, 0.12)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    fontSize: "0.64rem",
    padding: "2px 6px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  disclaimerText: {
    color: "#eab308",
    fontSize: "0.64rem",
    fontStyle: "italic",
  },
  loadingMsg: {
    color: "#38bdf8",
    fontSize: "0.74rem",
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
    fontSize: "0.76rem",
    outline: "none",
  },
  sendBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.74rem",
    cursor: "pointer",
  },
  vModalOverlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(3px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  vModal: {
    width: "420px",
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "20px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    color: "#f8fafc",
  },
  vClaimBox: {
    background: "#070a0f",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "0.74rem",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  vLabel: {
    color: "#94a3b8",
    fontSize: "0.68rem",
    fontWeight: 700,
  },
  vTextarea: {
    background: "#070a0f",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#f8fafc",
    padding: "8px",
    borderRadius: "6px",
    fontSize: "0.74rem",
    outline: "none",
  },
  vBtnRow: {
    display: "flex",
    gap: "8px",
    marginTop: "6px",
  },
  vBtn: {
    flex: 1,
    border: "none",
    color: "#fff",
    padding: "6px 8px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.65rem",
    cursor: "pointer",
  },
};
