import type { GoldenHour } from './goldenHour';

/** Built-in sample cases (fixtures); always listed last. */
export const SAMPLE_CASE_IDS = ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'];

export type SwitcherTab = 'ALL' | 'RECENT' | 'PINNED';

export interface WorkspaceInput {
  caseId: string;
  title?: string;
  firNumber?: string;
  complainantName?: string;
  typology?: string;
}
export interface RegisteredRow {
  case_id: string;
  title?: string;
  project_id?: string | null;
  lifecycle?: string | null;
  assignee?: string | null;
  details?: { fir_number?: string; complainant_name?: string; typology?: string };
}
export interface ProjectInput { project_id: string; name: string }
export interface SummaryInput {
  caseId: string;
  complainantName: string;
  bookedLossInr: number;
  recoverableInr: number;
  frozenInr: number;
  mules: number;
  networks: number;
  goldenHour: { remainingMins: number };
}
export interface Figures { lossInr?: number; freezableInr?: number; mules?: number; networks?: number }

export interface SwitcherCase {
  caseId: string;
  complainant: string;
  title: string;
  fir: string;
  typology: string;
  projectId: string | null;
  projectName: string | null;
  lifecycle: string | null;
  isSample: boolean;
  figures: Figures;
  golden: GoldenHour;
}
export interface SwitcherGroup { key: string; label: string; cases: SwitcherCase[] }

export interface BuildInput {
  workspaces: WorkspaceInput[];
  registered: RegisteredRow[];
  projects: ProjectInput[];
  summary: SummaryInput[];
  /** Sample-case figures and every golden-hour clock come from the app's shared selectors, passed in. */
  sampleFigures: (caseId: string) => Figures;
  golden: (caseId: string, summaryMins: number | undefined) => GoldenHour;
}

const first = (...v: (string | null | undefined)[]) => v.find((x) => x && x.trim()) ?? '';

/** Merge fixture workspaces, the projects store and the station summary into one list, one row per case id. */
export function buildSwitcherCases(i: BuildInput): SwitcherCase[] {
  const ws = new Map(i.workspaces.map((w) => [w.caseId, w]));
  const reg = new Map(i.registered.map((r) => [r.case_id, r]));
  const sum = new Map(i.summary.map((s) => [s.caseId, s]));
  const proj = new Map(i.projects.map((p) => [p.project_id, p.name]));
  const ids = new Set([...ws.keys(), ...reg.keys(), ...sum.keys()]);
  return [...ids].map((caseId) => {
    const w = ws.get(caseId);
    const r = reg.get(caseId);
    const s = sum.get(caseId);
    const isSample = SAMPLE_CASE_IDS.includes(caseId);
    const projectId = r?.project_id ?? null;
    const figures: Figures = isSample
      ? i.sampleFigures(caseId)
      : s
        ? { lossInr: s.bookedLossInr, freezableInr: Math.max(0, s.recoverableInr - s.frozenInr), mules: s.mules, networks: s.networks }
        : {};
    return {
      caseId,
      complainant: first(w?.complainantName, r?.details?.complainant_name, s?.complainantName),
      title: first(w?.title, r?.title),
      fir: first(w?.firNumber, r?.details?.fir_number),
      typology: first(w?.typology, r?.details?.typology).replace(/_/g, ' ').toLowerCase(),
      projectId,
      projectName: projectId ? proj.get(projectId) ?? null : null,
      lifecycle: r?.lifecycle ?? null,
      isSample,
      figures,
      golden: i.golden(caseId, isSample ? undefined : s?.goldenHour.remainingMins),
    };
  });
}

/** Projects (in the order given), then "No project", then built-in samples last. */
export function groupCases(cases: SwitcherCase[], projects: ProjectInput[]): SwitcherGroup[] {
  const groups: SwitcherGroup[] = [];
  for (const p of projects) {
    const list = cases.filter((c) => !c.isSample && c.projectId === p.project_id);
    if (list.length) groups.push({ key: p.project_id, label: p.name, cases: list });
  }
  const loose = cases.filter((c) => !c.isSample && !groups.some((g) => g.cases.includes(c)));
  if (loose.length) groups.push({ key: 'none', label: 'No project', cases: loose });
  const samples = cases.filter((c) => c.isSample);
  if (samples.length) groups.push({ key: 'sample', label: 'Sample cases', cases: samples });
  return groups;
}

export function matchesQuery(c: SwitcherCase, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.caseId, c.fir, c.complainant, c.title, c.projectName ?? ''].some((f) => f.toLowerCase().includes(q));
}

/** Tab + search filter, then grouping. Recent is one flat list in last-opened order. */
export function visibleGroups(
  cases: SwitcherCase[], projects: ProjectInput[], tab: SwitcherTab, query: string, recent: string[], pinned: string[],
): SwitcherGroup[] {
  let list = cases.filter((c) => matchesQuery(c, query));
  if (tab === 'PINNED') list = list.filter((c) => pinned.includes(c.caseId));
  if (tab === 'RECENT') {
    const rank = (c: SwitcherCase) => recent.indexOf(c.caseId);
    list = list.filter((c) => rank(c) >= 0).sort((a, b) => rank(a) - rank(b));
    return list.length ? [{ key: 'recent', label: 'Recently opened', cases: list }] : [];
  }
  return groupCases(list, projects);
}

/** Split text around case-insensitive query matches. */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const q = query.trim().toLowerCase();
  if (!q || !text) return [{ text, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  const lower = text.toLowerCase();
  let at = 0;
  for (let k = lower.indexOf(q); k >= 0; k = lower.indexOf(q, at)) {
    if (k > at) out.push({ text: text.slice(at, k), hit: false });
    out.push({ text: text.slice(k, k + q.length), hit: true });
    at = k + q.length;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out;
}

/** "Expired" or "1h 58m left". */
export const goldenLabel = (g: GoldenHour) => (g.expired ? 'Expired' : `${g.text} left`);

export function readIds(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export function writeIds(key: string, ids: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* storage unavailable: keep in memory only */ }
}
