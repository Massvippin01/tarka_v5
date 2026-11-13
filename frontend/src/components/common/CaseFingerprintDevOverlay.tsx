import React, { useEffect, useState } from "react";
import { useCaseStore } from "../../store/useCaseStore";

export const CaseFingerprintDevOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const activeCaseId = useCaseStore((s) => s.activeCaseId);
  const [auditStats, setAuditStats] = useState<{ total: number; valid: number; mismatched: number; mismatches: string[] }>({
    total: 0,
    valid: 0,
    mismatched: 0,
    mismatches: [],
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Ctrl+Shift+D
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const runAudit = () => {
      const panels = Array.from(document.querySelectorAll("[data-case-id]"));
      const mismatches: string[] = [];
      let valid = 0;
      let mismatched = 0;

      panels.forEach((el) => {
        const renderedId = el.getAttribute("data-case-id");
        const htmlEl = el as HTMLElement;
        if (!renderedId || (activeCaseId && renderedId !== activeCaseId)) {
          mismatched++;
          mismatches.push(`${htmlEl.tagName.toLowerCase()}[data-case-id="${renderedId}"] ≠ "${activeCaseId}"`);
          htmlEl.style.outline = "3px dashed #EF4444";
          htmlEl.style.outlineOffset = "2px";
        } else {
          valid++;
          htmlEl.style.outline = "2px solid #10B981";
          htmlEl.style.outlineOffset = "1px";
        }
      });

      setAuditStats({
        total: panels.length,
        valid,
        mismatched,
        mismatches,
      });
    };

    runAudit();
    const interval = setInterval(runAudit, 1000);
    return () => {
      clearInterval(interval);
      document.querySelectorAll("[data-case-id]").forEach((el) => {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
      });
    };
  }, [isOpen, activeCaseId]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(148, 163, 184, 0.3)",
        borderRadius: "10px",
        padding: "12px 16px",
        color: "#F8FAFC",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        fontFamily: "monospace",
        fontSize: "12px",
        maxWidth: "380px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <strong style={{ color: "#38BDF8" }}>FINGERPRINT AUDIT (Ctrl+Shift+D)</strong>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "14px" }}
        >
          ×
        </button>
      </div>
      <div>Active Case: <span style={{ color: "#FCD34D", fontWeight: 700 }}>{activeCaseId || "(None / Workspace)"}</span></div>
      <div>Instrumented Panels: {auditStats.total}</div>
      <div>Valid Fingerprints: <span style={{ color: "#10B981" }}>{auditStats.valid}</span></div>
      <div>Mismatched Panels: <span style={{ color: auditStats.mismatched > 0 ? "#EF4444" : "#10B981", fontWeight: 700 }}>{auditStats.mismatched}</span></div>

      {auditStats.mismatches.length > 0 && (
        <div style={{ marginTop: "8px", maxHeight: "120px", overflowY: "auto", fontSize: "10px", color: "#FCA5A5" }}>
          {auditStats.mismatches.map((m, i) => (
            <div key={i}>{m}</div>
          ))}
        </div>
      )}
    </div>
  );
};

