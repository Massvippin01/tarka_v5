import React, { useState } from "react";
import { ShieldCheck, FileCode, Users, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export interface IntegrityShieldCardProps {
  activeTab?: "pdf" | "cgnat";
  onTabChange?: (tab: "pdf" | "cgnat") => void;
}

export const IntegrityShieldCard: React.FC<IntegrityShieldCardProps> = ({
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<"pdf" | "cgnat">("pdf");
  const activeTab = controlledTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const [copiedRoot, setCopiedRoot] = useState(false);
  const [showMerklePath, setShowMerklePath] = useState(false);

  const fullMerkleRoot = "0xb189f3a9712a45d886910384cf22da810842e09153b6fa034e3209847492c810";

  const handleCopyRoot = () => {
    navigator.clipboard.writeText(fullMerkleRoot);
    setCopiedRoot(true);
    setTimeout(() => setCopiedRoot(false), 2000);
  };

  return (
    <div
      className="bento-card"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "14px",
        padding: "8px 12px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        boxSizing: "border-box",
      }}
    >
      {/* Header + Segmented Tab Switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <ShieldCheck size={13} color="#7C3AED" />
          <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#09090B", margin: 0, letterSpacing: "-0.01em" }}>
            Integrity & Privacy Shield
          </h3>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
            borderRadius: "5px",
            padding: "1px",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("pdf")}
            style={{
              border: "none",
              background: activeTab === "pdf" ? "#FFFFFF" : "transparent",
              color: activeTab === "pdf" ? "#09090B" : "#64748B",
              fontWeight: activeTab === "pdf" ? 700 : 500,
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              cursor: "pointer",
              boxShadow: activeTab === "pdf" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            PDF XRef (2 %%EOF)
          </button>
          <button
            type="button"
            onClick={() => setTab("cgnat")}
            style={{
              border: "none",
              background: activeTab === "cgnat" ? "#FFFFFF" : "transparent",
              color: activeTab === "cgnat" ? "#09090B" : "#64748B",
              fontWeight: activeTab === "cgnat" ? 700 : 500,
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              cursor: "pointer",
              boxShadow: activeTab === "cgnat" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            CGNAT Merkle (9,996)
          </button>
        </div>
      </div>

      {/* Tab 1: PDF XRef Offset Timeline */}
      {activeTab === "pdf" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10.5px" }}>
          {/* Offset 1 (Original) */}
          <div
            style={{
              padding: "5px 7px",
              borderRadius: "5px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "5px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  color: "#047857",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "1px 4px",
                  borderRadius: "3px",
                }}
              >
                0x00000000
              </span>
              <div>
                <div style={{ fontWeight: 600, color: "#1E293B", fontSize: "10.5px" }}>
                  Finacle Original Stream (%%EOF 1)
                </div>
                <div style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                  Helvetica / ArialMT · SHA-256 Verified
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 700,
                color: "#047857",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              VALID BASE
            </span>
          </div>

          {/* Offset 2 (Canva Append) */}
          <div
            style={{
              padding: "5px 7px",
              borderRadius: "5px",
              background: "#FFF1F2",
              border: "1px solid #FECDD3",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "5px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  color: "#BE123C",
                  background: "#FFE4E6",
                  border: "1px solid #FECDD3",
                  padding: "1px 4px",
                  borderRadius: "3px",
                }}
              >
                0x00014209
              </span>
              <div>
                <div style={{ fontWeight: 700, color: "#9F1239", fontSize: "10.5px" }}>
                  Canva Incremental Append (%%EOF 2)
                </div>
                <div style={{ fontSize: "9px", color: "#BE123C", fontFamily: "var(--font-mono)" }}>
                  Injected Object: /Font &lt;&lt;/F1 12 0 R&gt;&gt; (₹15,000 overwrite)
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 700,
                color: "#BE123C",
                background: "#FFE4E6",
                border: "1px solid #FECDD3",
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              FORGED APPEND
            </span>
          </div>

          {/* Hex Preview Strip */}
          <div
            style={{
              padding: "3px 7px",
              background: "#0F172A",
              color: "#CBD5E1",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              overflowX: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <FileCode size={10} color="#94A3B8" />
              <span style={{ color: "#34D399" }}>25 50 44 46</span>
              <span style={{ color: "#64748B" }}>…</span>
              <span style={{ color: "#FBBF24" }}>25 25 45 4F 46</span>
              <span style={{ color: "#64748B" }}>…</span>
              <span style={{ color: "#F87171" }}>25 25 45 4F 46 0A</span>
            </div>
            <span style={{ fontSize: "8px", color: "#94A3B8", fontFamily: "var(--font-sans)" }}>
              2 Trailers Found
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: CGNAT Merkle Privacy Proof */}
      {activeTab === "cgnat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10.5px" }}>
          {/* Merkle Root Box */}
          <div
            style={{
              padding: "5px 7px",
              borderRadius: "5px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "3px" }}>
                <Users size={11} color="#7C3AED" />
                <span>CGNAT Merkle Root (DoT Cl. 39.20)</span>
              </span>
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  color: "#047857",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "1px 4px",
                  borderRadius: "3px",
                }}
              >
                9,996 Blinded
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "3px",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                padding: "2px 5px",
                borderRadius: "3px",
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                color: "#09090B",
              }}
            >
              <span>0xb189…7492c810</span>
              <button
                type="button"
                onClick={handleCopyRoot}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  fontSize: "9px",
                  fontFamily: "var(--font-sans)",
                }}
                title="Copy full Merkle Root hash"
              >
                {copiedRoot ? (
                  <>
                    <Check size={9} color="#059669" />
                    <span style={{ color: "#059669", fontWeight: 600 }}>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={9} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Statutory Note */}
          <div
            style={{
              padding: "5px 7px",
              borderRadius: "5px",
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontSize: "9.5px",
              lineHeight: 1.3,
            }}
          >
            <strong style={{ color: "#047857" }}>Statutory Privacy: </strong>
            <span>
              Membership proof confirms suspect port without disclosing remaining 9,996 civilian CDRs to court.
            </span>
          </div>

          {/* Collapsible Inclusion Tree */}
          <div>
            <button
              type="button"
              onClick={() => setShowMerklePath((prev) => !prev)}
              style={{
                border: "none",
                background: "transparent",
                color: "#6D28D9",
                cursor: "pointer",
                padding: 0,
                fontSize: "9.5px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>{showMerklePath ? "Hide Inclusion Proof Tree" : "Inspect Inclusion Proof Tree (Depth 14)"}</span>
              {showMerklePath ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            {showMerklePath && (
              <div
                style={{
                  marginTop: "3px",
                  padding: "5px 7px",
                  background: "#0F172A",
                  color: "#CBD5E1",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "8.5px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div style={{ color: "#94A3B8" }}>Root: 0xb189f3a9…c810</div>
                <div style={{ paddingLeft: "6px", borderLeft: "1px solid #334155", color: "#C084FC" }}>
                  ├─ Node_L1: 0x4f12…88a1 (Left Subtree: 4,998 blinded)
                </div>
                <div style={{ paddingLeft: "12px", borderLeft: "1px solid #334155", color: "#34D399" }}>
                  └─ Leaf #4999 (Suspect Port 41288) ✓ Verified
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
