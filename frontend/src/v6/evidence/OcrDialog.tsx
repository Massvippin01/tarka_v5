import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import apiClient from '../../api/client';
import { Skeleton } from '../ui';
import type { EvidenceFile } from '../../selectors/evidenceSelectors';

const enc = encodeURIComponent;

interface Token { text: string; confidence: number; bbox: [number, number, number, number] }
interface Prov { raw_text?: string; confidence?: number }
export interface Recon {
  reconciliation_status: string;
  summary?: string;
  matched_row?: { line: number; payer: string; payee: string; amount: number; ts: number; ref: string } | null;
}
interface Finding { source: string; severity: string; summary: string }
export interface ForensicsPayload {
  ocr_analysis?: {
    engine?: string;
    ocr_status?: string;
    tokens?: Token[];
    extracted_fields?: Record<string, unknown> & { field_provenance?: Record<string, Prov>; ambiguities?: string[] };
  };
  findings?: Finding[];
  preliminary_assessment?: string;
  reconciliation?: Recon;
}

const FIELD_LABEL: [string, string][] = [
  ['amount', 'Amount'],
  ['utr_rrn', 'UTR / RRN (reference number)'],
  ['vpa', 'UPI ID'],
  ['transaction_date', 'Date'],
  ['transaction_time', 'Time'],
  ['bank_name', 'Bank'],
  ['upi_app', 'Payment app'],
  ['status', 'Status on receipt'],
];

const inr = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Plain-English reconciliation line; exported for tests. */
export function reconLine(r: Recon | undefined): { text: string; tone: 'safe' | 'risk' | 'muted' } {
  if (!r) return { text: 'Not compared with the statement yet.', tone: 'muted' };
  const m = r.matched_row;
  const when = m ? new Date(m.ts * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  const row = m ? `statement row #${m.line}: ${inr(m.amount)} to ${m.payee} at ${when}` : '';
  switch (r.reconciliation_status) {
    case 'MATCH_CONFIRMED': return { text: `Matches ${row}.`, tone: 'safe' };
    case 'DISCREPANCY_DETECTED': return { text: `Same reference as ${row}, but the receipt shows a different amount. Possible manipulation, needs examiner review.`, tone: 'risk' };
    case 'PROBABILISTIC_AMOUNT_ONLY_MATCH': return { text: `Amount fits ${row}, but the reference number did not match. Needs examiner review.`, tone: 'muted' };
    case 'UNMATCHED_IN_STATEMENT': return { text: 'No matching statement row. Needs examiner review.', tone: 'risk' };
    case 'NO_BANK_ROWS_YET': return { text: 'No bank statement has been uploaded to this case yet.', tone: 'muted' };
    case 'NOT_ENOUGH_DETAIL': return { text: 'No amount or reference number could be read, so there is nothing to compare.', tone: 'muted' };
    default: return { text: r.summary ?? 'Needs examiner review.', tone: 'muted' };
  }
}

const TONE = { safe: 'var(--safe)', risk: 'var(--risk)', muted: 'var(--fg-2)' } as const;

function useOcr(file: EvidenceFile | null, caseId: string) {
  const jobId = file?.jobId ?? null;
  const data = useQuery({
    queryKey: ['ocr', caseId, jobId],
    queryFn: async () => (await apiClient.get<ForensicsPayload>(`/api/v1/ingestion/cases/${enc(caseId)}/jobs/${enc(jobId!)}/forensics`)).data,
    enabled: !!jobId,
    retry: false,
  });
  const isImage = !!file && /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.filename);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!jobId || !isImage) return;
    let live = true;
    let obj: string | null = null;
    apiClient
      .get(`/api/v1/ingestion/cases/${enc(caseId)}/jobs/${enc(jobId)}/file`, { responseType: 'blob' })
      .then((r) => {
        obj = URL.createObjectURL(r.data as Blob);
        if (live) setUrl(obj);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      setUrl(null);
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [caseId, jobId, isImage]);
  return { data, url, isImage };
}

export const OcrDialog: React.FC<{ file: EvidenceFile | null; caseId: string; onClose: () => void }> = ({ file, caseId, onClose }) => {
  const { data, url, isImage } = useOcr(file, caseId);
  const p = data.data;
  const ocr = p?.ocr_analysis;
  const fields = ocr?.extracted_fields ?? {};
  const prov = fields.field_provenance ?? {};
  const noEngine = ocr?.ocr_status === 'OCR engine not available';
  const recon = reconLine(p?.reconciliation);
  const findings = p?.findings ?? [];
  return (
    <Dialog.Root open={!!file} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {file && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="v6-glass fixed left-1/2 top-[5vh] z-[81] flex max-h-[90vh] w-[min(1040px,94vw)] -translate-x-1/2 flex-col rounded-2xl"
                style={{ background: 'var(--glass-3)' }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
                  <div className="min-w-0">
                    <Dialog.Title className="text-[17px] font-[650] text-[var(--fg-1)]">Text read from this file (OCR)</Dialog.Title>
                    <p className="mt-0.5 truncate text-[13px] text-[var(--fg-2)]" title={file.filename}>
                      {file.filename}. The computer reads the picture; a person still has to check it.
                    </p>
                  </div>
                  <Dialog.Close className="rounded-md p-1.5 text-[var(--fg-3)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]" aria-label="Close">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-5">
                  {data.isLoading ? (
                    <Skeleton height={260} />
                  ) : data.isError || !p ? (
                    <p className="text-[13px] text-[var(--fg-2)]">No text reading is stored for this file. It may still be processing, or it is not a payment image or PDF.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                      <div>
                        {isImage && url ? (
                          <div className="relative overflow-hidden rounded-xl border border-[var(--line)]" data-testid="ocr-image">
                            <img src={url} alt="Evidence file with the text boxes found by OCR" className="block w-full" />
                            {(ocr?.tokens ?? []).map((t, i) => (
                              <span
                                key={i}
                                title={`${t.text} (${Math.round(t.confidence * 100)}% sure)`}
                                className="absolute rounded-[3px] border border-[var(--accent)] bg-[var(--accent)]/10"
                                style={{ left: `${t.bbox[0] * 100}%`, top: `${t.bbox[1] * 100}%`, width: `${(t.bbox[2] - t.bbox[0]) * 100}%`, height: `${(t.bbox[3] - t.bbox[1]) * 100}%` }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[var(--line)] p-4 text-[12.5px] text-[var(--fg-3)]">
                            {isImage ? 'Loading the picture…' : 'The page picture is not shown for PDFs. The text it found is in the table.'}
                          </div>
                        )}
                        <p className="mt-2 text-[12px] text-[var(--fg-3)]">Each box is a piece of text the computer found. Hover a box to see it.</p>
                      </div>
                      <div className="min-w-0 space-y-5">
                        {noEngine && (
                          <div className="rounded-xl border border-[var(--urgent)]/30 bg-[var(--urgent-bg)] p-3 text-[13px] text-[var(--urgent)]">
                            OCR engine not available on this server, so no text was read. The file is kept as evidence.
                          </div>
                        )}
                        <section>
                          <h4 className="mb-2 text-[13px] font-[650] text-[var(--fg-1)]">What was read</h4>
                          <table className="w-full table-fixed text-[13px]">
                            <colgroup><col className="w-[38%]" /><col /><col className="w-[84px]" /></colgroup>
                            <thead>
                              <tr className="text-left text-[12px] text-[var(--fg-3)]">
                                <th className="pb-1.5 font-medium">Field</th><th className="pb-1.5 font-medium">Value</th><th className="pb-1.5 font-medium">Confidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {FIELD_LABEL.map(([k, label]) => {
                                const v = fields[k];
                                const has = v !== null && v !== undefined && v !== '' && !(k === 'status' && v === 'UNKNOWN');
                                const c = prov[k]?.confidence;
                                return (
                                  <tr key={k} className="border-t border-[var(--line)]">
                                    <td className="py-1.5 pr-2 text-[var(--fg-2)]">{label}</td>
                                    <td className="py-1.5 pr-2 v6-mono text-[var(--fg-1)]">
                                      {has ? (k === 'amount' ? inr(Number(v)) : String(v)) : <span className="font-sans text-[var(--fg-3)]">Not found</span>}
                                    </td>
                                    <td className="py-1.5 tabular-nums text-[var(--fg-2)]">{has && typeof c === 'number' ? `${Math.round(c * 100)}%` : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {(fields.ambiguities ?? []).map((a, i) => <p key={i} className="mt-2 text-[12.5px] text-[var(--fg-2)]">{a}</p>)}
                        </section>
                        <section>
                          <h4 className="mb-1.5 text-[13px] font-[650] text-[var(--fg-1)]">Compared with the bank statement</h4>
                          <p className="text-[13.5px] font-medium" style={{ color: TONE[recon.tone] }} data-testid="ocr-recon">{recon.text}</p>
                        </section>
                        <section>
                          <h4 className="mb-1.5 text-[13px] font-[650] text-[var(--fg-1)]">Checks for editing</h4>
                          {findings.length === 0 ? (
                            <p className="text-[13px] text-[var(--fg-2)]">The checks (file details, compression, layout) found nothing unusual. A person still needs to review it.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {findings.map((f, i) => (
                                <li key={i} className="rounded-lg bg-[var(--risk-bg)] px-3 py-2 text-[13px] text-[var(--risk)]">{f.summary}</li>
                              ))}
                            </ul>
                          )}
                        </section>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
