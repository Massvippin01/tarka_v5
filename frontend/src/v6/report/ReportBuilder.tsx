import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { FileDown, Languages, ShieldCheck } from 'lucide-react';
import { formatInr } from '../../lib/formatInr';
import { setFocus } from '../../lib/focusUrl';
import { Chip, Skeleton } from '../ui';
import { Tip } from '../freeze/FreezeQueuePanel';
import type { ActionData } from '../freeze/useActionData';
import { buildReport, hashChain, renderReportHtml, type ChainLink, type ReportScope } from './reportModel';
import { HINDI_REVIEWED, UNTRANSLATED_MARK, missingHindi, type Lang } from './reportI18n';

const Marked: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(UNTRANSLATED_MARK);
  return (
    <>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          {i < parts.length - 1 && (
            <mark className="ml-0.5 rounded bg-[var(--color-urgent-bg,#fde68a)] px-1 text-[10px] font-semibold text-[var(--urgent)]" title="No checked Hindi translation yet; English shown">
              EN
            </mark>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export const ReportBuilder: React.FC<{ data: ActionData }> = ({ data }) => {
  const { scope, ctx } = data;
  const levelScope: ReportScope = scope.level === 'account' ? 'account' : scope.level === 'network' ? 'network' : 'case';
  const [lang, setLang] = useState<Lang>('en');
  const [chain, setChain] = useState<ChainLink[] | null>(null);
  const [generatedAt] = useState(() => new Date());

  const scopeName =
    scope.level === 'account' ? `${scope.account}${scope.network ? ` (${scope.network.network_id})` : ''}` : scope.network ? scope.network.network_id : ctx.caseId;
  const sections = useMemo(
    () =>
      buildReport(
        {
          caseId: ctx.caseId,
          firNumber: ctx.firNumber,
          policeStation: ctx.policeStation,
          officer: ctx.officer,
          complainant: ctx.complainantName,
          scope: levelScope,
          scopeName,
          figures: data.figures,
          queue: data.rows,
          checklist: data.checklist,
          evidence: data.evidence,
          generatedAt,
          fmt: (v) => formatInr(v),
        },
        lang,
      ),
    [ctx, levelScope, scopeName, data.figures, data.rows, data.checklist, data.evidence, generatedAt, lang],
  );

  useEffect(() => {
    let live = true;
    setChain(null);
    hashChain(sections).then((c) => live && setChain(c));
    return () => {
      live = false;
    };
  }, [sections]);

  const exportPdf = () => {
    if (!chain) return;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
      toast.error('Allow pop-ups for TARKA to export the PDF');
      return;
    }
    w.document.open();
    w.document.write(renderReportHtml(sections, chain, lang, ctx.officer)); // every value is escaped in renderReportHtml
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const scopes: { id: ReportScope | 'project'; label: string; on: boolean; tip: string }[] = [
    { id: 'account', label: 'Account', on: scope.level === 'account', tip: 'Pick one account on the Network or People page, then come back.' },
    { id: 'network', label: 'Network', on: scope.level === 'network', tip: 'Pick one network from the breadcrumb above.' },
    { id: 'case', label: 'Case', on: scope.level === 'project', tip: 'Every network in this case.' },
    { id: 'project', label: 'Project', on: false, tip: 'Reports across several cases of a project are not built yet. Make one report per case.' },
  ];
  const final = chain?.at(-1)?.hash;
  const hiMissing = missingHindi().length;
  const seg = 'rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors';

  return (
    <section className="v6-glass rounded-2xl p-4 space-y-4" aria-labelledby="rb-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="rb-title" className="text-[15px] font-semibold text-[var(--fg-1)]">Court report</h3>
          <p className="text-[12.5px] text-[var(--fg-3)] mt-0.5">Built from the figures on this page. Every amount lists the statement rows behind it, and the whole report is sealed with a hash chain.</p>
        </div>
        <button
          type="button"
          disabled={!chain}
          onClick={exportPdf}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-xs hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          <FileDown className="h-3.5 w-3.5" /> Export PDF
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div role="radiogroup" aria-label="What the report covers" className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--glass-1)] p-0.5">
          {scopes.map((s) => (
            <Tip key={s.id} text={s.tip}>
              <button
                type="button"
                role="radio"
                aria-checked={s.on}
                aria-disabled={s.id === 'project'}
                onClick={() => {
                  if (s.id === 'case') setFocus({ networkId: null, account: null });
                  else if (s.id === 'network' && scope.network) setFocus({ networkId: scope.network.network_id, account: null });
                }}
                className={clsx(seg, s.on ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-xs' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]', s.id === 'project' && 'cursor-not-allowed opacity-50')}
              >
                {s.label}
              </button>
            </Tip>
          ))}
        </div>
        <div role="radiogroup" aria-label="Language" className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--glass-1)] p-0.5">
          <Languages className="ml-1.5 h-3.5 w-3.5 text-[var(--fg-3)]" aria-hidden />
          {(['en', 'hi'] as Lang[]).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)} className={clsx(seg, lang === l ? 'bg-[var(--surface-1)] text-[var(--accent)] shadow-xs' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]')}>
              {l === 'en' ? 'English' : 'हिन्दी'}
            </button>
          ))}
        </div>
        {lang === 'hi' && (
          <Tip text={`Hindi comes only from TARKA’s translation table. ${hiMissing} legal or technical phrases have no checked translation yet and are printed in English with an EN mark.${HINDI_REVIEWED ? '' : ' The table has not yet been signed off by a certified translator.'}`}>
            <span tabIndex={0} className="cursor-help"><Chip variant="urgent">{hiMissing} phrases still in English</Chip></span>
          </Tip>
        )}
      </div>

      {/* Preview on paper: the one place this page uses a light sheet in both themes. */}
      <div className="max-h-[640px] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
        <article lang={lang} className="mx-auto max-w-[760px] rounded-md bg-[#fff] px-8 py-7 text-[12.5px] leading-relaxed text-[#18181b] shadow-[0_1px_3px_rgba(0,0,0,.12),0_12px_32px_-12px_rgba(0,0,0,.25)]">
          {sections.map((s, i) => {
            const isAppendix = s.id.startsWith('rows-');
            return (
              <section key={s.id} className={clsx(i > 0 && 'mt-5')}>
                {i === 0 ? (
                  <h4 className="text-[20px] font-semibold tracking-tight border-b-2 border-[#18181b] pb-1.5 mb-2"><Marked text={s.title} /></h4>
                ) : (
                  <h5 className="text-[13.5px] font-semibold border-b border-[#d4d4d8] pb-1 mb-1.5"><Marked text={s.title} /></h5>
                )}
                {s.head ? (
                  <table className="w-full border-collapse text-[11.5px]">
                    <thead>
                      <tr className="text-left">{s.head.map((h, j) => <th key={j} style={{ background: "#f2f2f3", color: "#1a1a1d" }} className="border border-[#d4d4d8] px-1.5 py-1 font-semibold"><Marked text={h} /></th>)}</tr>
                    </thead>
                    <tbody>
                      {s.rows.slice(0, isAppendix ? 8 : 40).map((r, j) => (
                        <tr key={j}>{r.map((c, k) => <td key={k} className="border border-[#d4d4d8] px-1.5 py-1 align-top break-words max-w-[220px]"><Marked text={c} /></td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <dl className="grid grid-cols-[170px_1fr] gap-x-3 gap-y-0.5">
                    {s.rows.map((r, j) => (
                      <React.Fragment key={j}>
                        <dt className="text-[#52525b]"><Marked text={r[0]} /></dt>
                        <dd className="break-words"><Marked text={r.slice(1).join(' ')} /></dd>
                      </React.Fragment>
                    ))}
                  </dl>
                )}
                {s.rows.length > (isAppendix ? 8 : 40) && (
                  <p className="mt-1 text-[11px] text-[#71717a]">Preview shows {isAppendix ? 8 : 40} of {s.rows.length.toLocaleString('en-IN')} rows; the PDF has all of them.</p>
                )}
                {s.note && <p className="mt-1 text-[11.5px] italic text-[#52525b]"><Marked text={s.note} /></p>}
                <p className="mt-1 font-mono text-[10px] text-[#a1a1aa] truncate" title={chain?.find((c) => c.id === s.id)?.hash}>
                  {chain ? `SHA-256 ${chain.find((c) => c.id === s.id)?.hash}` : 'Sealing…'}
                </p>
              </section>
            );
          })}
        </article>
      </div>

      <footer className="flex items-center gap-2 text-[12px] text-[var(--fg-3)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--safe)] shrink-0" />
        {final ? (
          <Tip text="Each section is fingerprinted together with the one before it. Change any line and every fingerprint after it changes, so this final fingerprint seals the whole report.">
            <span tabIndex={0} className="cursor-help truncate">
              {sections.length} sections sealed · final fingerprint <span className="v6-mono text-[var(--fg-2)]">{final.slice(0, 16)}…{final.slice(-6)}</span>
            </span>
          </Tip>
        ) : (
          <Skeleton height={14} width={260} />
        )}
      </footer>
    </section>
  );
};
