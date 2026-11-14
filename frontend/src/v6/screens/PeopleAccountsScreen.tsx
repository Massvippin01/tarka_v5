import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHead, FindingStrip, Card, CardHeader, Button, Chip, Gauge, Inspector, ScoreWaterfall } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';

export interface IdentityRecord {
  id: string;
  name: string;
  role: string;
  kind: 'victim' | 'risk' | 'safe';
  acct: string;
  score: number | null;
  mergedVpa?: boolean;
  why: Array<{ label: string; value: number }>;
  enNarrative: string;
  hiNarrative: string;
}

interface MentionItem {
  label: string;
  value: string;
  targetId: string;
}

interface MentionGroup {
  source: string;
  items: MentionItem[];
}

export const PeopleAccountsScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const canonical = getCanonicalCase(caseId);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [narrativeLang, setNarrativeLang] = useState<'en' | 'hi'>('en');

  const containerRef = useRef<HTMLDivElement>(null);
  const mentionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const identRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<Array<{ d: string; color: string; id: string }>>([]);

  // Data per case
  const { idents, mentions } = useMemo(() => {
    if (caseId === 'CASE-2026-001') {
      const identsList: IdentityRecord[] = [
        {
          id: 'V',
          name: 'Sunil Kumar',
          role: 'Victim',
          kind: 'victim',
          acct: 'SBI ••9101',
          score: null,
          why: [],
          enNarrative: 'Primary complainant and victim of extortion.',
          hiNarrative: 'प्राथमिक शिकायतकर्ता और जबरन वसूली का शिकार।',
        },
        {
          id: 'M1',
          name: 'Vikram Shah',
          role: 'Layer-1 mule',
          kind: 'risk',
          acct: 'Axis ••0291',
          score: 94,
          mergedVpa: true,
          why: [
            { label: 'Money left 112 s after arriving', value: 28 },
            { label: '₹5,00,000 split into 3 transfers in 7 min', value: 18 },
            { label: 'Same phone IMEI as HDFC ••1992', value: 16 },
            { label: '99% passed through within 24 h', value: 15 },
            { label: 'Account only 41 days old', value: 9 },
          ],
          enNarrative:
            'Money reached Vikram Shah’s Axis account and left again within two minutes, split into three transfers. The same phone also operates an HDFC account in this case, which is typical of a mule controller.',
          hiNarrative:
            'Vikram Shah के Axis Bank ••0291 खाते में पैसा आने के 112 सेकंड बाद ही आगे भेज दिया गया। वही फोन HDFC खाता भी संचालित करता है।',
        },
        {
          id: 'M2',
          name: 'Rohit Verma',
          role: 'Layer-2 mule',
          kind: 'risk',
          acct: 'HDFC ••1992',
          score: 88,
          why: [
            { label: 'Shares handset with Vikram Shah', value: 22 },
            { label: 'Pass-through to merchant + hold', value: 20 },
            { label: 'Received ₹3,00,000 in one hop', value: 18 },
            { label: 'New VPA created same day', value: 12 },
          ],
          enNarrative:
            'Account received ₹3,00,000 from Layer-1 mule and shared physical device hardware IMEI with Vikram Shah.',
          hiNarrative:
            'Rohit Verma का खाता Layer-1 म्यूल से ₹3,00,000 प्राप्त करता है और Vikram Shah के साथ डिवाइस साझा करता है।',
        },
        {
          id: 'M3',
          name: 'Sameer Khan',
          role: 'Layer-2 mule',
          kind: 'risk',
          acct: 'ICICI ••8129',
          score: 84,
          why: [
            { label: 'ATM cash-out 18 min after credit', value: 26 },
            { label: 'Same Wi-Fi hotspot as Vikram Shah', value: 18 },
            { label: 'Received ₹1,55,000 in one hop', value: 16 },
          ],
          enNarrative:
            'Cash out occurred via ATM 18 minutes post credit; connected from the same Wi-Fi BSSID as Vikram Shah.',
          hiNarrative:
            'क्रेडिट के 18 मिनट बाद ही एटीएम से नकद निकासी की गई; Vikram Shah के समान वाई-फाई हॉटस्पॉट से जुड़ा।',
        },
        {
          id: 'M4',
          name: 'Deepak Meena',
          role: 'Sink account',
          kind: 'risk',
          acct: 'PNB ••4471',
          score: 61,
          why: [
            { label: 'Received ₹45,000 from Layer-1', value: 20 },
            { label: 'No device overlap found', value: -6 },
          ],
          enNarrative:
            'Conduit sink receiving residual fan-out from Layer 1. No immediate hardware overlap identified.',
          hiNarrative:
            'लेयर-1 से ₹45,000 प्राप्त किए। कोई डिवाइस ओवरलैप नहीं मिला।',
        },
        {
          id: 'P',
          name: 'Apex Electronics',
          role: 'Verified merchant',
          kind: 'safe',
          acct: 'ICICI ••5241 · GSTIN',
          score: 12,
          why: [
            { label: '68-month business history', value: -30 },
            { label: 'Active GSTIN & invoices', value: -25 },
            { label: 'Normal POS sale pattern', value: -10 },
          ],
          enNarrative:
            'Bona fide commercial retailer. Longstanding 68-month operating tenure, active GSTIN registration, standard daytime POS payment patterns.',
          hiNarrative:
            'सत्यापित व्यापारी। 68 महीने का व्यावसायिक इतिहास और सक्रिय GSTIN।',
        },
      ];

      const mentionsList: MentionGroup[] = [
        {
          source: 'Bank statement',
          items: [
            { label: 'Victim A/c', value: 'SBI ••9101', targetId: 'V' },
            { label: 'Beneficiary VPA', value: 'vikramshah@okaxis', targetId: 'M1' },
            { label: 'Account', value: 'Axis ••0291', targetId: 'M1' },
          ],
        },
        {
          source: 'WhatsApp chat',
          items: [
            { label: 'Payment VPA', value: 'vikram.pay@okaxis', targetId: 'M1' },
            { label: 'Phone', value: '+91 98711 23941', targetId: 'M1' },
          ],
        },
        {
          source: 'Complaint (NCRP)',
          items: [
            { label: 'Complainant', value: 'Sunil Kumar', targetId: 'V' },
            { label: 'Caller ID', value: '+91 98711 23941', targetId: 'M1' },
          ],
        },
        {
          source: 'Bank / CDR',
          items: [
            { label: 'Account', value: 'HDFC ••1992', targetId: 'M2' },
            { label: 'Account', value: 'ICICI ••8129', targetId: 'M3' },
            { label: 'Account', value: 'PNB ••4471', targetId: 'M4' },
            { label: 'Merchant', value: 'Apex Electronics', targetId: 'P' },
            { label: 'IMEI', value: '8674 9206 ••4564', targetId: 'M2' },
          ],
        },
      ];

      return { idents: identsList, mentions: mentionsList };
    }

    // Generic dynamic resolution for cases 002..004
    const vic = canonical.complainant;
    const mules = canonical.accounts.filter((a) => a.holderType !== 'VICTIM');
    const identsList: IdentityRecord[] = [
      {
        id: 'V',
        name: vic.name,
        role: 'Victim',
        kind: 'victim',
        acct: `${vic.bank.split(' ')[0]} ••${vic.accountMasked.slice(-4)}`,
        score: null,
        why: [],
        enNarrative: 'Primary complainant and victim.',
        hiNarrative: 'प्राथमिक शिकायतकर्ता और पीड़ित।',
      },
      ...mules.map((m, i) => ({
        id: m.nodeId,
        name: m.holderName,
        role: m.holderType.replace(/_/g, ' '),
        kind: m.evidenceStatus === 'EXCLUDED_COMMERCIAL' ? ('safe' as const) : ('risk' as const),
        acct: `${m.bank.split(' ')[0]} ••${m.accountMasked.slice(-4)}`,
        score: m.evidenceStatus === 'EXCLUDED_COMMERCIAL' ? 14 : 90 - i * 8,
        why: [
          { label: 'Rapid pass-through transfer pattern', value: 24 },
          { label: 'Nodal consortium cross-FIR alert', value: 18 },
        ],
        enNarrative: `Account identified as ${m.holderType} in core banking records.`,
        hiNarrative: `कोर बैंकिंग रिकॉर्ड में खाते की पहचान ${m.holderType} के रूप में की गई।`,
      })),
    ];

    const mentionsList: MentionGroup[] = [
      {
        source: 'Bank statement',
        items: [
          { label: 'Victim A/c', value: vic.accountMasked, targetId: 'V' },
          ...mules.slice(0, 2).map((m) => ({ label: 'Beneficiary', value: m.accountMasked, targetId: m.nodeId })),
        ],
      },
      {
        source: 'Telecom / CDR',
        items: mules.slice(0, 2).map((m) => ({ label: 'Terminal', value: m.deviceImei || 'IMEI ••9941', targetId: m.nodeId })),
      },
    ];

    return { idents: identsList, mentions: mentionsList };
  }, [caseId, canonical]);

  // Compute SVG Bezier lines connecting mentions to identities
  const computeLines = () => {
    if (!containerRef.current) return;
    const box = containerRef.current.getBoundingClientRect();
    const newLines: Array<{ d: string; color: string; id: string }> = [];

    mentions.forEach((group) => {
      group.items.forEach((item, idx) => {
        const key = `${group.source}-${item.label}-${idx}`;
        const mentionEl = mentionRefs.current.get(key);
        const identEl = identRefs.current.get(item.targetId);

        if (mentionEl && identEl) {
          const a = mentionEl.getBoundingClientRect();
          const b = identEl.getBoundingClientRect();

          const x1 = a.right - box.left;
          const y1 = a.top + a.height / 2 - box.top;
          const x2 = b.left - box.left;
          const y2 = b.top + b.height / 2 - box.top;
          const mx = (x1 + x2) / 2;

          const targetIdent = idents.find((p) => p.id === item.targetId);
          const color = targetIdent?.kind === 'safe'
            ? '#34d399'
            : targetIdent?.kind === 'victim'
            ? '#818cf8'
            : '#fb7185';

          const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
          newLines.push({ d, color, id: key });
        }
      });
    });

    setLines(newLines);
  };

  useEffect(() => {
    const timer = setTimeout(computeLines, 300);
    window.addEventListener('resize', computeLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computeLines);
    };
  }, [idents, mentions]);

  const selectedPerson = useMemo(() => {
    return idents.find((p) => p.id === selectedPersonId) || null;
  }, [idents, selectedPersonId]);

  return (
    <div className="v6-enter space-y-4" data-testid="v6-people-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 2 · People & Accounts"
        title="Who is who?"
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="warn"
        icon={<AlertTriangle className="w-4 h-4" />}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveView('money')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            iconPosition="right"
          >
            Follow the money
          </Button>
        }
      >
        <b>12 mentions</b> from 4 sources resolved to <b>6 identities</b>: 4 suspected mule accounts, 1 merchant protected.
      </FindingStrip>

      {/* Main Resolution Card */}
      <Card>
        <CardHeader
          title="Identity resolution"
          subtitle="Click an identity to see why it was linked and scored"
          action={
            <div className="flex items-center gap-4 text-xs text-[var(--fg-3)]">
              <span className="flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-[var(--risk)] inline-block" /> Suspect
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-[var(--safe)] inline-block" /> Protected
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-[var(--flow)] inline-block" /> Victim
              </span>
            </div>
          }
        />

        <div
          ref={containerRef}
          className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-2"
        >
          {/* SVG Connecting Bezier Lines */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10 hidden lg:block">
            {lines.map((l) => (
              <path
                key={l.id}
                d={l.d}
                fill="none"
                stroke={l.color}
                strokeWidth={1.5}
                strokeOpacity={0.55}
                className="transition-all duration-300"
              />
            ))}
          </svg>

          {/* Left Column: Mentions Grouped by Source (4 cols) */}
          <div className="lg:col-span-4 space-y-4 z-20">
            {mentions.map((group) => (
              <div key={group.source} className="space-y-1.5">
                <div className="text-[11px] font-bold text-[var(--fg-3)] uppercase tracking-wider px-1">
                  {group.source}
                </div>
                {group.items.map((item, idx) => {
                  const key = `${group.source}-${item.label}-${idx}`;
                  return (
                    <div
                      key={key}
                      ref={(el) => {
                        if (el) mentionRefs.current.set(key, el);
                        else mentionRefs.current.delete(key);
                      }}
                      className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-xs flex items-center justify-between"
                    >
                      <div className="text-[var(--fg-3)] font-medium">{item.label}</div>
                      <div className="v6-mono text-[var(--fg-1)] font-semibold">{item.value}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right Column: Resolved Identity Cards (8 cols) */}
          <div className="lg:col-span-8 space-y-3 z-20">
            {idents.map((p) => {
              const initials = p.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const avatarBg = p.kind === 'safe'
                ? 'bg-[var(--safe-bg)] text-[#6ee7b7]'
                : p.kind === 'victim'
                ? 'bg-[var(--flow-bg)] text-[#c7d2fe]'
                : 'bg-[var(--risk-bg)] text-[#fda4af]';

              const isSelected = selectedPersonId === p.id;

              return (
                <div
                  key={p.id}
                  ref={(el) => {
                    if (el) identRefs.current.set(p.id, el);
                    else identRefs.current.delete(p.id);
                  }}
                  onClick={() => p.id !== 'V' && setSelectedPersonId(p.id)}
                  className={clsx(
                    'p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center gap-3.5 transition-all',
                    p.id !== 'V' && 'cursor-pointer hover:border-[var(--flow-2)] hover:-translate-y-0.5',
                    isSelected && 'border-[var(--flow-2)] bg-[var(--surface-3)]'
                  )}
                >
                  {/* Initials Avatar */}
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs flex-none', avatarBg)}>
                    {initials}
                  </div>

                  {/* Name & Role */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--fg-1)] truncate">{p.name}</span>
                      {p.mergedVpa && (
                        <span className="v6-chip flow text-[10.5px] px-1.5 py-0.5">
                          2 VPAs merged
                        </span>
                      )}
                    </div>
                    <div className="v6-card-s mt-0.5">
                      {p.role} · <span className="v6-mono">{p.acct}</span>
                    </div>
                  </div>

                  {/* Lead Strength Gauge / Badge */}
                  {p.score !== null ? (
                    <div className="w-36 flex flex-col justify-center gap-1 flex-none">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--fg-3)]">Lead strength</span>
                        <span className={clsx('font-extrabold v6-mono', p.kind === 'safe' ? 'text-[#6ee7b7]' : 'text-[#fda4af]')}>
                          {p.score}
                        </span>
                      </div>
                      <Gauge
                        value={p.score}
                        color={p.kind === 'safe' ? 'var(--safe)' : 'var(--risk)'}
                        height={6}
                      />
                    </div>
                  ) : (
                    <Chip variant="flow">Victim</Chip>
                  )}

                  {/* Why Button */}
                  {p.score !== null && (
                    <button
                      type="button"
                      className="v6-why flex-none ml-2"
                      data-person={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPersonId(p.id);
                      }}
                    >
                      Why?
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 420px Slide-Over Inspector */}
      {selectedPerson && (
        <Inspector
          isOpen={Boolean(selectedPerson)}
          onClose={() => setSelectedPersonId(null)}
          title={selectedPerson.name}
          subtitle={selectedPerson.role}
          meta={selectedPerson.acct}
        >
          {/* Big Score Header */}
          <div className="flex items-baseline gap-3 pb-4 border-b border-[var(--line)]">
            <div
              className={clsx(
                'text-4xl font-extrabold v6-mono',
                selectedPerson.kind === 'safe' ? 'text-[#6ee7b7]' : 'text-[#fda4af]'
              )}
            >
              {selectedPerson.score}
            </div>
            <div className="text-xs text-[var(--fg-3)] leading-relaxed">
              lead strength / 100
              <br />
              an investigative lead, not a finding of guilt
            </div>
          </div>

          {/* Why this score waterfall */}
          <div className="py-4">
            <div className="font-bold text-sm text-[var(--fg-1)] mb-3">
              Why this score
            </div>
            <ScoreWaterfall items={selectedPerson.why} />
          </div>

          {/* Local AI Narrative Explanation */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNarrativeLang('en')}
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs font-semibold cursor-pointer',
                    narrativeLang === 'en'
                      ? 'bg-[var(--flow-bg)] text-[var(--fg-1)]'
                      : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]'
                  )}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setNarrativeLang('hi')}
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs font-semibold cursor-pointer',
                    narrativeLang === 'hi'
                      ? 'bg-[var(--flow-bg)] text-[var(--fg-1)]'
                      : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]'
                  )}
                >
                  हिंदी
                </button>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[var(--fg-3)]">
                <Sparkles className="w-3 h-3 text-[var(--flow-2)]" />
                <span>local AI · llama3.1:8b</span>
              </div>
            </div>

            <div className="text-xs text-[var(--fg-2)] leading-relaxed">
              {narrativeLang === 'en'
                ? selectedPerson.enNarrative
                : selectedPerson.hiNarrative}
            </div>
          </div>

          {/* Admissible Evidence Exhibits */}
          <div className="mt-4 pt-3 border-t border-[var(--line)]">
            <div className="font-bold text-xs text-[var(--fg-1)] mb-2">
              Corroborating Evidence
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip variant="safe">T1 · SBI ledger</Chip>
              <Chip variant="safe">T1 · Axis statement</Chip>
              <Chip variant="muted">T2 · NPCI switch log</Chip>
              <Chip variant="risk">T3 · WhatsApp chat</Chip>
            </div>
          </div>
        </Inspector>
      )}
    </div>
  );
};
