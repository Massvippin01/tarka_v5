import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Shield,
  FileText,
  CreditCard,
  UserCheck,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  caseWizardSchema,
  type CaseWizardFormValues,
  TYPOLOGY_OPTIONS,
} from "../../../types/caseLifecycle";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";
import { queryClient } from "../../../queryClient";
import { formatInr } from "../../../utils/formatters";

interface CreateCaseWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const DRAFT_STORAGE_KEY = "tarka_create_case_wizard_draft_v1";

export const CreateCaseWizard: React.FC<CreateCaseWizardProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<Array<{ name: string; size: number }>>([]);

  const { createNewCaseWorkspace, selectCaseWorkspace } = useTarkaGlobal();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    trigger,
    formState: { errors },
    reset,
  } = useForm<CaseWizardFormValues>({
    resolver: zodResolver(caseWizardSchema),
    defaultValues: {
      firNumber: "",
      ncrpAckNo: "",
      complainantName: "",
      contactPhone: "",
      incidentDateTime: new Date().toISOString().slice(0, 16),
      title: "",
      typology: "DIGITAL_ARREST",
      description: "",
      victimBank: "State Bank of India",
      victimAccount: "",
      bookedLossInr: 250000,
      claimedLossInr: 250000,
      utrOrRrn: "",
      leadInvestigator: "Insp. R. K. Sharma (IO-409)",
      priority: "CRITICAL_GOLDEN_HOUR",
      policeStation: "Noida Cyber Crime PS, UP",
      tags: ["CYBER_FRAUD", "URGENT"],
    },
  });

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        reset(parsed);
      }
    } catch {
      // ignore
    }
  }, [reset]);

  // Draft autosave
  const formValues = watch();
  useEffect(() => {
    if (isOpen) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formValues));
      } catch {
        // ignore
      }
    }
  }, [formValues, isOpen]);

  // Auto-suggest typology based on description
  const descriptionValue = watch("description");
  useEffect(() => {
    if (!descriptionValue) return;
    const desc = descriptionValue.toLowerCase();
    if (desc.includes("cbi") || desc.includes("arrest") || desc.includes("trai") || desc.includes("customs") || desc.includes("narcotics")) {
      setValue("typology", "DIGITAL_ARREST");
    } else if (desc.includes("telegram") || desc.includes("crypto") || desc.includes("trading") || desc.includes("stock") || desc.includes("profit")) {
      setValue("typology", "TELEGRAM_INVESTMENT");
    } else if (desc.includes("apk") || desc.includes("sim swap") || desc.includes("otp") || desc.includes("malware")) {
      setValue("typology", "APK_SIM_SWAP");
    } else if (desc.includes("cfo") || desc.includes("vendor") || desc.includes("invoice") || desc.includes("rtgs divert")) {
      setValue("typology", "CORPORATE_BEC");
    } else if (desc.includes("task") || desc.includes("youtube like") || desc.includes("part-time job")) {
      setValue("typology", "TASK_FRAUD");
    }
  }, [descriptionValue, setValue]);

  const handleQuickEmergencyTemplate = () => {
    setValue("firNumber", "FIR #188/2026");
    setValue("ncrpAckNo", "1930-ACK-2611004921");
    setValue("complainantName", "Ananya Deshmukh");
    setValue("contactPhone", "9876543210");
    setValue("title", "High Value Crypto & Digital Arrest Extortion");
    setValue("typology", "DIGITAL_ARREST");
    setValue("description", "Complainant coerced into multi-layer transfers under TRAI disconnection and CBI arrest threats.");
    setValue("victimBank", "State Bank of India");
    setValue("victimAccount", "SBI-9840219910");
    setValue("bookedLossInr", 4250000);
    setValue("claimedLossInr", 4250000);
    setValue("utrOrRrn", "SBI-RTGS-990182410");
    setValue("priority", "CRITICAL_GOLDEN_HOUR");
    setValue("leadInvestigator", "Insp. R. K. Sharma (IO-409)");
    setValue("policeStation", "Noida Cyber Crime PS, UP");
    toast.info("Emergency Golden-Hour parameters auto-populated");
  };

  const handleNextStep = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger(["firNumber", "ncrpAckNo", "complainantName", "title", "typology"]);
    } else if (currentStep === 2) {
      isValid = await trigger(["victimBank", "victimAccount", "bookedLossInr"]);
    } else if (currentStep === 3) {
      isValid = await trigger(["leadInvestigator", "policeStation", "priority"]);
    } else {
      isValid = true;
    }

    if (isValid && currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).map((f) => ({ name: f.name, size: f.size }));
      setStagedFiles((prev) => [...prev, ...files]);
      toast.success(`${files.length} evidence file(s) staged for ingestion`);
    }
  };

  const onFinalSubmit = async (data: CaseWizardFormValues) => {
    // Guard against premature form submission when stepping through wizard
    if (currentStep < 4) return;
    setIsSubmitting(true);
    try {
      const newId = createNewCaseWorkspace({
        firNumber: data.firNumber.trim(),
        policeStation: data.policeStation.trim(),
        ncrpAckNo: data.ncrpAckNo.trim(),
        title: data.title.trim(),
        typology: data.typology as any,
        complainantName: data.complainantName.trim(),
        leadInvestigator: data.leadInvestigator.trim(),
        claimedLossInr: Number(data.claimedLossInr) || 0,
        bookedLossInr: Number(data.bookedLossInr) || 0,
        recoverableInr: Math.round((Number(data.bookedLossInr) || 0) * 0.75),
        commercialShieldedInr: Math.round((Number(data.bookedLossInr) || 0) * 0.35),
        goldenHourRemainingMins: 120,
        priority: data.priority as any,
        currentStage: "intake",
        syndicateLinks: [],
      });

      // Clear draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["cases"] });

      toast.success(`Case ${newId} initialized successfully!`, {
        description: `FIR: ${data.firNumber} | Loss: ${formatInr(data.bookedLossInr)}`,
      });

      // Transition seamlessly to newly initialized workspace on Evidence view
      selectCaseWorkspace(newId, "intake");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize case");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        data-testid="create-case-wizard-modal"
        className="w-full max-w-[720px] max-h-[min(88vh,680px)] my-auto flex flex-col overflow-hidden rounded-xl bg-white border border-[var(--line)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:px-5 sm:py-3.5 border-b border-[var(--line)] bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-[var(--accent)] flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[var(--fg-1)] m-0 leading-tight">
                Register New Cyber Fraud Case
              </h2>
              <p className="text-[12px] text-[var(--muted)] m-0 mt-0.5 leading-tight">
                NCRP 1930 & CCTNS Statutory Registration Protocol · BNSS 2023 / BSA Compliant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickEmergencyTemplate}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-600" />
              <span>Fill Demo Case</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--fg-1)] hover:bg-[#f4f4f5] transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Multi-Step Stepper Strip */}
        <div className="shrink-0 px-5 py-2.5 bg-[#fafafa] border-b border-[var(--line)] flex items-center gap-4 text-[12.5px] overflow-x-auto">
          {[
            { step: 1, label: "1. Complaint", icon: FileText },
            { step: 2, label: "2. Financials", icon: CreditCard },
            { step: 3, label: "3. Assignment", icon: UserCheck },
            { step: 4, label: "4. Evidence", icon: UploadCloud },
          ].map((item) => {
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                onClick={async () => {
                  if (item.step < currentStep) {
                    setCurrentStep(item.step as any);
                  } else if (item.step === currentStep + 1) {
                    handleNextStep();
                  }
                }}
                className={`flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                  isCurrent
                    ? "text-[var(--accent)] font-bold"
                    : isDone
                    ? "text-emerald-700 font-medium"
                    : "text-[var(--muted)] font-normal"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                ) : (
                  <Icon size={15} className={isCurrent ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                )}
                <span>{item.label}</span>
                {item.step < 4 && <span className="text-[var(--line-strong)] ml-2">›</span>}
              </div>
            );
          })}
        </div>

        {/* Wizard Step Body */}
        <form onSubmit={handleSubmit(onFinalSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">
            {/* STEP 1: COMPLAINT */}
            {currentStep === 1 && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      FIR Number *
                    </label>
                    <input
                      {...register("firNumber")}
                      placeholder="e.g. FIR #149/2026"
                      className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                        errors.firNumber ? "border-red-500" : "border-[var(--line)]"
                      }`}
                    />
                    {errors.firNumber && (
                      <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.firNumber.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      NCRP Acknowledgement No. *
                    </label>
                    <input
                      {...register("ncrpAckNo")}
                      placeholder="e.g. 1930-ACK-2311098412"
                      className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                        errors.ncrpAckNo ? "border-red-500" : "border-[var(--line)]"
                      }`}
                    />
                    {errors.ncrpAckNo && (
                      <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.ncrpAckNo.message}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Complainant Name *
                    </label>
                    <input
                      {...register("complainantName")}
                      placeholder="e.g. Sunil Kumar"
                      className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                        errors.complainantName ? "border-red-500" : "border-[var(--line)]"
                      }`}
                    />
                    {errors.complainantName && (
                      <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.complainantName.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Contact Mobile Number
                    </label>
                    <input
                      {...register("contactPhone")}
                      placeholder="e.g. 9811234567"
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Case Title *
                  </label>
                  <input
                    {...register("title")}
                    placeholder="e.g. Fake CBI Digital Arrest & Multi-Layer Money Laundering"
                    className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                      errors.title ? "border-red-500" : "border-[var(--line)]"
                    }`}
                  />
                  {errors.title && (
                    <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.title.message}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Typology / Crime Classification *
                    </label>
                    <select
                      {...register("typology")}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    >
                      {TYPOLOGY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Incident Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      {...register("incidentDateTime")}
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Complaint Narrative (Typology auto-suggests from keywords)
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Brief description of the extortion or scam narrative..."
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border resize-y"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: FINANCIALS */}
            {currentStep === 2 && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Victim Bank *
                    </label>
                    <input
                      {...register("victimBank")}
                      placeholder="e.g. State Bank of India"
                      className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                        errors.victimBank ? "border-red-500" : "border-[var(--line)]"
                      }`}
                    />
                    {errors.victimBank && (
                      <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.victimBank.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Victim Account No / UPI VPA *
                    </label>
                    <input
                      {...register("victimAccount")}
                      placeholder="e.g. 981100234190 or user@okhdfcbank"
                      className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                        errors.victimAccount ? "border-red-500" : "border-[var(--line)]"
                      }`}
                    />
                    {errors.victimAccount && (
                      <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.victimAccount.message}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Booked Loss Amount (₹ INR) *
                    </label>
                    <Controller
                      name="bookedLossInr"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="e.g. 500000"
                          className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                            errors.bookedLossInr ? "border-red-500" : "border-[var(--line)]"
                          }`}
                        />
                      )}
                    />
                    <span className="text-[12px] text-[var(--muted)] mt-1 block">
                      Formatted: {formatInr(watch("bookedLossInr") || 0)}
                    </span>
                    {errors.bookedLossInr && (
                      <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.bookedLossInr.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Claimed Loss in Complaint (₹ INR)
                    </label>
                    <Controller
                      name="claimedLossInr"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="e.g. 500000"
                          className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                        />
                      )}
                    />
                    <span className="text-[12px] text-[var(--muted)] mt-1 block">
                      Formatted: {formatInr(watch("claimedLossInr") || 0)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Initial Transfer UTR / RRN (Optional)
                  </label>
                  <input
                    {...register("utrOrRrn")}
                    placeholder="e.g. UTR-2026-SBI-0012938"
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  />
                  <span className="text-[12px] text-[var(--muted)] mt-1 block">
                    NPCI reference key used to anchor switch transaction timeline
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: ASSIGNMENT & PRIORITY */}
            {currentStep === 3 && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Assigned Investigating Officer (IO) *
                    </label>
                    <input
                      {...register("leadInvestigator")}
                      placeholder="e.g. Insp. R. K. Sharma (IO-409)"
                      className={`w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border ${
                        errors.leadInvestigator ? "border-red-500" : "border-[var(--line)]"
                      }`}
                    />
                    {errors.leadInvestigator && (
                      <span className="text-[12px] text-red-600 mt-1 block font-medium">{errors.leadInvestigator.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                      Jurisdiction / Police Station
                    </label>
                    <input
                      {...register("policeStation")}
                      placeholder="e.g. Noida Cyber Crime PS, UP"
                      className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider mb-1 block">
                    Investigation Priority & SLA Triage
                  </label>
                  <select
                    {...register("priority")}
                    className="w-full px-3 py-2 text-[13px] text-[var(--fg-1)] bg-white border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] box-border"
                  >
                    <option value="CRITICAL_GOLDEN_HOUR">CRITICAL (Golden-Hour Active - Immediate Freeze)</option>
                    <option value="HIGH_SYNDICATE">HIGH (Syndicate Overlap / Inter-State Network)</option>
                    <option value="MEDIUM">MEDIUM (Standard Financial Fraud)</option>
                    <option value="LOW">LOW (Low Amount / Routine Trace)</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 4: EVIDENCE ATTACHMENT */}
            {currentStep === 4 && (
              <div className="space-y-3.5">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-[var(--line-strong)] rounded-xl p-6 text-center bg-[#fafafa] hover:bg-blue-50/20 transition-colors cursor-pointer"
                >
                  <UploadCloud size={32} className="text-[var(--accent)] mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-[var(--fg-1)] m-0 mb-1">
                    Drag & Drop Evidence Artifacts (Bank Statement, Telco IPDR, WhatsApp Export)
                  </p>
                  <p className="text-[12px] text-[var(--muted)] m-0">
                    BSA §63(4) cryptographic hash seals and BIP-39 custodial stamps are applied automatically.
                  </p>
                </div>

                {stagedFiles.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider m-0 mb-1.5">
                      Staged Artifacts ({stagedFiles.length}):
                    </h4>
                    <div className="space-y-1">
                      {stagedFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2 bg-[#f4f4f5] rounded-lg text-[12.5px]"
                        >
                          <span className="font-semibold text-[var(--fg-1)]">{f.name}</span>
                          <span className="text-[var(--muted)] font-mono">{(f.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-[12px] text-emerald-800 font-medium leading-relaxed">
                    Case is ready to initialize. On submission, the pipeline will activate and redirect to the Evidence Workbench.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Footer Controls */}
          <div className="shrink-0 px-5 py-3 bg-[#fafafa] border-t border-[var(--line)] flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg border border-[var(--line)] bg-white hover:bg-[#f4f4f5] text-[var(--fg-1)] transition-colors cursor-pointer shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg border-none bg-transparent hover:bg-black/[0.03] text-[var(--muted)] hover:text-[var(--fg-1)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {currentStep < 4 ? (
                <button
                  key="btn-wizard-next"
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs border-none"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  key="btn-wizard-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs border-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSubmitting ? "Registering..." : "Launch Investigation"}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
};
