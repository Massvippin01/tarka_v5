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
  trigger?: React.ReactNode;
}

export const UpgradedCaseSwitcher: React.FC<UpgradedCaseSwitcherProps> = ({
  activeCase,
  activeCaseId,
  caseWorkspaces,
  onSelectCase,
  onOpenNewCase,
  trigger,
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
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            data-testid="case-switcher-button"
            title={`Active Case: ${activeCase?.firNumber || "CASE"} · ${activeCase?.title || ""}`}
            className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md border border-[var(--line)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[12px] font-bold text-[var(--fg-1)] transition-colors cursor-pointer shrink-0"
          >
            <Shield size={13} className="text-[var(--accent)]" />
            <span className="font-mono">
              {activeCase ? `${activeCase.caseId} · ${activeCase.firNumber}` : (activeCaseId || "SWITCH CASE")}
            </span>
            <ChevronDown size={12} className="text-[var(--muted)]" />
          </button>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          alignOffset={0}
          onKeyDown={handleKeyDown}
          className="w-[430px] max-w-[94vw] bg-white border border-[var(--line)] rounded-xl shadow-2xl p-3 z-[1000] flex flex-col gap-2.5 text-[var(--fg-1)] font-sans animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Header & Section Filter Tabs */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
              Switch Active Case
            </span>
            <div className="inline-flex items-center gap-1 bg-[#f4f4f5] p-1 rounded-lg">
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
                  className={`border-none rounded-md px-2.5 py-0.5 text-[12px] transition-colors cursor-pointer ${
                    selectedSection === sec.id
                      ? "bg-white text-[var(--accent)] font-bold shadow-2xs"
                      : "bg-transparent text-[var(--muted)] font-medium hover:text-[var(--fg-1)]"
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case, FIR, victim, phone, account..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[12.5px] text-[var(--fg-1)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:bg-white transition-colors box-border"
            />
          </div>

          {/* Case Items List */}
          <div className="flex flex-col gap-1.5 max-h-[310px] overflow-y-auto pr-0.5">
            {filteredCases.length === 0 ? (
              <div className="py-8 text-center text-[var(--muted)] text-[12.5px]">
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
                    className={`flex flex-col gap-1 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-200"
                        : isHighlighted
                        ? "bg-[#f4f4f5] border-[var(--line-strong)]"
                        : "bg-white hover:bg-[#fafafa] border-[var(--line)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[12.5px] font-bold font-mono ${isCurrent ? "text-[var(--accent)]" : "text-[var(--fg-1)]"}`}>
                          {cw.caseId} · {cw.firNumber}
                        </span>
                        <span
                          style={{
                            backgroundColor: statusMeta.bg,
                            color: statusMeta.text,
                            borderColor: statusMeta.border,
                          }}
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded border"
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      {cw.goldenHourRemainingMins > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          <Zap size={11} className="text-amber-600" />
                          <span>{cw.goldenHourRemainingMins}m</span>
                        </span>
                      ) : isCurrent ? (
                        <Check size={14} className="text-emerald-600 shrink-0" />
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="font-bold text-[var(--fg-1)]">
                        {cw.complainantName || "Victim Unspecified"}
                      </span>
                      <span className="text-[11.5px] font-semibold text-[var(--muted)] capitalize">
                        {(cw.typology || "").replace(/_/g, " ").toLowerCase()}
                      </span>
                    </div>

                    <div className="text-[12px] text-[var(--muted)] truncate">
                      {cw.title}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Bar: Register New Case Action */}
          <div className="pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={() => {
                onOpenNewCase();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--accent)] hover:bg-blue-700 text-white text-[12.5px] font-bold shadow-xs transition-colors cursor-pointer border-none"
            >
              <Plus size={14} />
              <span>Register New Case Workspace</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
