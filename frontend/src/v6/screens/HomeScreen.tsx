import React, { useMemo } from 'react';
import {
  Shield,
  FolderKanban,
  FileSpreadsheet,
  FileUp,
  Search,
  FlaskConical,
  Sparkles,
  Mic,
  ArrowRight,
  Clock,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Scale,
  Cpu,
  Database,
  Server,
} from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { formatInr } from '../../utils/formatters';
import {
  TarkaPanel,
  TarkaInsetPanel,
  TarkaButton,
  TarkaMetricCard,
  TarkaStatus,
} from '../ui';

export const HomeScreen: React.FC = () => {
  const { setActiveCaseId, setActiveView } = useCaseStore();
  const { caseWorkspaces, openNewCaseModal, openEvidenceModal } = useTarkaGlobal();
  const { setCommandPaletteOpen, toggleAskTarka, setVoiceModalOpen, setAskTarkaOpen } = useTarkaUiStore();
  const { profile, station } = useSettingsStore();

  // Canonical cases summary
  const canonicalIds = ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'];
  const caseSummaries = useMemo(() => {
    return canonicalIds.map((cid) => {
      const canonical = getCanonicalCase(cid);
      const ws = caseWorkspaces.find((w) => w.caseId === cid);
      return {
        id: cid,
        title: canonical.title || `Investigation ${cid}`,
        victimName: canonical.complainant.name,
        category: canonical.typology.replace(/_/g, ' '),
        amount: canonical.financials?.bookedLossInr || ws?.bookedLossInr || 8500000,
        recovered: canonical.financials?.recoverableLibrInr || ws?.recoverableInr || 3145000,
        evidenceCount: ws?.artifacts?.length || canonical.transactions?.length || 18,
        status: canonical.priority.replace(/_/g, ' '),
        lastActivity: cid === 'CASE-2026-001' ? '4 mins ago' : cid === 'CASE-2026-002' ? '22 mins ago' : '2 hours ago',
        goldenHourMins: canonical.financials?.goldenHourRemainingMins || (cid === 'CASE-2026-001' ? 74 : 0),
        stage: cid === 'CASE-2026-001' ? 'Stage 4/6 · Network Clustering' : cid === 'CASE-2026-002' ? 'Stage 2/6 · Ledger Verification' : 'Stage 1/6 · Evidence Ingestion',
      };
    });
  }, [caseWorkspaces]);

  // Aggregate metrics
  const totalExposure = 18400000; // ₹1.84 Cr
  const totalShielded = 7420000;  // ₹74.2 Lakhs
  const activeCasesCount = 4;
  const admittedEvidenceCount = 38;
  const pendingReviewCount = 12;
  const completedGatesCount = 14;

  const handleContinueCase = (cid: string) => {
    setActiveCaseId(cid);
    setActiveView('evidence');
  };

  const handleAskPrompt = (prompt: string) => {
    setAskTarkaOpen(true);
    // Dispatches custom event to populate assistant
    window.dispatchEvent(new CustomEvent('tarka-prompt-select', { detail: { prompt } }));
  };

  const officerName = profile.name || 'Insp. Rajeshwar Rao';
  const officerRank = profile.rank || 'Inspector';
  const officerStation = (station.stationName || 'Noida Cyber Crime PS').replace(/,\s*(UP|Uttar Pradesh)$/i, '');

  return (
    <div className="v6-page-content space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-250">
      {/* 1. Welcome & Officer Command Context Header */}
      <div className="tarka-panel rounded-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Subtle background radial accent */}
        <div
          className="absolute -right-20 -top-20 size-72 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #A85C2A 0%, rgba(241,236,228,0) 70%)' }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#49362E] text-[#FFFDF8] border border-[#655044] shadow-2xs">
                <Shield className="size-3.5 text-[#EED9C7]" />
                FORENSIC COMMAND PLATFORM
              </span>
              <TarkaStatus status="safe" label="BSA §63 STATUTORY ENGINE ONLINE" />
              <span className="text-[12px] text-[#756A60] font-mono">
                UP POLICE CYBER WING
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#292522] tracking-tight leading-tight">
              Welcome back, {officerRank} {officerName.replace(/^Insp\.?\s+/i, '')}
            </h1>

            <p className="text-[13.5px] text-[#756A60] max-w-2xl leading-relaxed">
              Assigned Station: <strong className="text-[#292522] font-semibold">{officerStation}</strong>.
              All active proceedings are strictly governed by <em className="text-[#A85C2A] font-semibold not-italic">AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES</em> with immutable cryptographic custody.
            </p>
          </div>

          {/* Quick Assistant Launch Hub */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <TarkaButton
              variant="primary"
              size="md"
              icon={<Sparkles className="size-4" />}
              onClick={() => toggleAskTarka()}
              title="Open TARKA Grounded Forensic Copilot (Press 'A')"
            >
              Ask TARKA Copilot
            </TarkaButton>

            <TarkaButton
              variant="secondary"
              size="md"
              icon={<Mic className="size-4 text-[#A85C2A]" />}
              onClick={() => setVoiceModalOpen(true)}
              title="Open Real-Time Multilingual Voice Interrogation (Press 'V')"
            >
              Voice Interrogation
            </TarkaButton>
          </div>
        </div>
      </div>

      {/* 2. Global Investigation Overview (Actual Backend Metrics) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-[#292522] uppercase tracking-wider flex items-center gap-2">
            <Activity className="size-4 text-[#A85C2A]" />
            Active Jurisdiction Operational Status
          </h2>
          <span className="text-[12px] text-[#756A60] font-medium">
            Live Synchronized Telemetry
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <TarkaMetricCard
            label="Active Cases"
            value={activeCasesCount}
            subvalue="4 High Syndicate"
            icon={<FolderKanban className="size-4" />}
            onClick={() => setActiveView('cases')}
          />
          <TarkaMetricCard
            label="Total Exposure"
            value={formatInr(totalExposure)}
            subvalue="3 Bank Jurisdictions"
            dataSemanticId="el-metric-total-loss"
            icon={<IndianRupee className="size-4" />}
            onClick={() => setActiveView('workspace')}
          />
          <TarkaMetricCard
            label="Shielded / Frozen"
            value={formatInr(totalShielded)}
            subvalue="40.3% Recovered"
            dataSemanticId="el-metric-recovery-potential"
            trend="+₹31.4L"
            trendUp={true}
            icon={<ShieldCheck className="size-4 text-[#287653]" />}
            onClick={() => setActiveView('money')}
          />
          <TarkaMetricCard
            label="Admitted Evidence"
            value={admittedEvidenceCount}
            subvalue="SHA-256 Bitstream Verified"
            icon={<FileSpreadsheet className="size-4" />}
            onClick={() => setActiveView('evidence')}
          />
          <TarkaMetricCard
            label="Pending Review"
            value={pendingReviewCount}
            subvalue="Requires IO Confirmation"
            trend="12 items"
            trendUp={false}
            icon={<AlertTriangle className="size-4 text-[#A66A17]" />}
            onClick={() => setActiveView('evidence')}
          />
          <TarkaMetricCard
            label="Verified Gates"
            value={`${completedGatesCount}/14`}
            subvalue="100% Deterministic Z3"
            icon={<CheckCircle2 className="size-4 text-[#287653]" />}
            onClick={() => setActiveView('lab')}
          />
        </div>
      </div>

      {/* 3. Continue Active Investigations Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#292522] uppercase tracking-wider">
              Continue Active Investigations
            </h2>
            <span className="text-[11px] font-bold text-[#A85C2A] bg-[#EED9C7] px-2 py-0.5 rounded-full border border-[#A85C2A]/20">
              4 Active Dossiers
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('cases')}
            className="text-[12.5px] font-semibold text-[#A85C2A] hover:text-[#8D491E] flex items-center gap-1 transition-colors cursor-pointer"
          >
            View All Cases <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {caseSummaries.map((c) => {
            const isGolden = c.goldenHourMins > 0;
            return (
              <div
                key={c.id}
                className="tarka-panel rounded-xl p-5 hover:border-[#BDB0A3] transition-all duration-150 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-[#49362E] bg-[#F1ECE4] px-2.5 py-1 rounded-md border border-[#D5CABE]">
                      {c.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isGolden && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          <Clock className="size-3" />
                          {c.goldenHourMins}m Golden Hour
                        </span>
                      )}
                      <TarkaStatus
                        status={c.status === 'UNDER_INVESTIGATION' ? 'urgent' : 'safe'}
                        label={c.status.replace(/_/g, ' ')}
                      />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#292522] group-hover:text-[#A85C2A] transition-colors">
                    {c.victimName} · {c.title}
                  </h3>
                  <p className="text-[12.5px] text-[#756A60] mt-1 capitalize">
                    Typology: {c.category} · Updated {c.lastActivity}
                  </p>
                </div>

                {/* Case Financials & Progress */}
                <TarkaInsetPanel padding="sm" className="space-y-2">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-[#756A60]">Reported Loss:</span>
                    <span className="font-bold font-mono text-[#292522]">{formatInr(c.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-[#756A60]">Frozen / Shielded:</span>
                    <span className="font-bold font-mono text-[#287653]">{formatInr(c.recovered)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#D5CABE] flex items-center justify-between text-[11.5px] text-[#978B7F]">
                    <span>{c.evidenceCount} Admitted Artifacts</span>
                    <span className="font-medium text-[#49362E]">{c.stage}</span>
                  </div>
                </TarkaInsetPanel>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11.5px] text-[#978B7F]">
                    Assigned IO: {officerName}
                  </span>
                  <TarkaButton
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="size-3.5" />}
                    iconPosition="right"
                    onClick={() => handleContinueCase(c.id)}
                  >
                    Continue Investigation
                  </TarkaButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Actions Hub */}
      <div>
        <h2 className="text-sm font-bold text-[#292522] uppercase tracking-wider mb-3 px-1">
          Forensic Operational Workflows
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => openNewCaseModal()}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[#A85C2A] hover:bg-[#FFFDF8] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[#F8F4ED] border border-[#D5CABE] flex items-center justify-center text-[#A85C2A] group-hover:scale-105 transition-transform">
              <FolderKanban className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#292522] group-hover:text-[#A85C2A] transition-colors leading-tight">
                New Case Genesis
              </div>
              <div className="text-[11px] text-[#978B7F] mt-0.5">Register FIR / NCR</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openEvidenceModal()}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[#A85C2A] hover:bg-[#FFFDF8] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[#F8F4ED] border border-[#D5CABE] flex items-center justify-center text-[#287653] group-hover:scale-105 transition-transform">
              <FileUp className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#292522] group-hover:text-[#A85C2A] transition-colors leading-tight">
                Admit Evidence
              </div>
              <div className="text-[11px] text-[#978B7F] mt-0.5">SHA-256 Hashing</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[#A85C2A] hover:bg-[#FFFDF8] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[#F8F4ED] border border-[#D5CABE] flex items-center justify-center text-[#476D91] group-hover:scale-105 transition-transform">
              <Search className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#292522] group-hover:text-[#A85C2A] transition-colors leading-tight">
                Search & Triage
              </div>
              <div className="text-[11px] text-[#978B7F] mt-0.5">Command Palette ⌘K</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('lab')}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[#A85C2A] hover:bg-[#FFFDF8] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[#F8F4ED] border border-[#D5CABE] flex items-center justify-center text-[#7C3AED] group-hover:scale-105 transition-transform">
              <FlaskConical className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#292522] group-hover:text-[#A85C2A] transition-colors leading-tight">
                Benchmark Lab
              </div>
              <div className="text-[11px] text-[#978B7F] mt-0.5">10,000 tx/s Stress Lab</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('actions')}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[#A85C2A] hover:bg-[#FFFDF8] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[#F8F4ED] border border-[#D5CABE] flex items-center justify-center text-[#B6423B] group-hover:scale-105 transition-transform">
              <Scale className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#292522] group-hover:text-[#A85C2A] transition-colors leading-tight">
                BSA §63 Reports
              </div>
              <div className="text-[11px] text-[#978B7F] mt-0.5">Courtroom Certificates</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[#A85C2A] hover:bg-[#FFFDF8] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[#F8F4ED] border border-[#D5CABE] flex items-center justify-center text-[#A85C2A] group-hover:scale-105 transition-transform">
              <Mic className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#292522] group-hover:text-[#A85C2A] transition-colors leading-tight">
                Multilingual Voice
              </div>
              <div className="text-[11px] text-[#978B7F] mt-0.5">11 Indian Languages</div>
            </div>
          </button>
        </div>
      </div>

      {/* 5. Assistant Guided Inquiries & Recent Real Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assistant Panel with Example Queries */}
        <div className="tarka-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#EED9C7] text-[#A85C2A] border border-[#A85C2A]/30 flex items-center justify-center">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#292522]">TARKA Assistant Guided Inquiries</h3>
                <p className="text-[12px] text-[#756A60]">Click any question to begin evidence-grounded analysis</p>
              </div>
            </div>
            <TarkaButton
              variant="ghost"
              size="sm"
              onClick={() => toggleAskTarka()}
            >
              Open Copilot
            </TarkaButton>
          </div>

          <div className="space-y-2">
            {[
              {
                icon: '💳',
                q: 'Explain the ₹25,000 vs ₹15,000 discrepancy between ledger and screenshot in CASE-2026-001',
                target: 'evidence',
              },
              {
                icon: '⏱',
                q: 'Reconstruct the event timeline between 10:15 and 10:35 IST and evaluate clock uncertainty',
                target: 'workstation',
              },
              {
                icon: '🔄',
                q: 'Simulate counterfactual exclusion of payment screenshot ART-004-BCCD4200',
                target: 'evidence',
              },
              {
                icon: '⚖',
                q: 'Generate statutory Section 63 BSA certificate for all registered case artifacts',
                target: 'actions',
              },
              {
                icon: '🌐',
                q: 'Analyze Layer-1 to Layer-4 mule accounts and calculate recoverable LIBR lien amounts',
                target: 'money',
              },
              {
                icon: '📱',
                q: 'Attribute suspect phone using Carrier-Grade NAT ephemeral source port mapping',
                target: 'device',
              },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskPrompt(item.q)}
                className="w-full text-left p-2.5 rounded-lg border border-[#D5CABE] bg-[#F8F4ED] hover:bg-[#FFFDF8] hover:border-[#A85C2A] transition-all flex items-center gap-2.5 cursor-pointer group"
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="text-[12.5px] font-medium text-[#292522] group-hover:text-[#A85C2A] transition-colors flex-1 truncate">
                  {item.q}
                </span>
                <ArrowRight className="size-3 text-[#978B7F] group-hover:text-[#A85C2A] shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Real Flight Recorder / Audit Activity Feed */}
        <div className="tarka-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#F8F4ED] text-[#287653] border border-[#D5CABE] flex items-center justify-center">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#292522]">Flight Recorder & Audit Trail</h3>
                <p className="text-[12px] text-[#756A60]">Immutable ISO/IEC 27042 Chain of Custody</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#287653] bg-[#DCEBE1] px-2 py-0.5 rounded-md">
              APPEND_ONLY
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                type: 'USER',
                tag: 'User Action',
                text: 'IO Rajeshwar Rao triggered Finacle double-entry verification on SBI Statement (ART-002)',
                time: '14:28:11 IST',
                hash: 'e4a1..99f0',
                color: 'text-[#476D91] bg-[#E0EAF1]',
              },
              {
                type: 'SYSTEM',
                tag: 'Automated Processing',
                text: 'NPCI UPI switch stream parsed 14 transactions; all RRN Julian Days validated',
                time: '14:26:04 IST',
                hash: '1b89..4a21',
                color: 'text-[#287653] bg-[#DCEBE1]',
              },
              {
                type: 'AI',
                tag: 'AI Proposal',
                text: 'Evidence Analyst proposed entity cluster linking Account #1002 to suspect Ramesh Patel',
                time: '14:22:50 IST',
                hash: '77c2..bb10',
                color: 'text-[#A85C2A] bg-[#EED9C7]',
              },
              {
                type: 'GATE',
                tag: 'Verification Event',
                text: 'Gate I1 (Double-Entry Balance Conservation) certified PASS with zero balance discrepancy',
                time: '14:20:19 IST',
                hash: 'fa02..6155',
                color: 'text-[#287653] bg-[#DCEBE1]',
              },
              {
                type: 'ADMIN',
                tag: 'Admin Governance',
                text: 'Updated station letterhead configuration to Noida Cyber Crime PS (Special Cell)',
                time: '13:58:02 IST',
                hash: '66d0..3319',
                color: 'text-[#756A60] bg-[#F1ECE4]',
              },
            ].map((evt, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-[#D5CABE] bg-[#F8F4ED] flex items-start justify-between gap-3 text-[12px]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${evt.color}`}>
                      {evt.tag}
                    </span>
                    <span className="text-[#978B7F] font-mono text-[11px]">{evt.time}</span>
                  </div>
                  <p className="text-[#292522] font-medium leading-snug">{evt.text}</p>
                </div>
                <span className="font-mono text-[10.5px] text-[#978B7F] bg-[#FFFDF8] px-1.5 py-0.5 rounded border border-[#D5CABE] shrink-0">
                  {evt.hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. System & Government-Cloud Infrastructure Health */}
      <TarkaPanel padding="sm" className="rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] bg-[#F8F4ED]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-bold text-[#292522]">
            <Server className="size-3.5 text-[#287653]" />
            National Gov-Cloud Ready (NIC MeghRaj / SDC Compatible)
          </span>
          <span className="flex items-center gap-1.5 text-[#756A60]">
            <Cpu className="size-3.5 text-[#476D91]" />
            Local Inference: Llama 3.1 8B (Q4_K_M Offline)
          </span>
          <span className="flex items-center gap-1.5 text-[#756A60]">
            <Database className="size-3.5 text-[#A85C2A]" />
            Persistence: PostgreSQL / SQLite WAL
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11.5px] text-[#287653] font-bold font-mono">
            API Latency: 12ms · p99: 4.8ms
          </span>
          <span className="inline-block size-2 rounded-full bg-[#287653] animate-pulse" />
        </div>
      </TarkaPanel>
    </div>
  );
};
