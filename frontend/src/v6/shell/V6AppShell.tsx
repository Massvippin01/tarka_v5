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

// V6 Screens (lazy-loaded for speed & clean architecture)
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

export const V6AppShell: React.FC = () => {
  const { syncFromUrl } = useUrlSync();
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { activeCase, caseWorkspaces } = useTarkaGlobal();
  const { setCommandPaletteOpen } = useTarkaUiStore();

  const [isDemoUserOpen, setIsDemoUserOpen] = useState(false);

  // Sync with browser URL changes
  useEffect(() => {
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  // Global Keyboard Shortcuts (1-6, Cmd/Ctrl-K, F, Esc)
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  // Case validity validation
  const effectiveCaseId = activeCaseId || 'CASE-2026-001';
  const isCaseUnknown =
    activeCaseId &&
    !['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(activeCaseId) &&
    !caseWorkspaces.some((c) => c.caseId === activeCaseId);

  const isCaseArchived = activeCase && (activeCase as any).status === 'ARCHIVED';

  // Screen router
  const renderScreen = () => {
    if (isCaseUnknown && !['workspace', 'dash', 'cases', 'settings', 'health', 'lab'].includes(activeView)) {
      return <CaseNotFoundScreen caseId={activeCaseId!} />;
    }

    switch (activeView) {
      case 'workspace':
      case 'dash':
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
        return <DeviceSimScreen />;
      case 'actions':
        return <ActionsReportScreen initialTab="actions" />;
      case 'report':
        return <ActionsReportScreen initialTab="report" />;
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

  return (
    <div className="v6-app" data-case-id={effectiveCaseId}>
      {/* Sidebar Rail */}
      <V6Rail onOpenDemoUser={() => setIsDemoUserOpen(true)} />

      {/* Main Content Area */}
      <div className="v6-main">
        {/* Topbar */}
        <V6Topbar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNewCase={() => setActiveView('cases')}
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
        <main className="v6-view" id="v6-view" data-case-id={effectiveCaseId}>
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

      {/* Command Palette / Ask TARKA */}
      <TarkaCommandPalette />

      {/* Dev Fingerprint Overlay */}
      <CaseFingerprintDevOverlay />
    </div>
  );
};
