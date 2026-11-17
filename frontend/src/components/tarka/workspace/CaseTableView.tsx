import React, { useState } from "react";
import {
  ArrowRight,
  Link2,
  UserCheck,
  Zap,
  MoreHorizontal,
  Edit3,
  Archive,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { CaseWorkspace, ActiveRoute } from "../../../context/TarkaGlobalContext";
import { formatInr } from "../../../utils/formatters";
import { STATUS_LABELS } from "../../../types/caseLifecycle";

interface CaseTableViewProps {
  cases: CaseWorkspace[];
  activeCaseId: string;
  onSelectCase: (caseId: string, stage?: ActiveRoute) => void;
  onOpenCompare: (caseId: string, linkedCaseId: string) => void;
  onEditCase?: (caseItem: CaseWorkspace) => void;
  onLinkCase?: (caseItem: CaseWorkspace) => void;
  onArchiveCase?: (caseId: string) => void;
  onDeleteDraft?: (caseId: string) => void;
  onChangeStatus?: (caseItem: CaseWorkspace) => void;
  onBulkAssign?: (caseIds: string[]) => void;
  onBulkArchive?: (caseIds: string[]) => void;
}

export const CaseTableView: React.FC<CaseTableViewProps> = ({
  cases,
  activeCaseId,
  onSelectCase,
  onOpenCompare,
  onEditCase,
  onLinkCase,
  onArchiveCase,
  onDeleteDraft,
  onChangeStatus: _onChangeStatus,
  onBulkAssign,
  onBulkArchive,
}) => {
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [activeMenuCaseId, setActiveMenuCaseId] = useState<string | null>(null);

  const handleToggleSelect = (caseId: string) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedCaseIds.size === cases.length) {
      setSelectedCaseIds(new Set());
    } else {
      setSelectedCaseIds(new Set(cases.map((c) => c.caseId)));
    }
  };

  const getTypologyColor = (typology: string) => {
    switch (typology) {
      case "DIGITAL_ARREST":
        return { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", label: "Digital Arrest" };
      case "APK_SIM_SWAP":
        return { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A", label: "SIM Swap / APK" };
      case "TELEGRAM_INVESTMENT":
        return { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE", label: "Investment Scam" };
      case "CORPORATE_BEC":
        return { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE", label: "Corporate BEC" };
      default:
        return { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0", label: "Cyber Fraud" };
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
      onClick={() => setActiveMenuCaseId(null)}
    >
      {/* Dense High-Performance Data Table */}
      <div style={{ flex: "1 1 auto", overflowX: "auto", overflowY: "auto", scrollbarWidth: "thin" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
            textAlign: "left",
            whiteSpace: "nowrap",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#F8FAFC",
                borderBottom: "1px solid #CBD5E1",
                position: "sticky",
                top: 0,
                zIndex: 10,
                color: "#475569",
              }}
            >
              <th style={{ padding: "8px 10px", width: "32px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedCaseIds.size > 0 && selectedCaseIds.size === cases.length}
                  onChange={handleSelectAll}
                  style={{ cursor: "pointer", accentColor: "#4F46E5" }}
                />
              </th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>Case ID & Typology</th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>Status</th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>Title & Complainant</th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>NCRP Ack / FIR</th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>Priority & SLA</th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>Loss vs Protected</th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>Syndicate Links</th>
              <th style={{ padding: "8px 10px", fontWeight: 800 }}>Lead IO</th>
              <th style={{ padding: "8px 10px", fontWeight: 800, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c, idx) => {
              const isSelected = selectedCaseIds.has(c.caseId);
              const isActive = c.caseId === activeCaseId;
              const typo = getTypologyColor(c.typology);
              const shielded = c.recoverableInr || c.commercialShieldedInr || 0;
              const ratio = c.bookedLossInr > 0 ? Math.round((shielded / c.bookedLossInr) * 100) : 0;
              const statusKey = ((c as any).status || "INVESTIGATING").toUpperCase();
              const statusMeta = STATUS_LABELS[statusKey] || STATUS_LABELS.INVESTIGATING;
              const isDraft = statusKey === "DRAFT";
              const isArchived = statusKey === "ARCHIVED";

              return (
                <tr
                  key={c.caseId}
                  onClick={() => onSelectCase(c.caseId)}
                  style={{
                    borderBottom: "1px solid #E2E8F0",
                    background: isSelected
                      ? "#EFF6FF"
                      : isActive
                      ? "#F8FAFC"
                      : idx % 2 === 0
                      ? "#FFFFFF"
                      : "#FAFAFA",
                    cursor: "pointer",
                    transition: "background 0.12s ease",
                  }}
                  className="hover:bg-indigo-50/50"
                >
                  {/* Select Checkbox */}
                  <td
                    style={{ padding: "8px 10px", textAlign: "center" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(c.caseId);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(c.caseId)}
                      style={{ cursor: "pointer", accentColor: "#4F46E5" }}
                    />
                  </td>

                  {/* Case ID & Typology Badge */}
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 800,
                          fontSize: "11px",
                          color: isActive ? "#0284C7" : "#0F172A",
                        }}
                      >
                        {c.caseId}
                      </span>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: typo.bg,
                          color: typo.text,
                          border: `1px solid ${typo.border}`,
                        }}
                      >
                        {typo.label}
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: "8px 10px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: statusMeta.bg,
                        color: statusMeta.text,
                        border: `1px solid ${statusMeta.border}`,
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: statusMeta.text,
                        }}
                      />
                      <span>{statusMeta.label}</span>
                    </span>
                  </td>

                  {/* Title & Complainant */}
                  <td style={{ padding: "8px 10px", maxWidth: "240px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#1E293B",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={c.title}
                      >
                        {c.title}
                      </span>
                      <span style={{ fontSize: "10px", color: "#64748B" }}>
                        Victim: {c.complainantName}
                      </span>
                    </div>
                  </td>

                  {/* NCRP Ack / FIR */}
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#334155" }}>
                        {c.firNumber}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "#64748B" }}>
                        {c.ncrpAckNo}
                      </span>
                    </div>
                  </td>

                  {/* Priority & Golden Hour SLA */}
                  <td style={{ padding: "8px 10px" }}>
                    {c.goldenHourRemainingMins > 0 ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#FEF3C7",
                          color: "#92400E",
                          border: "1px solid #FCD34D",
                        }}
                      >
                        <Zap size={11} color="#D97706" />
                        <span>{c.goldenHourRemainingMins}m SLA Active</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#FFF1F2",
                          color: "#BE123C",
                          border: "1px solid #FECDD3",
                        }}
                      >
                        Golden hour expired
                      </span>
                    )}
                  </td>

                  {/* Loss vs Protected Progress Bar */}
                  <td style={{ padding: "8px 10px", minWidth: "150px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                        <span style={{ fontWeight: 800, color: "#0F172A" }}>{formatInr(c.bookedLossInr)}</span>
                        <span style={{ fontWeight: 800, color: ratio > 0 ? "#059669" : "#64748B" }}>
                          {formatInr(shielded)} ({ratio}%)
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, ratio)}%`, height: "100%", background: "#10B981" }} />
                      </div>
                    </div>
                  </td>

                  {/* Syndicate Links */}
                  <td style={{ padding: "8px 10px" }}>
                    {c.syndicateLinks && c.syndicateLinks.length > 0 ? (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {Array.from(
                          new Map(c.syndicateLinks.map((link: any) => [link.linkedCaseId, link])).values()
                        ).map((link: any, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCompare(c.caseId, link.linkedCaseId);
                            }}
                            title={`Compare with ${link.linkedCaseId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "9.5px",
                              fontWeight: 700,
                              padding: "2px 5px",
                              borderRadius: "4px",
                              border: "1px solid #C7D2FE",
                              background: "#EEF2FF",
                              color: "#4338CA",
                              cursor: "pointer",
                            }}
                          >
                            <Link2 size={10} />
                            <span>{link.linkedCaseId}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: "10px", color: "#94A3B8" }}>Isolated Case</span>
                    )}
                  </td>

                  {/* Lead IO */}
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontSize: "10.5px", color: "#475569", fontWeight: 600 }}>
                      {c.leadInvestigator}
                    </span>
                  </td>

                  {/* Actions CTA with Dropdown Menu */}
                  <td style={{ padding: "8px 10px", textAlign: "right", position: "relative" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c.caseId);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "4px 8px",
                          borderRadius: "5px",
                          border: "1px solid #C7D2FE",
                          background: "#FFFFFF",
                          color: "#4F46E5",
                          cursor: "pointer",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        <span>Open</span>
                        <ArrowRight size={11} />
                      </button>

                      <button
                        type="button"
                        data-testid={`case-row-menu-${c.caseId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuCaseId(activeMenuCaseId === c.caseId ? null : c.caseId);
                        }}
                        style={{
                          padding: "4px 6px",
                          borderRadius: "5px",
                          border: "1px solid #E2E8F0",
                          background: "#FFFFFF",
                          color: "#64748B",
                          cursor: "pointer",
                        }}
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </div>

                    {/* Row Context Menu */}
                    {activeMenuCaseId === c.caseId && (
                      <div
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "100%",
                          zIndex: 100,
                          background: "#FFFFFF",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)",
                          minWidth: "160px",
                          padding: "4px",
                          textAlign: "left",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuCaseId(null);
                            onSelectCase(c.caseId);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            border: "none",
                            background: "transparent",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#1E293B",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <ExternalLink size={12} color="#4F46E5" />
                          <span>Open Workbench</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuCaseId(null);
                            if (onEditCase) onEditCase(c);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            border: "none",
                            background: "transparent",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#1E293B",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Edit3 size={12} color="#0284C7" />
                          <span>Edit Parameters</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuCaseId(null);
                            if (onLinkCase) onLinkCase(c);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            border: "none",
                            background: "transparent",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#1E293B",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Link2 size={12} color="#6D28D9" />
                          <span>Link Related Case</span>
                        </button>

                        {!isArchived && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuCaseId(null);
                              if (onArchiveCase) onArchiveCase(c.caseId);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 8px",
                              borderRadius: "4px",
                              border: "none",
                              background: "transparent",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#B45309",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF3C7")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Archive size={12} />
                            <span>Archive Case</span>
                          </button>
                        )}

                        {isDraft && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuCaseId(null);
                              if (onDeleteDraft) onDeleteDraft(c.caseId);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 8px",
                              borderRadius: "4px",
                              border: "none",
                              background: "transparent",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#DC2626",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE2E2")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Trash2 size={12} />
                            <span>Delete Draft</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Multi-Select Bulk Action Bar */}
      {selectedCaseIds.size > 0 && (
        <div
          data-testid="bulk-action-bar"
          style={{
            position: "absolute",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0F172A",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            zIndex: 100,
            color: "#FFFFFF",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#38BDF8" }}>
            {selectedCaseIds.size} {selectedCaseIds.size === 1 ? "Case" : "Cases"} Selected
          </span>

          <div style={{ width: "1px", height: "16px", background: "#334155" }} />

          <button
            type="button"
            onClick={() => {
              if (onBulkAssign) {
                onBulkAssign(Array.from(selectedCaseIds));
              } else {
                toast.success(`Assigned Lead IO to ${selectedCaseIds.size} cases.`);
              }
              setSelectedCaseIds(new Set());
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: "5px",
              border: "1px solid #475569",
              background: "#1E293B",
              color: "#F8FAFC",
              cursor: "pointer",
            }}
          >
            <UserCheck size={12} />
            <span>Assign Lead IO</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onBulkArchive) {
                onBulkArchive(Array.from(selectedCaseIds));
              } else {
                toast.success(`Archived ${selectedCaseIds.size} cases.`);
              }
              setSelectedCaseIds(new Set());
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: "5px",
              border: "1px solid #475569",
              background: "#1E293B",
              color: "#F8FAFC",
              cursor: "pointer",
            }}
          >
            <Archive size={12} />
            <span>Bulk Archive</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCaseIds(new Set())}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};
