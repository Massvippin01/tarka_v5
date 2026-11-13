import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save } from "lucide-react";
import { toast } from "sonner";
import { TYPOLOGY_OPTIONS } from "../../../types/caseLifecycle";
import { useTarkaGlobal, type CaseWorkspace } from "../../../context/TarkaGlobalContext";
import { queryClient } from "../../../queryClient";

const editCaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  typology: z.string().min(1, "Typology is required"),
  priority: z.enum(["CRITICAL_GOLDEN_HOUR", "HIGH_SYNDICATE", "MEDIUM", "LOW"]),
  leadInvestigator: z.string().min(2, "Assigned IO is required"),
  policeStation: z.string().min(2, "Station is required"),
  bookedLossInr: z.number().min(100, "Loss amount must be at least ₹100"),
  description: z.string().optional(),
});

type EditCaseFormValues = z.infer<typeof editCaseSchema>;

interface EditCaseSheetProps {
  caseData: CaseWorkspace | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditCaseSheet: React.FC<EditCaseSheetProps> = ({ caseData, isOpen, onClose }) => {
  const { caseWorkspaces, setCaseWorkspaces } = useTarkaGlobal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditCaseFormValues>({
    resolver: zodResolver(editCaseSchema),
    defaultValues: {
      title: "",
      typology: "DIGITAL_ARREST",
      priority: "HIGH_SYNDICATE",
      leadInvestigator: "",
      policeStation: "Noida Cyber Crime PS, UP",
      bookedLossInr: 0,
      description: "",
    },
  });

  useEffect(() => {
    if (caseData) {
      reset({
        title: caseData.title || "",
        typology: caseData.typology || "DIGITAL_ARREST",
        priority: (caseData.priority as any) || "HIGH_SYNDICATE",
        leadInvestigator: caseData.leadInvestigator || "",
        policeStation: caseData.policeStation || "Noida Cyber Crime PS, UP",
        bookedLossInr: caseData.bookedLossInr || 0,
        description: "",
      });
    }
  }, [caseData, reset]);

  const handleSafeClose = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm("You have unsaved changes. Discard changes?");
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const onSubmit = async (data: EditCaseFormValues) => {
    if (!caseData) return;
    setIsSubmitting(true);

    const prevWorkspaces = [...caseWorkspaces];

    // Optimistic Update
    setCaseWorkspaces((prev: CaseWorkspace[]) =>
      prev.map((c: CaseWorkspace) =>
        c.caseId === caseData.caseId
          ? {
              ...c,
              title: data.title,
              typology: data.typology as any,
              priority: data.priority as any,
              leadInvestigator: data.leadInvestigator,
              policeStation: data.policeStation,
              bookedLossInr: data.bookedLossInr,
            }
          : c
      )
    );

    try {
      const resp = await fetch(`/api/v1/cases/${caseData.caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          typology: data.typology,
          priority: data.priority,
          assigned_io: data.leadInvestigator,
          police_station: data.policeStation,
          booked_loss_inr: data.bookedLossInr,
          description: data.description,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server returned status ${resp.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case", caseData.caseId] });

      toast.success(`Case ${caseData.caseId} updated successfully`);
      onClose();
    } catch (err: any) {
      // Rollback on error
      setCaseWorkspaces(prevWorkspaces);
      toast.error(`Update failed, rolling back: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !caseData) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(15, 23, 42, 0.50)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={handleSafeClose}
    >
      <div
        data-testid="edit-case-sheet"
        style={{
          width: "480px",
          maxWidth: "100vw",
          height: "100%",
          background: "#FFFFFF",
          boxShadow: "-10px 0 25px -5px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#F8FAFC",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#0284C7", fontFamily: "var(--font-mono)" }}>
              {caseData.caseId} • {caseData.firNumber}
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", margin: "2px 0 0 0" }}>
              Edit Case Parameters
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", flex: 1, overflowY: "auto" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Case Title *
              </label>
              <input
                {...register("title")}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: errors.title ? "1px solid #EF4444" : "1px solid #CBD5E1",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
              {errors.title && <span style={{ fontSize: "10px", color: "#EF4444" }}>{errors.title.message}</span>}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Typology Classification *
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Priority Level
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
                  <option value="CRITICAL_GOLDEN_HOUR">CRITICAL (Golden-Hour)</option>
                  <option value="HIGH_SYNDICATE">HIGH (Syndicate)</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Booked Loss (₹)
                </label>
                <Controller
                  name="bookedLossInr"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Lead Investigating Officer (IO) *
              </label>
              <input
                {...register("leadInvestigator")}
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
                Police Station / Jurisdiction
              </label>
              <input
                {...register("policeStation")}
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

          {/* Footer CTA */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid #E2E8F0",
              background: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={handleSafeClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "12px",
                color: "#64748B",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 700,
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#0284C7",
                color: "#FFFFFF",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)",
              }}
            >
              <Save size={14} />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
