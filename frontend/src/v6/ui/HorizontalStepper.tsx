import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { useCaseStore } from '../../store/useCaseStore';
import { CASE_STEPS } from '../shell/caseSteps';

const STEPS = CASE_STEPS.map((s, i) => ({ ...s, stepNum: i + 1 }));

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
                'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer',
                isCurrent
                  ? 'text-[var(--accent-hover)] font-bold bg-[var(--accent-bg)]/50 border border-[var(--accent)]/40 shadow-xs'
                  : isDone
                  ? 'text-[var(--fg-2)] hover:text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
              )}
            >
              <span
                className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold border transition-all flex-none',
                  isCurrent
                    ? 'border-[var(--accent)] text-white bg-[var(--accent)] shadow-xs'
                    : isDone
                    ? 'bg-[var(--safe)] border-[var(--safe)] text-white shadow-xs'
                    : 'border-[var(--line)] text-[var(--fg-3)] bg-[var(--surface-2)]'
                )}
              >
                {isDone ? <Check className="w-3 h-3 stroke-[3] text-white" /> : step.stepNum}
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

