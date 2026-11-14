import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { useCaseStore } from '../../store/useCaseStore';

export interface StepItem {
  id: string;
  stepNum: number;
  label: string;
  views: string[];
}

const STEPS: StepItem[] = [
  { id: 'evidence', stepNum: 1, label: '1. Evidence & Ledger', views: ['evidence', 'intake'] },
  { id: 'people', stepNum: 2, label: '2. People & Accounts', views: ['people', 'entities'] },
  { id: 'money', stepNum: 3, label: '3. Money Trail', views: ['money', 'taint-engine'] },
  { id: 'network', stepNum: 4, label: '4. Fraud Network', views: ['network'] },
  { id: 'device', stepNum: 5, label: '5. Device & SIM', views: ['device', 'attribution', 'handset-sim'] },
  { id: 'actions', stepNum: 6, label: '6. Actions & Report', views: ['actions', 'report'] },
];

export const HorizontalStepper: React.FC = () => {
  const { activeView, setActiveView } = useCaseStore();

  const currentStepIndex = STEPS.findIndex((s) => s.views.includes(activeView));
  if (currentStepIndex === -1) return null;

  return (
    <nav
      className="flex items-center gap-1 h-10 px-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--line)] mb-3 overflow-x-auto select-none"
      aria-label="Investigation Stage Progress"
    >
      {STEPS.map((step, idx) => {
        const isCurrent = step.views.includes(activeView);
        const isDone = idx < currentStepIndex;

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => setActiveView(step.views[0])}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer',
                isCurrent
                  ? 'text-[var(--accent)] font-bold bg-[var(--surface-2)]'
                  : isDone
                  ? 'text-[var(--fg-2)] hover:text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
              )}
            >
              <span
                className={clsx(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10.5px] font-bold border transition-all',
                  isCurrent
                    ? 'border-[var(--accent)] text-white bg-[var(--accent)]'
                    : isDone
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                    : 'border-[var(--line-2)] text-[var(--fg-3)] bg-[var(--surface-2)]'
                )}
              >
                {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.stepNum}
              </span>
              <span>{step.label}</span>
            </button>

            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-[var(--fg-3)] opacity-40 flex-none" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

