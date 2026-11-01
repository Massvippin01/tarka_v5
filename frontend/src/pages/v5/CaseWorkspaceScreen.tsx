import React, { useState, useMemo } from "react";
import {
  Shield,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Plus,
  FileUp,
  FileText,
  FileSpreadsheet,
  FileCode,
  Smartphone,
  Network,
  Fingerprint,
  Scale,
  Copy,
  Activity,
  Zap,
  Trash2,
  X,
  Database,
} from "lucide-react";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { useTarkaGlobal, type IngestedArtifact, type ActiveRoute } from "../../context/TarkaGlobalContext";

export const CaseWorkspaceScreen: React.FC = () => {
  const {
    caseWorkspaces,
    activeCaseId,
    selectCaseWorkspace,
    openNewCaseModal,
    openEvidenceModal,
    removeQuarantinedArtifact,
  } = useTarkaGlobal();

  const { togglePublicDatasetModal } = useTarkaUiStore();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "GOLDEN_HOUR" | "SYNDICATE" | "COURT_READY">("ALL");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Selected case for detail preview (defaults to activeCaseId)
  const [previewCaseId, setPreviewCaseId] = useState<string>(activeCaseId || "CASE-2026-001");

  // Keep previewCaseId in sync if activeCaseId exists
  const currentPreviewCase = useMemo(() => {
    return caseWorkspaces.find((c) => c.caseId === previewCaseId) || caseWorkspaces[0];
  }, [caseWorkspaces, previewCaseId]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return caseWorkspaces.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          c.caseId.toLowerCase().includes(q) ||
          c.firNumber.toLowerCase().includes(q) ||
          c.ncrpAckNo.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          c.leadInvestigator.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (filterMode === "GOLDEN_HOUR") {
        return c.goldenHourRemainingMins > 0;
      }
      if (filterMode === "SYNDICATE") {
        return c.syndicateLinks && c.syndicateLinks.length > 0;
      }
      if (filterMode === "COURT_READY") {
        return c.priority === "COURT_FILING_READY" || c.gatesPassed >= 4;
      }

      return true;
    });
  }, [caseWorkspaces, searchQuery, filterMode]);

  // Aggregate stats for 4 KPI tiles
  const totalGoldenHourActive = useMemo(() => {
    return caseWorkspaces.filter((c) => c.goldenHourRemainingMins > 0).length;
  }, [caseWorkspaces]);

  const totalShieldedCapital = useMemo(() => {
    return caseWorkspaces.reduce((acc, c) => acc + (c.commercialShieldedInr || 0), 0);
  }, [caseWorkspaces]);

  const totalArtifactsCount = useMemo(() => {
    return caseWorkspaces.reduce((acc, c) => acc + c.artifacts.length, 0);
  }, [caseWorkspaces]);

  const totalQuarantinedCount = useMemo(() => {
    return caseWorkspaces.reduce(
      (acc, c) => acc + c.artifacts.filter((a) => a.tier === "TIER_3_QUARANTINED").length,
      0
    );
  }, [caseWorkspaces]);

  const totalSyndicateAnchors = useMemo(() => {
    const anchors = new Set<string>();
    caseWorkspaces.forEach((c) => {
      c.syndicateLinks.forEach((link) => anchors.add(link.sharedAnchorValue));
    });
    return anchors.size;
  }, [caseWorkspaces]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getVectorIcon = (vector: IngestedArtifact["vectorType"]) => {
    switch (vector) {
      case "PDF_RECEIPT":
        return <FileText size={14} color="#E11D48" />;
      case "CBS_LEDGER":
        return <FileSpreadsheet size={14} color="#059669" />;
      case "TELCO_CGNAT":
        return <Network size={14} color="#0284C7" />;
      case "NPCI_XML":
        return <FileCode size={14} color="#4F46E5" />;
      case "WHATSAPP_APK":
        return <Smartphone size={14} color="#D97706" />;
      default:
        return <FileText size={14} color="#64748B" />;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const stagesList: { id: Exclude<ActiveRoute, "workspace">; label: string; num: string }[] = [
    { id: "intake", label: "Intake & Falsifier", num: "01" },
    { id: "entities", label: "Entity Resolution", num: "02" },
    { id: "attribution", label: "CGNAT Attribution", num: "03" },
    { id: "network", label: "Syndicate Network", num: "04" },
    { id: "taint-engine", label: "Taint Engine §106/107", num: "05" },
    { id: "court-proof", label: "Court Admissibility", num: "06" },
  ];

  return (
    <div
      id="tarka-workspace-body"
      style={{
        flex: "1 1 0%",
        minHeight: 0,
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F4F6FB",
        overflow: "hidden",
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
        boxSizing: "border-box",
      }}
    >
      {/* TIER 1: STATION COMMAND HEADER & 4 FORENSIC KPI TILES */}
      <div
        style={{
          flexShrink: 0,
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          padding: "8px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxSizing: "border-box",
        }}
      >
        {/* Row 1: Command Header & Action Controls (Strict 32px Single-Line) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "nowrap",
            minWidth: 0,
          }}
        >
          {/* Station Badge & Security Clearance */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4F46E5",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.15)",
                flexShrink: 0,
              }}
            >
              <Shield size={16} strokeWidth={2.4} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 800,
                    letterSpacing: "0.03em",
                    color: "#09090B",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  NOIDA NODE #UP-16
                </span>
                <span
                  className="hidden md:inline-flex"
                  style={{
                    alignItems: "center",
                    gap: "3px",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    background: "#ECFDF5",
                    color: "#059669",
                    border: "1px solid #A7F3D0",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "#10B981",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  I4C SAMANVAYA · BSA §63
                </span>
              </div>
            </div>
          </div>

          {/* Search, Filter Pills & Action CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {/* Search Input */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search
                size={12}
                color="#94A3B8"
                style={{ position: "absolute", left: "8px", pointerEvents: "none" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FIR, Ack, Complainant..."
                style={{
                  width: "180px",
                  padding: "4px 22px 4px 26px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  fontSize: "11px",
                  color: "#0F172A",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "5px",
                    background: "transparent",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: "1px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "1.5px",
              }}
            >
              <button
                type="button"
                onClick={() => setFilterMode("ALL")}
                style={{
                  border: "none",
                  borderRadius: "5px",
                  padding: "3px 7px",
                  fontSize: "10.5px",
                  fontWeight: filterMode === "ALL" ? 700 : 500,
                  background: filterMode === "ALL" ? "#FFFFFF" : "transparent",
                  color: filterMode === "ALL" ? "#0F172A" : "#64748B",
                  boxShadow: filterMode === "ALL" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                }}
              >
                All ({caseWorkspaces.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("GOLDEN_HOUR")}
                style={{
                  border: "none",
                  borderRadius: "5px",
                  padding: "3px 7px",
                  fontSize: "10.5px",
                  fontWeight: filterMode === "GOLDEN_HOUR" ? 700 : 500,
                  background: filterMode === "GOLDEN_HOUR" ? "#FEF3C7" : "transparent",
                  color: filterMode === "GOLDEN_HOUR" ? "#92400E" : "#64748B",
                  boxShadow: filterMode === "GOLDEN_HOUR" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Zap size={10} color="#D97706" />
                <span>Golden Hour</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("SYNDICATE")}
                style={{
                  border: "none",
                  borderRadius: "5px",
                  padding: "3px 7px",
                  fontSize: "10.5px",
                  fontWeight: filterMode === "SYNDICATE" ? 700 : 500,
                  background: filterMode === "SYNDICATE" ? "#FFFFFF" : "transparent",
                  color: filterMode === "SYNDICATE" ? "#4338CA" : "#64748B",
                  boxShadow: filterMode === "SYNDICATE" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                }}
              >
                Syndicate Link
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("COURT_READY")}
                style={{
                  border: "none",
                  borderRadius: "5px",
                  padding: "3px 7px",
                  fontSize: "10.5px",
                  fontWeight: filterMode === "COURT_READY" ? 700 : 500,
                  background: filterMode === "COURT_READY" ? "#ECFDF5" : "transparent",
                  color: filterMode === "COURT_READY" ? "#047857" : "#64748B",
                  boxShadow: filterMode === "COURT_READY" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                }}
              >
                Court Ready
              </button>
            </div>

            <div style={{ width: "1px", height: "16px", background: "#E2E8F0" }} />

            {/* CTAs */}
            <button
              type="button"
              onClick={openNewCaseModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 9px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#1E293B",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Plus size={12} color="#4F46E5" />
              <span>New Case</span>
            </button>

            <button
              type="button"
              onClick={() => openEvidenceModal(currentPreviewCase?.caseId)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid #4338CA",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
              }}
            >
              <FileUp size={12} />
              <span>Ingest Evidence</span>
            </button>

            <button
              type="button"
              onClick={togglePublicDatasetModal}
              title="Benchmark against Kaggle PaySim 6.3M, IBM AML 5M, IEEE-CIS (Alt+D)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 9px",
                borderRadius: "6px",
                border: "1px solid #C7D2FE",
                background: "#EEF2FF",
                color: "#3730A3",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.08)",
              }}
            >
              <Database size={12} color="#4F46E5" />
              <span>Datasets (Alt+D)</span>
            </button>
          </div>
        </div>

        {/* Row 2: 4 Forensic Station KPI Bento Cards (Compact High-Contrast Strip) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "8px",
            boxSizing: "border-box",
          }}
        >
          {/* Tile 1: Golden Hour SLA Triage */}
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "8px",
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 2px rgba(217, 119, 6, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Clock size={13} color="#D97706" />
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#92400E", letterSpacing: "0.02em" }}>
                  GOLDEN-HOUR TRIAGE
                </span>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "0.5px 4px",
                  borderRadius: "3px",
                  background: "#FEF3C7",
                  color: "#92400E",
                  border: "1px solid #FCD34D",
                }}
              >
                180m SLA
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: "#78350F",
                  letterSpacing: "-0.02em",
                }}
              >
                {totalGoldenHourActive} LIVE CASES
              </div>
              <span style={{ fontSize: "10px", color: "#B45309", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                Dr. Meera Nair (38m)
              </span>
            </div>
          </div>

          {/* Tile 2: Capital Under Lien */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Scale size={13} color="#4F46E5" />
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1E293B", letterSpacing: "0.02em" }}>
                  PROTECTED CAPITAL §106/107
                </span>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "0.5px 4px",
                  borderRadius: "3px",
                  background: "#EEF2FF",
                  color: "#4338CA",
                  border: "1px solid #C7D2FE",
                }}
              >
                PROV. LIEN
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: "#0F172A",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatCurrency(totalShieldedCapital)}
              </div>
              <span style={{ fontSize: "10px", color: "#059669", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                99.8% Recovery Prob.
              </span>
            </div>
          </div>

          {/* Tile 3: Evidence Locker Integrity */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Fingerprint size={13} color="#059669" />
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#1E293B", letterSpacing: "0.02em" }}>
                  EVIDENCE INTEGRITY
                </span>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "0.5px 4px",
                  borderRadius: "3px",
                  background: "#ECFDF5",
                  color: "#047857",
                  border: "1px solid #A7F3D0",
                }}
              >
                100% AIR-GAP
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: "#0F172A",
                  letterSpacing: "-0.02em",
                }}
              >
                {totalArtifactsCount} EXHIBITS
              </div>
              <span style={{ fontSize: "10px", color: "#BE123C", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {totalQuarantinedCount} Quarantined
              </span>
            </div>
          </div>

          {/* Tile 4: Cross-Case Syndicate Hits */}
          <div
            style={{
              background: "#EEF2FF",
              border: "1px solid #C7D2FE",
              borderRadius: "8px",
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 2px rgba(79, 70, 229, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Network size={13} color="#4F46E5" />
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#312E81", letterSpacing: "0.02em" }}>
                  SYNDICATE OVERLAPS
                </span>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "0.5px 4px",
                  borderRadius: "3px",
                  background: "#E0E7FF",
                  color: "#3730A3",
                  border: "1px solid #C7D2FE",
                }}
              >
                I4C MATCH
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: "#1E1B4B",
                  letterSpacing: "-0.02em",
                }}
              >
                {totalSyndicateAnchors} HARDWARE ANCHORS
              </div>
              <span style={{ fontSize: "10px", color: "#4F46E5", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                JA4 · TAC · BSSID
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: 12-COLUMN RESIZABLE SPLIT WORKBENCH */}
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 58fr) minmax(0, 42fr)",
          gap: "12px",
          padding: "12px 16px 14px 16px",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* LEFT PANE: Master Case Workspaces List */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          {/* Sub-Header */}
          <div
            style={{
              padding: "8px 14px",
              background: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "10.5px",
              color: "#64748B",
              fontFamily: "var(--font-mono)",
              flexShrink: 0,
            }}
          >
            <span>SHOWING {filteredCases.length} OF {caseWorkspaces.length} REGISTERED INVESTIGATIONS</span>
            <span>SORT: SLA PRIORITY / INCIDENT DESCENDING</span>
          </div>

          {/* Scrollable Cards Container */}
          <div
            style={{
              flex: "1 1 0%",
              minHeight: 0,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {filteredCases.map((cw) => {
              const isSelected = previewCaseId === cw.caseId;
              const isGoldenHour = cw.goldenHourRemainingMins > 0;
              const hasSuppression = cw.bookedLossInr > cw.claimedLossInr * 2;
              const suppressionFactor =
                cw.claimedLossInr > 0 ? (cw.bookedLossInr / cw.claimedLossInr).toFixed(1) : "0";

              return (
                <div
                  key={cw.caseId}
                  onClick={() => setPreviewCaseId(cw.caseId)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                    background: isSelected ? "#F8FAFF" : "#FFFFFF",
                    boxShadow: isSelected
                      ? "0 4px 12px -2px rgba(79, 70, 229, 0.12)"
                      : "0 1px 3px rgba(15, 23, 42, 0.04)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Top Row: Priority Pill & Identifiers */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {isGoldenHour ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 7px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: "#FEF3C7",
                            color: "#92400E",
                            border: "1px solid #FCD34D",
                          }}
                        >
                          <Zap size={11} color="#D97706" />
                          <span>⚡ GOLDEN-HOUR · {cw.goldenHourRemainingMins}M REMAINING</span>
                        </span>
                      ) : cw.priority === "HIGH_SYNDICATE" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 7px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: "#EEF2FF",
                            color: "#4338CA",
                            border: "1px solid #C7D2FE",
                          }}
                        >
                          <Network size={11} color="#4F46E5" />
                          <span>🔗 MULTI-STATE SYNDICATE</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 7px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: "#ECFDF5",
                            color: "#047857",
                            border: "1px solid #A7F3D0",
                          }}
                        >
                          <CheckCircle2 size={11} color="#059669" />
                          <span>🏛️ COURT FILING READY</span>
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)",
                          color: "#1E293B",
                          background: "#F1F5F9",
                          border: "1px solid #E2E8F0",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {cw.caseId}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "10.5px",
                        fontFamily: "var(--font-mono)",
                        color: "#64748B",
                        display: "flex",
                        gap: "6px",
                      }}
                    >
                      <span>{cw.firNumber}</span>
                      <span>•</span>
                      <span>{cw.ncrpAckNo}</span>
                    </div>
                  </div>

                  {/* Title & Complainant Details */}
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0F172A", lineHeight: 1.3 }}>
                      {cw.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        color: "#64748B",
                        marginTop: "3px",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#334155" }}>{cw.complainantName}</span>
                      <span>·</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cw.policeStation}
                      </span>
                      <span>·</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#64748B" }}>
                        {cw.leadInvestigator}
                      </span>
                    </div>
                  </div>

                  {/* Syndicate Shared Anchor Pill if any */}
                  {cw.syndicateLinks && cw.syndicateLinks.length > 0 && (
                    <div
                      style={{
                        background: "#EEF2FF",
                        border: "1px solid #C7D2FE",
                        borderRadius: "6px",
                        padding: "5px 8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "10.5px",
                        fontFamily: "var(--font-mono)",
                        color: "#3730A3",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Network size={12} color="#4F46E5" />
                        <span>SHARED {cw.syndicateLinks[0].sharedAnchorType}:</span>
                        <span style={{ fontWeight: 700 }}>{cw.syndicateLinks[0].sharedAnchorValue}</span>
                      </div>
                      <span
                        style={{
                          fontSize: "9.5px",
                          background: "#FFFFFF",
                          border: "1px solid #C7D2FE",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          color: "#4338CA",
                        }}
                      >
                        Linked to {cw.syndicateLinks[0].linkedCaseId}
                      </span>
                    </div>
                  )}

                  {/* Financial Audit Well */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "6px",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      padding: "6px 8px",
                      fontSize: "11px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "9px", color: "#64748B", display: "block", textTransform: "uppercase" }}>
                        Claimed Loss
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#334155" }}>
                        {formatCurrency(cw.claimedLossInr)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: "9px", color: "#64748B", display: "block", textTransform: "uppercase" }}>
                        Booked Loss
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "#0F172A" }}>
                        {formatCurrency(cw.bookedLossInr)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: "9px", color: "#64748B", display: "block", textTransform: "uppercase" }}>
                        Recoverable §106/107
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "#059669" }}>
                        {formatCurrency(cw.recoverableInr)}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {hasSuppression ? (
                        <div>
                          <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#E11D48", display: "block" }}>
                            DISCREPANCY
                          </span>
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 800,
                              fontFamily: "var(--font-mono)",
                              background: "#FFF1F2",
                              color: "#BE123C",
                              border: "1px solid #FECDD3",
                              padding: "1px 4px",
                              borderRadius: "3px",
                            }}
                          >
                            {suppressionFactor}× SUPPRESSION
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontSize: "8.5px", color: "#64748B", display: "block" }}>
                            Shielded Merchant
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#334155" }}>
                            {formatCurrency(cw.commercialShieldedInr)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: 6-Stage Progress Indicator & Deep Workbench CTA */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "2px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {stagesList.map((st, i) => {
                        const isCurrent = cw.currentStage === st.id;
                        const isPassed = i < cw.gatesPassed;
                        return (
                          <div
                            key={st.id}
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: isCurrent ? 800 : 600,
                              padding: "2px 5px",
                              borderRadius: "3px",
                              background: isCurrent
                                ? "#4F46E5"
                                : isPassed
                                ? "#ECFDF5"
                                : "#F1F5F9",
                              color: isCurrent
                                ? "#FFFFFF"
                                : isPassed
                                ? "#047857"
                                : "#94A3B8",
                              border: isPassed ? "1px solid #A7F3D0" : "1px solid transparent",
                            }}
                            title={`${st.num} ${st.label}`}
                          >
                            {st.num}
                          </div>
                        );
                      })}
                      <span style={{ fontSize: "10.5px", color: "#64748B", fontFamily: "var(--font-mono)", marginLeft: "4px" }}>
                        Gate {cw.gatesPassed}/5 Verified
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCaseWorkspace(cw.caseId, cw.currentStage);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "1px solid #C7D2FE",
                        background: "#EEF2FF",
                        color: "#4338CA",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <span>Open Deep Workbench</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Selected Case Dossier Preview & Artifact Locker */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minHeight: 0,
            overflowY: "auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          {currentPreviewCase ? (
            <>
              {/* Card 1: Dossier Header & Primary Launch Action */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#4F46E5",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ACTIVE CASE DOSSIER
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      color: "#1E293B",
                    }}
                  >
                    {currentPreviewCase.caseId}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", lineHeight: 1.3 }}>
                    {currentPreviewCase.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "3px" }}>
                    {currentPreviewCase.policeStation} · Lead:{" "}
                    <span style={{ fontWeight: 700, color: "#334155", fontFamily: "var(--font-mono)" }}>
                      {currentPreviewCase.leadInvestigator}
                    </span>
                  </div>
                </div>

                {/* Big Primary Launch Workbench Button */}
                <button
                  type="button"
                  onClick={() => selectCaseWorkspace(currentPreviewCase.caseId, currentPreviewCase.currentStage)}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "1px solid #4338CA",
                    background: "#4F46E5",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)",
                  }}
                >
                  <Activity size={14} />
                  <span>Launch Deep Investigation Workbench</span>
                  <ArrowRight size={13} />
                </button>

                {/* Quick Stage Jump Navigation */}
                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "8px" }}>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      color: "#64748B",
                      fontFamily: "var(--font-mono)",
                      display: "block",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                    }}
                  >
                    Quick-Jump Investigation Pipeline:
                  </span>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "5px",
                    }}
                  >
                    {stagesList.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => selectCaseWorkspace(currentPreviewCase.caseId, st.id)}
                        style={{
                          padding: "4px 6px",
                          borderRadius: "5px",
                          border: "1px solid #E2E8F0",
                          background: "#FFFFFF",
                          color: "#334155",
                          fontSize: "10.5px",
                          fontFamily: "var(--font-mono)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "#4F46E5" }}>{st.num}</span>
                        <span style={{ fontSize: "9.5px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {st.id}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Cryptographic Evidence Locker */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Fingerprint size={15} color="#4F46E5" />
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                      CRYPTOGRAPHIC EVIDENCE LOCKER
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        background: "#F1F5F9",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        color: "#475569",
                      }}
                    >
                      {currentPreviewCase.artifacts.length} EXHIBITS
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEvidenceModal(currentPreviewCase.caseId)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#4F46E5",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Plus size={12} />
                    <span>Insert Evidence</span>
                  </button>
                </div>

                {/* Artifacts Items List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    maxHeight: "260px",
                    overflowY: "auto",
                  }}
                >
                  {currentPreviewCase.artifacts.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        fontSize: "11px",
                        color: "#94A3B8",
                        fontFamily: "var(--font-mono)",
                        border: "1px dashed #CBD5E1",
                        borderRadius: "8px",
                      }}
                    >
                      No forensic exhibits ingested yet.
                    </div>
                  ) : (
                    currentPreviewCase.artifacts.map((art) => {
                      const isQuarantined = art.tier === "TIER_3_QUARANTINED";
                      return (
                        <div
                          key={art.id}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "7px",
                            border: `1px solid ${isQuarantined ? "#FECDD3" : "#E2E8F0"}`,
                            background: isQuarantined ? "#FFF1F2" : "#F8FAFC",
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                              {getVectorIcon(art.vectorType)}
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  color: "#0F172A",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "200px",
                                }}
                                title={art.filename}
                              >
                                {art.filename}
                              </span>
                              <span style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                                ({(art.byteSize / 1024).toFixed(1)} KB)
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              {isQuarantined ? (
                                <span
                                  style={{
                                    fontSize: "8.5px",
                                    fontWeight: 800,
                                    fontFamily: "var(--font-mono)",
                                    background: "#FFE4E6",
                                    color: "#BE123C",
                                    border: "1px solid #FECDD3",
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                  }}
                                >
                                  QUARANTINED
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "8.5px",
                                    fontWeight: 800,
                                    fontFamily: "var(--font-mono)",
                                    background: "#ECFDF5",
                                    color: "#047857",
                                    border: "1px solid #A7F3D0",
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                  }}
                                >
                                  TIER-1 CERTIFIED
                                </span>
                              )}

                              {isQuarantined && (
                                <button
                                  type="button"
                                  onClick={() => removeQuarantinedArtifact(currentPreviewCase.caseId, art.id)}
                                  title="Remove Quarantined Exhibit"
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#94A3B8",
                                    cursor: "pointer",
                                    padding: "1px",
                                  }}
                                >
                                  <Trash2 size={12} color="#E11D48" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Hash & BIP39 Words */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "10px",
                              fontFamily: "var(--font-mono)",
                              borderTop: "1px solid rgba(0,0,0,0.05)",
                              paddingTop: "4px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748B" }}>
                              <span>SHA-256:</span>
                              <span style={{ color: "#334155" }}>{art.sha256.slice(0, 14)}...</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(art.sha256)}
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}
                                title="Copy Full SHA-256"
                              >
                                <Copy size={10} />
                              </button>
                              {copiedHash === art.sha256 && (
                                <span style={{ color: "#059669", fontSize: "9px" }}>Copied!</span>
                              )}
                            </div>

                            <span
                              style={{
                                background: "#EEF2FF",
                                border: "1px solid #C7D2FE",
                                color: "#4338CA",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                fontSize: "9px",
                              }}
                              title={art.phoneticReadout ? `Courtroom Phonetic Readout: ${art.phoneticReadout}` : "Phonetic Seal"}
                            >
                              {art.phoneticReadout ? art.phoneticReadout.split(" · ").slice(0, 3).join(" · ") : art.bip39Words.slice(0, 3).join(" · ")}
                            </span>
                          </div>

                          {/* Gate Detail */}
                          <div style={{ fontSize: "9.5px", color: "#64748B", lineHeight: 1.3 }}>
                            {art.gateDetail}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropzone Trigger CTA */}
                <button
                  type="button"
                  onClick={() => openEvidenceModal(currentPreviewCase.caseId)}
                  style={{
                    padding: "10px",
                    border: "1px dashed #4F46E5",
                    borderRadius: "8px",
                    background: "#EEF2FF",
                    color: "#4338CA",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <FileUp size={14} />
                  <span>+ Drag &amp; Drop or Click to Hash &amp; Ingest Raw Exhibit</span>
                </button>
              </div>

              {/* Card 3: Syndicate Telemetry Overlap Box */}
              {currentPreviewCase.syndicateLinks && currentPreviewCase.syndicateLinks.length > 0 && (
                <div
                  style={{
                    background: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Network size={14} color="#4F46E5" />
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#312E81" }}>
                        CROSS-CASE SYNDICATE TELEMETRY
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "9px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        background: "#FFFFFF",
                        border: "1px solid #C7D2FE",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        color: "#4338CA",
                      }}
                    >
                      I4C SAMANVAYA HIT
                    </span>
                  </div>

                  <p style={{ fontSize: "11px", color: "#3730A3", margin: 0, lineHeight: 1.4 }}>
                    Correlates with{" "}
                    <strong style={{ fontFamily: "var(--font-mono)" }}>
                      {currentPreviewCase.syndicateLinks[0].linkedCaseId}
                    </strong>{" "}
                    via identical {currentPreviewCase.syndicateLinks[0].sharedAnchorType} (
                    <code
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        background: "#FFFFFF",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        border: "1px solid #C7D2FE",
                      }}
                    >
                      {currentPreviewCase.syndicateLinks[0].sharedAnchorValue}
                    </code>
                    ). Indicates shared operational hardware across state lines.
                  </p>

                  <button
                    type="button"
                    onClick={() => setPreviewCaseId(currentPreviewCase.syndicateLinks[0].linkedCaseId)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#4338CA",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      paddingTop: "2px",
                    }}
                  >
                    <span>Inspect Linked Case ({currentPreviewCase.syndicateLinks[0].linkedCaseId})</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8", fontSize: "12px" }}>
              Select a case from the workbench list to inspect its dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
