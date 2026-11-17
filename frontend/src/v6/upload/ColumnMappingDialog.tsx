import React, { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookmarkCheck, Columns3, X } from 'lucide-react';
import apiClient from '../../api/client';
import { Button, Chip } from '../ui';
import { MAP_FIELDS, guessMapping, mappingBody, validateMapping, type MapField, type MappingColumns } from './columnMapping';
import { useUploadStore } from './useUploadStore';
import { stateFromStatus, type JobStatus } from './uploadPlanner';

interface Template {
  name: string;
  columns: MappingColumns;
  headers: string[];
}

const STATE_WORDS: Record<string, string> = {
  ready: 'ready — its rows are now in the case',
  processing: 'being processed',
  verifying: 'being checked',
  attention: 'still needs attention',
  rejected: 'rejected',
};

export const ColumnMappingDialog: React.FC<{
  job: JobStatus;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: (s: JobStatus) => void;
}> = ({ job, open, onOpenChange, onDone }) => {
  const headers: string[] = (job.analytics_summary?.detected_headers as string[]) ?? [];
  const rows: string[][] = ((job.analytics_summary?.sample_rows as string[][]) ?? []).slice(0, 5);
  const [cols, setCols] = useState<MappingColumns>(() => guessMapping(headers));
  const [templateName, setTemplateName] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const submitMapping = useUploadStore((s) => s.submitMapping);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setCols(guessMapping(headers));
      setServerError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job.job_id]);

  const templates = useQuery({
    queryKey: ['mapping-templates'],
    queryFn: async () => (await apiClient.get<Template[]>('/api/v1/ingestion/mapping-templates')).data,
    enabled: open,
  });

  const errors = useMemo(() => validateMapping(cols, headers), [cols, headers]);
  const byHeader = useMemo(() => {
    const m: Record<string, string> = {};
    MAP_FIELDS.forEach((f) => cols[f.key] && (m[cols[f.key]!] = f.label));
    return m;
  }, [cols]);

  const applyTemplate = (t: Template) => {
    const usable = Object.fromEntries(Object.entries(t.columns).filter(([, h]) => h && headers.includes(h))) as MappingColumns;
    setCols(usable);
    toast.message(`Applied template "${t.name}"`);
  };

  const submit = async () => {
    setBusy(true);
    setServerError(undefined);
    try {
      const s = await submitMapping(job.job_id, mappingBody(cols, templateName));
      const st = stateFromStatus(s);
      if (s.stage === 'NEEDS_MAPPING') {
        setServerError(s.error_message || s.analytics_summary?.note || 'The server still could not read the file with these columns.');
        return;
      }
      toast.success(`${job.filename ?? 'File'} is ${STATE_WORDS[st] ?? s.stage}`);
      if (templateName.trim()) void qc.invalidateQueries({ queryKey: ['mapping-templates'] });
      onDone?.(s);
      onOpenChange(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const select = (f: MapField, label: string) => (
    <select
      aria-label={label}
      value={cols[f] ?? ''}
      onChange={(e) => setCols((c) => ({ ...c, [f]: e.target.value || undefined }))}
      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 text-[12.5px] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      data-testid={`map-${f}`}
    >
      <option value="">— not in this file —</option>
      {headers.map((h, i) => (
        <option key={`${h}-${i}`} value={h}>
          {h || '(blank)'}
        </option>
      ))}
    </select>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[91] w-[min(960px,94vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/95 backdrop-blur-xl shadow-[var(--shadow)] p-5 focus:outline-none"
          data-testid="column-mapping-dialog"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 flex-none rounded-lg flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent)]">
              <Columns3 className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[16px] font-semibold text-[var(--fg-1)] truncate" title={job.filename}>
                Match columns{job.filename ? ` — ${job.filename}` : ''}
              </Dialog.Title>
              <Dialog.Description className="text-[12.5px] text-[var(--fg-2)] mt-0.5">
                Tell TARKA which column holds each piece of information. Date and amount are needed; the rest help link accounts.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button size="sm" variant="ghost" aria-label="Close">
                <X className="w-4 h-4" />
              </Button>
            </Dialog.Close>
          </div>

          {headers.length === 0 ? (
            <div className="mt-4 text-[12.5px] text-[var(--fg-2)]">The server did not send the file's column names, so they cannot be matched here.</div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {MAP_FIELDS.map((f) => (
                  <label key={f.key} className="block min-w-0" title={f.tip}>
                    <span className="block text-[11.5px] font-semibold text-[var(--fg-2)] mb-1">
                      {f.label}
                      {f.required ? <span className="text-[var(--risk)]"> *</span> : <span className="font-normal text-[var(--fg-3)]"> (optional)</span>}
                    </span>
                    {select(f.key, f.label)}
                  </label>
                ))}
              </div>

              <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-3)] mb-1.5">
                First {rows.length} row{rows.length === 1 ? '' : 's'} of the file
              </div>
              <div className="rounded-xl border border-[var(--line)] overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[var(--surface-2)]">
                      {headers.map((h, i) => (
                        <th key={`${h}-${i}`} className="px-2.5 py-2 text-left font-semibold text-[var(--fg-2)] whitespace-nowrap">
                          <div className="max-w-[180px] truncate font-mono" title={h}>
                            {h || '(blank)'}
                          </div>
                          {byHeader[h] && (
                            <Chip variant="flow" className="mt-1">
                              {byHeader[h]}
                            </Chip>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={headers.length} className="px-2.5 py-3 text-[var(--fg-3)]">
                          No sample rows were sent.
                        </td>
                      </tr>
                    )}
                    {rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-[var(--line)]">
                        {headers.map((h, ci) => (
                          <td
                            key={ci}
                            className={`px-2.5 py-1.5 whitespace-nowrap tabular-nums ${byHeader[h] ? 'text-[var(--fg-1)] bg-[var(--accent-bg)]/40' : 'text-[var(--fg-3)]'}`}
                          >
                            <div className="max-w-[180px] truncate" title={r[ci] ?? ''}>
                              {r[ci] ?? ''}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <label className="block" title="Next time a file with exactly these columns arrives, TARKA matches them by itself.">
                  <span className="block text-[11.5px] font-semibold text-[var(--fg-2)] mb-1">
                    Save as bank template <span className="font-normal text-[var(--fg-3)]">(optional)</span>
                  </span>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. HDFC savings statement"
                    maxLength={80}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12.5px] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    data-testid="map-template-name"
                  />
                </label>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-semibold text-[var(--fg-2)] mb-1">Saved bank templates</div>
                  {templates.isLoading ? (
                    <div className="h-7 rounded-lg animate-pulse bg-[var(--surface-3)]" />
                  ) : templates.isError ? (
                    <div className="text-[12px] text-[var(--fg-3)]">Could not load saved templates.</div>
                  ) : !templates.data?.length ? (
                    <div className="text-[12px] text-[var(--fg-3)]">None yet. Name this mapping above to save one.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {templates.data.map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => applyTemplate(t)}
                          title={`Columns: ${t.headers.join(', ')}`}
                          className="max-w-[220px] truncate inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-[12px] text-[var(--fg-1)] hover:border-[var(--accent)]"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5 flex-none text-[var(--accent)]" />
                          <span className="truncate">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {(errors.length > 0 || serverError) && headers.length > 0 && (
            <ul className="mt-4 space-y-0.5 text-[12px]">
              {serverError && <li className="text-[var(--risk)]">{serverError}</li>}
              {errors.map((e) => (
                <li key={e} className="text-[var(--urgent)]">
                  {e}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost">Cancel</Button>
            </Dialog.Close>
            <Button variant="primary" onClick={() => void submit()} disabled={busy || errors.length > 0 || headers.length === 0} isLoading={busy} data-testid="map-submit">
              Read file with these columns
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
