import os

# 1. Update IntakeScreen.tsx
intake_content = open('src/pages/v5/IntakeScreen.tsx', encoding='utf-8').read()

# Replace imports
intake_old_import = '''import { IntakeKpiCard } from "../../components/tarka/intake/IntakeKpiCard";'''
intake_new_import = '''import { IntakeKpiCard } from "../../components/tarka/intake/IntakeKpiCard";
import { KpiTile, StoryBanner } from "../../components/tarka/kit";'''

if intake_old_import in intake_content and 'StoryBanner' not in intake_content:
    intake_content = intake_content.replace(intake_old_import, intake_new_import)

# Insert StoryBanner directly before the KPI section
if '<StoryBanner' not in intake_content:
    story_banner_code = '''      {/* STORY BANNER */}
      <StoryBanner
        screenId="intake"
        takeaway="CBS double-entry invariant falsifies purported ₹15,000 victim receipt, proving unbooked ₹2,00,000 deficit and Tier-1 HSM tamper."
        evidenceChips={[
          { tier: "T1", label: "SBI Finacle CBS", hash: "b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567" },
          { tier: "T1", label: "NPCI Switch STAN", hash: "9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd" },
          { tier: "T3", label: "Victim Screenshot", hash: "c89148bc92019482019a84719284102948192841029481928410294819284102" },
        ]}
      />

'''
    target_pos = intake_content.find('{/* =========================================================================\n          ROW 1: TOP 4 KPI CARDS')
    if target_pos != -1:
        intake_content = intake_content[:target_pos] + story_banner_code + intake_content[target_pos:]

# Replace the 4 KPI cards in IntakeScreen.tsx
old_kpi_section = intake_content[intake_content.find('<section\n        aria-label="Key Forensic Metrics"'):intake_content.find('</section>') + 10]

new_kpi_section = '''<section
        aria-label="Key Forensic Metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: isCompact ? "6px" : "10px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <KpiTile
          title="Ledger conservation"
          value={isRow14Tampered ? "Row #14 Fail" : "100% Valid"}
          icon={ShieldCheck}
          iconColor={isRow14Tampered ? "#E11D48" : "#059669"}
          iconBg={isRow14Tampered ? "#FFE4E6" : "#ECFDF5"}
          statusBadge={{
            text: isRow14Tampered ? "BREACH ✗" : "6/6 RECONCILED",
            variant: isRow14Tampered ? "rose" : "emerald",
          }}
          subtitle="Bal[k] = Bal[k-1] + Cr - Dr"
          microVisual="ring"
          progressPct={isRow14Tampered ? 83 : 100}
          provenanceTooltip="Double-entry conservation solver: 6 CBS rows reconciled in 0.4ms."
          onClick={() => toggleMutation("alterBankRow14")}
        />

        <KpiTile
          title="NPCI RRN clock sync"
          value={isForgedRrn ? "10:50:14 IST" : "10:00:14 IST"}
          icon={Clock}
          iconColor={isForgedRrn ? "#E11D48" : "#4F46E5"}
          iconBg={isForgedRrn ? "#FFE4E6" : "#EEF2FF"}
          statusBadge={{
            text: isForgedRrn ? "CLOCK SKEW" : "Δ +14s (IN SPEC)",
            variant: isForgedRrn ? "rose" : "indigo",
          }}
          subtitle="Julian Day 265 · STAN #149921"
          microVisual="ring"
          progressPct={isForgedRrn ? 20 : 100}
          provenanceTooltip="NPCI UPI Switch timestamp decoded directly from 12-digit RRN."
          onClick={() => {
            setActiveDockTab("rrn");
            toggleMutation("forgeRrnTimestamp");
          }}
        />

        <KpiTile
          title="Claim vs. booked"
          value="-₹2,00,000.00"
          icon={AlertTriangle}
          iconColor="#E11D48"
          iconBg="#FFE4E6"
          statusBadge={{ text: "14.3× SUPPRESSED", variant: "rose" }}
          subtitle="Claimed: ₹15K vs CBS: ₹2.15L"
          microVisual="ring"
          progressPct={7}
          provenanceTooltip="Canva receipt overwrote genuine ₹2,15,000 CBS debit with fraudulent ₹15,000 text."
          onClick={() => setActiveDockTab("pdf")}
        />

        <KpiTile
          title="Civilian PII blinded"
          value="9,996 / 10,000"
          icon={FileCheck}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "99.96% BLINDED", variant: "emerald" }}
          subtitle="Air-Gap Zero External Calls"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Deterministic SHA-256 HMAC pseudonymization blinds innocent telecom subscribers."
          onClick={() => setActiveDockTab("privacy")}
        />
      </section>'''

if old_kpi_section:
    intake_content = intake_content.replace(old_kpi_section, new_kpi_section)

open('src/pages/v5/IntakeScreen.tsx', 'w', encoding='utf-8').write(intake_content)
print('IntakeScreen.tsx updated with StoryBanner and KpiTile!')

# 2. Update LedgerCard.tsx (Waterfall & footer)
ledger_content = open('src/components/tarka/intake/LedgerCard.tsx', encoding='utf-8').read()

# Replace footer unsourced strings
ledger_content = ledger_content.replace(
    'Tier-1 HSM Conservation Verified · RBI Circular Compliant',
    'Tier-1 HSM Conservation Verified · Cryptographic Chain of Custody'
)
ledger_content = ledger_content.replace(
    'SBI-FINACLE-10.2-PROD',
    'FINACLE-10-AUDIT'
)

# Replace the static 4 boxes with the 4-Bar Accounting Waterfall
old_synthesis_box = ledger_content[ledger_content.find('{/* Ledger Conservation & Invariant Summary Box */}'):ledger_content.find('</div>\n      </div>\n\n      {/* =========================================================================\n          FOOTER (28PX)')]

new_waterfall_box = '''{/* Ledger Conservation & Invariant Summary Box - 4-Bar Accounting Waterfall */}
        <div
          style={{
            margin: "10px 10px 8px 10px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
              Double-Entry Conservation Accounting Waterfall
            </span>
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                padding: "1px 6px",
                borderRadius: "3px",
                background: isRow14Tampered ? "#FFF1F2" : "#ECFDF5",
                color: isRow14Tampered ? "#BE123C" : "#047857",
                border: `1px solid ${isRow14Tampered ? "#FECDD3" : "#A7F3D0"}`,
              }}
            >
              {isRow14Tampered ? "Residual: -₹2,00,000.00 ✗" : "Residual: ₹0.00 ✓"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
              <div style={{ color: "#64748B", fontSize: "8.5px" }}>Opening Balance</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "10.5px", color: "#0F172A", marginTop: "1px" }}>
                ₹6,15,890.00
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #BBF7D0", borderRadius: "4px", padding: "4px 6px" }}>
              <div style={{ color: "#166534", fontSize: "8.5px" }}>+ Total Credits (1)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "10.5px", color: "#15803D", marginTop: "1px" }}>
                +₹1,25,000.00
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #FECDD3", borderRadius: "4px", padding: "4px 6px" }}>
              <div style={{ color: "#991B1B", fontSize: "8.5px" }}>− Total Debits (5)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "10.5px", color: "#E11D48", marginTop: "1px" }}>
                −₹2,32,650.00
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: isRow14Tampered ? "1.5px solid #FECDD3" : "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
              <div style={{ color: "#64748B", fontSize: "8.5px" }}>Closing Balance</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "10.5px", color: isRow14Tampered ? "#BE123C" : "#0F172A", marginTop: "1px" }}>
                ₹{customRow14Balance ? (parseFloat(customRow14Balance) - 14200).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "5,08,240.00"}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "9px", color: "#475569", lineHeight: 1.3, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 6px" }}>
            <strong style={{ color: "#0F172A" }}>Mathematical Proof: </strong>
            Every transaction sequence <code style={{ fontFamily: "var(--font-mono)", background: "#F1F5F9", padding: "0 3px" }}>k ∈ [11..16]</code> satisfies <code style={{ fontFamily: "var(--font-mono)", background: "#F1F5F9", padding: "0 3px" }}>Bal[k] = Bal[k-1] + Cr[k] - Dr[k]</code>.
            {isRow14Tampered && " Discrepancy detected at Sequence #14 (Vikram Mule account debit)."}
          </div>
        </div>'''

if old_synthesis_box:
    ledger_content = ledger_content.replace(old_synthesis_box, new_waterfall_box)

open('src/components/tarka/intake/LedgerCard.tsx', 'w', encoding='utf-8').write(ledger_content)
print('LedgerCard.tsx updated with 4-Bar Waterfall and clean metadata!')

# 3. Update InspectorDock.tsx (RRN ScaleBar and chip text)
dock_content = open('src/components/tarka/intake/InspectorDock.tsx', encoding='utf-8').read()

# Add ScaleBar import if not present
if 'ScaleBar' not in dock_content:
    dock_content = dock_content.replace(
        'import { BentoKpiCard } from "../BentoPrimitives";',
        'import { BentoKpiCard } from "../BentoPrimitives";\nimport { ScaleBar } from "../kit/ScaleBar";'
    )

# Rename ADMISSIBLE to "Integrity checks pass"
dock_content = dock_content.replace(
    '{decodedRrn?.admissibilityVerdict === "ADMISSIBLE" ? "ADMISSIBLE" : "FLAGGED"}',
    '{decodedRrn?.admissibilityVerdict === "ADMISSIBLE" ? "Integrity checks pass" : "FLAGGED"}'
)

# Replace PrecisionVernierGauge with ScaleBar with labelAbove and valueBelow
old_gauge_call = '''          {/* Precision Vernier Clock-Drift Gauge */}
          <PrecisionVernierGauge
            min={-180}
            max={180}
            value={isForgedRrn ? 180 : driftSec}
            feasibleRange={[-180, 180]}
            unit="s"
            title="CBS Finacle ↔ NPCI Switch NTP Stratum-2 Sync"
            statusLabel={isWithinTolerance ? "IN SPEC (±180s) ✓" : "SKEW EXCEEDED ✗"}
            isSat={isWithinTolerance}
          />'''

new_scalebar_call = '''          {/* Non-Overlapping Precision Clock-Drift ScaleBar */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
            <ScaleBar
              labelAbove="CBS Finacle ↔ NPCI Switch NTP Stratum-2 Sync"
              min={-180}
              max={180}
              value={isForgedRrn ? 180 : driftSec}
              unit="s"
              toleranceBand={{
                from: -180,
                to: 180,
                label: "ADMISSIBLE BOUND (±180s)",
              }}
              valueBelow={`Δ = ${driftSec > 0 ? "+" : ""}${driftSec}.0s (Stratum-2 Sync)`}
            />
          </div>'''

if old_gauge_call in dock_content:
    dock_content = dock_content.replace(old_gauge_call, new_scalebar_call)

open('src/components/tarka/intake/InspectorDock.tsx', 'w', encoding='utf-8').write(dock_content)
print('InspectorDock.tsx updated with non-overlapping ScaleBar!')
