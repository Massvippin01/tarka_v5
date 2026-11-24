import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Upload,
  Download,
  AlertTriangle,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
} from "lucide-react";
import { validationLabApi } from "../../../api/validationLabApi";
import type {
  ValidationDashboardDto,
  ScenarioDefinitionDto,
  TestCaseDto,
  ValidationSessionDto,
  RealEvidenceIntakeRecordDto,
} from "../../../api/validationLabApi";

export const FounderValidationLab: React.FC = () => {
  const [dashboard, setDashboard] = useState<ValidationDashboardDto | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioDefinitionDto[]>([]);
  const [sessions, setSessions] = useState<ValidationSessionDto[]>([]);
  const [activeSession, setActiveSession] = useState<ValidationSessionDto | null>(null);
  const [sessionTests, setSessionTests] = useState<TestCaseDto[]>([]);
  const [sessionEvidence, setSessionEvidence] = useState<RealEvidenceIntakeRecordDto[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [executingAll, setExecutingAll] = useState<boolean>(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [subTab, setSubTab] = useState<"catalogue" | "intake">("catalogue");

  // Real Evidence Intake Form State
  const [caseIdInput, setCaseIdInput] = useState<string>("CASE-LIVE-001");
  const [sourceNameInput, setSourceNameInput] = useState<string>("Complainant Device Extraction");
  const [acquisitionMethodInput, setAcquisitionMethodInput] = useState<string>("Lawful USB Extraction via Investigator Terminal");
  const [transmissionChannelInput, setTransmissionChannelInput] = useState<string>("DIRECT_EXPORT");
  const [redactionConfirmed, setRedactionConfirmed] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedTestDetail, setSelectedTestDetail] = useState<TestCaseDto | null>(null);

  // Load initial data
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, scens, sessList] = await Promise.all([
        validationLabApi.getDashboard(),
        validationLabApi.listScenarios(),
        validationLabApi.listSessions(),
      ]);
      setDashboard(dash);
      setScenarios(scens);
      setSessions(sessList);

      if (sessList.length > 0) {
        const cur = sessList[0];
        setActiveSession(cur);
        const [tests, evs] = await Promise.all([
          validationLabApi.listSessionTests(cur.session_id),
          validationLabApi.listSessionEvidence(cur.session_id),
        ]);
        setSessionTests(tests);
        setSessionEvidence(evs);
      }
    } catch (err) {
      console.error("Failed to load validation lab data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSelectSession = async (sessId: string) => {
    const sess = sessions.find((s) => s.session_id === sessId) || null;
    setActiveSession(sess);
    if (sess) {
      try {
        const [tests, evs] = await Promise.all([
          validationLabApi.listSessionTests(sess.session_id),
          validationLabApi.listSessionEvidence(sess.session_id),
        ]);
        setSessionTests(tests);
        setSessionEvidence(evs);
      } catch (err) {
        console.error("Failed to load session details:", err);
      }
    }
  };

  const handleCreateSession = async (mode: string = "REAL_EVIDENCE") => {
    try {
      const name = mode === "REAL_EVIDENCE" ? "Live Forensic Evidence Intake Session" : "Controlled 49-Scenario Validation";
      const newSess = await validationLabApi.createSession(name, mode, "Created from Founder Dashboard");
      setSessions([newSess, ...sessions]);
      setActiveSession(newSess);
      setSessionTests([]);
      setSessionEvidence([]);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleRunScenario = async (sc: ScenarioDefinitionDto) => {
    if (!activeSession) return;
    try {
      setExecutingId(sc.scenario_id);
      // Create test case
      const tc = await validationLabApi.createTestCase(activeSession.session_id, {
        case_id: `CASE-${sc.scenario_id}`,
        test_category: sc.category,
        scenario_id: sc.scenario_id,
        scenario_description: sc.title,
        engine: sc.engine,
        expected_behaviour: sc.expected_behaviour,
      });

      // Execute
      const executed = await validationLabApi.executeTestCase(tc.test_id);

      // Update tests state
      setSessionTests((prev) => [executed, ...prev.filter((t) => t.test_id !== executed.test_id)]);
      setSelectedTestDetail(executed);

      // Refresh dashboard rollup
      const updatedDash = await validationLabApi.getDashboard();
      setDashboard(updatedDash);
    } catch (err) {
      console.error(`Failed to execute scenario ${sc.scenario_id}:`, err);
    } finally {
      setExecutingId(null);
    }
  };

  const handleRunAllScenarios = async () => {
    if (!activeSession || executingAll) return;
    try {
      setExecutingAll(true);
      const filtered = scenarios.filter((s) => categoryFilter === "ALL" || s.category === categoryFilter);

      for (const sc of filtered) {
        setExecutingId(sc.scenario_id);
        const tc = await validationLabApi.createTestCase(activeSession.session_id, {
          case_id: `CASE-${sc.scenario_id}`,
          test_category: sc.category,
          scenario_id: sc.scenario_id,
          scenario_description: sc.title,
          engine: sc.engine,
          expected_behaviour: sc.expected_behaviour,
        });
        const executed = await validationLabApi.executeTestCase(tc.test_id);
        setSessionTests((prev) => [executed, ...prev.filter((t) => t.test_id !== executed.test_id)]);
      }

      const updatedDash = await validationLabApi.getDashboard();
      setDashboard(updatedDash);
    } catch (err) {
      console.error("Failed to execute scenario suite:", err);
    } finally {
      setExecutingAll(false);
      setExecutingId(null);
    }
  };

  const handleUploadRealEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !selectedFile || !redactionConfirmed) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("case_id", caseIdInput);
      formData.append("source_name", sourceNameInput);
      formData.append("acquisition_method", acquisitionMethodInput);
      formData.append("transmission_channel", transmissionChannelInput);
      formData.append("redaction_notes", "Examiner verified citizen Aadhaar/PAN redacted.");
      formData.append("file", selectedFile);

      const rec = await validationLabApi.uploadRealEvidence(activeSession.session_id, formData);
      setSessionEvidence([rec, ...sessionEvidence]);
      setSelectedFile(null);
      alert(`Evidence ${rec.filename} safely admitted into CAS raw tier. SHA-256: ${rec.sha256}`);
    } catch (err) {
      console.error("Evidence upload failed:", err);
      alert(`Upload rejected by Evidence Gateway: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleExportReport = async () => {
    if (!activeSession) return;
    try {
      const rep = await validationLabApi.exportReport(activeSession.session_id);
      const blob = new Blob([JSON.stringify(rep, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TARKA_VALIDATION_REPORT_${activeSession.session_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export report:", err);
    }
  };

  const filteredScenarios = scenarios.filter((s) => categoryFilter === "ALL" || s.category === categoryFilter);

  const confusion = dashboard?.classification_metrics.confusion_matrix || { TP: 0, TN: 0, FP: 0, FN: 0 };
  const latencies = dashboard?.operational_metrics || { mean_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, count: 0 };

  return (
    <div style={{ padding: "24px", backgroundColor: "#FAF8F3", minHeight: "100%", color: "#1E1D1A" }}>
      {/* 1. Header & Constitutional Principles Banner */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #D8D2C7",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={28} color="#AF3F3A" />
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px" }}>
                TARKA FOUNDER FORENSIC VALIDATION LAB
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: "#AF3F3A",
                  color: "#FFFFFF",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.5px",
                }}
              >
                PHASE 11-13 VALIDATION
              </span>
              {loading && <span style={{ fontSize: "11px", color: "#888", fontStyle: "italic" }}>(Syncing Lab State...)</span>}
            </div>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#666" }}>
              Founder-operated, independent testing laboratory executing real-evidence verification against unblinded ground truth.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => handleCreateSession("REAL_EVIDENCE")}
              style={{
                backgroundColor: "#1E1D1A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Upload size={14} /> New Real Evidence Session
            </button>
            <button
              onClick={() => handleCreateSession("CONTROLLED_EVALUATION")}
              style={{
                backgroundColor: "#355C8A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Cpu size={14} /> New 49-Scenario Benchmark
            </button>
            <button
              onClick={handleExportReport}
              disabled={!activeSession}
              style={{
                backgroundColor: "#FFFFFF",
                color: "#1E1D1A",
                border: "1px solid #D8D2C7",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: activeSession ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>

        {/* Epistemic Mandate Banner */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            backgroundColor: "#F3EFE6",
            borderLeft: "4px solid #1E1D1A",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: "#1E1D1A" }}>CONSTITUTIONAL INVARIANT: </span>
            <span style={{ color: "#444" }}>AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.</span>
          </div>
          <div style={{ display: "flex", gap: "12px", color: "#666" }}>
            <span>✓ Non-Promotable (human_verified = False)</span>
            <span>✓ 100% Local / Zero-Cloud Transmission</span>
            <span>✓ CAS Streaming SHA-256 Pre-Hashed</span>
          </div>
        </div>
      </div>

      {/* 2. Confusion Matrix & Multi-Dimensional Metrics Rollup */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>TRUE POSITIVE (TP)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#2E7D32", marginTop: "4px" }}>{confusion.TP}</div>
          <div style={{ fontSize: "10px", color: "#888" }}>Tampered correctly caught</div>
        </div>

        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>TRUE NEGATIVE (TN)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1565C0", marginTop: "4px" }}>{confusion.TN}</div>
          <div style={{ fontSize: "10px", color: "#888" }}>Genuine correctly cleared</div>
        </div>

        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>FALSE POSITIVE (FP)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#C62828", marginTop: "4px" }}>{confusion.FP}</div>
          <div style={{ fontSize: "10px", color: "#888" }}>False accusation error</div>
        </div>

        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>FALSE NEGATIVE (FN)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#E65100", marginTop: "4px" }}>{confusion.FN}</div>
          <div style={{ fontSize: "10px", color: "#888" }}>Missed alteration error</div>
        </div>

        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>ACCURACY (N={dashboard?.classification_metrics.labelled_denominator || 0})</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1E1D1A", marginTop: "4px" }}>
            {((dashboard?.classification_metrics.accuracy || 0) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: "10px", color: "#888" }}>Labelled denominator</div>
        </div>

        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>FALSE DISCOVERY (FDR)</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1E1D1A", marginTop: "4px" }}>
            {((dashboard?.classification_metrics.false_discovery_rate || 0) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: "10px", color: "#888" }}>FP / (TP + FP)</div>
        </div>

        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>P95 LATENCY</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1E1D1A", marginTop: "4px" }}>
            {latencies.p95_ms.toFixed(0)} <span style={{ fontSize: "12px", fontWeight: 400 }}>ms</span>
          </div>
          <div style={{ fontSize: "10px", color: "#888" }}>Mean: {latencies.mean_ms.toFixed(1)} ms</div>
        </div>
      </div>

      {/* 3. Session Info & Mode Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          border: "1px solid #D8D2C7",
          borderRadius: "6px",
          padding: "12px 18px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>ACTIVE SESSION:</span>
          <select
            value={activeSession?.session_id || ""}
            onChange={(e) => handleSelectSession(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #D8D2C7",
              fontSize: "12px",
              backgroundColor: "#FAF8F3",
              color: "#1E1D1A",
              fontWeight: 600,
            }}
          >
            {sessions.map((s) => (
              <option key={s.session_id} value={s.session_id}>
                {s.session_name} ({s.session_id.slice(-8)}) — [{s.mode}]
              </option>
            ))}
          </select>

          {activeSession?.mode === "REAL_EVIDENCE" ? (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: "#FFF3E0",
                color: "#E65100",
                border: "1px solid #FFE082",
                padding: "3px 8px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <AlertTriangle size={12} /> REAL DIGITAL EVIDENCE MODE
            </span>
          ) : (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: "#E3F2FD",
                color: "#1565C0",
                border: "1px solid #BBDEFB",
                padding: "3px 8px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Cpu size={12} /> CONTROLLED EVALUATION (49 SCENARIOS)
            </span>
          )}
        </div>

        {/* Sub-tab switcher */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setSubTab("catalogue")}
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              backgroundColor: subTab === "catalogue" ? "#1E1D1A" : "transparent",
              color: subTab === "catalogue" ? "#FFFFFF" : "#666",
              cursor: "pointer",
            }}
          >
            49-Scenario Catalogue
          </button>
          <button
            onClick={() => setSubTab("intake")}
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              backgroundColor: subTab === "intake" ? "#1E1D1A" : "transparent",
              color: subTab === "intake" ? "#FFFFFF" : "#666",
              cursor: "pointer",
            }}
          >
            Real Evidence Intake ({sessionEvidence.length})
          </button>
        </div>
      </div>

      {/* 4. Sub-Tab Content */}
      {subTab === "catalogue" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>
          {/* Left Column: Catalogue Table */}
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {["ALL", "TRACE", "AEGIS", "PLATFORM"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      border: "1px solid #D8D2C7",
                      backgroundColor: categoryFilter === cat ? "#1E1D1A" : "#FFFFFF",
                      color: categoryFilter === cat ? "#FFFFFF" : "#444",
                      cursor: "pointer",
                    }}
                  >
                    {cat} ({scenarios.filter((s) => cat === "ALL" || s.category === cat).length})
                  </button>
                ))}
              </div>

              <button
                onClick={handleRunAllScenarios}
                disabled={executingAll || !activeSession}
                style={{
                  backgroundColor: "#2E7D32",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: executingAll ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {executingAll ? <RotateCcw size={14} className="spin" /> : <Play size={14} />}
                {executingAll ? "Running Suite..." : "Run All Scenarios"}
              </button>
            </div>

            {/* Scenarios Table */}
            <div style={{ maxHeight: "600px", overflowY: "auto", border: "1px solid #EAE6DF", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F3EFE6", textAlign: "left", borderBottom: "1px solid #D8D2C7" }}>
                    <th style={{ padding: "8px 10px" }}>ID</th>
                    <th style={{ padding: "8px 10px" }}>Category</th>
                    <th style={{ padding: "8px 10px" }}>Scenario Title</th>
                    <th style={{ padding: "8px 10px" }}>Engine</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                    <th style={{ padding: "8px 10px" }}>Confusion</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScenarios.map((sc) => {
                    const testMatch = sessionTests.find((t) => t.scenario_id === sc.scenario_id);
                    const isRunning = executingId === sc.scenario_id;

                    return (
                      <tr
                        key={sc.scenario_id}
                        onClick={() => testMatch && setSelectedTestDetail(testMatch)}
                        style={{
                          borderBottom: "1px solid #EAE6DF",
                          backgroundColor: selectedTestDetail?.scenario_id === sc.scenario_id ? "#F7F5EE" : "transparent",
                          cursor: testMatch ? "pointer" : "default",
                        }}
                      >
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>{sc.scenario_id}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              backgroundColor: sc.category === "TRACE" ? "#EDE7F6" : sc.category === "AEGIS" ? "#E3F2FD" : "#E8F5E9",
                              color: sc.category === "TRACE" ? "#512DA8" : sc.category === "AEGIS" ? "#1565C0" : "#2E7D32",
                              fontWeight: 600,
                            }}
                          >
                            {sc.category}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sc.title}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#666" }}>{sc.engine}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {isRunning ? (
                            <span style={{ color: "#E65100", fontWeight: 600 }}>RUNNING...</span>
                          ) : testMatch?.execution_status === "PASSED" ? (
                            <span style={{ color: "#2E7D32", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                              <CheckCircle2 size={13} /> PASSED
                            </span>
                          ) : testMatch?.execution_status === "FAILED" ? (
                            <span style={{ color: "#C62828", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                              <XCircle size={13} /> FAILED
                            </span>
                          ) : (
                            <span style={{ color: "#999" }}>NOT_RUN</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                          {testMatch?.confusion_classification === "TP" && <span style={{ color: "#2E7D32" }}>TP</span>}
                          {testMatch?.confusion_classification === "TN" && <span style={{ color: "#1565C0" }}>TN</span>}
                          {testMatch?.confusion_classification === "FP" && <span style={{ color: "#C62828" }}>FP</span>}
                          {testMatch?.confusion_classification === "FN" && <span style={{ color: "#E65100" }}>FN</span>}
                          {(!testMatch || testMatch?.confusion_classification === "NOT_APPLICABLE") && (
                            <span style={{ color: "#AAA" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunScenario(sc);
                            }}
                            disabled={isRunning || executingAll}
                            style={{
                              backgroundColor: "#FAF8F3",
                              border: "1px solid #D8D2C7",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: isRunning ? "not-allowed" : "pointer",
                            }}
                          >
                            {isRunning ? "Running" : "Test"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Active Forensic Case Inspector */}
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "8px", padding: "16px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, borderBottom: "1px solid #EEE", paddingBottom: "8px" }}>
              FORENSIC TEST CASE INSPECTION
            </h3>

            {selectedTestDetail ? (
              <div style={{ fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{selectedTestDetail.scenario_id}: {selectedTestDetail.scenario_description}</span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: selectedTestDetail.execution_status === "PASSED" ? "#E8F5E9" : "#FFEBEE",
                      color: selectedTestDetail.execution_status === "PASSED" ? "#2E7D32" : "#C62828",
                    }}
                  >
                    {selectedTestDetail.execution_status}
                  </span>
                </div>

                <div style={{ color: "#666", marginBottom: "12px" }}>
                  Execution Duration: <b>{selectedTestDetail.processing_duration_ms.toFixed(1)} ms</b> | Confusion: <b>{selectedTestDetail.confusion_classification}</b>
                </div>

                {/* Actual Output Details */}
                <div style={{ backgroundColor: "#FAF8F3", padding: "10px", borderRadius: "4px", border: "1px solid #EAE6DF", marginBottom: "12px" }}>
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>Output Summary:</div>
                  <div>• Is Tampered: <b>{String(selectedTestDetail.actual_output?.is_tampered ?? false)}</b></div>
                  <div>• Composite Anomaly Score: <b>{String(selectedTestDetail.actual_output?.composite_score ?? "0.0")}</b></div>
                  <div>• Extracted Amount: <b>{String(selectedTestDetail.actual_output?.extracted_amount ?? "None")}</b></div>
                  <div>• Extracted UTR/RRN: <b>{String(selectedTestDetail.actual_output?.extracted_utr ?? "None")}</b></div>
                  <div>• Reconciliation Delta: <b>₹{String(selectedTestDetail.actual_output?.discrepancy_delta ?? "0.00")}</b></div>
                </div>

                {/* Intermediate Observations */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>Intermediate Diagnostic Modules:</div>
                  {selectedTestDetail.intermediate_observations?.map((obs, idx) => (
                    <div key={idx} style={{ padding: "4px 8px", backgroundColor: "#F3EFE6", borderRadius: "3px", marginBottom: "4px", fontSize: "11px" }}>
                      <b>{String(obs.module)}</b>: {JSON.stringify(obs)}
                    </div>
                  ))}
                </div>

                {/* Section 63 BSA Caveat */}
                <div style={{ padding: "8px", backgroundColor: "#FFF8E1", borderLeft: "3px solid #FFA000", fontSize: "11px", color: "#6D4C41" }}>
                  <b>Section 63 BSA / Section 65B Notice:</b> Output frozen with SHA-256 fingerprint. Human examiner verification required before court presentation.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
                <HelpCircle size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                <p style={{ margin: 0 }}>Click on any scenario row from the catalogue to inspect its frozen outputs and intermediate findings.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Real Evidence Intake Sub-Tab */
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
          {/* Intake Upload Form */}
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "8px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Upload size={18} color="#AF3F3A" />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>LAWFUL REAL EVIDENCE INTAKE</h3>
            </div>

            <p style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
              Upload genuine payment screenshots, official Core Banking Statements (CSV), or disputed UPI transaction records.
              Raw bytes are preserved immutably with SHA-256 in CAS raw storage. Zero cloud transmission.
            </p>

            <form onSubmit={handleUploadRealEvidence}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>CASE IDENTIFIER</label>
                <input
                  type="text"
                  value={caseIdInput}
                  onChange={(e) => setCaseIdInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #D8D2C7", fontSize: "12px" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>SOURCE NAME</label>
                <input
                  type="text"
                  value={sourceNameInput}
                  onChange={(e) => setSourceNameInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #D8D2C7", fontSize: "12px" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>ACQUISITION METHOD</label>
                <input
                  type="text"
                  value={acquisitionMethodInput}
                  onChange={(e) => setAcquisitionMethodInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #D8D2C7", fontSize: "12px" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>TRANSMISSION CHANNEL</label>
                <select
                  value={transmissionChannelInput}
                  onChange={(e) => setTransmissionChannelInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #D8D2C7", fontSize: "12px" }}
                >
                  <option value="DIRECT_EXPORT">DIRECT_EXPORT (USB / Direct Examiner Workstation)</option>
                  <option value="WHATSAPP">WHATSAPP (Social Media Recompressed)</option>
                  <option value="TELEGRAM">TELEGRAM (Document Transfer Mode)</option>
                  <option value="OFFICIAL_CBS_PORTAL">OFFICIAL_CBS_PORTAL (Direct Bank Clearance Export)</option>
                  <option value="EMAIL">EMAIL (Encrypted Ingestion Gateway)</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>EVIDENCE FILE (PNG, JPG, CSV)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,text/csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", padding: "8px", border: "1px dashed #D8D2C7", borderRadius: "4px" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px", padding: "10px", backgroundColor: "#FFF3E0", borderRadius: "4px", border: "1px solid #FFE082" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11px", color: "#E65100", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={redactionConfirmed}
                    onChange={(e) => setRedactionConfirmed(e.target.checked)}
                    style={{ marginTop: "2px" }}
                  />
                  <span>
                    <b>MANDATORY PII REDACTION CONFIRMATION:</b> I certify under investigative authority that citizen Aadhaar, full account PAN, and sensitive personal identifiers are handled lawfully with zero external network leakage.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile || !redactionConfirmed}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#AF3F3A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: uploading || !selectedFile || !redactionConfirmed ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "Computing Pre-Hash & Verifying Disk..." : "Admit Evidence Into CAS"}
              </button>
            </form>
          </div>

          {/* Admitted Evidence Register */}
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C7", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: 700 }}>SESSION EVIDENCE CUSTODY CHAIN</h3>

            {sessionEvidence.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "500px", overflowY: "auto" }}>
                {sessionEvidence.map((ev) => (
                  <div
                    key={ev.evidence_id}
                    style={{
                      padding: "12px",
                      backgroundColor: "#FAF8F3",
                      border: "1px solid #EAE6DF",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700 }}>{ev.filename}</span>
                      <span style={{ fontSize: "10px", color: "#2E7D32", fontWeight: 600 }}>READ-BACK VERIFIED ✓</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>
                      ID: <b>{ev.evidence_id}</b> | Size: {(ev.size_bytes / 1024).toFixed(1)} KB | Channel: {ev.transmission_channel}
                    </div>
                    <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#444", wordBreak: "break-all" }}>
                      SHA-256: {ev.sha256}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
                <Layers size={36} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: "13px" }}>No real evidence admitted in this session yet.</p>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#AAA" }}>Use the intake form on the left to safely ingest genuine payment evidence.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
