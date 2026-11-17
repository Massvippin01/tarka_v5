import React from "react";
import { FileText, X, ChevronRight } from "lucide-react";
import { ScaleBar } from "../kit/ScaleBar";
import { recoveryModel } from "../../../utils/recoveryModel";
import {
  resolveCase,
  selectAccountFlows,
  selectDoctrineComparison,
  selectFinancialSummary,
} from "../../../selectors/caseSelectors";
import { formatInr, formatInrCompact, formatDuration } from "../../../lib/formatInr";

interface RecoveryModelPanelProps {
  isInjectClean: boolean;
  freezeBudgetK: number;
  selectedNodeId: string | null;
  onCloseNodeDrawer: () => void;
  onOpenOrders: () => void;
  caseId?: string;
  victimName?: string;
}

const box: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px" };

export const RecoveryModelPanel: React.FC<RecoveryModelPanelProps> = ({
  isInjectClean,
  freezeBudgetK,
  selectedNodeId,
  onCloseNodeDrawer,
  onOpenOrders,
  caseId,
}) => {
  const fixture = resolveCase(caseId);
  if (!fixture) {
    return <div style={{ padding: 12, fontSize: 12, color: "#64748B" }}>No money-trail data for this case yet.</div>;
  }
  const model = recoveryModel(isInjectClean, freezeBudgetK, caseId);
  const fin = selectFinancialSummary(fixture);
  const doctrine = selectDoctrineComparison(fixture, isInjectClean);
  const flows = selectAccountFlows(fixture);
  const merchants = flows.filter((a) => a.role === "MERCHANT");

  // Node drawer
  if (selectedNodeId) {
    const acctId = selectedNodeId.replace("::held", "");
    const acct = flows.find((a) => a.nodeId === acctId);
    const isHeld = selectedNodeId.endsWith("::held");
    const dossier = acct
      ? {
          title: isHeld ? `${acct.holderName} (balance held)` : acct.holderName,
          role: acct.roleLabel,
          account: `${acct.bank} ${acct.accountMasked}`,
          amount:
            acct.role === "VICTIM"
              ? `-${formatInr(acct.outflowInr)}`
              : isHeld
                ? `${formatInr(acct.heldInr)} held`
                : acct.role === "MERCHANT"
                  ? `${formatInr(acct.frozenInr)} specific lien`
                  : acct.role === "SINK"
                    ? `${formatInr(acct.inflowInr)} cash withdrawn`
                    : `${formatInr(acct.inflowInr)} received`,
          statute:
            acct.role === "VICTIM"
              ? "Complainant account"
              : acct.role === "MERCHANT"
                ? "BNSS §106 specific debit lien"
                : acct.role === "SINK"
                  ? "Physical cash leakage"
                  : "BNSS §107 provisional seizure",
          dwell: acct.dwellSeconds !== null ? formatDuration(acct.dwellSeconds) : "—",
          description:
            acct.role === "VICTIM"
              ? `Debited ${formatInr(acct.outflowInr)} in ${acct.txOut} transfer${acct.txOut === 1 ? "" : "s"}.`
              : acct.role === "SINK"
                ? "Cash is irrecoverable from banking rails; request CCTV and the terminal journal."
                : acct.role === "MERCHANT"
                  ? "Commercial account. A specific lien attaches only to the traced receipt, shielding lawful turnover."
                  : `Received ${formatInr(acct.inflowInr)}, forwarded ${formatInr(acct.outflowInr)}, ${formatInr(acct.heldInr)} still in the account${acct.frozenInr > 0 ? ` (${formatInr(acct.frozenInr)} frozen)` : ""}.`,
        }
      : { title: "Account", role: "Entity", account: selectedNodeId, amount: "—", statute: "BNSS statutory order", dwell: "—", description: "No further detail in this case." };

    const row = (label: string, value: string, color = "#0F172A", mono = true) => (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 6px", background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "4px" }}>
        <span style={{ color: "#64748B", fontWeight: 600, flexShrink: 0 }}>{label}</span>
        <span title={value} style={{ fontWeight: 700, color, fontFamily: mono ? "var(--font-mono)" : undefined, textAlign: "right", overflowWrap: "anywhere" }}>
          {value}
        </span>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "9px", fontWeight: 800, color: "#4F46E5", textTransform: "uppercase" }}>{dossier.role}</span>
            <div title={dossier.title} style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A", marginTop: "1px", overflowWrap: "anywhere" }}>
              {dossier.title}
            </div>
          </div>
          <button type="button" onClick={onCloseNodeDrawer} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", color: "#64748B" }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "10.5px" }}>
          {row("Bank and account", dossier.account)}
          {row("Amount", dossier.amount)}
          {row("Legal basis", dossier.statute, "#059669", false)}
          {row("Dwell time", dossier.dwell, "#64748B")}
          <div style={{ padding: "6px 8px", background: "#F1F5F9", borderRadius: "5px", color: "#334155", lineHeight: 1.4, marginTop: "2px" }}>{dossier.description}</div>
        </div>
        <div style={{ marginTop: "auto" }}>
          <button
            type="button"
            onClick={onOpenOrders}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "5px", border: "none", background: "#4F46E5", color: "#FFFFFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
          >
            <span>Draft BNSS §106/§107 orders</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  const maxL = fin.bookedLossInr / 100000;
  const cashL = fin.unrecoverableCashoutInr / 100000;
  const muleL = fin.frozenMuleInr / 100000;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px", boxSizing: "border-box" }}>
      {/* 1. Where the money is now */}
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A" }}>Where the {formatInrCompact(fin.bookedLossInr)} is now</span>
          <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#059669", background: "#ECFDF5", padding: "1px 6px", borderRadius: "3px", fontFamily: "var(--font-mono)" }}>
            Recoverable {formatInrCompact(fin.recoverableInr)} ({fin.recoveryPct}%)
          </span>
        </div>
        <ScaleBar
          min={0}
          max={maxL}
          value={fin.recoverableInr / 100000}
          unit="L"
          height={14}
          zones={[
            { from: 0, to: cashL, color: "#F43F5E", label: `Cashed out ${formatInrCompact(fin.unrecoverableCashoutInr)} (${fin.cashoutPct}%)` },
            { from: cashL, to: cashL + muleL, color: "#F59E0B", label: `Mule hold ${formatInrCompact(fin.frozenMuleInr)}` },
            { from: cashL + muleL, to: maxL, color: "#0284C7", label: `Merchant lien ${formatInrCompact(fin.shieldedCommercialInr)}` },
          ]}
        />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 4, fontSize: "9.5px", marginTop: "4px" }}>
          <span style={{ color: "#E11D48", fontWeight: 700 }}>■ ATM cash-out {formatInrCompact(fin.unrecoverableCashoutInr)}</span>
          <span style={{ color: "#B45309", fontWeight: 700 }}>■ Held in mules {formatInrCompact(fin.frozenMuleInr)}</span>
          <span style={{ color: "#0284C7", fontWeight: 700 }}>■ Merchant lien {formatInrCompact(fin.shieldedCommercialInr)}</span>
        </div>
      </div>

      {/* 2. Containment vs recovery */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <div style={{ ...box, padding: "6px 8px", borderRadius: 6 }}>
          <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Containment exits</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
            {Array.from({ length: Math.max(1, model.totalEscapeRoutes) }, (_, i) => i + 1).map((pip) => {
              const isSealed = model.openEscapeExits === 0 || pip > model.openEscapeExits;
              return (
                <span key={pip} style={{ width: 12, height: 12, borderRadius: "50%", background: isSealed ? "#10B981" : "#F43F5E", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#FFF", fontWeight: 800 }}>
                  {isSealed ? "✓" : "!"}
                </span>
              );
            })}
          </div>
          <div style={{ fontSize: "9.5px", color: model.openEscapeExits === 0 ? "#059669" : "#BE123C", fontWeight: 700, marginTop: "2px" }}>
            {model.openEscapeExits === 0 ? `0 of ${model.totalEscapeRoutes} exits open (sealed)` : `${model.openEscapeExits} of ${model.totalEscapeRoutes} exits still open`}
          </div>
        </div>
        <div style={{ ...box, padding: "6px 8px", borderRadius: 6 }}>
          <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Net recovery rate</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)", marginTop: 1 }}>
            {model.recoveryPotentialPct}% <span style={{ fontSize: 9.5, color: "#059669" }}>({formatInrCompact(fin.recoverableInr)})</span>
          </div>
          <div style={{ width: "100%", height: 4, background: "#E2E8F0", borderRadius: 2, overflow: "hidden", marginTop: 3 }}>
            <div style={{ width: `${fin.recoveryPct}%`, height: "100%", background: "#059669" }} />
          </div>
        </div>
      </div>

      {/* 3. Accounting doctrines */}
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: "#0F172A" }}>Accounting doctrine comparison</span>
          <span style={{ fontSize: 9, color: "#64748B" }}>{doctrine.rulesEqual ? "Equal until funds commingle" : "Doctrines diverge"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          {doctrine.rows.map((row) => (
            <div key={row.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, marginBottom: 1, gap: 6 }}>
                <span title={row.note} style={{ fontWeight: row.key === "LIBR" ? 800 : 600, color: row.key === "LIBR" ? "#059669" : "#475569" }}>
                  {row.label}
                  {row.key === "LIBR" ? " ★" : ""}
                </span>
                <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: row.key === "LIBR" ? "#059669" : "#475569" }}>{formatInr(row.recoverableInr)}</span>
              </div>
              <div style={{ width: "100%", height: 5, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${row.pctOfLoss}%`, height: "100%", background: row.key === "LIBR" ? "#059669" : row.key === "FIFO" ? "#64748B" : "#8B5CF6" }} />
              </div>
            </div>
          ))}
        </div>

        {merchants.map((m) => (
          <div key={m.nodeId} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "6px 8px", marginTop: 6 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "#0F172A", marginBottom: 3, overflowWrap: "anywhere" }} title={`${m.holderName} · ${m.bank} ${m.accountMasked}`}>
              LIBR ledger · {m.holderName} ({m.bank} {m.accountMasked})
            </div>
            <table style={{ width: "100%", fontSize: 9.5, fontFamily: "var(--font-mono)", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ textAlign: "left", padding: 2 }}>Step</th>
                  <th style={{ textAlign: "right", padding: 2 }}>Amount</th>
                  <th style={{ textAlign: "right", padding: 2 }}>Tainted hold</th>
                  <th style={{ textAlign: "right", padding: 2 }}>Clean</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 2 }}>Traced receipt</td>
                  <td style={{ textAlign: "right", padding: 2, color: "#E11D48" }}>+{formatInr(m.inflowInr)}</td>
                  <td style={{ textAlign: "right", padding: 2, color: "#E11D48", fontWeight: 800 }}>{formatInr(m.frozenInr)}</td>
                  <td style={{ textAlign: "right", padding: 2 }}>{formatInr(0)}</td>
                </tr>
                {isInjectClean && (
                  <tr>
                    <td style={{ padding: 2 }}>Clean deposit (scenario)</td>
                    <td style={{ textAlign: "right", padding: 2, color: "#059669" }}>+{formatInr(doctrine.cleanDepositInjectedInr)}</td>
                    <td style={{ textAlign: "right", padding: 2, color: "#E11D48", fontWeight: 800 }}>{formatInr(m.frozenInr)}</td>
                    <td style={{ textAlign: "right", padding: 2, color: "#059669", fontWeight: 800 }}>{formatInr(doctrine.cleanDepositInjectedInr)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
        <div style={{ fontSize: 9.5, color: "#475569", marginTop: 6, borderTop: "1px dashed #CBD5E1", paddingTop: 3 }}>
          <strong>Sum check:</strong> {formatInr(fin.frozenMuleInr)} frozen in mules + {formatInr(fin.shieldedCommercialInr)} merchant lien ={" "}
          <strong>
            {formatInr(fin.recoverableInr)} recoverable ({fin.recoveryPct}%)
          </strong>{" "}
          + {formatInr(fin.unrecoverableCashoutInr)} cash-out ({fin.cashoutPct}%) ={" "}
          <strong>
            {formatInr(fin.bookedLossInr)} total loss{fin.isReconciled ? " (reconciled)" : ` (unaccounted ${formatInr(fin.unaccountedInr)})`}
          </strong>
        </div>
      </div>

      {/* 4. SOP schedule */}
      <div style={box}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>MHA 2026 golden hour SOP schedule</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, textAlign: "center" }}>
          {[
            ["24h freeze", "T+24h", "#ECFDF5", "#A7F3D0", "#047857"],
            ["7d lien notice", "T+7d", "#EEF2FF", "#C7D2FE", "#4338CA"],
            ["15d summons", "T+15d", "#F8FAFC", "#E2E8F0", "#64748B"],
            ["90d court", "T+90d", "#F8FAFC", "#E2E8F0", "#64748B"],
          ].map(([a, b, bg, bd, fg]) => (
            <div key={a} style={{ background: bg, border: `1px solid ${bd}`, padding: 3, borderRadius: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: fg }}>{a}</div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: fg }}>{b}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 4 }}>
        <button
          type="button"
          onClick={onOpenOrders}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 12px", borderRadius: 6, border: "none", background: "#4F46E5", color: "#FFFFFF", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)" }}
        >
          <FileText size={13} />
          <span>Draft BNSS §106/§107 orders</span>
        </button>
      </div>
    </div>
  );
};
