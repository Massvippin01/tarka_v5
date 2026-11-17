import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { FileSearch, X } from 'lucide-react';
import { Skeleton } from '../ui';
import { clusterGraph, KIND_META, type DeviceCluster, type DeviceRow } from '../../selectors/deviceSelectors';

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Small two-column graph: shared identifiers on the left, the accounts that used them on the right. */
export const ClusterGraph: React.FC<{
  cluster: DeviceCluster;
  labelOf: (key: string) => string;
  outside: (key: string) => boolean;
  onAccount: (key: string) => void;
}> = ({ cluster, labelOf, outside, onAccount }) => {
  const g = clusterGraph(cluster);
  const ROW = 30;
  const h = Math.max(g.ids.length, g.accounts.length) * ROW + 16;
  const yId = (i: number) => 8 + ROW / 2 + i * ROW + ((Math.max(g.ids.length, g.accounts.length) - g.ids.length) * ROW) / 2;
  const yAc = (i: number) => 8 + ROW / 2 + i * ROW + ((Math.max(g.ids.length, g.accounts.length) - g.accounts.length) * ROW) / 2;
  const L = 182;
  const R = 318;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 460 ${h}`} className="w-full h-auto" role="img" aria-label={`Devices shared by ${cluster.accounts.length} accounts`}>
        {g.edges.map((e, i) => {
          const y1 = yId(e.from);
          const y2 = yAc(e.to);
          const weak = KIND_META[e.kind].strength === 'weak';
          return (
            <path
              key={i}
              d={`M ${L} ${y1} C ${(L + R) / 2} ${y1}, ${(L + R) / 2} ${y2}, ${R} ${y2}`}
              fill="none"
              stroke={weak ? 'var(--fg-3)' : 'var(--accent)'}
              strokeOpacity={weak ? 0.45 : 0.75}
              strokeWidth={weak ? 1.2 : 1.8}
              strokeDasharray={weak ? '4 4' : undefined}
            />
          );
        })}
        {g.ids.map((l, i) => (
          <g key={`${l.kind}:${l.value}`}>
            <title>{`${KIND_META[l.kind].label} — ${KIND_META[l.kind].tip}\n${l.value}`}</title>
            <rect x={6} y={yId(i) - 11} width={L - 6} height={22} rx={11} fill="var(--surface-1)" stroke="var(--line-2)" />
            <circle cx={L} cy={yId(i)} r={4} fill={KIND_META[l.kind].strength === 'weak' ? 'var(--fg-3)' : 'var(--accent)'} />
            <text x={16} y={yId(i) + 4} fontSize={11} fill="var(--fg-2)">
              <tspan fontWeight={600} fill="var(--fg-1)">{KIND_META[l.kind].short}</tspan>
              <tspan className="v6-mono" dx={5}>{trunc(l.value, 17)}</tspan>
            </text>
          </g>
        ))}
        {g.accounts.map((a, i) => (
          <g key={a} onClick={() => onAccount(a)} className="cursor-pointer" role="button" aria-label={`Open ${labelOf(a)}`}>
            <title>{`${labelOf(a)}${outside(a) ? ' — outside this network' : ''}`}</title>
            <circle cx={R} cy={yAc(i)} r={5} fill={outside(a) ? 'var(--surface-1)' : 'var(--fg-1)'} stroke="var(--fg-1)" strokeWidth={1.2} />
            <text x={R + 12} y={yAc(i) + 4} fontSize={11.5} fill={outside(a) ? 'var(--fg-3)' : 'var(--fg-1)'} fontWeight={500}>
              {trunc(labelOf(a), 20)}
            </text>
          </g>
        ))}
      </svg>
      {g.hiddenAccounts > 0 && <p className="text-[12px] text-[var(--fg-3)] mt-1">+{g.hiddenAccounts} more accounts in this group, listed below.</p>}
    </div>
  );
};

export interface RowsRequest {
  title: string;
  account?: string;
  kind?: string;
  value?: string;
}

const COLS: { key: keyof DeviceRow; label: string; tip?: string; mono?: boolean; w: string }[] = [
  { key: 'timeLabel', label: 'Time (IST)', w: 'w-[124px]', mono: true },
  { key: 'account', label: 'Account', w: 'w-[150px]' },
  { key: 'phone', label: 'Mobile', w: 'w-[92px]', mono: true },
  { key: 'imei', label: 'Phone', tip: KIND_META.imei.tip, w: 'w-[122px]', mono: true },
  { key: 'imsi', label: 'SIM', tip: KIND_META.imsi.tip, w: 'w-[122px]', mono: true },
  { key: 'ip', label: 'Internet address', tip: KIND_META.ip.tip, w: 'w-[108px]', mono: true },
  { key: 'bssid', label: 'Wi-Fi', tip: KIND_META.bssid.tip, w: 'w-[122px]', mono: true },
  { key: 'event', label: 'What happened', w: 'w-[120px]' },
  { key: 'source', label: 'Source', tip: 'File and row the record was read from, for the exhibit list.', w: '' },
];

/** The rows behind a number: every sighting listed with its file and row. */
export const SourceRowsDialog: React.FC<{
  request: RowsRequest | null;
  rows: DeviceRow[] | undefined;
  loading: boolean;
  error: boolean;
  labelOf: (key: string) => string;
  onClose: () => void;
}> = ({ request, rows, loading, error, labelOf, onClose }) => (
  <Dialog.Root open={!!request} onOpenChange={(o) => !o && onClose()}>
    <AnimatePresence>
      {request && (
        <Dialog.Portal forceMount>
          <Dialog.Overlay asChild>
            <motion.div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div
              className="fixed z-50 left-1/2 top-[8vh] w-[min(1180px,94vw)] max-h-[84vh] -translate-x-1/2 flex flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-2)] backdrop-blur-xl shadow-2xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--line)]">
                <div className="min-w-0">
                  <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-[var(--accent)] flex-none" />
                    <span className="truncate" title={request.title}>{request.title}</span>
                  </Dialog.Title>
                  <Dialog.Description className="text-[12px] text-[var(--fg-3)] mt-0.5">
                    {rows ? `${rows.length.toLocaleString('en-IN')} record${rows.length === 1 ? '' : 's'}${rows.length >= 500 ? ' (first 500)' : ''}, oldest first.` : 'Device records behind this number.'}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="p-1.5 rounded-md text-[var(--fg-3)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]" aria-label="Close">
                  <X className="w-4 h-4" />
                </Dialog.Close>
              </div>
              <div className="overflow-auto px-5 pb-4">
                {loading ? (
                  <div className="space-y-2 pt-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={22} />)}</div>
                ) : error ? (
                  <p className="text-[13px] text-[var(--urgent)] py-6">Could not load the records. Close this and try again.</p>
                ) : !rows?.length ? (
                  <p className="text-[13px] text-[var(--fg-3)] py-6">No records.</p>
                ) : (
                  <table className="w-full table-fixed text-[12px] border-collapse">
                    <thead className="sticky top-0 bg-[var(--glass-2)] backdrop-blur-xl">
                      <tr className="text-left text-[var(--fg-3)]">
                        {COLS.map((c) => (
                          <th key={c.key} className={`${c.w} py-2 pr-3 font-medium border-b border-[var(--line)]`} title={c.tip}>
                            <span className={c.tip ? 'underline decoration-dotted underline-offset-2' : ''}>{c.label}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.key} className="border-b border-[var(--line)] hover:bg-[var(--hover)]">
                          {COLS.map((c) => {
                            const raw = r[c.key];
                            const v = c.key === 'account' ? labelOf(String(raw)) : raw === null || raw === undefined || raw === '' ? '—' : String(raw);
                            return (
                              <td key={c.key} className={`py-1.5 pr-3 ${c.mono ? 'v6-mono' : ''} text-[var(--fg-1)]`}>
                                <span className="block truncate" title={v}>{v}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  </Dialog.Root>
);
