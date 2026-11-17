import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  X,
  Copy,
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { humanizeAuditEvent, type AuditEventDto } from "../../../utils/auditHumanizer";

interface CaseAuditTrailDrawerProps {
  caseId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CaseAuditTrailDrawer: React.FC<CaseAuditTrailDrawerProps> = ({
  caseId,
  isOpen,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});

  const isGlobal = !caseId || caseId === "ALL";

  // Query events from API
  const { data: rawEvents = [], isLoading } = useQuery<AuditEventDto[]>({
    queryKey: isGlobal ? ["system", "audit", "feed"] : ["case", caseId, "audit"],
    queryFn: async () => {
      const url = isGlobal
        ? "/api/v1/system/audit/feed"
        : `/api/v1/cases/${caseId}/audit`;
      const res = await fetch(url, {
        headers: { Authorization: "Bearer test-token" },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
    staleTime: 5000,
  });

  const { data: chainVerification } = useQuery({
    queryKey: ["system", "audit", "verify-chain"],
    queryFn: async () => {
      const res = await fetch("/api/v1/system/audit/verify-chain", {
        headers: { Authorization: "Bearer test-token" },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen,
    staleTime: 10000,
  });

  const humanizedEvents = rawEvents.map(humanizeAuditEvent);

  const filteredEvents = humanizedEvents.filter((e) => {
    if (selectedCategory === "ALL") return true;
    return e.category === selectedCategory;
  });

  const handleCopyHash = (hashVal: string) => {
    navigator.clipboard.writeText(hashVal);
    setCopiedHash(hashVal);
    toast.success("SHA-256 payload hash copied to clipboard");
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const toggleDiff = (eventId: string) => {
    setExpandedDiffs((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="audit-trail-drawer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          width: "560px",
          maxWidth: "100%",
          height: "100%",
          background: "#FFFFFF",
          boxShadow: "-8px 0 25px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F8FAFC",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={14} color="#059669" />
              </div>
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
                {isGlobal ? "Station-Wide Forensic Audit Ledger" : `Immutable Audit Trail · ${caseId}`}
              </h2>
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
              Append-only SHA-256 chained transaction records pursuant to BSA §63
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              borderRadius: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cryptographic Chain Integrity Indicator Banner */}
        <div
          style={{
            padding: "10px 20px",
            background: chainVerification?.chain_valid ? "#F0FDF4" : "#FFFBEB",
            borderBottom: `1px solid ${chainVerification?.chain_valid ? "#BBF7D0" : "#FDE68A"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: chainVerification?.chain_valid ? "#16A34A" : "#D97706",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: chainVerification?.chain_valid ? "#166534" : "#92400E",
              }}
            >
              {chainVerification?.chain_valid
                ? `Cryptographic Hash-Chain Intact (${chainVerification.total_records} Records Verified)`
                : "Verifying Merkle & Hash-Chain Integrity..."}
            </span>
          </div>
          {chainVerification?.head_hash && (
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "#475569",
                background: "#FFFFFF",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #E2E8F0",
              }}
              title={chainVerification.head_hash}
            >
              Head: {chainVerification.head_hash.slice(0, 10)}...
            </span>
          )}
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            padding: "8px 20px",
            background: "#FFFFFF",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            gap: "5px",
            overflowX: "auto",
          }}
        >
          {["ALL", "ENFORCEMENT", "INTAKE", "LIFECYCLE", "GOVERNANCE", "SYSTEM"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                fontSize: "10.5px",
                fontWeight: selectedCategory === cat ? 800 : 600,
                background: selectedCategory === cat ? "#0F172A" : "#F1F5F9",
                color: selectedCategory === cat ? "#FFFFFF" : "#64748B",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {cat === "ALL" ? `All (${humanizedEvents.length})` : cat}
            </button>
          ))}
        </div>

        {/* Audit Events Feed */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: "#F8FAFC",
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748B", fontSize: "12px" }}>
              Loading cryptographic audit ledger...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748B", fontSize: "12px" }}>
              No audit events found for selected category.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isDiffExpanded = Boolean(expandedDiffs[evt.id]);

              return (
                <div
                  key={evt.id}
                  data-testid={`audit-card-${evt.id}`}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  {/* Top Bar: Category Pill, Case ID, Timestamp */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: "3px",
                          background: `${evt.categoryColor}15`,
                          color: evt.categoryColor,
                          border: `1px solid ${evt.categoryColor}30`,
                        }}
                      >
                        {evt.category}
                      </span>
                      {isGlobal && evt.caseId && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            color: "#0284C7",
                          }}
                        >
                          {evt.caseId}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#94A3B8" }}>
                      <Clock size={10} />
                      <span>{evt.timestampFormatted} ({evt.timeAgo})</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
                    {evt.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.4" }}>
                    {evt.description}
                  </div>

                  {/* Actor & SHA-256 Hash Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "4px",
                      paddingTop: "6px",
                      borderTop: "1px solid #F1F5F9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", color: "#64748B" }}>
                      <User size={11} color="#94A3B8" />
                      <span>{evt.actorName}</span>
                    </div>

                    {/* SHA-256 Copyable Chip */}
                    {evt.payloadHash && (
                      <button
                        type="button"
                        onClick={() => handleCopyHash(evt.payloadHash)}
                        title={`Click to copy SHA-256 payload hash: ${evt.payloadHash}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "9.5px",
                          fontFamily: "var(--font-mono)",
                          background: "#F8FAFC",
                          border: "1px solid #CBD5E1",
                          borderRadius: "4px",
                          padding: "1px 5px",
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <Hash size={9} color="#64748B" />
                        <span>{evt.payloadHash.slice(0, 10)}...</span>
                        {copiedHash === evt.payloadHash ? <Check size={9} color="#10B981" /> : <Copy size={9} color="#94A3B8" />}
                      </button>
                    )}
                  </div>

                  {/* Before / After Diff Inspector (For State Transitions) */}
                  {evt.diff && (
                    <div style={{ marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => toggleDiff(evt.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "transparent",
                          border: "none",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#4F46E5",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {isDiffExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        <span>{isDiffExpanded ? "Hide Mutation Diff" : "Inspect Mutation Diff"}</span>
                      </button>

                      {isDiffExpanded && (
                        <div
                          style={{
                            marginTop: "6px",
                            padding: "8px",
                            background: "#0F172A",
                            borderRadius: "6px",
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: "#E2E8F0",
                            overflowX: "auto",
                          }}
                        >
                          <pre style={{ margin: 0 }}>
                            {JSON.stringify(evt.diff, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
