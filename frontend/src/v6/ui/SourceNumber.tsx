import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, X, FileSearch } from 'lucide-react';
import clsx from 'clsx';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { formatInr } from '../../lib/formatInr';
import { sumMoneyRows, type MoneyFigure, type MoneyRow } from '../../selectors/caseSelectors';

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, MoneyRow>();
const cell = (v: string) => <span className="block truncate" title={v}>{v}</span>;
const BASE_COLUMNS = helper.columns([
  helper.accessor('dateIst', { header: 'Date', cell: (i) => cell(i.getValue() || '—') }),
  helper.accessor('from', { header: 'From', cell: (i) => cell(i.getValue()) }),
  helper.accessor('to', { header: 'To', cell: (i) => cell(i.getValue()) }),
  helper.accessor('amountInr', {
    header: 'Amount',
    cell: (i) => <span className={clsx('v6-mono font-semibold', i.getValue() < 0 && 'text-[var(--risk)]')}>{formatInr(i.getValue())}</span>,
  }),
  helper.accessor('reference', { header: 'Reference', cell: (i) => cell(i.getValue() || '—') }),
  helper.accessor('sourceFile', {
    header: 'Source',
    cell: (i) => cell(`${i.getValue()}${i.row.original.sourceRow !== null ? ` · row ${i.row.original.sourceRow}` : ''}`),
  }),
]);
const CASE_COLUMN = helper.accessor('caseId', { header: 'Case', cell: (i) => <span className="v6-mono">{i.getValue()}</span> });
const MULTI_CASE_COLUMNS = helper.columns([CASE_COLUMN, ...BASE_COLUMNS]);

const HEADER_TIP: Record<string, string> = {
  amountInr: 'Negative = money that left the account again, so it is no longer there.',
  reference: 'Bank reference for the payment (UTR / RRN), or the statement narration.',
  sourceFile: 'File and row the payment was read from, for the court exhibit list.',
};

export interface SourceNumberProps {
  figure: MoneyFigure;
  /** Custom rendering of the figure (e.g. a count-up); defaults to formatInr(figure.totalInr). */
  children?: React.ReactNode;
  className?: string;
}

/** A money figure that opens the transaction rows behind it, with a visible "adds up to" check. */
export const SourceNumber: React.FC<SourceNumberProps> = ({ figure, children, className }) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          data-testid="source-number"
          title={`${figure.label} — click to see the ${figure.rows.length} transaction${figure.rows.length === 1 ? '' : 's'} behind it`}
          className={clsx(
            'cursor-pointer rounded-md text-inherit font-inherit underline decoration-dotted decoration-1 underline-offset-4 decoration-current/40 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]',
            className,
          )}
        >
          {children ?? formatInr(figure.totalInr)}
        </button>
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.aside
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="v6-glass fixed right-3 top-3 bottom-3 z-[91] w-[min(860px,calc(100vw-24px))] rounded-2xl flex flex-col overflow-hidden text-[var(--fg-1)] focus:outline-none"
                style={{ background: 'var(--glass-3)' }}
                data-testid="source-sheet"
              >
                <SheetBody figure={figure} />
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

const SheetBody: React.FC<{ figure: MoneyFigure }> = ({ figure }) => {
  const multiCase = new Set(figure.rows.map((r) => r.caseId)).size > 1;
  const table = useTable({ features, columns: multiCase ? MULTI_CASE_COLUMNS : BASE_COLUMNS, data: figure.rows });
  const total = sumMoneyRows(figure.rows);
  const gap = figure.totalInr - total;

  return (
    <>
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-[var(--line)]">
        <span className="w-9 h-9 flex-none rounded-lg flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent)]">
          <FileSearch className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-[12.5px] font-medium text-[var(--fg-2)] truncate" title={figure.label}>{figure.label}</Dialog.Title>
          <div className="text-[24px] font-bold text-[var(--fg-1)] v6-mono leading-tight">{formatInr(figure.totalInr)}</div>
          <Dialog.Description className="text-[12px] text-[var(--fg-3)] mt-0.5">
            {figure.rows.length} transaction{figure.rows.length === 1 ? '' : 's'} from the case evidence
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <button type="button" aria-label="Close" className="h-8 w-8 flex-none rounded-lg flex items-center justify-center text-[var(--fg-2)] hover:bg-[var(--hover)]">
            <X className="w-4 h-4" />
          </button>
        </Dialog.Close>
      </div>

      <div className="flex-1 overflow-auto px-5 py-3">
        {figure.rows.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-[var(--fg-3)] text-[13px] gap-1">
            <FileSearch className="w-6 h-6 mb-1" />
            <span className="font-semibold text-[var(--fg-2)]">No transaction rows behind this figure yet</span>
            <span>Upload the bank statements for this case to trace it.</span>
          </div>
        ) : (
          <table className="v6-table w-full table-fixed" data-testid="source-rows">
            <thead>
              {table.getHeaderGroups().map((g) => (
                <tr key={g.id}>
                  {g.headers.map((h) => (
                    <th
                      key={h.id}
                      title={HEADER_TIP[h.column.id]}
                      className={clsx(h.column.id === 'amountInr' ? 'text-right w-[120px]' : 'text-left', h.column.id === 'caseId' && 'w-[120px]', h.column.id === 'dateIst' && 'w-[150px]')}
                    >
                      <table.FlexRender header={h} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((r) => (
                <tr key={r.original.id} className="row">
                  {r.getAllCells().map((c) => (
                    <td key={c.id} className={clsx('min-w-0', c.column.id === 'amountInr' && 'text-right')}>
                      <table.FlexRender cell={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div
        data-testid="source-check"
        className={clsx(
          'mx-5 mb-5 mt-1 rounded-xl px-4 py-3 flex items-center gap-2 text-[13px] font-semibold border',
          gap === 0 ? 'bg-[var(--safe-bg)] text-[var(--safe)] border-transparent' : 'bg-[var(--urgent-bg)] text-[var(--urgent)] border-transparent',
        )}
      >
        {gap === 0 ? <CheckCircle2 className="w-4 h-4 flex-none" /> : <AlertTriangle className="w-4 h-4 flex-none" />}
        <span className="v6-mono">
          {gap === 0
            ? `Adds up to ${formatInr(total)} — matches the figure`
            : `Rows add up to ${formatInr(total)} — ${formatInr(Math.abs(gap))} ${gap > 0 ? 'not yet traced to a transaction' : 'more than the figure'}`}
        </span>
      </div>
    </>
  );
};
