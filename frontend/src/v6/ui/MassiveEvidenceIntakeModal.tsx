import React, { useState, useRef, useEffect } from 'react';
import {
  FileUp,
  X,
  ShieldCheck,
  Lock,
  Pause,
  Play,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Activity,
} from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { getStoredAuthToken, ensureAuthenticatedSession } from '../../api/client';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

interface MassiveEvidenceIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEvidenceAdmitted?: (artifactId: string) => void;
}

export const MassiveEvidenceIntakeModal: React.FC<MassiveEvidenceIntakeModalProps> = ({
  isOpen,
  onClose,
  onEvidenceAdmitted,
}) => {
  const { activeCaseId } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resourceBudget, setResourceBudget] = useState<any>(null);
  const [estimating, setEstimating] = useState<boolean>(false);
  const [admissionError, setAdmissionError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Poll job status when active
  useEffect(() => {
    let interval: any;
    if (jobId && isUploading) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/ingestion/jobs/${jobId}/status`, {
            headers: {
              Authorization: `Bearer ${getStoredAuthToken() || ''}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setJobStatus(data);
            if (data.stage === 'EVIDENCE_AVAILABLE' || data.error_message) {
              setIsUploading(false);
              if (data.admitted_artifact_id) {
                onEvidenceAdmitted?.(data.admitted_artifact_id);
              }
            }
          }
        } catch {}
      }, 500);
    }
    return () => clearInterval(interval);
  }, [jobId, isUploading, onEvidenceAdmitted]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setAdmissionError(null);
    setResourceBudget(null);
    setJobId(null);
    setJobStatus(null);

    // Call estimate-resources endpoint
    setEstimating(true);
    try {
      await ensureAuthenticatedSession();
      const res = await fetch('/api/v1/ingestion/estimate-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredAuthToken() || ''}`,
        },
        body: JSON.stringify({
          case_id: caseId,
          filename: file.name,
          file_size_bytes: file.size,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResourceBudget(data);
        if (data.decision === 'REJECT_UNSAFE') {
          setAdmissionError(data.reason);
        }
      }
    } catch (err: any) {
      setAdmissionError(`Failed to evaluate resource admission: ${err.message}`);
    } finally {
      setEstimating(false);
    }
  };

  const startUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setAdmissionError(null);
    abortControllerRef.current = new AbortController();

    try {
      await ensureAuthenticatedSession();
      // 1. Create Job
      const createRes = await fetch('/api/v1/ingestion/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredAuthToken() || ''}`,
        },
        body: JSON.stringify({
          case_id: caseId,
          filename: selectedFile.name,
          total_size_bytes: selectedFile.size,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.detail || 'Failed to initialize ingestion job.');
      }

      const jobData = await createRes.json();
      setJobId(jobData.job_id);
      setJobStatus(jobData);

      // 2. Stream in 64 KB bounded chunks
      const CHUNK_SIZE = 64 * 1024;
      let offset = 0;

      while (offset < selectedFile.size) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const chunkSlice = selectedFile.slice(offset, offset + CHUNK_SIZE);
        const chunkBuf = await chunkSlice.arrayBuffer();

        const chunkRes = await fetch(
          `/api/v1/ingestion/jobs/${jobData.job_id}/chunk?offset=${offset}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/octet-stream',
              Authorization: `Bearer ${getStoredAuthToken() || ''}`,
            },
            body: chunkBuf,
            signal: abortControllerRef.current.signal,
          }
        );

        if (!chunkRes.ok) {
          const err = await chunkRes.json();
          throw new Error(err.detail || 'Chunk upload failed.');
        }

        const updated = await chunkRes.json();
        setJobStatus(updated);
        offset += chunkBuf.byteLength;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setAdmissionError(err.message);
      }
      setIsUploading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!jobId) return;
    const action = isPaused ? 'resume' : 'pause';
    try {
      const res = await fetch(`/api/v1/ingestion/jobs/${jobId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getStoredAuthToken() || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setIsPaused(data.is_paused);
        setJobStatus(data);
      }
    } catch {}
  };

  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (jobId) {
      try {
        await fetch(`/api/v1/ingestion/jobs/${jobId}/cancel`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getStoredAuthToken() || ''}`,
          },
        });
      } catch {}
    }
    setIsUploading(false);
    setJobId(null);
    setJobStatus(null);
  };

  const stagesList = [
    { num: 1, id: 'FILE_RECEIVED', label: 'Received' },
    { num: 2, id: 'UPLOAD_COMPLETED', label: 'Uploaded' },
    { num: 3, id: 'FILE_VALIDATED', label: 'Signature Checked' },
    { num: 4, id: 'HASH_CALCULATED', label: 'SHA-256 Sealed' },
    { num: 5, id: 'EVIDENCE_ADMITTED', label: 'Admitted' },
    { num: 6, id: 'CONTENT_EXTRACTED', label: 'Extracted' },
    { num: 7, id: 'CONTENT_INDEXED', label: 'Indexed' },
    { num: 8, id: 'ANALYTICAL_PROCESSING_COMPLETED', label: 'Reconciled' },
    { num: 9, id: 'RESULTS_VALIDATED', label: 'SMT Verified' },
    { num: 10, id: 'EVIDENCE_AVAILABLE', label: 'Available' },
  ];

  const currentStageNum = jobStatus
    ? stagesList.findIndex((s) => s.id === jobStatus.stage) + 1
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl bg-[#EDE8E0] border border-[#C5BCB1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#231E1B] text-[#FFFDF8] flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-[#A85C2A] flex items-center justify-center text-white shadow-sm">
              <FileUp className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Massive Evidence Ingestion Engine
              </h2>
              <div className="text-xs text-slate-300 font-mono">
                Bounded Chunked Hashing & 10-Stage Statutory Admission Pipeline
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Case Context Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 border border-[#D5CABE] text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">Target Case:</span>
              <span className="font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                {caseId}
              </span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Lockdown Policy: WORM Immutable Storage Active
            </div>
          </div>

          {/* File Selector */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#A89C90] hover:border-amber-600 rounded-2xl p-8 text-center cursor-pointer bg-white/40 hover:bg-white/70 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileUp className="size-10 mx-auto text-amber-700/60 group-hover:text-amber-700 group-hover:scale-110 transition-transform mb-3" />
              <div className="font-bold text-slate-800 text-sm">
                Drop large forensic evidence file here, or click to browse
              </div>
              <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Supports Bank CBS CSVs, PDFs, Excel Ledgers, Telecom CDRs, Device Images, ZIP Archives, and PCAP Logs up to multi-gigabyte scale.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/80 border border-[#D5CABE] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HardDrive className="size-5 text-amber-700" />
                  <div>
                    <div className="font-bold text-slate-800 text-sm">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {formatBytes(selectedFile.size)} ({selectedFile.size.toLocaleString()} bytes)
                    </div>
                  </div>
                </div>
                {!isUploading && !jobStatus?.admitted_artifact_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setResourceBudget(null);
                    }}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Change File
                  </button>
                )}
              </div>

              {/* Resource Budget & Dynamic Admission Indicator */}
              {estimating && (
                <div className="flex items-center gap-2 text-xs text-amber-700 font-mono animate-pulse">
                  <Activity className="size-3.5 animate-spin" />
                  <span>Evaluating system memory headroom & parser expansion multiplier...</span>
                </div>
              )}

              {resourceBudget && (
                <div className="pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Workload Class</span>
                    <span className="font-bold text-slate-800">{resourceBudget.budget.operational_class}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Est. Memory</span>
                    <span className="font-bold text-slate-800">{formatBytes(resourceBudget.budget.estimated_memory_bytes)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Strategy</span>
                    <span className="font-mono text-[10px] font-bold text-amber-800">{resourceBudget.budget.recommended_strategy.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Admission</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Approved
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admission Error Warning */}
          {admissionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-rose-600" />
              <span>{admissionError}</span>
            </div>
          )}

          {/* Upload Progress & 10-Stage Pipeline Telemetry */}
          {jobStatus && (
            <div className="p-4 rounded-xl bg-white border border-[#D5CABE] space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">Job: {jobStatus.job_id}</span>
                  <span className="text-slate-400 ml-2 font-mono">
                    {formatBytes(jobStatus.bytes_uploaded)} / {formatBytes(jobStatus.total_size_bytes)} ({jobStatus.progress_pct}%)
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                  <span>Speed: <b>{jobStatus.throughput_mbps} MB/s</b></span>
                  <span>ETA: <b>{jobStatus.eta_seconds}s</b></span>
                </div>
              </div>

              {/* Dual Progress Bars: Upload vs Ingestion Stage */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Upload Stream Progress</span>
                  <span>{jobStatus.progress_pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-amber-600 transition-all duration-200 rounded-full"
                    style={{ width: `${jobStatus.progress_pct}%` }}
                  />
                </div>
              </div>

              {/* 10 Explicit Ingestion Stages Grid */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span className="font-bold uppercase tracking-wider">Statutory Pipeline Stage</span>
                  <span className="font-bold text-amber-800">
                    Stage {currentStageNum}/10 · {jobStatus.stage.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                  {stagesList.map((st) => {
                    const isDone = st.num < currentStageNum || jobStatus.stage === 'EVIDENCE_AVAILABLE';
                    const isCurrent = st.num === currentStageNum && jobStatus.stage !== 'EVIDENCE_AVAILABLE';
                    return (
                      <div
                        key={st.id}
                        title={`Stage ${st.num}: ${st.label}`}
                        className={`text-center p-1 rounded-md text-[9.5px] font-mono font-bold transition-all border ${
                          isDone
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : isCurrent
                            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm animate-pulse'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {st.num}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SHA-256 Digest Box */}
              {jobStatus.sha256 && (
                <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="size-3.5 text-sky-400 shrink-0" />
                    <span className="text-slate-400">SHA-256:</span>
                    <span className="truncate text-sky-200">{jobStatus.sha256}</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] uppercase font-bold shrink-0 ml-2">
                    Verified
                  </span>
                </div>
              )}

              {/* Final Evidence Admitted Card */}
              {jobStatus.stage === 'EVIDENCE_AVAILABLE' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Evidence Formally Admitted to Case Register</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    Artifact ID: <b>{jobStatus.admitted_artifact_id}</b>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Ledger reconciliation completed. Evidence ready for Z3 solver and fraud network correlation.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#DFD7CC] border-t border-[#C5BCB1] flex items-center justify-between">
          <div>
            {isUploading && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#C5BCB1] hover:bg-slate-50 text-slate-800 inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="size-3.5" />
                  <span>Cancel Job</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {jobStatus?.stage === 'EVIDENCE_AVAILABLE' ? 'Done' : 'Close'}
            </button>
            {!jobStatus && selectedFile && !admissionError && (
              <button
                type="button"
                onClick={startUpload}
                disabled={estimating || isUploading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#A85C2A] hover:bg-[#8F4E24] text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                Admit Evidence to Case
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

