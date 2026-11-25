import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, FileSpreadsheet, ArrowRight, Upload } from 'lucide-react';
import apiClient from '../../api/client';
import { formatInr } from '../../lib/formatInr';
import { setFocus } from '../../lib/focusUrl';
import { useCaseStore } from '../../store/useCaseStore';
import { Button, Chip } from '../ui';

export interface NcrpComplaintRecord {
  id: string;
  project_id: string | null;
  case_id: string;
  ack_no: string;
  victim_name: string;
  phone: string;
  account_vpa: string;
  amount_inr: number | null;
  complaint_ts: number | null;
  complaint_ts_raw: string;
  typology: string;
  status: 'MATCHED' | 'UNMATCHED';
  match_reason: string;
  matched_account: string | null;
  matched_network_id: string | null;
  matched_txns: {
    job_id: string;
    line: number;
    ts: number;
    payer: string;
    payee: string;
    amount: number;
    ref: string;
    network_id: string | null;
  }[];
  imported_at: number;
}

interface Props {
  projectId?: string;
  caseId?: string;
  title?: string;
  onImported?: () => void;
}

export const NcrpImportPanel: React.FC<Props> = ({ projectId, caseId, title = 'NCRP complaint import', onImported }) => {
  const qc = useQueryClient();
  const { setActiveCaseId, setActiveView } = useCaseStore();
  const [csvText, setCsvText] = useState('');
  const [expanded, setExpanded] = useState(false);

  const listUrl = projectId
    ? `/api/v1/projects/${encodeURIComponent(projectId)}/ncrp-complaints`
    : `/api/v1/cases/${encodeURIComponent(caseId!)}/ncrp-complaints`;
  const importUrl = projectId
    ? `/api/v1/projects/${encodeURIComponent(projectId)}/ncrp-import`
    : `/api/v1/cases/${encodeURIComponent(caseId!)}/ncrp-import`;

  const listQ = useQuery({
    queryKey: ['ncrp-complaints', projectId ?? '', caseId ?? ''],
    queryFn: async () => (await apiClient.get<{ complaints: NcrpComplaintRecord[] }>(listUrl)).data,
    enabled: Boolean(projectId || caseId),
  });

  const importMut = useMutation({
    mutationFn: async (text: string) =>
      (
        await apiClient.post<{
          imported: number;
          matched_count: number;
          unmatched_count: number;
          complaints: NcrpComplaintRecord[];
        }>(importUrl, { csv_text: text, ...(caseId ? { case_id: caseId } : {}) })
      ).data,
    onSuccess: (d) => {
      toast.success(`Imported ${d.imported} NCRP complaint${d.imported === 1 ? '' : 's'} (${d.matched_count} matched)`);
      setCsvText('');
      void qc.invalidateQueries({ queryKey: ['ncrp-complaints'] });
      if (caseId) void qc.invalidateQueries({ queryKey: ['case', caseId] });
      onImported?.();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Could not import NCRP CSV';
      toast.error(String(msg));
    },
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setExpanded(true);
    importMut.mutate(text);
    e.target.value = '';
  };

  const complaints = listQ.data?.complaints ?? [];
  const matched = complaints.filter((c) => c.status === 'MATCHED').length;

  return (
    <section className="v6-glass rounded-2xl p-4 space-y-3" data-testid="ncrp-import-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[var(--accent)]" />
            {title}
          </h3>
          <p className="text-[12px] text-[var(--fg-3)]">
            Import NCRP CSV complaints (ack no., victim, phone, account/VPA, amount, date/time, typology) to auto-match against ingested flows and start the golden-hour clock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {complaints.length > 0 && (
            <Chip variant={matched > 0 ? 'safe' : 'muted'}>
              {matched}/{complaints.length} matched
            </Chip>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--fg-1)] hover:bg-[var(--hover)]">
            <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Upload CSV</span>
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="sr-only" data-testid="ncrp-file-input" />
          </label>
          <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)} data-testid="ncrp-toggle-paste">
            {expanded ? 'Hide CSV box' : 'Paste CSV'}
          </Button>
        </div>
      </div>

      {expanded && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (csvText.trim()) importMut.mutate(csvText);
          }}
          className="space-y-2 border-t border-[var(--line)] pt-3"
        >
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={4}
            placeholder="ack_no,victim_name,phone,account_vpa,amount,date_time,typology"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-[12px] v6-mono text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            data-testid="ncrp-csv-textarea"
          />
          <div className="flex justify-end gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={!csvText.trim()} isLoading={importMut.isPending} data-testid="ncrp-import-submit">
              Import & match complaints
            </Button>
          </div>
        </form>
      )}

      {complaints.length > 0 && (
        <div className="space-y-2 border-t border-[var(--line)] pt-3" data-testid="ncrp-complaints-list">
          {complaints.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--line)] bg-[var(--glass-1)] px-3 py-2.5 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {c.status === 'MATCHED' ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--safe)] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[var(--urgent)] shrink-0" />
                  )}
                  <span className="font-mono font-semibold text-[var(--fg-1)]">{c.ack_no || 'No Ack No.'}</span>
                  <span className="text-[var(--fg-2)] truncate">{c.victim_name || 'Victim not named'}</span>
                  {c.account_vpa && <span className="v6-mono text-[11px] text-[var(--fg-3)]">{c.account_vpa}</span>}
                  {c.amount_inr != null && <span className="font-semibold tabular-nums text-[var(--fg-1)]">{formatInr(c.amount_inr)}</span>}
                  {c.typology && <Chip variant="muted">{c.typology}</Chip>}
                </div>
                <div className="flex items-center gap-2">
                  <Chip variant={c.status === 'MATCHED' ? 'safe' : 'urgent'}>{c.status}</Chip>
                  {c.matched_network_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveCaseId(c.case_id);
                        setActiveView('network');
                        setFocus({ networkId: c.matched_network_id, account: c.matched_account });
                      }}
                    >
                      Open {c.matched_network_id} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11.5px] text-[var(--fg-2)]">{c.match_reason}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
