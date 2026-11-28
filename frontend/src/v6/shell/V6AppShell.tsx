import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useCaseStore, useUrlSync } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { V6Rail } from './V6Rail';
import { V6Topbar } from './V6Topbar';
import { CaseNotFoundScreen } from '../../pages/v5/CaseNotFoundScreen';
import { CaseFingerprintDevOverlay } from '../../components/common/CaseFingerprintDevOverlay';
import { DemoUserModal } from '../../components/tarka/auth/DemoUserModal';
import { TarkaCommandPalette } from '../../components/tarka/TarkaCommandPalette';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { Skeleton } from '../ui/Skeleton';
import { Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

// V6 Screens (lazy-loaded for speed & clean architecture)
const ParticleHomeScreen = lazy(() =>
  import('../screens/ParticleHomeScreen').then((m) => ({ default: m.ParticleHomeScreen }))
);
const HomeScreen = lazy(() =>
  import('../screens/HomeScreen').then((m) => ({ default: m.HomeScreen }))
);
const CommandCenterScreen = lazy(() =>
  import('../screens/CommandCenterScreen').then((m) => ({ default: m.CommandCenterScreen }))
);
const CasesScreen = lazy(() =>
  import('../screens/CasesScreen').then((m) => ({ default: m.CasesScreen }))
);
const EvidenceLedgerScreen = lazy(() =>
  import('../screens/EvidenceLedgerScreen').then((m) => ({ default: m.EvidenceLedgerScreen }))
);
const PeopleAccountsScreen = lazy(() =>
  import('../screens/PeopleAccountsScreen').then((m) => ({ default: m.PeopleAccountsScreen }))
);
const MoneyTrailScreen = lazy(() =>
  import('../screens/MoneyTrailScreen').then((m) => ({ default: m.MoneyTrailScreen }))
);
const FraudNetworkScreen = lazy(() =>
  import('../screens/FraudNetworkScreen').then((m) => ({ default: m.FraudNetworkScreen }))
);
const DeviceSimScreen = lazy(() =>
  import('../screens/DeviceSimScreen').then((m) => ({ default: m.DeviceSimScreen }))
);
const ActionsReportScreen = lazy(() =>
  import('../screens/ActionsReportScreen').then((m) => ({ default: m.ActionsReportScreen }))
);
const LabScreen = lazy(() =>
  import('../screens/LabScreen').then((m) => ({ default: m.LabScreen }))
);
const SettingsScreen = lazy(() =>
  import('../screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);
const HealthDiagnosticsScreen = lazy(() =>
  import('../screens/HealthDiagnosticsScreen').then((m) => ({ default: m.HealthDiagnosticsScreen }))
);
const ViewNotFoundScreen = lazy(() =>
  import('../../components/tarka/feedback/ViewNotFoundScreen').then((m) => ({
    default: m.ViewNotFoundScreen,
  }))
);

// Parity Overlays, Drawers & Modals (lazy-loaded)
const AskTarkaDrawer = lazy(() =>
  import('../ui/AskTarkaDrawer').then((m) => ({ default: m.AskTarkaDrawer }))
);
const TarkaVoiceModal = lazy(() =>
  import('../voice/TarkaVoiceModal').then((m) => ({ default: m.TarkaVoiceModal }))
);
const EvidenceIntakeModal = lazy(() =>
  import('../../components/tarka/workspace/EvidenceIntakeModal').then((m) => ({
    default: m.EvidenceIntakeModal,
  }))
);
const MassiveEvidenceIntakeModal = lazy(() =>
  import('../ui/MassiveEvidenceIntakeModal').then((m) => ({ default: m.MassiveEvidenceIntakeModal }))
);
const NewCaseModal = lazy(() =>
  import('../../components/tarka/workspace/NewCaseModal').then((m) => ({
    default: m.NewCaseModal,
  }))
);
const BenchmarkLabDrawer = lazy(() =>
  import('../../components/tarka/benchmark/BenchmarkLabDrawer').then((m) => ({
    default: m.BenchmarkLabDrawer,
  }))
);
const PublicDatasetBenchmarkModal = lazy(() =>
  import('../../components/tarka/benchmark/PublicDatasetBenchmarkModal').then((m) => ({
    default: m.PublicDatasetBenchmarkModal,
  }))
);
const InvestigationIntelligenceBrief = lazy(() =>
  import('../../components/tarka/investigation/InvestigationIntelligenceBrief').then((m) => ({
    default: m.InvestigationIntelligenceBrief,
  }))
);
const JudgeModeWalkthrough = lazy(() =>
  import('../../components/tarka/demo/JudgeModeWalkthrough').then((m) => ({
    default: m.JudgeModeWalkthrough,
  }))
);
const CaseAuditTrailDrawer = lazy(() =>
  import('../../components/tarka/audit/CaseAuditTrailDrawer').then((m) => ({
    default: m.CaseAuditTrailDrawer,
  }))
);
const RelationshipEvidenceSheet = lazy(() =>
  import('../../components/tarka/investigation/RelationshipEvidenceSheet').then((m) => ({
    default: m.RelationshipEvidenceSheet,
  }))
);
const TransformationAuditLog = lazy(() =>
  import('../../components/tarka/investigation/TransformationAuditLog').then((m) => ({
    default: m.TransformationAuditLog,
  }))
);

import { HorizontalStepper } from '../ui/HorizontalStepper';
import { TarkaContextualGuideModal } from '../guide/TarkaContextualGuideModal';
import { highlightController } from '../highlight/semanticRegistry';
import { BookOpen } from 'lucide-react';

export const V6AppShell: React.FC = () => {
  const { syncFromUrl } = useUrlSync();
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { activeCase, caseWorkspaces, openNewCaseModal } = useTarkaGlobal();
  const {
    setCommandPaletteOpen,
    toggleAskTarka,
    voiceModalOpen,
    setVoiceModalOpen,
    intelligenceBriefOpen,
    setIntelligenceBriefOpen,
    relationshipSheetOpen,
    setRelationshipSheetOpen,
    selectedEvidenceEdge,
    transformationAuditModalOpen,
    setTransformationAuditModalOpen,
    massiveIntakeModalOpen,
    setMassiveIntakeModalOpen,
  } = useTarkaUiStore();

  const [isDemoUserOpen, setIsDemoUserOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [auditDrawerCaseId, setAuditDrawerCaseId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Subscribe to voice-directed semantic element highlights
  useEffect(() => {
    return highlightController.subscribe((elementId, tone) => {
      document.querySelectorAll('[data-semantic-highlight]').forEach((el) => {
        el.removeAttribute('data-semantic-highlight');
      });
      if (elementId) {
        const target =
          document.getElementById(elementId) ||
          document.querySelector(`[data-semantic-id="${elementId}"]`);
        if (target) {
          target.setAttribute('data-semantic-highlight', tone);
        }
      }
    });
  }, []);

  // Sync with browser URL changes
  useEffect(() => {
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  // Global logo navigation listeners
  useEffect(() => {
    const handleNavWorkspace = () => setActiveView('workspace');
    const handleNavHome = () => setActiveView('home');
    window.addEventListener('tarka:navigate-workspace', handleNavWorkspace);
    window.addEventListener('tarka:navigate-home', handleNavHome);
    return () => {
      window.removeEventListener('tarka:navigate-workspace', handleNavWorkspace);
      window.removeEventListener('tarka:navigate-home', handleNavHome);
    };
  }, [setActiveView]);

  // Global Keyboard Shortcuts (1-6, Cmd/Ctrl-K, F, A, V, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Cmd/Ctrl + K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // 'a' or 'A': Ask TARKA AI Copilot
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleAskTarka();
        return;
      }

      // 'v' or 'V': Multimodal Voice Interrogation
      if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setVoiceModalOpen(true);
        return;
      }

      // 'w' or 'W': Jump to Workstation / Active Investigation Workspace
      if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveView('workspace');
        return;
      }

      // 'h' or 'H': Jump to Sovereign Voice Field Home
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveView('home');
        return;
      }

      // Keys 1 to 6: Jump to investigation steps
      if (e.key === '1') {
        e.preventDefault();
        setActiveView('evidence');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveView('people');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveView('money');
      } else if (e.key === '4') {
        e.preventDefault();
        setActiveView('network');
      } else if (e.key === '5') {
        e.preventDefault();
        setActiveView('device');
      } else if (e.key === '6') {
        e.preventDefault();
        setActiveView('actions');
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveView('actions');
      } else if ((e.key === '?' || (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey)) && activeView !== 'home') {
        e.preventDefault();
        setIsGuideOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView, setCommandPaletteOpen, toggleAskTarka, setVoiceModalOpen, activeView]);

  // Case validity validation
  const effectiveCaseId = activeCaseId || 'CASE-2026-001';
  const knownViews = [
    'home',
    'workspace',
    'dash',
    'dashboard',
    'cases',
    'settings',
    'health',
    'lab',
    'court',
    'court-dossier',
    'court-proof',
    'privacy',
    'privacy-crypto',
    'workstation',
    'benchmarks',
    'benchmark',
  ];

  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tarka_v6_rail_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleRail = () => {
    setRailCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tarka_v6_rail_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const isCaseUnknown =
    activeCaseId &&
    !['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(activeCaseId) &&
    !caseWorkspaces.some((c) => c.caseId === activeCaseId);

  const isCaseArchived =
    activeCase &&
    (activeCase as any).status === 'ARCHIVED' &&
    (activeCase as any).caseId === effectiveCaseId;

  // Screen router
  const renderScreen = () => {
    if (isCaseUnknown && !knownViews.includes(activeView)) {
      return <CaseNotFoundScreen caseId={activeCaseId!} />;
    }

    switch (activeView) {
      case 'home':
        return <ParticleHomeScreen />;
      case 'workspace':
      case 'command-centre':
      case 'dash':
      case 'dashboard':
        return <HomeScreen />;
      case 'commandcenter':
      case 'command-center':
      case 'cases-hub':
      case 'hub':
        return <CommandCenterScreen />;
      case 'cases':
        return <CasesScreen />;
      case 'evidence':
      case 'intake':
        return <EvidenceLedgerScreen />;
      case 'people':
      case 'entities':
        return <PeopleAccountsScreen />;
      case 'money':
      case 'taint-engine':
        return <MoneyTrailScreen />;
      case 'network':
        return <FraudNetworkScreen />;
      case 'device':
      case 'handset-sim':
      case 'attribution':
        return <DeviceSimScreen />;
      case 'actions':
        return <ActionsReportScreen initialTab="actions" />;
      case 'report':
        return <ActionsReportScreen initialTab="report" />;
      case 'court':
      case 'court-dossier':
      case 'court-proof':
        return <LabScreen initialTab="court-proof" />;
      case 'privacy':
      case 'privacy-crypto':
        return <LabScreen initialTab="privacy-crypto" />;
      case 'workstation':
        return <LabScreen initialTab="workstation" />;
      case 'benchmarks':
      case 'benchmark':
        return <LabScreen initialTab="benchmarks" />;
      case 'lab':
        return <LabScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'health':
        return <HealthDiagnosticsScreen />;
      default:
        return <ViewNotFoundScreen view={activeView} />;
    }
  };

  // Pure Immersive Particle Intelligence Interface (NO sidebar, NO navbar, NO top menu, NO cards)
  if (activeView === 'home') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="w-screen h-screen bg-[#07090D]" />}>
          <ParticleHomeScreen />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div
      className="v6-app"
      data-case-id={effectiveCaseId}
      style={{ '--v6-rail-width': railCollapsed ? '64px' : '260px' } as React.CSSProperties}
    >
      {/* Sidebar Rail */}
      <V6Rail
        isCollapsed={railCollapsed}
        onToggleCollapse={toggleRail}
        onOpenDemoUser={() => setIsDemoUserOpen(true)}
      />

      {/* Main Content Area */}
      <div className="v6-main">
        {/* Topbar */}
        <V6Topbar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNewCase={() => openNewCaseModal()}
          onOpenAuditTrail={(targetCaseId) => {
            setAuditDrawerCaseId(targetCaseId || activeCaseId);
            setIsAuditDrawerOpen(true);
          }}
        />

        {/* Read-Only Archived Banner if case is ARCHIVED */}
        {isCaseArchived && (
          <div
            data-testid="archived-case-banner"
            className="flex items-center gap-2.5 px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs font-semibold"
          >
            <Lock className="w-4 h-4 text-amber-400 flex-none" />
            <span>
              This case is <b>ARCHIVED</b> and read-only. Forensic chain-of-custody and evidence manifests are permanently sealed.
            </span>
          </div>
        )}

        {/* View container */}
        <main
          className={cn('v6-view', activeView === 'home' && 'p-0 overflow-y-auto bg-[#07090D]')}
          id="v6-view"
          data-case-id={effectiveCaseId}
        >
          {activeView !== 'home' && <HorizontalStepper />}
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="space-y-4 p-4">
                  <Skeleton height={48} />
                  <div className="grid grid-cols-4 gap-4">
                    <Skeleton height={110} />
                    <Skeleton height={110} />
                    <Skeleton height={110} />
                    <Skeleton height={110} />
                  </div>
                  <Skeleton height={380} />
                </div>
              }
            >
              {renderScreen()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Persona Switching Modal */}
      <DemoUserModal
        isOpen={isDemoUserOpen}
        onClose={() => setIsDemoUserOpen(false)}
      />

      {/* Command Palette */}
      <TarkaCommandPalette />

      {/* Ask TARKA Copilot Slide-Over */}
      <Suspense fallback={null}>
        <AskTarkaDrawer />
      </Suspense>

      {/* Multimodal Voice Interrogation Station */}
      <Suspense fallback={null}>
        <TarkaVoiceModal
          isOpen={voiceModalOpen}
          onClose={() => setVoiceModalOpen(false)}
        />
      </Suspense>

      {/* Cryptographic Evidence Intake Modal */}
      <Suspense fallback={null}>
        <EvidenceIntakeModal />
        {massiveIntakeModalOpen && (
          <MassiveEvidenceIntakeModal
            isOpen={massiveIntakeModalOpen}
            onClose={() => setMassiveIntakeModalOpen(false)}
          />
        )}
      </Suspense>

      {/* New Case Registration Modal */}
      <Suspense fallback={null}>
        <NewCaseModal />
      </Suspense>

      {/* Benchmark Lab Drawer & Public Datasets Modal */}
      <Suspense fallback={null}>
        <BenchmarkLabDrawer />
        <PublicDatasetBenchmarkModal />
      </Suspense>

      {/* 7-Question Statutory Investigation Intelligence Brief */}
      <Suspense fallback={null}>
        <InvestigationIntelligenceBrief
          isOpen={intelligenceBriefOpen}
          onClose={() => setIntelligenceBriefOpen(false)}
        />
      </Suspense>

      {/* Guided Judge Demo Walkthrough (Offline Capable) */}
      <Suspense fallback={null}>
        <JudgeModeWalkthrough />
      </Suspense>

      {/* Case Audit Trail Drawer (BSA §63 Chain of Custody) */}
      <Suspense fallback={null}>
        <CaseAuditTrailDrawer
          caseId={auditDrawerCaseId || effectiveCaseId}
          isOpen={isAuditDrawerOpen}
          onClose={() => setIsAuditDrawerOpen(false)}
        />
      </Suspense>

      {/* Relationship Evidence Deep-Dive Sheet */}
      <Suspense fallback={null}>
        <RelationshipEvidenceSheet
          edge={selectedEvidenceEdge}
          isOpen={relationshipSheetOpen}
          onClose={() => setRelationshipSheetOpen(false)}
        />
      </Suspense>

      {/* Transformation & Merkle Root Audit Modal */}
      <Suspense fallback={null}>
        <TransformationAuditLog
          isOpen={transformationAuditModalOpen}
          onClose={() => setTransformationAuditModalOpen(false)}
        />
      </Suspense>

      {/* Floating Contextual Forensic Guide Button */}
      <button
        onClick={() => setIsGuideOpen(true)}
        className="fixed bottom-5 right-6 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FFFDF8] dark:bg-[#25221F] border border-[#D5CABE] dark:border-[#3B332F] shadow-lg text-[#292522] dark:text-[#E9E2D7] text-xs font-semibold hover:border-[#476D91] transition cursor-pointer"
        title="Contextual Forensic & Algorithmic Guide (Press ? or G)"
      >
        <BookOpen size={14} className="text-[#476D91]" />
        <span>Screen Guide</span>
      </button>

      {/* Contextual Forensic Guide Modal */}
      <TarkaContextualGuideModal
        viewId={activeView}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Dev Fingerprint Overlay */}
      <CaseFingerprintDevOverlay />
    </div>
  );
};
