import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { EvidenceStatusBadge } from "./EvidenceStatusBadge";
import forensicsApi from "../../api/forensicsApi";

export interface ContradictionItem {
  finding_id: string;
  category: string;
  severity: string;
  title: string;
  why_it_matters: string;
  supporting_fact_ids: string[];
  source_artifact_ids: string[];
  rule_firing_reason: string;
  original_values: Record<string, unknown>;
  normalized_values: Record<string, unknown>;
  status: string;
  review_state?: string;
  review_notes?: string;
  reviewed_by?: string;
}

export interface EvidenceGapItem {
  gap_id: string;
  category: string;
  status: string;
  title: string;
  why_it_matters: string;
  exposed_by_rule_id: string;
  relevant_artifact_ids: string[];
  suggested_remedy?: string;
  review_decision?: string;
  reviewed_by?: string;
  review_scope?: string;
}

export interface ExplanationSource {
  fact_id: string;
  artifact_id: string;
  artifact_filename: string;
  source_location: string;
  raw_value?: unknown;
  normalized_value?: unknown;
  source_tier: string;
  timestamp?: string;
  bounding_box?: number[];
  confidence?: number;
  sha256?: string;
  raw_snippet?: string;
}

export interface DerivationStepItem {
  step_number: number;
  stage: string;
  description: string;
  input_reference?: string;
  output_reference?: string;
  metadata?: Record<string, unknown>;
}

export interface FindingExplanationData {
  finding_id: string;
  finding_type: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  plain_language_summary: string;
  sources: ExplanationSource[];
  rule_metadata?: {
    rule_id: string;
    rule_version: string;
    rule_display_name: string;
    rule_purpose: string;
    operator: string;
    join_key: string;
    firing_condition: string;
    satisfied_conditions?: string[];
  };
  derivation_chain?: DerivationStepItem[];
  epistemic_notice?: string;
  epistemic_uncertainties?: string[];
  review_audit?: {
    review_state: string;
    reviewed_by?: string;
    review_notes?: string;
    reviewed_at_iso?: string;
    review_scope?: string;
  };
  fingerprint?: string;
}

interface ContradictionPanelProps {
  contradictions: ContradictionItem[];
  gaps: EvidenceGapItem[];
  caseId?: string;
  runId?: string;
  onReviewAction?: (id: string, decision: string, notes: string, scope?: string, targetType?: string) => void;
  className?: string;
}

export const ContradictionPanel: React.FC<ContradictionPanelProps> = ({
  contradictions,
  gaps,
  caseId,
  runId,
  onReviewAction,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<"CONTRADICTIONS" | "GAPS">("CONTRADICTIONS");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewingType, setReviewingType] = useState<"finding" | "gap">("finding");
  const [reviewDecision, setReviewDecision] = useState<string>("RESOLVE");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [reviewScope, setReviewScope] = useState<string>("");

  // Explanation Modal State
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanationData, setExplanationData] = useState<FindingExplanationData | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const handleOpenReview = (id: string, type: "finding" | "gap") => {
    setReviewingId(id);
    setReviewingType(type);
    setReviewNotes("");
    setReviewScope("");
  };

  const handleSaveReview = () => {
    if (reviewingId && onReviewAction) {
      onReviewAction(reviewingId, reviewDecision, reviewNotes, reviewScope, reviewingType);
    }
    setReviewingId(null);
  };

  const handleOpenExplanation = async (id: string) => {
    setExplainingId(id);
    setExplanationData(null);
    setExplanationError(null);
    if (!caseId) {
      setExplanationError("Case ID is required to fetch evidence explanation.");
      return;
    }
    try {
      setLoadingExplanation(true);
      const data = await forensicsApi.getFindingExplanation(caseId, id, runId);
      setExplanationData(data);
    } catch (err: unknown) {
      console.error("Failed to load explanation:", err);
      const msg = err instanceof Error ? err.message : "Failed to load forensic explanation.";
      setExplanationError(msg);
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <div className={`bg-slate-950 border border-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Contradictions & Epistemic Gaps</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Z3 Minimal Unsatisfiable Subsets (MUS) isolating mutually exclusive claims across evidence records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("CONTRADICTIONS")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTab === "CONTRADICTIONS"
                ? "bg-[#AF3F3A] text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Contradictions ({contradictions.length})
          </button>
          <button
            onClick={() => setActiveTab("GAPS")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTab === "GAPS"
                ? "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Evidence Gaps ({gaps.length})
          </button>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingId && (
        <div className="p-4 bg-slate-900 border-b border-indigo-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300">
              Authorized Examiner Review for <code className="text-white">{reviewingId}</code> ({reviewingType.toUpperCase()})
            </span>
            <button onClick={() => setReviewingId(null)} className="text-xs text-slate-400 hover:text-white" aria-label="Close review panel">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Review Decision</label>
              <select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200"
              >
                <option value="RESOLVE">RESOLVE (Resolved with documented evidence)</option>
                <option value="CONFIRM_ABSENT">CONFIRM_ABSENT (Verified absent within defined statutory scope)</option>
                <option value="MARK_UNREADABLE">MARK_UNREADABLE (Content illegible / low confidence)</option>
                <option value="ACCEPT">ACCEPT (Confirm machine-extracted candidate)</option>
                <option value="REJECT">REJECT (Dismiss ungrounded finding)</option>
              </select>
            </div>

            {reviewDecision === "CONFIRM_ABSENT" && (
              <div>
                <label className="block text-amber-400 mb-1">Mandatory Examination Scope</label>
                <input
                  type="text"
                  placeholder="e.g. Scanned all 12 bank account statements for Feb 2026"
                  value={reviewScope}
                  onChange={(e) => setReviewScope(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-600/60 rounded p-1.5 text-slate-200"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Examiner Justification & Notes</label>
            <textarea
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="State statutory basis and observational evidence..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReviewingId(null)}
              className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReview}
              className="px-3 py-1 text-xs bg-indigo-600 text-white font-medium rounded hover:bg-indigo-500"
            >
              Commit Audit Review
            </button>
          </div>
        </div>
      )}

      {/* Forensic Explanation Modal */}
      {explainingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-850 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                  {explainingId}
                </span>
                <h4 className="text-sm font-semibold text-slate-100">
                  Evidence-Grounded Finding Explanation & Trace
                </h4>
              </div>
              <button
                onClick={() => setExplainingId(null)}
                className="text-slate-400 hover:text-white text-base px-2 py-0.5"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {loadingExplanation ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-2" />
                  <div>Synthesizing deterministic evidence derivation chain...</div>
                </div>
              ) : explanationError ? (
                <div className="p-4 bg-red-950/40 border border-red-700 rounded text-red-300">
                  {explanationError}
                </div>
              ) : explanationData ? (
                <>
                  {/* Summary & Epistemic Notice */}
                  <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-sm">{explanationData.title}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#AF3F3A]/20 text-[#AF3F3A] border border-[#AF3F3A]/40 font-bold">
                        {explanationData.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{explanationData.plain_language_summary}</p>
                    {explanationData.epistemic_notice && (
                      <div className="text-[11px] text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-900/50">
                        <strong>Epistemic Notice: </strong>{explanationData.epistemic_notice}
                      </div>
                    )}
                  </div>

                  {/* Supporting vs Contradicting Source Records */}
                  <div className="space-y-2">
                    <h5 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                      Source Evidence Lineage ({explanationData.sources?.length || 0} Records)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {explanationData.sources?.map((s, idx) => (
                        <div key={idx} className="p-3 bg-slate-950/90 rounded border border-slate-800 space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="font-semibold text-slate-200">{s.artifact_filename}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {s.source_tier}
                            </span>
                          </div>
                          <div className="text-slate-400 truncate">
                            Artifact: <code className="text-indigo-400">{s.artifact_id}</code>
                          </div>
                          <div className="text-slate-400 truncate">
                            Locator: <span className="text-slate-300">{s.source_location}</span>
                          </div>
                          {s.raw_value !== undefined && (
                            <div>
                              <span className="text-slate-400">Raw Value: </span>
                              <code className="text-emerald-400 font-mono">{String(s.raw_value)}</code>
                            </div>
                          )}
                          {s.normalized_value !== undefined && (
                            <div>
                              <span className="text-slate-400">Normalized: </span>
                              <code className="text-cyan-400 font-mono">{String(s.normalized_value)}</code>
                            </div>
                          )}
                          {s.sha256 && (
                            <div className="font-mono text-[10px] text-slate-500 truncate">
                              SHA: {s.sha256}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Governing Rule */}
                  {explanationData.rule_metadata && (
                    <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300">
                          Governing Rule: {explanationData.rule_metadata.rule_display_name}
                        </span>
                        <code className="text-indigo-300 font-mono text-[10px]">
                          {explanationData.rule_metadata.rule_id} (v{explanationData.rule_metadata.rule_version})
                        </code>
                      </div>
                      <p className="text-slate-400">{explanationData.rule_metadata.rule_purpose}</p>
                      <div className="text-slate-400">
                        Condition: <code className="text-amber-300 font-mono text-[10px]">{explanationData.rule_metadata.firing_condition}</code>
                      </div>
                    </div>
                  )}

                  {/* Derivation Steps */}
                  {explanationData.derivation_chain && explanationData.derivation_chain.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                        Derivation Sequence
                      </h5>
                      <div className="space-y-1.5">
                        {explanationData.derivation_chain.map((step, idx) => (
                          <div key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-850 flex items-start gap-2.5 text-[11px]">
                            <span className="font-mono text-indigo-400 font-bold">{step.step_number}.</span>
                            <div className="flex-1">
                              <span className="font-semibold text-slate-300">{step.stage}: </span>
                              <span className="text-slate-400">{step.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statutory Review Status */}
                  {explanationData.review_audit && (
                    <div className="p-3 bg-indigo-950/20 border border-indigo-700/50 rounded space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-300">Examiner Review Determination</span>
                        <span className="font-mono font-bold text-emerald-400">{explanationData.review_audit.review_state}</span>
                      </div>
                      <div className="text-slate-300">
                        Examiner: {explanationData.review_audit.reviewed_by} • {explanationData.review_audit.reviewed_at_iso}
                      </div>
                      {explanationData.review_audit.review_notes && (
                        <div className="text-slate-400">Rationale: {explanationData.review_audit.review_notes}</div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-850 border-t border-slate-700 text-[11px] text-slate-400">
              <span>BSA § 63 & CrPC § 91 Cryptographic Evidentiary Chain</span>
              <button
                onClick={() => setExplainingId(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content list */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[600px]">
        {activeTab === "CONTRADICTIONS" ? (
          contradictions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No active contradictions detected in this analysis run.</div>
          ) : (
            contradictions.map((c) => (
              <div
                key={c.finding_id}
                className="p-4 rounded-lg border border-[#AF3F3A]/40 bg-[#AF3F3A]/5 hover:border-[#AF3F3A]/70 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#AF3F3A]">{c.finding_id}</span>
                    <h4 className="text-sm font-semibold text-slate-100">{c.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.review_state && (
                      <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {c.review_state}
                      </span>
                    )}
                    <EvidenceStatusBadge status="CONTRADICTION" />
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{c.why_it_matters}</p>

                {/* Values comparison box */}
                <div className="mt-3 p-3 rounded bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Discrepancy Matrix (Raw vs Normalized)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(c.original_values || {}).map(([src, val]) => (
                      <div key={src} className="p-2 rounded bg-slate-950/60 border border-slate-850">
                        <span className="text-slate-400 font-medium block truncate">{src}:</span>
                        <code className="text-emerald-400 font-mono text-xs mt-0.5 block">{String(val)}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span>Severity: <strong className="text-[#AF3F3A]">{c.severity}</strong></span>
                    <span>Rule: <code className="text-slate-200">{c.rule_firing_reason?.slice(0, 40)}...</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenExplanation(c.finding_id)}
                      className="px-2.5 py-1 text-xs bg-indigo-950 hover:bg-indigo-900 text-indigo-200 rounded border border-indigo-700 transition flex items-center gap-1.5"
                    >
                      <Search size={12} /> Explain & Trace
                    </button>
                    <button
                      onClick={() => handleOpenReview(c.finding_id, "finding")}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                    >
                      Examiner Review
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          gaps.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No evidence gaps identified in this case.</div>
          ) : (
            gaps.map((g) => (
              <div
                key={g.gap_id}
                className="p-4 rounded-lg border border-amber-800/40 bg-amber-950/10 hover:border-amber-700/60 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">{g.gap_id}</span>
                    <h4 className="text-sm font-semibold text-slate-100">{g.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.review_decision && (
                      <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {g.review_decision}
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                      {g.status}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{g.why_it_matters}</p>

                {g.suggested_remedy && (
                  <div className="mt-2.5 text-xs text-slate-400">
                    <strong className="text-slate-300">Remedy: </strong>{g.suggested_remedy}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Rule: <code className="text-slate-200">{g.exposed_by_rule_id}</code></span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenExplanation(g.gap_id)}
                      className="px-2.5 py-1 text-xs bg-indigo-950 hover:bg-indigo-900 text-indigo-200 rounded border border-indigo-700 transition flex items-center gap-1.5"
                    >
                      <Search size={12} /> Explain & Trace
                    </button>
                    <button
                      onClick={() => handleOpenReview(g.gap_id, "gap")}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                    >
                      Resolve Gap
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      <div className="p-3 bg-slate-900/40 border-t border-slate-800 text-[11px] text-slate-500">
        <strong>Forensic Principle:</strong> AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES. Contradictions must remain visible and explainable; software never silently resolves conflicting records.
      </div>
    </div>
  );
};

export default ContradictionPanel;
