import React, { useState } from "react";
import { Link2, X } from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal, type CaseWorkspace } from "../../../context/TarkaGlobalContext";
import { queryClient } from "../../../queryClient";

interface LinkCaseModalProps {
  sourceCase: CaseWorkspace | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LinkCaseModal: React.FC<LinkCaseModalProps> = ({ sourceCase, isOpen, onClose }) => {
  const { caseWorkspaces, setCaseWorkspaces } = useTarkaGlobal();
  const [targetCaseId, setTargetCaseId] = useState("");
  const [linkType, setLinkType] = useState("RELATED_FIR");
  const [notes, setNotes] = useState("Common Layer 2 mule account detected");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !sourceCase) return null;

  const eligibleTargets = caseWorkspaces.filter((c) => c.caseId !== sourceCase.caseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCaseId) {
      toast.error("Please select a target case to link");
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/cases/${sourceCase.caseId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_case_id: targetCaseId,
          link_type: linkType,
          notes: notes.trim(),
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server returned HTTP ${resp.status}`);
      }

      // Update local syndicate links
      setCaseWorkspaces((prev: CaseWorkspace[]) =>
        prev.map((c: CaseWorkspace) => {
          if (c.caseId === sourceCase.caseId) {
            const existing = c.syndicateLinks || [];
            return {
              ...c,
              syndicateLinks: [
                ...existing,
                {
                  linkedCaseId: targetCaseId,
                  sharedAnchorType: "MULE_ACCOUNT",
                  sharedAnchorValue: notes.slice(0, 30),
                },
              ],
            };
          }
          if (c.caseId === targetCaseId) {
            const existing = c.syndicateLinks || [];
            return {
              ...c,
              syndicateLinks: [
                ...existing,
                {
                  linkedCaseId: sourceCase.caseId,
                  sharedAnchorType: "MULE_ACCOUNT",
                  sharedAnchorValue: notes.slice(0, 30),
                },
              ],
            };
          }
          return c;
        })
      );

      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case", sourceCase.caseId] });
      queryClient.invalidateQueries({ queryKey: ["case", targetCaseId] });

      toast.success(`Case ${sourceCase.caseId} linked to ${targetCaseId}`);
      onClose();
    } catch (err: any) {
      toast.error(`Linking failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.60)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "460px",
          background: "#FFFFFF",
          borderRadius: "10px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link2 size={18} color="#4F46E5" />
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>
              Link Case: {sourceCase.caseId}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <X size={16} color="#64748B" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
          <div>
            <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              Target Case to Link *
            </label>
            <select
              value={targetCaseId}
              onChange={(e) => setTargetCaseId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "12px",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select target case...</option>
              {eligibleTargets.map((c) => (
                <option key={c.caseId} value={c.caseId}>
                  {c.caseId} • {c.firNumber} ({c.complainantName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              Link Association Type
            </label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "12px",
                boxSizing: "border-box",
              }}
            >
              <option value="RELATED_FIR">Related FIR / Parallel Investigation</option>
              <option value="SYNDICATE_OVERLAP">Syndicate Overlap (Shared Mule / IP / Infrastructure)</option>
              <option value="COMMON_SUSPECT">Common Suspect / Accused Identity</option>
              <option value="MERGED_COMPLAINT">Merged NCRP Complaints</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              Investigative Rationale & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Shared Layer 2 mule account SBI-9021884102"
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetCaseId}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: isSubmitting || !targetCaseId ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Linking..." : "Establish Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
