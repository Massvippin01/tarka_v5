import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Copy, FileSpreadsheet, GitFork, Inbox, RotateCcw, Share2, UserCheck, Zap } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { Button, Chip, EmptyState, PageHead, Skeleton, SourceNumber, type ChipVariant } from '../ui';
import { buildDeskItems, type DeskItem, type DeskKind } from '../desk/desk';
import { useDeskData } from '../desk/useDeskData';

const KIND: Record<DeskKind, { label: string; hint: string; icon: React.ReactNode; variant: ChipVariant }> = {
  action: { label: 'Action pending', hint: 'Case lifecycle is set to "Action pending"', icon: <Zap className="w-4 h-4" />, variant: 'urgent' },
  unsplit: { label: 'Mule network', hint: 'Suspected mules whose money trail is not yet a case of its own', icon: <GitFork className="w-4 h-4" />, variant: 'risk' },
  cross: { label: 'Seen in other cases', hint: 'Same UPI ID, phone or account found in another case you can access', icon: <Share2 className="w-4 h-4" />, variant: 'flow' },
  identity: { label: 'Same person?', hint: 'Probable identity matches (entity resolution) waiting for your yes/no', icon: <UserCheck className="w-4 h-4" />, variant: 'frozen' },
  mapping: { label: 'Match columns', hint: 'Uploaded files whose columns TARKA could not recognise', icon: <FileSpreadsheet className="w-4 h-4" />, variant: 'muted' },
  duplicate: { label: 'Duplicate upload', hint: 'The same file (by SHA-256) was already uploaded', icon: <Copy className="w-4 h-4" />, variant: 'muted' },
};

export const DeskScreen: React.FC = () => {
  const d = useDeskData();
  const items = useMemo(() => buildDeskItems(d.cases), [d.cases]);
  const counts = useMemo(() => items.reduce<Partial<Record<DeskKind, number>>>((m, i) => ({ ...m, [i.kind]: (m[i.kind] ?? 0) + 1 }), {}), [items]);
  const caseCount = d.cases.length;

  return (
    <div className="v6-enter space-y-[var(--space-4)] max-w-[1100px]" data-testid="v6-desk">
      <PageHead
        kicker="My Desk"
        title={d.isLoading ? 'Checking your cases…' : items.length ? `${items.length} ${items.length === 1 ? 'thing needs' : 'things need'} you` : 'All clear'}
        subtitle={caseCount ? `Across ${caseCount} ${caseCount === 1 ? 'case' : 'cases'} you can access` : undefined}
        actions={
          <Button size="sm" variant="ghost" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={d.refetch}>
            Refresh
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="flex flex-wrap gap-[var(--space-2)]">
          {(Object.keys(KIND) as DeskKind[]).filter((k) => counts[k]).map((k) => (
            <Chip key={k} variant={KIND[k].variant} icon={KIND[k].icon} title={KIND[k].hint}>
              {KIND[k].label} · {counts[k]}
            </Chip>
          ))}
        </div>
      )}

      {d.failedCases.length > 0 && !d.error && (
        <div role="status" className="v6-glass rounded-xl px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--urgent)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-none" />
          <span className="truncate" title={d.failedCases.join(', ')}>
            Could not check {d.failedCases.length === 1 ? d.failedCases[0] : `${d.failedCases.length} cases`} — the list below may be incomplete.
          </span>
        </div>
      )}

      {d.error ? (
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6" />}
          title="Could not load your cases"
          description="The TARKA server did not answer. Check you are signed in and the server is running."
          action={<Button size="sm" onClick={d.refetch}>Try again</Button>}
        />
      ) : d.isLoading && !items.length ? (
        <div className="space-y-[var(--space-2)]" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={68} className="rounded-2xl" />)}
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6" />}
          title="Nothing needs you right now"
          description="New mule networks, cross-case matches, files to map and cases waiting for action will appear here."
        />
      ) : (
        <ul className="space-y-[var(--space-2)]">
          {items.map((it, i) => <DeskRow key={it.id} item={it} index={i} />)}
          {d.isLoading && <li aria-busy="true"><Skeleton height={68} className="rounded-2xl" /></li>}
        </ul>
      )}
    </div>
  );
};

const DeskRow: React.FC<{ item: DeskItem; index: number }> = ({ item, index }) => {
  const k = KIND[item.kind];
  const open = () => {
    const s = useCaseStore.getState();
    s.setActiveCaseId(item.caseId);
    s.setActiveView(item.view);
  };
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.2 }}
      className="v6-glass rounded-2xl flex items-center transition-shadow hover:shadow-[var(--glass-shadow-hover)]"
    >
      <button
        type="button"
        onClick={open}
        data-testid="desk-item"
        className="min-w-0 flex-1 text-left rounded-2xl px-[var(--space-4)] py-[var(--space-3)] flex items-center gap-[var(--space-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        <span className={`v6-chip ${k.variant} !p-2 !rounded-xl flex-none`} title={k.hint}>{k.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[var(--text-md)] font-semibold text-[var(--fg-1)] truncate" title={item.title}>{item.title}</span>
          <span className="block text-[var(--text-xs)] text-[var(--fg-2)] truncate mt-0.5" title={item.detail}>{item.detail}</span>
        </span>
        <Chip variant="muted" className="flex-none font-mono" title={`Opens ${item.caseId}`}>{item.caseId}</Chip>
        <ChevronRight className="w-4 h-4 text-[var(--fg-3)] flex-none" />
      </button>
      {item.figure && (
        <SourceNumber figure={item.figure} className="flex-none mr-[var(--space-4)] v6-mono text-[var(--text-sm)] font-semibold text-[var(--fg-1)]" />
      )}
    </motion.li>
  );
};
