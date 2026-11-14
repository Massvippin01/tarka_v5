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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={() => setAskTarkaOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <aside
        data-testid="ask-tarka-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Ask TARKA Forensic AI Copilot"
        className="fixed top-0 right-0 bottom-0 w-[490px] max-w-[96vw] bg-white border-l border-[var(--line)] shadow-[-16px_0_40px_rgba(15,23,42,0.15)] z-50 flex flex-col transition-transform animate-in slide-in-from-right duration-250"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[var(--accent)] border border-blue-100 flex items-center justify-center flex-none">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900">Ask TARKA</h2>
                <Chip variant="safe" withDot>
                  BSA §63
                </Chip>
              </div>
              <p className="text-[12px] text-zinc-500">
                Grounded Forensic AI Copilot · {caseId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Voice Mode Toggle */}
            <Button
              variant="default"
              size="sm"
              icon={<Mic className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => {
                setAskTarkaOpen(false);
                setVoiceModalOpen(true);
              }}
              title="Switch to multimodal voice conversation"
              className="text-[12px] font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200"
            >
              Voice Mode
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAskTarkaOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Close Ask TARKA drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security & Provenance Banner */}
        <div className="flex items-center gap-2 px-5 py-2 bg-emerald-50/70 border-b border-emerald-100/80 text-[12px] text-emerald-800 font-medium flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-emerald-600 flex-none" />
          <span>Local offline inference · Evidence strictly DATA_ONLY · Zero prompt injection</span>
        </div>

        {/* Body (ForensicAssistantPanel) */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
          <ForensicAssistantPanel caseId={caseId} className="h-full flex flex-col" />
        </div>
      </aside>
    </>
  );
};
