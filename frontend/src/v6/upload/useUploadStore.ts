/**
 * Upload engine for the Upload Center. Lives in a store (not the screen) so uploads keep
 * going when the investigator navigates to another screen.
 */
import { create } from 'zustand';
import axios from 'axios';
import apiClient from '../../api/client';
import { resumeDb } from './resumeDb';
import {

  MAX_PARALLEL,
  SNIFF_BYTES,
  TERMINAL_STAGES,
  decideResume,
  fileKey,
  planChunks,
  sniff,
  stateFromStatus,
  type CardState,
  type JobStatus,
  type SniffResult,
} from './uploadPlanner';

const API = '/api/v1/ingestion';
const POLL_MS = 1000;
const NET_RETRIES = 3;

export interface UploadItem {
  id: string; // fileKey
  caseId: string;
  name: string;
  size: number;
  lastModified: number;
  file?: File; // missing after a reload until the same file is dropped again
  sniff?: SniffResult;
  state: CardState;
  jobId?: string;
  bytesSent: number;
  speedBps: number;
  reason?: string;
  status?: JobStatus;
  addedAt: number;
}

interface UploadStore {
  items: Record<string, UploadItem>;
  hydratedCases: Record<string, boolean>;
  addFiles: (files: File[], caseId: string) => Promise<void>;
  hydrate: (caseId: string) => Promise<void>;
  pause: (id: string) => void;
  resume: (id: string) => void;
  retryProcessing: (id: string) => Promise<void>;
  /** Send a column mapping for a NEEDS_MAPPING job; throws a plain-English message on failure. */
  submitMapping: (jobId: string, body: { columns: Record<string, string>; template_name?: string }) => Promise<JobStatus>;
  cancel: (id: string) => Promise<void>;
  dismiss: (id: string) => void;
}

const controllers = new Map<string, AbortController>();

const patch = (id: string, p: Partial<UploadItem>) =>
  useUploadStore.setState((s) => (s.items[id] ? { items: { ...s.items, [id]: { ...s.items[id], ...p } } } : s));
const get = (id: string) => useUploadStore.getState().items[id];

const errText = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data?.detail;
    if (typeof d === 'string') return d;
    if (e.response) return `Server replied ${e.response.status}`;
    return 'Could not reach the TARKA server';
  }
  return e instanceof Error ? e.message : String(e);
};
const isAbort = (e: unknown) => axios.isCancel(e) || (e as any)?.name === 'CanceledError';

async function fetchStatus(jobId: string): Promise<JobStatus | null> {
  try {
    return (await apiClient.get<JobStatus>(`${API}/jobs/${jobId}/status`)).data;
  } catch (e) {
    if (axios.isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 403)) return null;
    throw e;
  }
}

function applyStatus(id: string, s: JobStatus) {
  const state = stateFromStatus(s);
  const reason =
    state === 'rejected' || state === 'attention'
      ? s.error_message || (s.stage === 'NEEDS_MAPPING' ? s.analytics_summary?.note : undefined)
      : undefined;
  patch(id, { status: s, state, reason, bytesSent: s.bytes_uploaded });
}

/** Poll until the job reaches a terminal stage or reports an error. */
async function pollUntilDone(id: string, jobId: string) {
  while (get(id)) {
    let s: JobStatus | null;
    try {
      s = await fetchStatus(jobId);
    } catch {
      await new Promise((r) => setTimeout(r, POLL_MS * 3));
      continue; // server briefly unreachable: keep waiting
    }
    if (!s) return patch(id, { state: 'attention', reason: 'The server no longer has this upload. Remove it and drop the file again.' });
    applyStatus(id, s);
    if (TERMINAL_STAGES.has(s.stage) || s.error_message) return;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function createJob(item: UploadItem): Promise<string> {
  const { data } = await apiClient.post<JobStatus>(`${API}/jobs/create`, {
    case_id: item.caseId,
    filename: item.name,
    total_size_bytes: item.size,
  });
  await resumeDb.put({
    key: item.id,
    caseId: item.caseId,
    jobId: data.job_id,
    name: item.name,
    size: item.size,
    lastModified: item.lastModified,
  });
  patch(item.id, { jobId: data.job_id, status: data, bytesSent: 0 });
  return data.job_id;
}

async function run(id: string) {
  const ctrl = new AbortController();
  controllers.set(id, ctrl);
  patch(id, { state: 'uploading', reason: undefined });
  try {
    const item = get(id);
    const file = item.file!;
    let jobId = item.jobId;
    let offset = 0;

    if (jobId) {
      const d = decideResume(await fetchStatus(jobId), file.size);
      if (d.kind === 'restart') jobId = undefined;
      else if (d.kind === 'continue') offset = d.offset;
      else return void (await pollUntilDone(id, jobId));
    }
    if (!jobId) jobId = await createJob(item);

    let last: JobStatus | undefined;
    let speed = get(id)?.speedBps ?? 0;
    while (offset < file.size) {
      const { end } = planChunks(file.size, offset)[0];
      let t0 = performance.now();
      let prevLoaded = 0;
      let attempt = 0;
      for (;;) {
        try {
          const res = await apiClient.put<JobStatus>(`${API}/jobs/${jobId}/chunk`, file.slice(offset, end), {
            params: { offset },
            headers: { 'Content-Type': 'application/octet-stream' },
            signal: ctrl.signal,
            timeout: 0, // big chunks on slow links, and the last chunk may run processing inline
            onUploadProgress: (ev) => {
              const now = performance.now();
              const dt = (now - t0) / 1000;
              if (dt > 0.05) {
                const inst = (ev.loaded - prevLoaded) / dt;
                speed = speed ? speed * 0.7 + inst * 0.3 : inst;
                t0 = now;
                prevLoaded = ev.loaded;
              }
              const sent = offset + ev.loaded;
              patch(id, { bytesSent: sent, speedBps: speed, state: sent >= file.size ? 'verifying' : 'uploading' });
            },
          });
          last = res.data;
          offset = end;
          break;
        } catch (e) {
          if (isAbort(e)) throw e;
          const code = axios.isAxiosError(e) ? e.response?.status : undefined;
          if (code === 409) {
            // Offset mismatch (e.g. a previous attempt landed): realign with the server.
            const d = decideResume(await fetchStatus(jobId), file.size);
            if (d.kind === 'continue') {
              offset = d.offset;
              break;
            }
            if (d.kind === 'restart') throw new Error(errText(e));
            offset = file.size; // all bytes are in
            break;
          }
          if (code !== undefined && code < 500) throw e; // 4xx other than 409: not retryable
          if (++attempt > NET_RETRIES) throw e;
          await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
        }
      }
    }

    if (last) applyStatus(id, last);
    if (!last || !(TERMINAL_STAGES.has(last.stage) || last.error_message)) await pollUntilDone(id, jobId);
  } catch (e) {
    if (isAbort(e)) patch(id, { state: 'paused' });
    else {
      const code = axios.isAxiosError(e) ? e.response?.status : undefined;
      patch(id, {
        state: code !== undefined && code < 500 ? 'rejected' : 'paused',
        reason: code !== undefined && code < 500 ? errText(e) : `${errText(e)}. Press Resume to continue.`,
      });
    }
  } finally {
    controllers.delete(id);
    pump();
  }
}

/** Start queued uploads while fewer than MAX_PARALLEL are sending bytes. */
function pump() {
  const queued = Object.values(useUploadStore.getState().items)
    .filter((i) => i.state === 'queued' && i.file && !controllers.has(i.id))
    .sort((a, b) => a.addedAt - b.addedAt);
  for (const item of queued.slice(0, Math.max(0, MAX_PARALLEL - controllers.size))) void run(item.id);
}

export const useUploadStore = create<UploadStore>((set) => ({
  items: {},
  hydratedCases: {},

  addFiles: async (files, caseId) => {
    for (const file of files) {
      const id = fileKey(file, caseId);
      const existing = get(id);
      if (existing && (controllers.has(id) || existing.file)) continue; // already in this session
      const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
      const base = { file, sniff: sniff(head, file.size, file.name), state: 'queued' as const, reason: undefined };
      set((s) => ({
        items: {
          ...s.items,
          [id]: existing
            ? { ...existing, ...base } // same file re-dropped after a reload: resume its job
            : { id, caseId, name: file.name, size: file.size, lastModified: file.lastModified, bytesSent: 0, speedBps: 0, addedAt: Date.now(), ...base },
        },
      }));
    }
    pump();
  },

  hydrate: async (caseId) => {
    if (useUploadStore.getState().hydratedCases[caseId]) return;
    set((s) => ({ hydratedCases: { ...s.hydratedCases, [caseId]: true } }));
    for (const r of await resumeDb.all(caseId)) {
      if (get(r.key)) continue;
      set((s) => ({
        items: {
          ...s.items,
          [r.key]: { id: r.key, caseId, name: r.name, size: r.size, lastModified: r.lastModified, jobId: r.jobId, state: 'paused', bytesSent: 0, speedBps: 0, addedAt: r.lastModified },
        },
      }));
      fetchStatus(r.jobId)
        .then((s) => {
          if (!s || s.is_cancelled) {
            void resumeDb.remove(r.key);
            useUploadStore.setState((st) => {
              const { [r.key]: _, ...rest } = st.items;
              return { items: rest };
            });
            return;
          }
          const d = decideResume(s, r.size);
          if (d.kind === 'continue') patch(r.key, { status: s, bytesSent: s.bytes_uploaded, state: 'paused', reason: 'Page was reloaded. Drop the same file again to continue where it stopped.' });
          else if (d.kind === 'wait') void pollUntilDone(r.key, r.jobId);
          else applyStatus(r.key, s);
        })
        .catch((e) => patch(r.key, { reason: `Could not check this upload: ${errText(e)}` }));
    }
  },

  pause: (id) => controllers.get(id)?.abort(),

  resume: (id) => {
    if (!get(id)?.file) return;
    patch(id, { state: 'queued', reason: undefined });
    pump();
  },

  retryProcessing: async (id) => {
    const jobId = get(id)?.jobId;
    if (!jobId) return;
    try {
      await apiClient.post(`${API}/jobs/${jobId}/resume`);
      patch(id, { state: 'processing', reason: undefined });
      await pollUntilDone(id, jobId);
    } catch (e) {
      patch(id, { reason: errText(e) });
    }
  },

  submitMapping: async (jobId, body) => {
    let s: JobStatus;
    try {
      s = (await apiClient.post<JobStatus>(`${API}/jobs/${jobId}/mapping`, body, { timeout: 0 })).data;
    } catch (e) {
      throw new Error(errText(e));
    }
    const item = Object.values(useUploadStore.getState().items).find((i) => i.jobId === jobId);
    if (item) {
      applyStatus(item.id, s);
      if (!(TERMINAL_STAGES.has(s.stage) || s.error_message)) void pollUntilDone(item.id, jobId);
    }
    return s;
  },

  cancel: async (id) => {
    const item = get(id);
    controllers.get(id)?.abort();
    if (item?.jobId) await apiClient.post(`${API}/jobs/${item.jobId}/cancel`).catch(() => undefined);
    useUploadStore.getState().dismiss(id);
  },

  dismiss: (id) => {
    void resumeDb.remove(id);
    set((s) => {
      const { [id]: _, ...rest } = s.items;
      return { items: rest };
    });
  },
}));

