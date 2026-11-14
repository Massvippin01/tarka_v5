import React, { useEffect } from 'react';
import { Sparkles, Mic, X, Shield } from 'lucide-react';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useCaseStore } from '../../store/useCaseStore';
import { ForensicAssistantPanel } from '../../components/tarka/ForensicAssistantPanel';
import { Button } from './Button';
import { Chip } from './Chip';

export const AskTarkaDrawer: React.FC = () => {
  const { askTarkaOpen, setAskTarkaOpen, setVoiceModalOpen } = useTarkaUiStore();
  const { activeCaseId } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && askTarkaOpen) {
        setAskTarkaOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [askTarkaOpen, setAskTarkaOpen]);

  if (!askTarkaOpen) return null;

  return (
    <>
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setAskTarkaOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <aside
        data-testid="ask-tarka-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Ask TARKA Forensic AI Copilot"
        className="fixed top-0 right-0 bottom-0 w-[470px] max-w-[95vw] bg-[var(--surface-1)] border-l border-[var(--line-2)] shadow-[-30px_0_60px_rgba(0,0,0,0.8)] z-50 flex flex-col backdrop-blur-2xl transition-transform animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--surface-2)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--flow-bg)] text-[var(--flow)] flex items-center justify-center flex-none">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--fg-1)]">Ask TARKA</h2>
                <Chip variant="safe" withDot>
                  BSA §63
                </Chip>
              </div>
              <p className="text-[11px] text-[var(--fg-3)]">
                Grounded Forensic AI Copilot · {caseId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Voice Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              icon={<Mic className="w-3.5 h-3.5 text-[var(--flow-2)]" />}
              onClick={() => {
                setAskTarkaOpen(false);
                setVoiceModalOpen(true);
              }}
              title="Switch to multimodal voice conversation"
              className="text-xs text-[var(--flow-2)] hover:bg-[var(--flow-bg)]"
            >
              Voice Mode
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAskTarkaOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-3)] transition-colors"
              aria-label="Close Ask TARKA drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security & Provenance Banner */}
        <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent border-b border-[var(--line)] text-[11px] text-[var(--fg-2)]">
          <Shield className="w-3.5 h-3.5 text-[var(--safe)] flex-none" />
          <span>Local offline inference · Evidence strictly DATA_ONLY · Zero prompt injection</span>
        </div>

        {/* Body (ForensicAssistantPanel) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ForensicAssistantPanel caseId={caseId} className="h-full flex flex-col" />
        </div>
      </aside>
    </>
  );
};
