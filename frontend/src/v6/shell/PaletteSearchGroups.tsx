import React, { useEffect, useMemo } from 'react';
import { Command, defaultFilter, useCommandState } from 'cmdk';
import { FolderKanban, FolderOpen, GitFork, Inbox, LayoutDashboard, Loader2, UploadCloud, Wallet } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { setFocus } from '../../lib/focusUrl';
import { buildIdentifierIndex, searchIdentifiers } from '../desk/desk';
import { useDeskData } from '../desk/useDeskData';

const ID_PREFIX = 'id:';

/** cmdk filter: identifier rows are pre-ranked by searchIdentifiers (rank is in the value); everything else uses cmdk's default. */
export const paletteFilter = (value: string, search: string, keywords?: string[]) => {
  if (value.startsWith(ID_PREFIX)) return 1 - Number(value.split(':')[1]) / 100;
  return defaultFilter!(value, search, keywords);
};

const VIEWS = [
  { view: 'desk', label: 'Inbox · what needs you now', icon: Inbox },
  { view: 'workspace', label: 'Station dashboard · every active case', icon: LayoutDashboard },
  { view: 'projects', label: 'Projects · group cases into operations', icon: FolderKanban },
  { view: 'triage', label: 'Triage · fraud networks in this case', icon: GitFork },
  { view: 'upload', label: 'Upload centre · add bank, CDR, WhatsApp files', icon: UploadCloud },
];

const groupStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--fg-3)', padding: '12px 12px 4px',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};
const itemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
  fontSize: 'var(--text-sm)', color: 'var(--fg-1)', cursor: 'pointer', minWidth: 0,
};
const ROLE: Record<string, string> = { MULE: 'Suspected mule', VICTIM: 'Victim', CASH_OUT: 'Cash-out', UNKNOWN: 'Unclear role' };

/** Views, backend cases and identifiers (VPA / phone / account) across every case the user can access. */
export const PaletteSearchGroups: React.FC<{ knownCaseIds: string[]; onDone: () => void; onTopHit: (value: string) => void }> = ({ knownCaseIds, onDone, onTopHit }) => {
  const search = useCommandState((s) => s.search);
  const d = useDeskData();
  const index = useMemo(() => buildIdentifierIndex(d.cases), [d.cases]);
  const hits = useMemo(() => searchIdentifiers(index, search), [index, search]);
  const hitValue = (i: number) => `${ID_PREFIX}${i}:${hits[i].caseId}:${hits[i].identifier}`;
  const top = hits.length ? hitValue(0) : '';
  // Hits arrive after cmdk picks its first row; move the keyboard selection to the best identifier match.
  useEffect(() => {
    if (top) onTopHit(top);
  }, [top, onTopHit]);
  const extraCases = d.cases.filter((c) => !knownCaseIds.includes(c.caseId));

  const go = (view: string, caseId?: string) => {
    const s = useCaseStore.getState();
    if (caseId) s.setActiveCaseId(caseId);
    s.setActiveView(view);
    onDone();
  };

  return (
    <>
      {hits.length > 0 && (
        <Command.Group heading="UPI IDs, phones & accounts" style={groupStyle}>
          {hits.map((h, i) => (
            <Command.Item
              key={`${h.caseId}|${h.identifier}`}
              value={hitValue(i)}
              onSelect={() => {
                setFocus({ networkId: null, account: h.identifier }); // opens the account dossier
                go('people', h.caseId);
              }}
              style={itemStyle}
              data-testid="palette-identifier-hit"
            >
              <Wallet size={15} style={{ color: h.role === 'MULE' ? 'var(--risk)' : 'var(--flow)', flex: 'none' }} />
              <span className="v6-mono truncate" title={h.identifier}>{h.identifier}</span>
              <span style={{ color: 'var(--fg-3)', flex: 'none' }}>{ROLE[h.role] ?? h.role} · {h.networkId}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 600, flex: 'none' }}>{h.caseId}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {search.trim().length >= 3 && !hits.length && d.isLoading && (
        <div style={{ ...itemStyle, color: 'var(--fg-3)', cursor: 'default' }}>
          <Loader2 size={14} className="animate-spin" /> Searching networks in your cases…
        </div>
      )}

      <Command.Group heading="Go to" style={groupStyle}>
        {VIEWS.map(({ view, label, icon: Icon }) => (
          <Command.Item key={view} value={`view ${view} ${label}`} onSelect={() => go(view)} style={itemStyle}>
            <Icon size={15} style={{ color: 'var(--accent)', flex: 'none' }} />
            <span className="truncate">{label}</span>
          </Command.Item>
        ))}
      </Command.Group>

      {extraCases.length > 0 && (
        <Command.Group heading="Other cases you can access" style={groupStyle}>
          {extraCases.map((c) => (
            <Command.Item key={c.caseId} value={`case ${c.caseId} ${d.titles.get(c.caseId) ?? ''}`} onSelect={() => go('triage', c.caseId)} style={itemStyle}>
              <FolderOpen size={15} style={{ color: 'var(--fg-3)', flex: 'none' }} />
              <strong style={{ flex: 'none' }}>{c.caseId}</strong>
              <span className="truncate" style={{ color: 'var(--fg-2)' }} title={d.titles.get(c.caseId)}>{d.titles.get(c.caseId)}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
    </>
  );
};
