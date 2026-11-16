import React, { useState } from 'react';
import { getContextualGuide } from './tarkaContextualGuide';
import {
  X,
  BookOpen,
  Cpu,
  Info,
  ArrowRight,
} from 'lucide-react';

interface TarkaContextualGuideModalProps {
  viewId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TarkaContextualGuideModal: React.FC<TarkaContextualGuideModalProps> = ({
  viewId,
  isOpen,
  onClose,
}) => {
  const [explanationDepth, setExplanationDepth] = useState<'investigator' | 'technical'>('investigator');

  if (!isOpen) return null;

  const guide = getContextualGuide(viewId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#FFFDF8] dark:bg-[#1E1C1A] border border-[#D5CABE] dark:border-[#3B332F] shadow-2xl flex flex-col overflow-hidden text-[#292522] dark:text-[#E9E2D7] animate-v6-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D5CABE] dark:border-[#3B332F] bg-[#F8F4ED] dark:bg-[#25221F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#476D91]/15 text-[#476D91] dark:text-[#7EA0C4] flex items-center justify-center font-bold">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif tracking-tight">
                {guide.title}
              </h3>
              <p className="text-xs text-[#756A60] dark:text-[#978B7F]">
                Forensic Operational &amp; Algorithmic Guide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dual Depth Toggle */}
            <div className="flex items-center bg-[#E5DDD1] dark:bg-[#2D2825] p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setExplanationDepth('investigator')}
                className={`px-3 py-1 rounded-md transition ${
                  explanationDepth === 'investigator'
                    ? 'bg-[#FFFDF8] dark:bg-[#3B332F] text-[#292522] dark:text-white shadow-sm font-bold'
                    : 'text-[#756A60] dark:text-[#978B7F]'
                }`}
              >
                Investigator
              </button>
              <button
                onClick={() => setExplanationDepth('technical')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                  explanationDepth === 'technical'
                    ? 'bg-[#FFFDF8] dark:bg-[#3B332F] text-[#292522] dark:text-white shadow-sm font-bold'
                    : 'text-[#756A60] dark:text-[#978B7F]'
                }`}
              >
                <Cpu size={12} />
                Technical
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#756A60] hover:text-[#292522] dark:hover:text-white hover:bg-[#E5DDD1] dark:hover:bg-[#2D2825] transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Overview Statement */}
          <div className="p-4 rounded-xl bg-[#F1ECE4] dark:bg-[#292522] border border-[#D5CABE] dark:border-[#3B332F] leading-relaxed">
            <div className="flex items-start gap-2.5">
              <Info size={16} className="text-[#476D91] mt-0.5 flex-none" />
              <div>
                <span className="font-semibold text-xs uppercase tracking-wider block text-[#476D91] mb-1">
                  Purpose &amp; Objective
                </span>
                <p className="text-xs text-[#292522] dark:text-[#E9E2D7]">
                  {guide.purpose}
                </p>
              </div>
            </div>
          </div>

          {/* Explanation according to selected depth */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#756A60] dark:text-[#978B7F] mb-2">
              {explanationDepth === 'investigator' ? 'Investigative Narrative' : 'Mathematical &amp; Algorithmic Details'}
            </h4>
            <div className="p-4 rounded-xl bg-[#FFFDF8] dark:bg-[#1E1C1A] border border-[#D5CABE] dark:border-[#3B332F] text-xs leading-relaxed text-[#292522] dark:text-[#E9E2D7]">
              {explanationDepth === 'investigator' ? guide.investigatorExplanation : guide.technicalExplanation}
            </div>
          </div>

          {/* Decoded Abbreviations */}
          {Object.keys(guide.abbreviations).length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#756A60] dark:text-[#978B7F] mb-2">
                Decoded Abbreviations &amp; Statutory Terms
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(guide.abbreviations).map(([abbr, meaning]) => (
                  <div
                    key={abbr}
                    className="p-2.5 rounded-lg bg-[#F8F4ED] dark:bg-[#25221F] border border-[#E5DDD1] dark:border-[#3B332F] text-xs"
                  >
                    <span className="font-mono font-bold text-[#A85C2A] block mb-0.5">
                      {abbr}
                    </span>
                    <span className="text-[#756A60] dark:text-[#978B7F]">
                      {meaning}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screen Metrics Breakdown */}
          {guide.metrics.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#756A60] dark:text-[#978B7F] mb-2">
                Key Metrics &amp; Indicators
              </h4>
              <div className="space-y-2">
                {guide.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="p-3 rounded-lg bg-[#F8F4ED] dark:bg-[#25221F] border border-[#E5DDD1] dark:border-[#3B332F] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold block text-[#292522] dark:text-white">
                        {m.label}
                      </span>
                      <span className="text-[#756A60] dark:text-[#978B7F]">
                        {m.investigativeMeaning}
                      </span>
                    </div>
                    <div className="text-right flex-none pl-3 font-mono">
                      <span className="font-bold text-[#476D91] block">
                        {m.unit}
                      </span>
                      <span className="text-[11px] text-[#756A60]">
                        Range: {m.normalRange}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Actions */}
          {guide.recommendedNextSteps.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#756A60] dark:text-[#978B7F] mb-2">
                Recommended Next Investigative Steps
              </h4>
              <div className="space-y-1.5">
                {guide.recommendedNextSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[#F1ECE4] dark:bg-[#25221F] text-xs text-[#292522] dark:text-[#E9E2D7]"
                  >
                    <ArrowRight size={13} className="text-[#476D91] flex-none" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#D5CABE] dark:border-[#3B332F] bg-[#F8F4ED] dark:bg-[#25221F] flex items-center justify-between text-xs text-[#756A60] font-mono">
          <span>AI PROPOSES • EVIDENCE VERIFIES • HUMAN DECIDES</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#49362E] hover:bg-[#292522] text-white font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
