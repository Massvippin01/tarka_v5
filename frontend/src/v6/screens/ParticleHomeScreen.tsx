import React from 'react';
import { ChevronRight, MessageSquare, Mic } from 'lucide-react';
import { TarkaParticleOrb } from '../voice/TarkaParticleOrb';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useCaseFixture } from '../../selectors/bundleAdapter';
import { useV6Theme } from '../shell/useV6Theme';
import { Button, TechnicalDetails } from '../ui';

const STAGE: Record<string, string> = {
  intake: 'Collecting evidence',
  attribution: 'Identifying accounts and people',
  network: 'Mapping the gang',
  'court-proof': 'Preparing for court',
};

// Questions are templates: the assistant answers them from the active case's bundle only.
const PROMPTS = [
  { label: 'Summarise this case', query: 'Summarise this case: how much was lost, where the money went and who the main suspects are.' },
  { label: 'Where did the money go?', query: 'Trace where the victim\'s money went, step by step, and what is still recoverable.' },
  { label: 'Which accounts should be frozen first?', query: 'Which accounts should be frozen first, and why?' },
  { label: 'What happened when?', query: 'Walk me through the timeline of this case, from first contact to the complaint.' },
  { label: 'Is any evidence missing?', query: 'What evidence is missing or contradicts itself in this case?' },
];

const JUMPS: { view: string; label: string }[] = [
  { view: 'evidence', label: 'Evidence' },
  { view: 'money', label: 'Money trail' },
  { view: 'network', label: 'Network' },
  { view: 'actions', label: 'Actions & report' },
];

export const ParticleHomeScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const { setVoiceModalOpen, setAskTarkaOpen } = useTarkaUiStore();
  const { fixture } = useCaseFixture(activeCaseId);
  const theme = useV6Theme((s) => s.theme);

  const ask = (query: string) => {
    setAskTarkaOpen(true);
    window.dispatchEvent(new CustomEvent('tarka-prompt-select', { detail: { prompt: query } }));
  };

  return (
    <div className="v6-enter min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center gap-6 py-6" data-testid="v6-voice-home">
      <p className="text-[12.5px] text-[var(--fg-2)] max-w-xl">
        Ask about the active case by voice or text, in English or an Indian language.
      </p>

      <div className="relative">
        <TarkaParticleOrb
          state="idle"
          audioLevel={0}
          size={300}
          theme={theme === 'dark' ? 'midnight-teal' : 'porcelain'}
          onClick={() => setVoiceModalOpen(true)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={() => setVoiceModalOpen(true)}>
          <Mic className="w-4 h-4" /> Start talking
        </Button>
        <Button variant="default" onClick={() => setAskTarkaOpen(true)}>
          <MessageSquare className="w-4 h-4" /> Type a question
        </Button>
      </div>

      {fixture ? (
        <div className="v6-card !py-2 !px-4 inline-flex items-center gap-2 text-[12.5px] max-w-[640px]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
          <span className="font-medium text-[var(--fg-1)] shrink-0">{fixture.caseId}</span>
          <span className="text-[var(--fg-3)]">·</span>
          <span className="truncate text-[var(--fg-2)]" title={fixture.title}>{fixture.title}</span>
          {STAGE[fixture.currentStage] && (
            <>
              <span className="text-[var(--fg-3)]">·</span>
              <span className="shrink-0 text-[var(--fg-2)]">{STAGE[fixture.currentStage]}</span>
            </>
          )}
        </div>
      ) : (
        <p className="text-[12.5px] text-[var(--fg-3)]">
          No case is open. Pick one from the case switcher at the top to ask about it.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={!fixture}
            onClick={() => ask(p.query)}
            className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border border-[var(--line)] bg-[var(--glass-2)] backdrop-blur-md text-[var(--fg-2)] enabled:hover:text-[var(--fg-1)] enabled:hover:border-[var(--accent)]/50 disabled:opacity-50 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 text-[12.5px] text-[var(--fg-3)]">
        Or go straight to
        {JUMPS.map((j) => (
          <button key={j.view} type="button" onClick={() => setActiveView(j.view)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md hover:text-[var(--accent)] hover:bg-[var(--hover)]">
            {j.label} <ChevronRight className="w-3 h-3" />
          </button>
        ))}
      </div>

      <div className="w-full max-w-2xl text-left">
        <TechnicalDetails>
          <p>The voice window lets you choose an offline speech model on this computer or the Sarvam cloud service; pick offline for sensitive cases.
            The orb stays calm until you start talking.</p>
          <p>The assistant reads only the active case's data. It suggests; the investigator decides. Check answers against the evidence before relying on them.</p>
        </TechnicalDetails>
      </div>
    </div>
  );
};
