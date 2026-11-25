import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronDown, Search, Plus, Pin, FolderKanban } from "lucide-react";
import apiClient from "../../api/client";
import type { CaseWorkspace } from "../../context/TarkaGlobalContext";
import { useStationSummary } from "../../selectors/bundleAdapter";
import { selectCaseActionFinancials } from "../../selectors/actionSelectors";
import { selectGoldenHour, formatGoldenHour } from "../../lib/goldenHour";
import { formatInrCompact } from "../../lib/formatInr";
import { useCaseStore } from "../../store/useCaseStore";
import { LIFECYCLE } from "../../v6/screens/lifecycle";
import { Chip } from "../../v6/ui";
import {
  buildSwitcherCases, goldenLabel, highlightParts, readIds, visibleGroups, writeIds,
  type ProjectInput, type RegisteredRow, type SwitcherCase, type SwitcherTab,
} from "../../lib/caseSwitcherModel";

interface UpgradedCaseSwitcherProps {
  activeCase: CaseWorkspace | undefined;
  activeCaseId: string;
  caseWorkspaces: CaseWorkspace[];
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
  trigger?: React.ReactNode;
}

const RECENT_KEY = "tarka.caseSwitcher.recent";
const PINNED_KEY = "tarka.caseSwitcher.pinned";
const TABS: { id: SwitcherTab; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "RECENT", label: "Recent" },
  { id: "PINNED", label: "Pinned" },
];

const Mark: React.FC<{ text: string; q: string }> = ({ text, q }) => (
  <>
    {highlightParts(text, q).map((p, i) =>
      p.hit ? <mark key={i} className="cs-mark">{p.text}</mark> : <React.Fragment key={i}>{p.text}</React.Fragment>
    )}
  </>
);

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
  const [tab, setTab] = useState<SwitcherTab>("ALL");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readIds(RECENT_KEY));
  const [pinned, setPinned] = useState<string[]>(() => readIds(PINNED_KEY));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const setActiveView = useCaseStore((s) => s.setActiveView);

  const summaryQuery = useStationSummary();
  const registeredQuery = useQuery({
    queryKey: ["projects-cases"],
    queryFn: async () => (await apiClient.get<RegisteredRow[]>("/api/v1/projects/cases")).data,
    staleTime: 30_000,
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await apiClient.get<ProjectInput[]>("/api/v1/projects")).data,
    staleTime: 30_000,
  });
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const allCases = useMemo(
    () =>
      buildSwitcherCases({
        workspaces: caseWorkspaces,
        registered: registeredQuery.data ?? [],
        projects,
        summary: summaryQuery.data?.cases ?? [],
        sampleFigures: (id) => {
          const f = selectCaseActionFinancials(id);
          return { lossInr: f.bookedLossInr, freezableInr: f.pendingFreezeInr };
        },
        // Summary minutes only for cases that have no demo fixture; everything else uses the shared selector.
        golden: (id, mins) => (mins === undefined ? selectGoldenHour(id) : formatGoldenHour(mins)),
      }),
    [caseWorkspaces, registeredQuery.data, projects, summaryQuery.data]
  );

  const groups = useMemo(
    () => visibleGroups(allCases, projects, tab, searchQuery, recent, pinned),
    [allCases, projects, tab, searchQuery, recent, pinned]
  );
  const flat = useMemo(() => groups.flatMap((g) => g.cases), [groups]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setTab("ALL");
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => setHighlightedIndex(0), [searchQuery, tab, isOpen]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-flat-index="${highlightedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const choose = useCallback(
    (caseId: string) => {
      const next = [caseId, ...recent.filter((x) => x !== caseId)].slice(0, 8);
      setRecent(next);
      writeIds(RECENT_KEY, next);
      onSelectCase(caseId);
      setIsOpen(false);
    },
    [recent, onSelectCase]
  );

  const togglePin = (caseId: string) => {
    const next = pinned.includes(caseId) ? pinned.filter((x) => x !== caseId) : [...pinned, caseId];
    setPinned(next);
    writeIds(PINNED_KEY, next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const n = Math.max(1, flat.length);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => (p + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => (p - 1 + n) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[highlightedIndex]) choose(flat[highlightedIndex].caseId);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const lifecycleOf = (c: SwitcherCase) => LIFECYCLE.find((l) => l.key === c.lifecycle);

  const renderRow = (c: SwitcherCase, idx: number) => {
    const isCurrent = c.caseId === activeCaseId;
    const isHot = idx === highlightedIndex;
    const life = lifecycleOf(c);
    const isPinned = pinned.includes(c.caseId);
    const f = c.figures;
    const facts = [
      f.lossInr !== undefined && `${formatInrCompact(f.lossInr)} lost`,
      f.freezableInr !== undefined && `${formatInrCompact(f.freezableInr)} still freezable`,
      f.mules !== undefined && `${f.mules} mules`,
      f.networks !== undefined && `${f.networks} networks`,
    ].filter(Boolean) as string[];
    return (
      <div
        key={c.caseId}
        role="option"
        aria-selected={isCurrent}
        data-case-option={c.caseId}
        data-flat-index={idx}
        onClick={() => choose(c.caseId)}
        onMouseEnter={() => setHighlightedIndex(idx)}
        className={`cs-row ${isCurrent ? "cs-row-active" : ""} ${isHot && !isCurrent ? "cs-row-hot" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="cs-name" title={c.complainant || c.title}>
            <Mark text={c.complainant || c.title || "Complainant not recorded"} q={searchQuery} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {life && <Chip variant={isCurrent ? "muted" : life.variant} className="cs-pill">{life.label}</Chip>}
            <button
              type="button"
              aria-label={isPinned ? "Unpin case" : "Pin case"}
              aria-pressed={isPinned}
              onClick={(e) => { e.stopPropagation(); togglePin(c.caseId); }}
              className={`cs-pin ${isPinned ? "on" : ""}`}
            >
              <Pin size={12} />
            </button>
          </div>
        </div>
        <div className="cs-meta">
          <Mark text={c.caseId} q={searchQuery} />
          {c.fir && <> · <Mark text={c.fir} q={searchQuery} /></>}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          {c.typology && <span className="cs-type">{c.typology}</span>}
          {c.title && c.title !== c.complainant && (
            <span className="cs-title" title={c.title}><Mark text={c.title} q={searchQuery} /></span>
          )}
          <span className={`cs-golden ${c.golden.expired ? "expired" : ""}`} title="Golden hour">
            {goldenLabel(c.golden)}
          </span>
        </div>
        {facts.length > 0 && <div className="cs-facts">{facts.join(" · ")}</div>}
      </div>
    );
  };

  let runningIndex = 0;

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
          onKeyDown={handleKeyDown}
          className="cs-pop w-[440px] max-w-[94vw] z-[1000] flex flex-col gap-2 p-2.5 font-sans"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-[var(--fg-1)]">Cases</span>
              <span className="cs-count">{flat.length}</span>
            </div>
            <div className="cs-tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`cs-tab ${tab === t.id ? "on" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[var(--fg-3)] absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case id, FIR, complainant, title, project"
              className="cs-search"
            />
            <span className="cs-esc">ESC</span>
          </div>

          <div ref={listRef} role="listbox" className="cs-list">
            {flat.length === 0 ? (
              <div className="py-6 text-center text-[var(--fg-3)] text-[12px]">
                {searchQuery ? `No cases matching "${searchQuery}"` : tab === "ALL" ? "No cases yet" : tab === "RECENT" ? "No cases opened yet" : "No pinned cases"}
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.key} className="flex flex-col gap-1">
                  <div className="cs-group">
                    <span className="truncate">{g.label}</span>
                    {g.key === "sample" && <span className="cs-sample">Sample</span>}
                  </div>
                  {g.cases.map((c) => renderRow(c, runningIndex++))}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={() => { onOpenNewCase(); setIsOpen(false); }}
              className="cs-new"
            >
              <Plus size={13} />
              <span>New case</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveView("projects"); setIsOpen(false); }}
              className="cs-link"
            >
              <FolderKanban size={13} />
              <span>Open projects</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
