/**
 * The court report as data: sections built from the same figures the screen shows, a SHA-256 hash chain over them,
 * and an escaped HTML rendering for print / Save as PDF. Pure apart from crypto.subtle in hashChain.
 */
import type { MoneyFigure } from '../../selectors/caseSelectors';
import type { ChecklistItem, RankedRow } from '../freeze/actionPlan';
import { t, untranslated, HINDI_REVIEWED, UNTRANSLATED_MARK, type Lang, type TKey } from './reportI18n';

export type ReportScope = 'account' | 'network' | 'case' | 'project';

export interface ReportMoneyPath {
  victim: string;
  path: string[];
  amountInr: number;
  outcome: string;
  heldInr: number;
}

export interface ReportControllerEvidence {
  networkId: string;
  controllerId: string;
  sharedIdentifiers: string;
  accounts: string[];
  reason: string;
}

export interface ReportProjectCase {
  caseId: string;
  title: string;
  stage: string;
  assignee: string;
  bookedInr: number;
  recoverableInr: number;
}

export interface ReportFigure {
  id: string;
  label: TKey;
  figure: MoneyFigure;
}

export interface ReportInput {
  caseId: string;
  firNumber: string;
  policeStation: string;
  officer: string;
  complainant: string;
  scope: ReportScope;
  scopeName: string;
  figures: ReportFigure[];
  queue: RankedRow[];
  checklist: ChecklistItem[];
  evidence: { name: string; sha256: string }[];
  moneyPaths?: ReportMoneyPath[];
  controllers?: ReportControllerEvidence[];
  projectCases?: ReportProjectCase[];
  generatedAt: Date;
  fmt: (inr: number) => string;
}

export interface ReportSection {
  id: string;
  title: string;
  head?: string[];
  rows: string[][];
  note?: string;
}

/** Rows per figure in the appendix; the rest stay one click away in the app. */
export const ROWS_PER_FIGURE = 300;

export function buildReport(i: ReportInput, lang: Lang): ReportSection[] {
  const L = (k: TKey) => t(k, lang);
  const scopeLabel = L(
    i.scope === 'project' ? 'scopeProject' : i.scope === 'case' ? 'scopeCase' : i.scope === 'network' ? 'scopeNetwork' : 'scopeAccount',
  );
  const extraSections: ReportSection[] = [];
  if (i.scope === 'project' && i.projectCases?.length) {
    extraSections.push({
      id: 'project-cases',
      title: L('projectCases'),
      head: [L('case'), L('caseStage'), L('officerAssigned'), L('paidIn'), L('recoverable')],
      rows: i.projectCases.map((pc) => [
        pc.title ? `${pc.caseId} (${pc.title})` : pc.caseId,
        untranslated(pc.stage || 'INTAKE', lang),
        pc.assignee || '—',
        i.fmt(pc.bookedInr),
        i.fmt(pc.recoverableInr),
      ]),
    });
  }
  if (i.moneyPaths?.length) {
    extraSections.push({
      id: 'money-paths',
      title: L('moneyPaths'),
      head: [L('victim'), L('hopPath'), L('amount'), L('pathOutcome'), L('held')],
      rows: i.moneyPaths.slice(0, 120).map((mp) => [
        mp.victim,
        mp.path.join(' → '),
        i.fmt(mp.amountInr),
        untranslated(mp.outcome, lang),
        i.fmt(mp.heldInr),
      ]),
    });
  }
  if (i.controllers?.length) {
    extraSections.push({
      id: 'controllers',
      title: L('controllers'),
      head: [L('controllerGroup'), L('deviceIdentifiers'), L('mulesCount'), L('reason')],
      rows: i.controllers.slice(0, 120).map((c) => [
        `${c.controllerId} (${c.networkId})`,
        c.sharedIdentifiers,
        `${c.accounts.length}: ${c.accounts.slice(0, 6).join(', ')}${c.accounts.length > 6 ? ` +${c.accounts.length - 6}` : ''}`,
        untranslated(c.reason, lang),
      ]),
    });
  }
  const sections: ReportSection[] = [
    {
      id: 'header',
      title: L('title'),
      rows: [
        [L('case'), i.caseId],
        [L('fir'), i.firNumber || '—'],
        [L('station'), i.policeStation || '—'],
        [L('officer'), i.officer || '—'],
        [L('complainant'), i.complainant || '—'],
        [L('scope'), `${scopeLabel}: ${i.scopeName}`],
        [L('generated'), i.generatedAt.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })],
      ],
      note: lang === 'hi' && !HINDI_REVIEWED ? L('hindiNote') : undefined,
    },
    {
      id: 'money',
      title: L('moneySummary'),
      head: ['#', '', L('amount')],
      rows: i.figures.map((f) => [f.id, `${L(f.label)}`, i.fmt(f.figure.totalInr)]),
    },
    ...extraSections,
    {
      id: 'notices',
      title: L('freezeNotices'),
      head: [L('account'), L('bank'), L('section'), L('amount'), L('status')],
      rows: i.queue.map((r) => [
        r.accountMasked && r.accountMasked !== r.holderName ? `${r.holderName} (${r.accountMasked})` : r.holderName,
        untranslated(r.bankKey.label, lang),
        L(r.section === '106' ? 'sec106' : 'sec107'),
        i.fmt(r.amountInr),
        L(r.status),
      ]),
    },
    {
      id: 'checklist',
      title: L('checklist'),
      rows: i.checklist.map((c) => [c.ok ? L('done') : L('missing'), untranslated(c.text, lang)]),
      note: i.checklist.every((c) => c.ok) ? L('courtReady') : L('notCourtReady'),
    },
    {
      id: 'evidence',
      title: L('evidence'),
      head: [L('file'), L('fingerprint')],
      rows: i.evidence.map((e) => [e.name, e.sha256]),
    },
    ...i.figures.map((f) => {
      const rows = f.figure.rows;
      const more = rows.length - ROWS_PER_FIGURE;
      return {
        id: `rows-${f.id}`,
        title: `${f.id} · ${L(f.label)} · ${i.fmt(f.figure.totalInr)}`,
        head: [L('date'), L('from'), L('to'), L('amount'), L('reference'), L('source')],
        rows: rows.slice(0, ROWS_PER_FIGURE).map((r) => [
          r.dateIst || '—',
          r.from,
          r.to,
          i.fmt(r.amountInr),
          r.reference || '—',
          `${r.sourceFile}${r.sourceRow !== null ? ` · ${r.sourceRow}` : ''}`,
        ]),
        note: rows.length === 0 ? L('noRows') : more > 0 ? `+${more.toLocaleString('en-IN')} ${L('moreRows')}` : undefined,
      };
    }),
  ];
  return sections;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ChainLink {
  id: string;
  hash: string;
}

/** h(n) = SHA-256(h(n-1) + JSON(section n)); h(0) is chained from the empty string. */
export async function hashChain(sections: ReportSection[]): Promise<ChainLink[]> {
  const out: ChainLink[] = [];
  let prev = '';
  for (const s of sections) {
    prev = await sha256Hex(prev + JSON.stringify(s));
    out.push({ id: s.id, hash: prev });
  }
  return out;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const mark = (s: string) => esc(s).split(UNTRANSLATED_MARK).join(`<mark class="en">${UNTRANSLATED_MARK}</mark>`);

/** Self-contained printable HTML; every value escaped. */
export function renderReportHtml(sections: ReportSection[], chain: ChainLink[], lang: Lang, officer: string): string {
  const hashOf = new Map(chain.map((c) => [c.id, c.hash]));
  const body = sections
    .map((s, i) => {
      const table = s.head
        ? `<table><thead><tr>${s.head.map((h) => `<th>${mark(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r) => `<tr>${r.map((c) => `<td>${mark(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
        : `<table class="kv"><tbody>${s.rows.map((r) => `<tr><th>${mark(r[0])}</th><td>${r.slice(1).map(mark).join(' ')}</td></tr>`).join('')}</tbody></table>`;
      const Tag = i === 0 ? 'h1' : 'h2';
      return `<section><${Tag}>${mark(s.title)}</${Tag}>${table}${s.note ? `<p class="note">${mark(s.note)}</p>` : ''}<p class="hash">SHA-256 ${esc(hashOf.get(s.id) ?? '')}</p></section>`;
    })
    .join('');
  const final = chain[chain.length - 1]?.hash ?? '';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(sections[0]?.title ?? 'Report')}</title><style>
body{font:12px/1.5 "Segoe UI","Nirmala UI","Noto Sans Devanagari",system-ui,sans-serif;color:#111;margin:28px}
h1{font-size:20px;margin:0 0 8px}h2{font-size:14px;margin:22px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d4d4d4;padding:4px 6px;text-align:left;vertical-align:top;word-break:break-word}
thead th{background:#f4f4f5}.kv th{width:200px;background:#fafafa}.note{color:#444;font-style:italic}
.hash{font:10px ui-monospace,Consolas,monospace;color:#666;margin:4px 0 0}mark.en{background:#fde68a;padding:0 2px;font-size:9px}
footer{margin-top:28px;display:flex;justify-content:space-between;gap:24px;border-top:2px solid #111;padding-top:10px}
@page{size:A4;margin:14mm}section{break-inside:auto}tr{break-inside:avoid}
</style></head><body>${body}<footer><div><strong>${mark(t('hashChain', lang))}</strong><br>${mark(t('hashNote', lang))}<br><span class="hash">${mark(t('finalHash', lang))}: ${esc(final)}</span></div><div style="min-width:220px;text-align:right"><br><br>______________________<br>${mark(t('signature', lang))}<br>${esc(officer)}</div></footer></body></html>`;
}
