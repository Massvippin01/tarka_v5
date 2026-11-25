import React, { useEffect, useState } from "react";
import axios from "axios";
import { apiUrl } from "../api/client";
import { useInvestigation } from "../context/InvestigationContext";

interface GlobalCommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalCommandSearch: React.FC<GlobalCommandSearchProps> = ({ isOpen, onClose }) => {
  const { selectEntity, selectCase, selectEvidence, runCopilotQuery } = useInvestigation();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);

  // Keyboard shortcut listener: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(apiUrl(`/api/v1/investigation/search/federated?q=${encodeURIComponent(val.trim())}`));
      setResults(res.data.results || []);
      setTelemetry({
        duration: res.data.query_duration_ms,
        total: res.data.total_available,
        coverage: res.data.source_coverage || [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenItem = (item: any) => {
    if (item.entity_type === "CASE") {
      selectCase(item.id);
    } else if (item.entity_type === "EVIDENCE") {
      selectEvidence(item.id);
    } else {
      selectEntity(item.id);
    }
    onClose();
  };

  if (!isOpen) return null;

  // Group results by category
  const categories: Record<string, any[]> = {
    PEOPLE: results.filter((r) => r.entity_type === "PERSON"),
    CASES: results.filter((r) => r.entity_type === "CASE"),
    VEHICLES: results.filter((r) => r.entity_type === "VEHICLE"),
    PHONES: results.filter((r) => r.entity_type === "PHONE"),
    EVIDENCE: results.filter((r) => r.entity_type === "EVIDENCE"),
    TRANSACTIONS: results.filter((r) => r.entity_type === "BANKACCOUNT" || r.entity_type === "UPIACCOUNT"),
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header Search Bar */}
        <div style={styles.searchHeader}>
          <span style={styles.searchIcon}></span>
          <input
            type="text"
            placeholder="Search FIR, Aadhaar, Phone, Plate, VPA, Person... (Press ESC to close)"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            style={styles.searchInput}
          />
          <kbd style={styles.kbdTag}>ESC</kbd>
        </div>

        {/* Source Coverage Status Pill */}
        <div style={styles.coverageBar}>
          <span>FEDERATED SOURCE COVERAGE:</span>
          <span style={styles.cTag}>CCTNS ● ONLINE</span>
          <span style={styles.cTag}>NCRP ● ONLINE</span>
          <span style={styles.cTag}>VAHAN ● ONLINE</span>
          <span style={styles.cTag}>CDR ● ONLINE</span>
          <span style={styles.cTag}>ANPR ● ONLINE</span>
          {telemetry && (
            <span style={styles.timingTag}> {telemetry.duration}ms ({telemetry.total} matches)</span>
          )}
        </div>

        {/* Results Container */}
        <div style={styles.resultsBody}>
          {loading ? (
            <div style={styles.loadingText}>Searching federated intelligence sources...</div>
          ) : results.length === 0 ? (
            <div style={styles.emptyText}>
              {query ? "No matching entities found in current scope." : "Type an identifier (e.g. C102, P001, PH001, V188, ACC992) to begin search."}
            </div>
          ) : (
            Object.entries(categories).map(([catName, catItems]) => {
              if (catItems.length === 0) return null;
              return (
                <div key={catName} style={styles.categorySection}>
                  <div style={styles.categoryTitle}>{catName} ({catItems.length})</div>
                  <div style={styles.itemsList}>
                    {catItems.map((item) => (
                      <div key={item.id} style={styles.resultItem}>
                        <div style={styles.itemHeader}>
                          <span style={styles.itemTitle}>{item.name}</span>
                          <span style={styles.relBadge}>Score: {item.relevance_score}</span>
                          <span style={styles.typeBadge}>{item.entity_type}</span>
                        </div>
                        <div style={styles.itemSnippet}>{item.snippet || item.title}</div>

                        {/* Non-Destructive Entity Resolution Candidates */}
                        {item.er_candidates && item.er_candidates.length > 0 && (
                          <div style={styles.erBox}>
                            POSSIBLE CANDIDATE MATCH: Match Score {(item.er_candidates[0].match_score * 100).toFixed(0)}% ({item.er_candidates[0].matched_fields.join(", ")})
                          </div>
                        )}

                        {/* Quick Action Buttons */}
                        <div style={styles.actionRow}>
                          <button style={styles.openBtn} onClick={() => handleOpenItem(item)}>
                            OPEN INVESTIGATION
                          </button>
                          <button
                            style={styles.copilotBtn}
                            onClick={() => {
                              runCopilotQuery(`Investigate entity ${item.id} (${item.name})`);
                              onClose();
                            }}
                          >
                            ASK COPILOT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 99999,
    display: "flex",
    justifyContent: "center",
    paddingTop: "60px",
  },
  modal: {
    width: "680px",
    maxHeight: "75vh",
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
  },
  searchHeader: {
    display: "flex",
    alignItems: "center",
    padding: "14px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    gap: "10px",
  },
  searchIcon: {
    fontSize: "1.1rem",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#f8fafc",
    fontSize: "0.95rem",
    outline: "none",
    fontWeight: 600,
  },
  kbdTag: {
    background: "#1e293b",
    color: "#94a3b8",
    fontSize: "0.65rem",
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  coverageBar: {
    background: "#070a0f",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    padding: "6px 16px",
    fontSize: "0.62rem",
    color: "#64748b",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  cTag: {
    color: "#34d399",
  },
  timingTag: {
    color: "#38bdf8",
    marginLeft: "auto",
  },
  resultsBody: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  loadingText: {
    color: "#38bdf8",
    fontSize: "0.8rem",
    textAlign: "center",
    padding: "20px",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "0.78rem",
    textAlign: "center",
    padding: "20px",
  },
  categorySection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  categoryTitle: {
    color: "#38bdf8",
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  resultItem: {
    background: "#070a0f",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "10px 12px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  itemTitle: {
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "0.88rem",
    flex: 1,
  },
  relBadge: {
    color: "#34d399",
    fontSize: "0.65rem",
    fontWeight: 700,
  },
  typeBadge: {
    background: "rgba(255,255,255,0.06)",
    color: "#94a3b8",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
  },
  itemSnippet: {
    color: "#cbd5e1",
    fontSize: "0.72rem",
  },
  erBox: {
    background: "rgba(234, 179, 8, 0.12)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    color: "#fde047",
    fontSize: "0.68rem",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  openBtn: {
    background: "#10b981",
    border: "none",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.68rem",
    cursor: "pointer",
  },
  copilotBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.68rem",
    cursor: "pointer",
  },
};
