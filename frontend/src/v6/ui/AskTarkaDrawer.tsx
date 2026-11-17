import React, { useState, useEffect } from 'react';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { TarkaUniversalAssistant } from '../assistant/TarkaUniversalAssistant';

export const AskTarkaDrawer: React.FC = () => {
  const { askTarkaOpen, setAskTarkaOpen, setVoiceModalOpen } = useTarkaUiStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && askTarkaOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setAskTarkaOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [askTarkaOpen, setAskTarkaOpen, isFullscreen]);

  if (!askTarkaOpen) return null;

  return (
    <>
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-[#292522]/60 backdrop-blur-xs z-40 transition-opacity"
        onClick={() => setAskTarkaOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over Drawer or Fullscreen Modal */}
      <aside
        data-testid="ask-tarka-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Ask TARKA Forensic AI Copilot"
        className={`fixed z-50 flex flex-col transition-all duration-200 bg-[var(--surface-1)] border-l border-[var(--line)] shadow-[-16px_0_40px_rgba(41,37,34,0.18)] ${
          isFullscreen
            ? 'inset-4 md:inset-8 rounded-2xl border border-[var(--line)] shadow-2xl animate-in zoom-in-95'
            : 'top-0 right-0 bottom-0 w-[540px] max-w-[96vw] animate-in slide-in-from-right duration-200'
        }`}
      >
        <TarkaUniversalAssistant
          mode={isFullscreen ? 'fullscreen' : 'drawer'}
          onClose={() => setAskTarkaOpen(false)}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onOpenVoice={() => {
            setAskTarkaOpen(false);
            setVoiceModalOpen(true);
          }}
          className="h-full flex-1"
        />
      </aside>
    </>
  );
};
