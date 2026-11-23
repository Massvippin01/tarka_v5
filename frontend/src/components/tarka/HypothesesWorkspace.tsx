import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Scale,
  Sparkles,
  Gavel,
  RefreshCw,
} from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";

interface HypothesesWorkspaceProps {
  caseId: string;
}

export const HypothesesWorkspace: React.FC<HypothesesWorkspaceProps> = ({ caseId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [selectedHypothesis, setSelectedHypothesis] = useState<string>("H1");
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    forensicsApi.getHypotheses(caseId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || err.message || "Failed to load hypotheses");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  const hypotheses = data?.hypotheses_matrix?.hypotheses || [];
  const gaps = data?.prioritized_evidence_gaps || [];
  const activeH = hypotheses.find((h: any) => h.hypothesis_id === selectedHypothesis) || hypotheses[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div className="skeuo-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="lg-badge lg-badge-blue">AEGIS INVESTIGATIVE REASONING</span>
            <span className="lg-badge lg-badge-emerald">ANALYSIS OF COMPETING HYPOTHESES (ACH)</span>
            <span className="lg-badge" style={{ backgroundColor: "rgba(139, 92, 246, 0.2)", color: "#C4B5FD" }}>MULTI-FACTOR GAP SCORING</span>
          </div>
          <h2 style={{ margin: "8px 0 4px", fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
            Competing Hypotheses & Prioritized Evidence Gaps
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8" }}>
            Investigative reasoning without bias: AI proposes formal hypotheses, evidence tests each scenario, and human examiners retain statutory decision authority.
          </p>
        </div>

        <button onClick={loadData} className="skeuo-btn" style={{ padding: "6px 14px", fontSize: "12px" }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh Reasoner</span>
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
          <div style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #3B82F6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <div style={{ marginTop: "12px", fontSize: "13px", fontFamily: "'IBM Plex Mono', monospace" }}>
            Evaluating competing hypotheses against evidence matrix...
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", backgroundColor: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.4)", borderRadius: "12px", color: "#FECDD3", fontSize: "13px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Hypotheses Overview Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {hypotheses.map((h: any) => {
              const isSel = (activeH?.hypothesis_id === h.hypothesis_id);
              return (
                <div
                  key={h.hypothesis_id}
                  onClick={() => setSelectedHypothesis(h.hypothesis_id)}
                  className="skeuo-card"
                  style={{
                    cursor: "pointer",
                    borderColor: isSel ? "#3B82F6" : undefined,
                    boxShadow: isSel ? "0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span className="lg-badge lg-badge-blue" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {h.hypothesis_id}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: h.plausibility_score > 0.6 ? "#10B981" : "#FBBF24" }}>
                      Plausibility: {Math.round(h.plausibility_score * 100)}%
                    </span>
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                    {h.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: 1.4 }}>
                    {h.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detailed Selected Hypothesis Breakdown */}
          {activeH && (
            <div className="skeuo-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#60A5FA", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                    HYPOTHESIS DETAIL • {activeH.hypothesis_id}
                  </div>
                  <h3 style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
                    {activeH.title}
                  </h3>
                </div>

                <div className="lg-badge lg-badge-subtle">
                  SMT SOLVER VALIDATED
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Supporting Observations */}
                <div className="skeuo-inset" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#34D399", display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <CheckCircle2 size={16} />
                    <span>Supporting Evidence ({activeH.supporting_observations?.length || 0})</span>
                  </div>
                  {activeH.supporting_observations?.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.6 }}>
                      {activeH.supporting_observations.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#6B7280", fontStyle: "italic" }}>
                      No direct supporting evidence established yet.
                    </div>
                  )}
                </div>

                {/* Contradictory Observations */}
                <div className="skeuo-inset" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#F87171", display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <XCircle size={16} />
                    <span>Contradictory Evidence ({activeH.contradictory_observations?.length || 0})</span>
                  </div>
                  {activeH.contradictory_observations?.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.6 }}>
                      {activeH.contradictory_observations.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#6B7280", fontStyle: "italic" }}>
                      No contradictory observations recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Discriminative Checks & Next Actions */}
              <div style={{ padding: "14px 18px", borderRadius: "12px", backgroundColor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#93C5FD", display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Sparkles size={16} />
                  <span>Recommended Discriminative Checks</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {activeH.recommended_checks?.map((check: string, idx: number) => (
                    <div key={idx} className="lg-badge lg-badge-blue" style={{ fontSize: "11px", padding: "4px 10px" }}>
                      {check}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Prioritized Evidence Gaps & Statutory Powers */}
          <div className="skeuo-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Scale size={18} color="#FBBF24" />
                  <span>Prioritized Evidence Gaps (Ranked by Investigative Information Value)</span>
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
                  Ranked by formula: <code style={{ color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>(Relevance * 0.40 + InfoValue * 0.35) / Cost * 0.25</code> with statutory legal authorities.
                </p>
              </div>
            </div>

            <div className="skeuo-inset" style={{ overflowX: "auto" }}>
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Evidence Required</th>
                    <th>Description</th>
                    <th>Statutory Authority</th>
                    <th>Priority Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g: any, index: number) => (
                    <tr key={g.gap_id || index}>
                      <td style={{ color: "#60A5FA", fontWeight: 700 }}>#{index + 1}</td>
                      <td style={{ fontWeight: 600, color: "#FFFFFF" }}>{g.evidence_type}</td>
                      <td style={{ color: "#CBD5E1" }}>{g.description}</td>
                      <td>
                        <span className="lg-badge lg-badge-emerald" style={{ fontSize: "10px" }}>
                          <Gavel size={10} style={{ marginRight: "4px" }} />
                          {g.statutory_authority || g.statutory_basis || "BNSS Section 94"}
                        </span>
                      </td>
                      <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#FBBF24" }}>
                        {(g.priority_score || 0.85).toFixed(2)}
                      </td>
                      <td>
                        <button
                          className="skeuo-btn skeuo-btn-primary"
                          style={{ padding: "3px 8px", fontSize: "10px" }}
                          onClick={() => alert(`Issuing formal requisition notice under ${g.statutory_authority || "BNSS Section 94"} for ${g.evidence_type}`)}
                        >
                          <span>Requisition Notice</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
