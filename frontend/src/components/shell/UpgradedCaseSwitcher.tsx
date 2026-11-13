import React, { useState, useMemo, useRef, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Shield,
  ChevronDown,
  Search,
  Plus,
  Zap,
  Check,
} from "lucide-react";
import type { CaseWorkspace } from "../../context/TarkaGlobalContext";
import { STATUS_LABELS } from "../../types/caseLifecycle";

interface UpgradedCaseSwitcherProps {
  activeCase: CaseWorkspace | undefined;
  activeCaseId: string;
  caseWorkspaces: CaseWorkspace[];
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
}

export const UpgradedCaseSwitcher: React.FC<UpgradedCaseSwitcherProps> = ({
  activeCase,
  activeCaseId,
  caseWorkspaces,
  onSelectCase,
  onOpenNewCase,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<"ALL" | "RECENT" | "PINNED" | "MY">("ALL");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setHighlightedIndex(0);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredCases = useMemo(() => {
    return caseWorkspaces.filter((c) => {
      // Section filter
      if (selectedSection === "PINNED") {
        const isPinned = c.priority === "CRITICAL_GOLDEN_HOUR" || c.goldenHourRemainingMins > 0;
        if (!isPinned) return false;
      } else if (selectedSection === "MY") {
        // e.g. assigned cases
        const isMine = (c.leadInvestigator || "").includes("Sharma") || (c.leadInvestigator || "").includes("Insp");
        if (!isMine) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.caseId.toLowerCase().includes(q) ||
        c.firNumber.toLowerCase().includes(q) ||
        (c.ncrpAckNo && c.ncrpAckNo.toLowerCase().includes(q)) ||
        c.title.toLowerCase().includes(q) ||
        c.complainantName.toLowerCase().includes(q) ||
        (c.leadInvestigator && c.leadInvestigator.toLowerCase().includes(q))
      );
    });
  }, [caseWorkspaces, searchQuery, selectedSection]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredCases.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredCases.length) % Math.max(1, filteredCases.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredCases[highlightedIndex];
      if (target) {
        onSelectCase(target.caseId);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid="case-switcher-button"
          title={`Active Case: ${activeCase?.firNumber || "CASE"} · ${activeCase?.title || ""}`}
          className="hover:border-cyan-400/50 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
          style={{
            height: "28px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(6, 182, 212, 0.12)",
            border: "1px solid rgba(34, 211, 238, 0.30)",
            borderRadius: "6px",
            padding: "0 8px",
            color: "#22D3EE",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Shield size={12} color="#22D3EE" />
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {activeCase ? `${activeCase.caseId} · ${activeCase.firNumber}` : (activeCaseId || "SWITCH CASE")}
          </span>
          <ChevronDown size={11} color="#94A3B8" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          onKeyDown={handleKeyDown}
          style={{
            width: "380px",
            background: "#0F172A",
            border: "1px solid #334155",
            borderRadius: "10px",
            boxShadow: "0 20px 35px -5px rgba(0, 0, 0, 0.85)",
            padding: "10px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            color: "#F8FAFC",
            fontFamily: "var(--font-sans)",
          }}
        >
          {/* Header & Section Pills */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "6px" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              SWITCH ACTIVE CASE
            </span>
            <div style={{ display: "inline-flex", gap: "2px", background: "rgba(255, 255, 255, 0.05)", padding: "2px", borderRadius: "5px" }}>
              {[
                { id: "ALL", label: "All" },
                { id: "RECENT", label: "Recent" },
                { id: "PINNED", label: "Pinned" },
                { id: "MY", label: "My Cases" },
              ].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSection(sec.id as any)}
                  style={{
                    border: "none",
                    borderRadius: "3px",
                    padding: "2px 6px",
                    fontSize: "9.5px",
                    fontWeight: selectedSection === sec.id ? 800 : 500,
                    background: selectedSection === sec.id ? "rgba(34, 211, 238, 0.20)" : "transparent",
                    color: selectedSection === sec.id ? "#22D3EE" : "#94A3B8",
                    cursor: "pointer",
                  }}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} color="#94A3B8" style={{ position: "absolute", left: "9px", pointerEvents: "none" }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case, FIR, victim, phone, account..."
              style={{
                width: "100%",
                padding: "6px 10px 6px 28px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(255, 255, 255, 0.04)",
                fontSize: "11px",
                color: "#F8FAFC",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Case Items List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {filteredCases.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#64748B", fontSize: "11px" }}>
                No cases matching "{searchQuery}"
              </div>
            ) : (
              filteredCases.map((cw, idx) => {
                const isCurrent = cw.caseId === activeCaseId;
                const isHighlighted = idx === highlightedIndex;
                const statusKey = ((cw as any).status || "INVESTIGATING").toUpperCase();
                const statusMeta = STATUS_LABELS[statusKey] || STATUS_LABELS.INVESTIGATING;

                return (
                  <div
                    key={cw.caseId}
                    data-case-option={cw.caseId}
                    onClick={() => {
                      onSelectCase(cw.caseId);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: isCurrent
                        ? "rgba(6, 182, 212, 0.18)"
                        : isHighlighted
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: isCurrent
                        ? "1px solid rgba(34, 211, 238, 0.35)"
                        : isHighlighted
                        ? "1px solid rgba(255, 255, 255, 0.18)"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, fontFamily: "var(--font-mono)", color: isCurrent ? "#22D3EE" : "#CBD5E1" }}>
                          {cw.caseId} · {cw.firNumber}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: statusMeta.bg,
                            color: statusMeta.text,
                            border: `1px solid ${statusMeta.border}`,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      {cw.goldenHourRemainingMins > 0 ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "2px",
                            fontSize: "9px",
                            fontWeight: 700,
                            color: "#FBBF24",
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.30)",
                            padding: "1px 5px",
                            borderRadius: "3px",
                          }}
                        >
                          <Zap size={9} />
                          <span>{cw.goldenHourRemainingMins}m</span>
                        </span>
                      ) : isCurrent ? (
                        <Check size={12} color="#34D399" />
                      ) : null}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px" }}>
                      <span style={{ fontWeight: 700, color: "#F8FAFC" }}>
                        {cw.complainantName || "Victim Unspecified"}
                      </span>
                      <span style={{ fontSize: "10px", color: "#94A3B8" }}>
                        {cw.typology}
                      </span>
                    </div>

                    <div style={{ fontSize: "10px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cw.title}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Bar: Register New Case Action */}
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px" }}>
            <button
              type="button"
              onClick={() => {
                onOpenNewCase();
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #0284C7 0%, #2563EB 100%)",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)",
              }}
            >
              <Plus size={13} />
              <span>Register New Case Workspace</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
