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
          className="w-[450px] max-w-[94vw] bg-white border border-[var(--line)] rounded-xl shadow-2xl p-2.5 z-[1000] flex flex-col gap-2 text-[var(--fg-1)] font-sans animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Header & Section Filter Tabs */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)]">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-[var(--fg-1)] uppercase tracking-wider">
                Switch Case
              </span>
              <span className="text-[10.5px] font-mono font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded-full">
                {filteredCases.length}
              </span>
            </div>

            <div className="inline-flex items-center gap-0.5 bg-[#f4f4f5] p-0.5 rounded-lg shrink-0">
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
                  className={`border-none rounded-md px-2 py-0.5 text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
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
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case, FIR, victim, phone..."
              className="w-full pl-8 pr-12 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[12px] text-[var(--fg-1)] placeholder:text-zinc-400 outline-none focus:border-[var(--accent)] focus:bg-white transition-colors box-border"
            />
            <span className="absolute right-2 text-[9.5px] font-mono font-semibold text-zinc-400 bg-zinc-200/60 px-1.5 py-0.5 rounded pointer-events-none">
              ESC
            </span>
          </div>

          {/* Case Items List */}
          <div className="flex flex-col gap-1 max-h-[340px] overflow-y-auto pr-0.5">
            {filteredCases.length === 0 ? (
              <div className="py-6 text-center text-[var(--muted)] text-[12px]">
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
                    className={`relative flex flex-col gap-0.5 p-2 px-2.5 rounded-lg border transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 pl-3.5"
                        : isHighlighted
                        ? "bg-[#f4f4f5] border-[var(--line-strong)]"
                        : "bg-white hover:bg-[#fafafa] border-[var(--line)]"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#2563EB]" />
                    )}

                    {/* Top Row: Case ID, Victim, Status Badge, Golden Hour */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`text-[12px] font-bold font-mono ${isCurrent ? "text-[var(--accent)]" : "text-zinc-900"}`}>
                          {cw.caseId}
                        </span>
                        <span className="text-zinc-300">·</span>
                        <span className="text-[12px] font-bold text-zinc-800 truncate">
                          {cw.complainantName || "Victim Unspecified"}
                        </span>
                        <span className="text-zinc-400 text-[11px] font-mono shrink-0">
                          ({cw.firNumber})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          style={{
                            backgroundColor: statusMeta.bg,
                            color: statusMeta.text,
                            borderColor: statusMeta.border,
                          }}
                          className="text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider"
                        >
                          {statusMeta.label}
                        </span>

                        {cw.goldenHourRemainingMins > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            <Zap size={10} className="text-amber-600" />
                            <span>{cw.goldenHourRemainingMins}m</span>
                          </span>
                        ) : isCurrent ? (
                          <Check size={13} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                        ) : null}
                      </div>
                    </div>

                    {/* Bottom Row: Typology Pill & Title */}
                    <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-500">
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 uppercase tracking-tight shrink-0">
                        {(cw.typology || "").replace(/_/g, " ")}
                      </span>
                      <span className="truncate flex-1 text-[11px] text-zinc-500">
                        {cw.title}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Bar: Register New Case Action */}
          <div className="pt-1.5 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={() => {
                onOpenNewCase();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[var(--accent)] hover:bg-blue-700 text-white text-[12px] font-semibold shadow-xs transition-colors cursor-pointer border-none"
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
