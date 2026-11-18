import React, { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import apiClient from '../../api/client';
import { Button } from '../ui';

/** Formats other tools already import. The backend builds each file from this case's networks. */
const FORMATS = [
  { id: 'i2', label: 'i2 / Maltego', title: 'Who paid whom, how much and how often, as a link chart for i2 Analyst\'s Notebook or Maltego (CSV)' },
  { id: 'stix', label: 'STIX 2.1', title: 'Suspected mule UPI IDs and phones as STIX 2.1 indicators, the format CERT-In and I4C share (JSON)' },
  { id: 'suspects', label: 'Suspect list', title: 'Every suspected mule with its layer, score and reason, including layers beyond the first (CSV)' },
] as const;

export const ExportButtons: React.FC<{ caseId: string }> = ({ caseId }) => {
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (format: string) => {
    setBusy(format);
    try {
      const res = await apiClient.get(`/api/v1/cases/${encodeURIComponent(caseId)}/export`, {
        params: { format },
        responseType: 'blob',
      });
      const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] ?? '')?.[1] ?? `${caseId}-${format}`;
      const url = URL.createObjectURL(res.data as Blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed. Check that the case has processed statements and try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5" aria-label="Export this case">
      {FORMATS.map((f) => (
        <Button key={f.id} size="sm" title={f.title} disabled={busy !== null} onClick={() => void download(f.id)}>
          <Download className="w-3.5 h-3.5" aria-hidden />
          {busy === f.id ? 'Preparing…' : f.label}
        </Button>
      ))}
    </div>
  );
};
