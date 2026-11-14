import React, { useState } from "react";
import { X, Copy, Check, Printer, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import type { CaseActionRecord } from "../../../types/actions";
import { formatInr } from "../../../utils/formatters";

interface GenerateFreezeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  firNumber: string;
  policeStation: string;
  complainantName: string;
  selectedActions: CaseActionRecord[];
  onDispatched: () => void;
}

export const GenerateFreezeOrderModal: React.FC<GenerateFreezeOrderModalProps> = ({
  isOpen,
  onClose,
  caseId,
  firNumber,
  policeStation,
  complainantName,
  selectedActions,
  onDispatched,
}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || selectedActions.length === 0) return null;

  const totalMandated = selectedActions.reduce((sum, a) => sum + a.targetAmount, 0);

  const noticeText = `OFFICE OF THE ASSISTANT COMMISSIONER OF POLICE
${policeStation.toUpperCase()}
Ref: POLICE/CYBER/BNSS106/${caseId}/${new Date().getFullYear()}
Dated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}

To:
${Array.from(new Set(selectedActions.map((a) => a.bank)))
  .map((b, i) => `${i + 1}. The Nodal Officer / Law Enforcement Liaison Cell, ${b} Ltd.`)
  .join("\n")}

SUBJECT: STATUTORY PROVISIONAL ORDER FOR FREEZING OF BANK ACCOUNTS & LIEN CREATION UNDER SECTIONS 106 & 107 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 (BNSS) READ WITH SECTION 66D INFORMATION TECHNOLOGY ACT.

WHEREAS, an investigation has been registered under FIR No. ${firNumber} upon the formal complaint of ${complainantName}.

AND WHEREAS, credible digital forensics and transactional audit logs confirm that an aggregate sum of ${formatInr(
    totalMandated
  )} has been fraudulently layered into the following suspect beneficiary accounts maintained at your respective branches:

${selectedActions
  .map(
    (a, idx) =>
      `[${idx + 1}] SUSPECT ACCOUNT (${a.layer}):
   - Account Holder: ${a.accountHolder}
   - Bank: ${a.bank} | IFSC: ${a.ifsc}
   - Account Identifier: ${a.accountMasked}
   - Mandated Statutory Lien: ${formatInr(a.targetAmount)}
   - Statutory Ground: ${a.notes || "Clayton's Case / LIBR doctrine illicit layering"}`
  )
  .join("\n\n")}

YOU ARE HEREBY DIRECTED TO:
1. Immediately effect a debit freeze / debit lien on the above accounts within 2 (two) hours of receipt of this notice under Section 106/107 BNSS 2023.
2. Furnish complete KYC dossier (Account Opening Form, Aadhar/PAN, registered phone & email).
3. Provide internet banking IP audit logs, session identifiers, and MAC address logs.
4. Report compliance by return email to ${policeStation.toLowerCase().replace(/[^a-z0-9]/g, "")}@police.gov.in quoting Reference No. ${selectedActions[0]?.referenceNo}.

Take notice that failure to comply with this statutory order attracts penal consequences under Section 223 of the Bharatiya Nyaya Sanhita, 2023.

Given under my hand and seal of the Police Station,

(Insp. R. K. Sharma)
Investigating Officer, Cyber Crime PS
Badge: IO-409`;

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setIsCopied(true);
    toast.success("Statutory freeze notice copied to clipboard.");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleIssueOrders = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/actions/freeze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          account_ids: selectedActions.map((a) => a.accountId),
          document_type: "BNSS_106_FREEZE",
          officer_badge: "IO-409",
          notes: "Statutory debit freeze mandated under Section 106 BNSS",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to issue freeze orders");
      }

      toast.success(`Freeze orders successfully issued for ${selectedActions.length} accounts!`);
      onDispatched();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to issue freeze orders");
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
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#E0F2FE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0369A1",
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                Generate Statutory Freeze Directives (§106/§107 BNSS)
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748B" }}>
                {selectedActions.length} Accounts Selected · Mandated Lien: {formatInr(totalMandated)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#64748B",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Notice Preview */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          <pre
            style={{
              margin: 0,
              padding: "16px",
              background: "#F8FAFC",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#1E293B",
            }}
          >
            {noticeText}
          </pre>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              {isCopied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{isCopied ? "Copied" : "Copy Directive"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              <Printer size={14} />
              <span>Print Order</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleIssueOrders}
              disabled={isSubmitting}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                border: "none",
                background: "#0284C7",
                fontSize: "12px",
                fontWeight: 700,
                color: "#FFFFFF",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 1px 3px rgba(2, 132, 199, 0.3)",
              }}
            >
              <Send size={14} />
              <span>{isSubmitting ? "Issuing Orders..." : "Dispatch Statutory Orders"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
