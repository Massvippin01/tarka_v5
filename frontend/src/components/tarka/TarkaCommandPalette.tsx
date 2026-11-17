import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import {
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Zap,
  RotateCcw,
  Maximize2,
  Sliders,
  PanelLeft,
  Search,
  LayoutGrid,
  FilePlus2,
  FileUp,
  FolderOpen,
  Database,
  Sparkles,
  Mic,
  Scale,
  Users,
  GitMerge,
  Network,
  Smartphone,
  FlaskConical,
  Settings,
  Activity,
  Play,
  FileQuestion,
} from 'lucide-react';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useCaseStore } from '../../store/useCaseStore';
import { PaletteSearchGroups, paletteFilter } from '../../v6/shell/PaletteSearchGroups';

export const TarkaCommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveDockTab,
    togglePresentationMode,
    toggleDensity,
    toggleSidebar,
    setBenchmarkLabOpen,
    setPublicDatasetModalOpen,
    setAskTarkaOpen,
    setVoiceModalOpen,
    setIntelligenceBriefOpen,
    startJudgeDemo,
  } = useTarkaUiStore();

  const {
    toggleMutation,
    resetAllMutations,
    setActiveRoute,
    caseWorkspaces,
    selectCaseWorkspace,
    openNewCaseModal,
    openEvidenceModal,
  } = useTarkaGlobal();

  const { setActiveCaseId, setActiveView } = useCaseStore();

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const [selected, setSelected] = useState('');

  if (!commandPaletteOpen) return null;

  const navigateTo = (view: string) => {
    setActiveView(view);
    setActiveRoute(view as any);
    setCommandPaletteOpen(false);
  };

  const switchCase = (caseId: string) => {
    setActiveCaseId(caseId);
    selectCaseWorkspace(caseId);
    setCommandPaletteOpen(false);
  };

  return (
    <div
      data-testid="tarka-command-palette"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 10, 16, 0.45)',
        backdropFilter: 'blur(var(--blur-1))',
        WebkitBackdropFilter: 'blur(var(--blur-1))',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          maxWidth: '92vw',
          background: 'var(--glass-3)',
          backdropFilter: 'blur(var(--blur-3)) saturate(150%)',
          WebkitBackdropFilter: 'blur(var(--blur-3)) saturate(150%)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow), var(--shadow-lg)',
          overflow: 'hidden',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <Command
          label="TARKA Global Forensic Command Palette"
          filter={paletteFilter}
          value={selected}
          onValueChange={setSelected}
          style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {/* Input Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              borderBottom: '1px solid var(--line)',
              background: 'transparent',
            }}
          >
            <Search size={18} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
            <Command.Input
              data-testid="command-palette-input"
              autoFocus
              placeholder="Search a UPI ID, phone, account, case or screen…"
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '14px',
                color: 'var(--fg-1)',
                fontFamily: 'inherit',
              }}
            />
            <kbd
              style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--fg-3)',
                background: 'var(--surface-3)',
                border: '1px solid var(--line)',
                padding: '2px 8px',
                borderRadius: '6px',
                flexShrink: 0,
              }}
            >
              ESC
            </kbd>
          </div>

          {/* Items List */}
          <Command.List
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            <Command.Empty
              style={{
                padding: '28px',
                textAlign: 'center',
                color: 'var(--fg-3)',
                fontSize: '13px',
              }}
            >
              Nothing matches. Try a UPI ID, phone number, account or case number.
            </Command.Empty>

            <PaletteSearchGroups
              knownCaseIds={caseWorkspaces.map((cw) => cw.caseId)}
              onDone={() => setCommandPaletteOpen(false)}
              onTopHit={setSelected}
            />

            {/* Group 0: Ask TARKA AI & Intelligent Assistance */}
            <Command.Group
              heading="ASK TARKA · AI INVESTIGATOR"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--flow-2)',
                padding: '8px 12px 4px 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setAskTarkaOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                  background: 'var(--flow-bg)',
                  marginBottom: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={16} style={{ color: 'var(--flow)' }} />
                  <span style={{ fontWeight: 600 }}>Ask TARKA: Grounded AI Copilot (BSA §63 Verified)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--flow-2)', fontFamily: 'var(--font-mono)' }}>A</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setVoiceModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                  background: 'rgba(34, 211, 238, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mic size={16} style={{ color: 'var(--flow-2)' }} />
                  <span style={{ fontWeight: 600 }}>Multimodal Voice Interrogation (Sarvam STT/TTS)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--flow-2)', fontFamily: 'var(--font-mono)' }}>V</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setIntelligenceBriefOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileQuestion size={16} style={{ color: 'var(--urgent)' }} />
                  <span>Open 7-Question Statutory Investigation Intelligence Brief</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--fg-3)' }}>BSA Statutory</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  startJudgeDemo();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Play size={16} style={{ color: 'var(--safe)' }} />
                  <span>Guided 3-Minute Judge Mode Walkthrough (Works Offline)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--safe)' }}>Demo Day</span>
              </Command.Item>
            </Command.Group>

            {/* Group 1: Navigation & Investigation Screens */}
            <Command.Group
              heading="INVESTIGATION STAGES & SCREENS"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--fg-3)',
                padding: '12px 12px 4px 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderTop: '1px solid var(--line)',
                marginTop: '6px',
              }}
            >
              <Command.Item
                onSelect={() => navigateTo('workspace')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutGrid size={15} style={{ color: 'var(--flow)' }} />
                  <span>Command Center · Station Overview & Corridors</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>Alt+0</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('cases')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FolderOpen size={15} style={{ color: 'var(--flow)' }} />
                  <span>All Cases · Register & Case Management</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('evidence')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={15} style={{ color: 'var(--urgent)' }} />
                  <span>Step 1: Evidence & Ledger Falsification Gate</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>1</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('people')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={15} style={{ color: 'var(--risk)' }} />
                  <span>Step 2: People & Accounts (Identity Resolution & Shield)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>2</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('money')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <GitMerge size={15} style={{ color: 'var(--flow-2)' }} />
                  <span>Step 3: Money Trail (Multi-Hop Sankey Flow)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>3</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('network')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Network size={15} style={{ color: 'var(--urgent)' }} />
                  <span>Step 4: Fraud Network (Graph Topology & Replay)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>4</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('device')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Smartphone size={15} style={{ color: 'var(--flow)' }} />
                  <span>Step 5: Device & SIM (Hardware & SIM-Swap CDR)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>5</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('actions')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Scale size={15} style={{ color: 'var(--safe)' }} />
                  <span>Step 6: Actions & Report (BNSS §106 Freezes & Sealed Paper)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>6 / F</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('lab')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FlaskConical size={15} style={{ color: 'var(--flow-2)' }} />
                  <span>Forensic Labs: Court Dossier, Privacy ZKP, Workstation & Benchmarks</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={15} style={{ color: 'var(--fg-3)' }} />
                  <span>Settings & Police Station Letterhead</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo('health')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={15} style={{ color: 'var(--safe)' }} />
                  <span>System Health, Probes & Cryptographic Diagnostics</span>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Group 2: Canonical & Custom Cases */}
            <Command.Group
              heading="CANONICAL CASES & WORKSPACES"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--fg-3)',
                padding: '12px 12px 4px 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderTop: '1px solid var(--line)',
                marginTop: '6px',
              }}
            >
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  openNewCaseModal();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FilePlus2 size={15} style={{ color: 'var(--safe)' }} />
                  <span>Register New FIR / NCRP 1930 Case Workspace</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  openEvidenceModal();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileUp size={15} style={{ color: 'var(--flow)' }} />
                  <span>Upload Raw Evidence File (Instant WebCrypto SHA-256)</span>
                </div>
              </Command.Item>

              {caseWorkspaces.map((cw) => (
                <Command.Item
                  key={cw.caseId}
                  onSelect={() => switchCase(cw.caseId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--fg-1)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FolderOpen size={15} style={{ color: 'var(--fg-3)' }} />
                    <span>
                      Switch to <strong style={{ color: 'var(--flow-2)' }}>{cw.caseId}</strong>: {cw.firNumber} ({cw.complainantName} · {cw.title.slice(0, 28)}...)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: cw.goldenHourRemainingMins > 0 ? 'var(--urgent)' : 'var(--safe)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {cw.goldenHourRemainingMins > 0 ? `${cw.goldenHourRemainingMins}m SLA` : 'Active'}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Group 3: Forensic Labs & Public Datasets */}
            <Command.Group
              heading="FORENSIC LABS & CALIBRATION"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--safe)',
                padding: '12px 12px 4px 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderTop: '1px solid var(--line)',
                marginTop: '6px',
              }}
            >
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setBenchmarkLabOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={15} style={{ color: 'var(--safe)' }} />
                  <span style={{ fontWeight: 600 }}>Open Forensic Benchmark & Calibration Lab</span>
                </div>
                <kbd style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--safe)' }}>Alt+B</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setPublicDatasetModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={15} style={{ color: 'var(--flow)' }} />
                  <span style={{ fontWeight: 600 }}>Open Public Dataset Benchmark (PaySim / IBM AML / IEEE-CIS)</span>
                </div>
                <kbd style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--flow)' }}>Alt+D</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab('rrn');
                  navigateTo('lab');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={15} style={{ color: 'var(--flow-2)' }} />
                  <span>Inspect NPCI RRN Timeline & Clock Skew</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab('pdf');
                  navigateTo('lab');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={15} style={{ color: 'var(--risk)' }} />
                  <span>Inspect PDF Incremental Append & %%EOF Revision</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab('privacy');
                  navigateTo('lab');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={15} style={{ color: 'var(--safe)' }} />
                  <span>Open CGNAT Merkle Privacy Shield & PSI</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab('proof');
                  navigateTo('lab');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={15} style={{ color: 'var(--flow)' }} />
                  <span>Open Gate Falsification Proof Timeline</span>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Group 4: Forensic Mutators & Live Tamper Injections */}
            <Command.Group
              heading="FORENSIC MUTATORS & TAMPER TESTS"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--risk)',
                padding: '12px 12px 4px 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderTop: '1px solid var(--line)',
                marginTop: '6px',
              }}
            >
              <Command.Item
                onSelect={() => {
                  toggleMutation('alterBankRow14');
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={15} style={{ color: 'var(--risk)' }} />
                  <span>Toggle Row #14 Balance Tamper (-₹2.00L Deficit)</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--risk)', fontFamily: 'var(--font-mono)' }}>T</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleMutation('forgeRrnTimestamp');
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={15} style={{ color: 'var(--urgent)' }} />
                  <span>Forge RRN NTP Clock Skew (+50m Tamper)</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  resetAllMutations();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <RotateCcw size={15} style={{ color: 'var(--fg-3)' }} />
                  <span>Reset All Forensic Mutations to Clean State</span>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Group 5: Viewport & Layout Controls */}
            <Command.Group
              heading="VIEW & DENSITY CONTROLS"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--fg-3)',
                padding: '12px 12px 4px 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderTop: '1px solid var(--line)',
                marginTop: '6px',
              }}
            >
              <Command.Item
                onSelect={() => {
                  togglePresentationMode();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Maximize2 size={15} style={{ color: 'var(--flow)' }} />
                  <span>Toggle Presentation Mode (Full-width canvas)</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleDensity();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sliders size={15} style={{ color: 'var(--fg-3)' }} />
                  <span>Toggle UI Density (Comfortable / Compact)</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleSidebar();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--fg-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <PanelLeft size={15} style={{ color: 'var(--fg-3)' }} />
                  <span>Toggle Sidebar Rail Collapse</span>
                </div>
                <kbd style={{ fontSize: '12px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>Ctrl+B</kbd>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
