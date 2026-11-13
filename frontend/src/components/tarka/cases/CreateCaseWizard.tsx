import React, { useState, useEffect } from "react";
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
import { useCaseStore } from "../../../store/useCaseStore";
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

  const { createNewCaseWorkspace } = useTarkaGlobal();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
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
    toast.info("Emergency Golden-Hour parameters auto-populated");
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
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

      // Switch to new case on Intake view
      useCaseStore.getState().setActiveCaseId(newId);
      useCaseStore.getState().setActiveView("intake");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize case");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.70)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        data-testid="create-case-wizard-modal"
        style={{
          width: "740px",
          maxWidth: "96vw",
          maxHeight: "92vh",
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(34, 211, 238, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(34, 211, 238, 0.3)",
              }}
            >
              <Shield size={18} color="#22D3EE" />
            </div>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Register New Cyber Fraud Case</h2>
              <p style={{ fontSize: "11px", color: "#94A3B8", margin: "2px 0 0 0" }}>
                NCRP 1930 & CCTNS Statutory Registration Protocol (BNS / BSA Compliant)
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleQuickEmergencyTemplate}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                color: "#FCD34D",
                cursor: "pointer",
              }}
            >
              <Sparkles size={12} />
              <span>Fill Demo Case</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Multi-Step Stepper Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            padding: "10px 20px",
            gap: "12px",
            fontSize: "12px",
          }}
        >
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
                onClick={() => setCurrentStep(item.step as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  color: isCurrent ? "#0284C7" : isDone ? "#059669" : "#64748B",
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {isDone ? (
                  <CheckCircle2 size={14} color="#059669" />
                ) : (
                  <Icon size={14} color={isCurrent ? "#0284C7" : "#94A3B8"} />
                )}
                <span>{item.label}</span>
                {item.step < 4 && <span style={{ color: "#CBD5E1", marginLeft: "8px" }}>›</span>}
              </div>
            );
          })}
        </div>

        {/* Wizard Step Body */}
        <form onSubmit={handleSubmit(onFinalSubmit)} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
            {/* STEP 1: COMPLAINT */}
            {currentStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      FIR Number *
                    </label>
                    <input
                      {...register("firNumber")}
                      placeholder="e.g. FIR #149/2026"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: errors.firNumber ? "1px solid #EF4444" : "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors.firNumber && (
                      <span style={{ fontSize: "10px", color: "#EF4444" }}>{errors.firNumber.message}</span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      NCRP Acknowledgement No. *
                    </label>
                    <input
                      {...register("ncrpAckNo")}
                      placeholder="e.g. 1930-ACK-2311098412"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: errors.ncrpAckNo ? "1px solid #EF4444" : "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors.ncrpAckNo && (
                      <span style={{ fontSize: "10px", color: "#EF4444" }}>{errors.ncrpAckNo.message}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Complainant Name *
                    </label>
                    <input
                      {...register("complainantName")}
                      placeholder="e.g. Sunil Kumar"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: errors.complainantName ? "1px solid #EF4444" : "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors.complainantName && (
                      <span style={{ fontSize: "10px", color: "#EF4444" }}>{errors.complainantName.message}</span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Contact Mobile Number
                    </label>
                    <input
                      {...register("contactPhone")}
                      placeholder="e.g. 9811234567"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: errors.contactPhone ? "1px solid #EF4444" : "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors.contactPhone && (
                      <span style={{ fontSize: "10px", color: "#EF4444" }}>{errors.contactPhone.message}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Case Title *
                  </label>
                  <input
                    {...register("title")}
                    placeholder="e.g. Fake CBI Digital Arrest & Multi-Layer Money Laundering"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: errors.title ? "1px solid #EF4444" : "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                  {errors.title && (
                    <span style={{ fontSize: "10px", color: "#EF4444" }}>{errors.title.message}</span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Typology / Crime Classification *
                    </label>
                    <select
                      {...register("typology")}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    >
                      {TYPOLOGY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Incident Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      {...register("incidentDateTime")}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Complaint Narrative (Typology auto-suggests from keywords)
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Brief description of the extortion or scam narrative..."
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: FINANCIALS */}
            {currentStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Victim Bank *
                    </label>
                    <input
                      {...register("victimBank")}
                      placeholder="e.g. State Bank of India"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: errors.victimBank ? "1px solid #EF4444" : "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Victim Account No / UPI VPA *
                    </label>
                    <input
                      {...register("victimAccount")}
                      placeholder="e.g. 981100234190 or user@okhdfcbank"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: errors.victimAccount ? "1px solid #EF4444" : "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
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
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: errors.bookedLossInr ? "1px solid #EF4444" : "1px solid #CBD5E1",
                            fontSize: "12px",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    />
                    <span style={{ fontSize: "11px", color: "#64748B", marginTop: "2px", display: "block" }}>
                      Formatted: {formatInr(watch("bookedLossInr") || 0)}
                    </span>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
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
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid #CBD5E1",
                            fontSize: "12px",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Initial Transfer UTR / RRN (Optional)
                  </label>
                  <input
                    {...register("utrOrRrn")}
                    placeholder="e.g. UTR-2026-SBI-0012938"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: ASSIGNMENT & PRIORITY */}
            {currentStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Assigned Investigating Officer (IO) *
                    </label>
                    <input
                      {...register("leadInvestigator")}
                      placeholder="e.g. Insp. R. K. Sharma (IO-409)"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: errors.leadInvestigator ? "1px solid #EF4444" : "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Jurisdiction / Police Station
                    </label>
                    <input
                      {...register("policeStation")}
                      placeholder="e.g. Noida Cyber Crime PS, UP"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "12px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Investigation Priority
                  </label>
                  <select
                    {...register("priority")}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  style={{
                    border: "2px dashed #94A3B8",
                    borderRadius: "10px",
                    padding: "24px",
                    textAlign: "center",
                    background: "#F8FAFC",
                    cursor: "pointer",
                  }}
                >
                  <UploadCloud size={32} color="#0284C7" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", margin: "0 0 4px 0" }}>
                    Drag & Drop Evidence Artifacts (Bank Statement, Telco IPDR, WhatsApp Export)
                  </p>
                  <p style={{ fontSize: "11px", color: "#64748B", margin: 0 }}>
                    BSA §63(4) cryptographic hash seals and BIP-39 custodial stamps are applied automatically.
                  </p>
                </div>

                {stagedFiles.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#334155", margin: "0 0 6px 0" }}>
                      Staged Artifacts ({stagedFiles.length}):
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {stagedFiles.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            background: "#F1F5F9",
                            borderRadius: "6px",
                            fontSize: "11px",
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#0F172A" }}>{f.name}</span>
                          <span style={{ color: "#64748B" }}>{(f.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} color="#059669" />
                  <span style={{ fontSize: "11px", color: "#065F46" }}>
                    Case is ready to initialize. On submission, the pipeline will activate and redirect to the Evidence Workbench.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Footer Controls */}
          <div
            style={{
              padding: "14px 20px",
              background: "#F8FAFC",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "7px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#0284C7",
                    color: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "7px 18px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#059669",
                    color: "#FFFFFF",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)",
                  }}
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
};
