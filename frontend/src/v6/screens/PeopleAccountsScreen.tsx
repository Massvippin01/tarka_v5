import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  HelpCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import {
  CaseSyncBridge,
  type CanonicalEntity,
  type RawToken,
} from '../../services/caseSyncBridge';
import { CANONICAL_CASES, buildCaseBundleFromFixture } from '../../fixtures/cases';
import { reconstruct5FileInvestigation, type ReconstructedEdge } from '../../utils/investigationReconstructor';
import { getBnss94EntityResolutionDirective } from '../../utils/statutoryDirectives';
import { RelationshipEvidenceSheet } from '../../components/tarka/investigation/RelationshipEvidenceSheet';

export interface CandidateMergeLink {
  id: string;
  sourceMentionId: string;
  sourceLabel: string;
  sourceValue: string;
  sourceBadge: string;
  targetEntityId: string;
  targetName: string;
  matchScore: number;
  matchEvidence: string[];
  decision: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SPLIT';
  sha256Proof?: string;
  timestamp?: string;
}

export const PeopleAccountsScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const { setActiveRoute } = useTarkaGlobal();
  const caseId = activeCaseId || 'CASE-2026-001';

  const investigation = useMemo(() => {
    if (caseId && CANONICAL_CASES[caseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[caseId]);
    }
    return reconstruct5FileInvestigation();
  }, [caseId]);

  const dynamicData = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseCanonicalEntities(caseId, investigation);
  }, [caseId, investigation]);

  const [selectedEntityId, setSelectedEntityId] = useState<string>('ENT-02');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('ALL');
  const [isCopiedDirective, setIsCopiedDirective] = useState(false);
  const [narrativeLang, setNarrativeLang] = useState<'en' | 'hi'>('en');
  const [bipartiteMapActive, setBipartiteMapActive] = useState(true);

  // Modals
  const [selectedEdgeForSheet, setSelectedEdgeForSheet] = useState<ReconstructedEdge | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [whyModalEntity, setWhyModalEntity] = useState<CanonicalEntity | null>(null);
  const [addMentionOpen, setAddMentionOpen] = useState(false);
  const [newMentionName, setNewMentionName] = useState('VIKRAM SHA');
  const [newMentionPhone, setNewMentionPhone] = useState('98711-23941');
  const [newMentionSource, setNewMentionSource] = useState('WhatsApp Chat Export');

  // Custom mentions state
  const [customMentions, setCustomMentions] = useState<RawToken[]>([]);

  // Candidate merge review links (investigator can Accept / Reject / Split a merge)
  const [candidateLinks, setCandidateLinks] = useState<CandidateMergeLink[]>([
    {
      id: 'LINK-01',
      sourceMentionId: 'M-VIKRAM-WA',
      sourceLabel: 'VIKRAM SHA (WhatsApp)',
      sourceValue: 'vikram.pay@okaxis · +91 9871123941',
      sourceBadge: 'WhatsApp Chat Export',
      targetEntityId: 'ENT-02',
      targetName: 'Vikram Shah',
      matchScore: 95,
      matchEvidence: [
        "Indic transliteration equivalence: 'VIKRAM SHA' ≈ 'Vikram Shah'",
        'Phone Exact Match: +91 9871123941 (normalized from 09871123941)',
        "UPI Alias match: common handle root 'vikram' (vikramshah@okaxis ↔ vikram.pay@okaxis)",
      ],
      decision: 'PROPOSED',
    },
    {
      id: 'LINK-02',
      sourceMentionId: 'M-ROHIT-POS',
      sourceLabel: 'Rohit Verma (POS Slip)',
      sourceValue: 'HDFC ••1992 · Terminal #P9901',
      sourceBadge: 'POS Merchant Slip',
      targetEntityId: 'ENT-03',
      targetName: 'Rohit Verma',
      matchScore: 88,
      matchEvidence: [
        'Exact Account Match: HDFC ••1992 recorded in CBS exhibit',
        'Device Hardware IMEI overlap: IMEI #864192040192841 matches Layer-1 mule handset',
      ],
      decision: 'PROPOSED',
    },
    {
      id: 'LINK-03',
      sourceMentionId: 'M-APEX-CLEAN',
      sourceLabel: 'Apex Traders Wholesale (GSTIN)',
      sourceValue: 'GSTIN 07AABCA1234F1Z5 · ICICI ••8129',
      sourceBadge: 'GST Portal Filing',
      targetEntityId: 'ENT-05',
      targetName: 'Apex Traders Wholesale',
      matchScore: 42,
      matchEvidence: [
        'VETOED: Valid commercial GSTIN registered 4 years prior to fraud',
        'VETOED: Statutory clean turnover of ₹4,50,000 protected under LIBR doctrine',
      ],
      decision: 'REJECTED',
    },
  ]);

  const allTokens = useMemo(() => {
    return [...dynamicData.tokens, ...customMentions];
  }, [dynamicData.tokens, customMentions]);

  const filteredTokens = useMemo(() => {
    if (selectedSourceType === 'ALL') return allTokens;
    return allTokens.filter(
      (t) =>
        t.sourceType.toUpperCase() === selectedSourceType.toUpperCase() ||
        t.source.toUpperCase().includes(selectedSourceType.toUpperCase())
    );
  }, [allTokens, selectedSourceType]);

  const canonicalEntities = dynamicData.entities;
  const selectedEntity = canonicalEntities.find((e) => e.id === selectedEntityId) || canonicalEntities[0];

  // SVG lines for bipartite mapping
  const matrixContainerRef = useRef<HTMLDivElement>(null);
  const [svgLines, setSvgLines] = useState<
    Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      isLinkedToSelected: boolean;
      tokenId: string;
    }>
  >([]);

  const updateSvgLines = useCallback(() => {
    if (!matrixContainerRef.current) return;
    const containerRect = matrixContainerRef.current.getBoundingClientRect();
    const lines: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      isLinkedToSelected: boolean;
      tokenId: string;
    }> = [];

    filteredTokens.forEach((token) => {
      const tokenEl = document.getElementById(`token-card-${token.id}`);
      const entityEl = document.getElementById(`entity-card-${token.targetEntityId}`);
      if (tokenEl && entityEl) {
        const tokenRect = tokenEl.getBoundingClientRect();
        const entityRect = entityEl.getBoundingClientRect();

        const x1 = tokenRect.right - containerRect.left;
        const y1 = tokenRect.top + tokenRect.height / 2 - containerRect.top;
        const x2 = entityRect.left - containerRect.left;
        const y2 = entityRect.top + entityRect.height / 2 - containerRect.top;

        lines.push({
          x1,
          y1,
          x2,
          y2,
          color: token.targetEntityId === selectedEntityId ? '#2563eb' : '#d4d4d8',
          isLinkedToSelected: token.targetEntityId === selectedEntityId,
          tokenId: token.id,
        });
      }
    });

    setSvgLines(lines);
  }, [filteredTokens, selectedEntityId]);

  useEffect(() => {
    updateSvgLines();
    const timer = setTimeout(updateSvgLines, 100);
    window.addEventListener('resize', updateSvgLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSvgLines);
    };
  }, [updateSvgLines, customMentions, selectedSourceType, bipartiteMapActive]);

  const handleCopyDirective = () => {
    navigator.clipboard.writeText(getBnss94EntityResolutionDirective(caseId));
    setIsCopiedDirective(true);
    toast.success('§94 BNSS Cross-Bank KYC & CAF Requisition copied to clipboard');
    setTimeout(() => setIsCopiedDirective(false), 2000);
  };

  const handleAddNewMention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentionName.trim()) {
      toast.error('Please enter a mention name or handle');
      return;
    }

    const cleanDigits = newMentionPhone.replace(/\D/g, '');
    const formattedPhone = cleanDigits.length === 10 ? `+91 ${cleanDigits}` : newMentionPhone;
    const isVikramMatch =
      newMentionName.toUpperCase().includes('VIKRAM') ||
      newMentionName.toUpperCase().includes('SHA') ||
      cleanDigits === '9871123941';

    const targetId = isVikramMatch ? 'ENT-02' : 'ENT-03';
    const newTokenId = `M-CUSTOM-${Date.now().toString().slice(-4)}`;

    const newToken: RawToken = {
      id: newTokenId,
      source: newMentionSource,
      sourceType: newMentionSource.toLowerCase().includes('whatsapp')
        ? 'whatsapp'
        : newMentionSource.toLowerCase().includes('cdr')
        ? 'cdr'
        : 'cbs',
      label: newMentionName.trim(),
      value: formattedPhone || 'No Phone Disclosed',
      targetEntityId: targetId,
      badgeColor: '#0284C7',
      aliasReason: isVikramMatch
        ? `Indic transliteration 'VIKRAM SHA' ≈ 'Vikram Shah' · Phone exact match ${formattedPhone}`
        : 'Heuristic multi-source identifier correlation',
    };

    setCustomMentions((prev) => [newToken, ...prev]);
    setAddMentionOpen(false);
    toast.success(`Extracted & bound mention "${newToken.label}" to ${targetId}`);
  };

  const handleDecision = (linkId: string, decision: 'ACCEPTED' | 'REJECTED' | 'SPLIT') => {
    setCandidateLinks((prev) =>
      prev.map((l) => (l.id === linkId ? { ...l, decision } : l))
    );
    toast.info(`Candidate link ${linkId} marked as ${decision}`);
  };

  const mergesVetoedCount = candidateLinks.filter((l) => l.decision === 'REJECTED').length;

  return (
    <div className="v6-enter space-y-3" data-testid="v6-people-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 2 · People & Accounts"
        title="Who received the funds?"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddMentionOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>+ Add Mention</span>
            </button>
            <button
              type="button"
              onClick={handleCopyDirective}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              {isCopiedDirective ? (
                <Check className="w-3.5 h-3.5 text-[var(--safe)]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--fg-3)]" />
              )}
              <span>Copy §94 Directive</span>
            </button>
            <Button
              variant="default"
              size="md"
              onClick={() => {
                setActiveView('money');
                setActiveRoute('taint-engine');
              }}
            >
              <span className="flex items-center gap-1.5">
                <span>Money Trail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </div>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="urgent"
        action={
          <button
            type="button"
            onClick={() => {
              setActiveView('money');
              setActiveRoute('taint-engine');
            }}
            className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Proceed to Money Trail</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <span>
          Resolved <strong>{canonicalEntities.length} canonical entities</strong> from {allTokens.length} raw mentions across 5 exhibits. High Court strict veto applied on 1 commercial merchant.
        </span>
      </FindingStrip>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Raw identifiers</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-flow-bg)] text-[var(--flow)]">
              5 EXHIBITS
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            {allTokens.length} mentions
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            WhatsApp, APK, CBS, CDR, POS
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Canonical entities</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
              RESOLVED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            {canonicalEntities.length} entities
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Victim, Layer-1, Layer-2, Merchant
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Merges vetoed</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-urgent-bg)] text-[var(--urgent)]">
              STRICT HC STANDARD
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--urgent)]">
            {mergesVetoedCount} / {candidateLinks.length} vetoed
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Apex Traders clean turnover protected
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Social-eng vectors</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--risk)]">
              DIGITAL ARREST
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--risk)]">
            3 active lures
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            TRAI notice, CBI seal, video extortion
          </div>
        </div>
      </div>

      {/* Extraction & Alias Resolution Matrix Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--surface-1)] border border-[var(--line)] rounded-lg shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-[var(--fg-3)] mr-1">Filter source:</span>
          {['ALL', 'WhatsApp', 'APK', 'CBS', 'CDR', 'POS'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedSourceType(st)}
              className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors ${
                selectedSourceType === st
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-2)] cursor-pointer">
            <input
              type="checkbox"
              checked={bipartiteMapActive}
              onChange={(e) => setBipartiteMapActive(e.target.checked)}
              className="rounded text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span>Bipartite Link Arcs</span>
          </label>
        </div>
      </div>

      {/* 12-Column Main Workbench: Left 7 Cols Mentions & Canonical Entities, Right 5 Cols Profile Analysis Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
        {/* Left 7 Columns: Bipartite Mentions-to-Entities Map */}
        <div
          ref={matrixContainerRef}
          className="lg:col-span-7 relative bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 overflow-hidden shadow-xs"
        >
          {/* SVG Bipartite Connectors Overlay */}
          {bipartiteMapActive && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {svgLines.map((line, idx) => (
                <path
                  key={idx}
                  d={`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={line.isLinkedToSelected ? 2.5 : 1}
                  strokeDasharray={line.isLinkedToSelected ? 'none' : '4 3'}
                  opacity={line.isLinkedToSelected ? 0.9 : 0.4}
                />
              ))}
            </svg>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-20">
            {/* Left Sub-column: Extracted Mentions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
                <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
                  Raw Mentions ({filteredTokens.length})
                </span>
                <span className="text-[12px] text-[var(--fg-3)]">5 Exhibits</span>
              </div>

              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredTokens.map((token) => (
                  <div
                    key={token.id}
                    id={`token-card-${token.id}`}
                    onClick={() => setSelectedEntityId(token.targetEntityId)}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      token.targetEntityId === selectedEntityId
                        ? 'bg-[var(--color-flow-bg)] border-[var(--accent)] shadow-xs'
                        : 'bg-[var(--surface-2)] border-[var(--line)] hover:bg-[var(--hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-bold text-[var(--fg-1)] truncate">
                        {token.label}
                      </span>
                      <span className="text-[12px] font-semibold px-1.5 py-0.2 rounded bg-[var(--surface-1)] border border-[var(--line)] text-[var(--fg-3)] shrink-0">
                        {token.source}
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--fg-2)] font-mono truncate mt-0.5">
                      {token.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sub-column: Canonical Entities */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
                <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
                  Canonical Profiles ({canonicalEntities.length})
                </span>
                <span className="text-[12px] text-[var(--fg-3)]">Resolved</span>
              </div>

              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {canonicalEntities.map((ent) => (
                  <div
                    key={ent.id}
                    id={`entity-card-${ent.id}`}
                    onClick={() => setSelectedEntityId(ent.id)}
                    className={`p-2.5 rounded border cursor-pointer transition-all ${
                      ent.id === selectedEntityId
                        ? 'bg-[var(--surface-1)] border-[var(--accent)] ring-2 ring-[var(--accent)]/15 shadow-sm'
                        : 'bg-[var(--surface-1)] border-[var(--line)] hover:bg-[var(--hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] font-bold text-[var(--fg-1)] truncate">
                          {ent.name}
                        </span>
                        {ent.isHardVeto && (
                          <span className="text-[12px] font-semibold px-1.5 py-0.2 rounded bg-[var(--color-urgent-bg)] text-[var(--urgent)] shrink-0">
                            VETOED
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[12px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                          ent.roleColor === 'rose'
                            ? 'bg-[var(--color-risk-bg)] text-[var(--risk)]'
                            : ent.roleColor === 'emerald'
                            ? 'bg-[var(--color-safe-bg)] text-[var(--safe)]'
                            : ent.roleColor === 'amber'
                            ? 'bg-[var(--color-urgent-bg)] text-[var(--urgent)]'
                            : 'bg-[var(--color-flow-bg)] text-[var(--flow)]'
                        }`}
                      >
                        {ent.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[12px] text-[var(--fg-3)] font-mono">
                      <span>{ent.id}</span>
                      <span>Score: {ent.fraudScore}%</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--line)] text-[12px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWhyModalEntity(ent);
                        }}
                        className="text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Why?</span>
                      </button>
                      <span className="text-[var(--fg-3)]">{ent.tokens.length} bound tokens</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hard Veto Guardrail Card */}
          <div className="mt-3 p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[var(--safe)] shrink-0 mt-0.5" />
            <div className="text-[12px]">
              <span className="font-bold text-[var(--fg-1)]">
                Statutory Judicial Review & Auto-Merge Prohibition:
              </span>{' '}
              <span className="text-[var(--fg-2)]">
                Per High Court guidelines and SentinelX Rule #5, AI proposes candidate matches but auto-merges are strictly prohibited. Every identity resolution requires explicit IO judicial concurrence with append-only SHA-256 audit logging.
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Profile Analysis Panel & Candidate Merge Review */}
        <div className="lg:col-span-5 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 overflow-y-auto max-h-[680px] shadow-xs">
          {/* Header with Bilingual Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <div>
              <span className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider">
                Profile Analysis
              </span>
              <h3 className="text-[15px] font-bold text-[var(--fg-1)] mt-0.5">
                {selectedEntity.name} ({selectedEntity.id})
              </h3>
            </div>
            <div className="inline-flex p-0.5 bg-[var(--surface-2)] border border-[var(--line)] rounded">
              <button
                type="button"
                onClick={() => setNarrativeLang('en')}
                className={`px-2 py-0.5 text-[12px] font-semibold rounded ${
                  narrativeLang === 'en' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setNarrativeLang('hi')}
                className={`px-2 py-0.5 text-[12px] font-semibold rounded ${
                  narrativeLang === 'hi' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)]'
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>

          {/* Confidence Score & Lead Strength */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)]">
            <div>
              <div className="text-[12px] font-medium text-[var(--fg-3)]">Attribution Score</div>
              <div className="text-[22px] font-bold text-[var(--fg-1)] mt-0.5">
                {selectedEntity.fraudScore}%
              </div>
            </div>
            <div>
              <div className="text-[12px] font-medium text-[var(--fg-3)]">Judicial Standard</div>
              <div className="text-[13px] font-semibold text-[var(--accent)] mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Statutory Evidence Satisfied</span>
              </div>
            </div>
          </div>

          {/* Sub-scores (Velocity, Device, Structuring, KYC) */}
          <div className="space-y-1.5">
            <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
              Forensic Risk Dimensions
            </span>
            <div className="space-y-1">
              <div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--fg-2)]">Drain Velocity</span>
                  <span className="font-semibold text-[var(--fg-1)]">
                    {selectedEntity.subScores.velocity} / 10
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--surface-2)] rounded overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-[var(--risk)]"
                    style={{ width: `${selectedEntity.subScores.velocity * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--fg-2)]">Device Hardware Overlap</span>
                  <span className="font-semibold text-[var(--fg-1)]">
                    {selectedEntity.subScores.deviceOverlap} / 10
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--surface-2)] rounded overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-[var(--urgent)]"
                    style={{ width: `${selectedEntity.subScores.deviceOverlap * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--fg-2)]">Structuring Pattern</span>
                  <span className="font-semibold text-[var(--fg-1)]">
                    {selectedEntity.subScores.structuring} / 10
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--surface-2)] rounded overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-[var(--flow)]"
                    style={{ width: `${selectedEntity.subScores.structuring * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--fg-2)]">KYC Discrepancy</span>
                  <span className="font-semibold text-[var(--fg-1)]">
                    {selectedEntity.subScores.kycDiscrepancy} / 10
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--surface-2)] rounded overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-[var(--device)]"
                    style={{ width: `${selectedEntity.subScores.kycDiscrepancy * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bilingual Narrative */}
          <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)]">
            <span className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider block mb-1">
              Investigative Summary ({narrativeLang.toUpperCase()})
            </span>
            <p className="text-[12px] text-[var(--fg-1)] leading-relaxed">
              {narrativeLang === 'en'
                ? selectedEntity.summary
                : selectedEntity.id === 'ENT-02'
                ? 'Vikram Shah के Axis Bank खाते में पैसा आने के 112 सेकंड बाद ही आगे भेज दिया गया। वही फोन HDFC खाता भी संचालित करता है।'
                : selectedEntity.summary}
            </p>
          </div>

          {/* Bound Evidence Tokens */}
          <div className="space-y-1.5">
            <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
              Bound Evidence Exhibits ({selectedEntity.tokens.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {selectedEntity.tokens.map((tok, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[12px] font-mono bg-[var(--surface-2)] border border-[var(--line)] text-[var(--fg-2)]"
                >
                  {tok}
                </span>
              ))}
            </div>
          </div>

          {/* Candidate Merge Review Links (Judicial Review) */}
          <div className="space-y-2 pt-2 border-t border-[var(--line)]">
            <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block">
              Candidate Merge Review & Judicial Concurrence
            </span>

            {candidateLinks.map((link) => (
              <div
                key={link.id}
                className="p-2.5 rounded border border-[var(--line)] bg-[var(--surface-2)] space-y-2"
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold text-[var(--fg-1)]">{link.sourceLabel}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-semibold text-[12px] ${
                      link.decision === 'ACCEPTED'
                        ? 'bg-[var(--color-safe-bg)] text-[var(--safe)]'
                        : link.decision === 'REJECTED'
                        ? 'bg-[var(--color-risk-bg)] text-[var(--risk)]'
                        : link.decision === 'SPLIT'
                        ? 'bg-[var(--color-urgent-bg)] text-[var(--urgent)]'
                        : 'bg-[var(--color-flow-bg)] text-[var(--flow)]'
                    }`}
                  >
                    {link.decision}
                  </span>
                </div>

                <div className="text-[12px] text-[var(--fg-3)] font-mono">{link.sourceValue}</div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDecision(link.id, 'ACCEPTED')}
                    className="px-2 py-0.5 rounded text-[12px] font-medium bg-[var(--surface-1)] border border-[var(--line)] text-[var(--safe)] hover:bg-[var(--color-safe-bg)]"
                  >
                    Accept Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(link.id, 'REJECTED')}
                    className="px-2 py-0.5 rounded text-[12px] font-medium bg-[var(--surface-1)] border border-[var(--line)] text-[var(--risk)] hover:bg-[var(--color-risk-bg)]"
                  >
                    Reject (Veto)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(link.id, 'SPLIT')}
                    className="px-2 py-0.5 rounded text-[12px] font-medium bg-[var(--surface-1)] border border-[var(--line)] text-[var(--urgent)] hover:bg-[var(--color-urgent-bg)]"
                  >
                    Split
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Mention Modal */}
      {addMentionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-4 w-full max-w-md shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <h3 className="text-[14px] font-bold text-[var(--fg-1)]">Add New Extracted Mention</h3>
              <button
                type="button"
                onClick={() => setAddMentionOpen(false)}
                className="text-[var(--fg-3)] hover:text-[var(--fg-1)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewMention} className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">
                  Mention Name / Handle
                </label>
                <input
                  type="text"
                  value={newMentionName}
                  onChange={(e) => setNewMentionName(e.target.value)}
                  placeholder="e.g. VIKRAM SHA, Rohit V"
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--line)] rounded text-[var(--fg-1)] focus:outline-hidden focus:border-[var(--accent)]"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">
                  Phone / Account / VPA
                </label>
                <input
                  type="text"
                  value={newMentionPhone}
                  onChange={(e) => setNewMentionPhone(e.target.value)}
                  placeholder="e.g. 98711-23941"
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--line)] rounded text-[var(--fg-1)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">
                  Evidence Source Exhibit
                </label>
                <select
                  value={newMentionSource}
                  onChange={(e) => setNewMentionSource(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--line)] rounded text-[var(--fg-1)] focus:outline-hidden focus:border-[var(--accent)]"
                >
                  <option value="WhatsApp Chat Export">WhatsApp Chat Export</option>
                  <option value="Airtel CDR Record">Airtel CDR Record</option>
                  <option value="SBI CBS Statement">SBI CBS Statement</option>
                  <option value="POS Merchant Slip">POS Merchant Slip</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setAddMentionOpen(false)}
                  className="px-3 py-1.5 text-[12px] font-medium text-[var(--fg-2)] hover:bg-[var(--hover)] rounded"
                >
                  Cancel
                </button>
                <Button variant="default" size="sm" type="submit">
                  Bind Mention
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Why? Modal */}
      {whyModalEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-4 w-full max-w-md shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <h3 className="text-[14px] font-bold text-[var(--fg-1)]">
                Attribution Justification: {whyModalEntity.name}
              </h3>
              <button
                type="button"
                onClick={() => setWhyModalEntity(null)}
                className="text-[var(--fg-3)] hover:text-[var(--fg-1)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[12px]">
              <p className="text-[var(--fg-2)]">{whyModalEntity.summary}</p>
              <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px]">
                <div>Confidence: {whyModalEntity.fraudScore}%</div>
                <div>Role: {whyModalEntity.role}</div>
                <div>Veto Status: {whyModalEntity.isHardVeto ? 'VETOED (Clean)' : 'ACTIVE MULE'}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--line)]">
              <Button variant="default" size="sm" onClick={() => setWhyModalEntity(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Evidence Sheet */}
      <RelationshipEvidenceSheet
        edge={selectedEdgeForSheet}
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSelectedEdgeForSheet(null);
        }}
      />
    </div>
  );
};
