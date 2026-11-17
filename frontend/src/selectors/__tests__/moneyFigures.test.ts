import { describe, expect, it } from "vitest";
import { CANONICAL_CASES } from "../../fixtures/cases";
import {
  selectAccountMoneyFigure,
  selectFinancialSummary,
  selectMoneyFigure,
  selectPortfolioMoneyFigure,
  sumMoneyRows,
  type MoneyFigureKey,
} from "../caseSelectors";

const KEYS: MoneyFigureKey[] = ["loss", "recoverable", "frozen", "cashout", "shielded"];
const IDS = ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"];

describe("money figures trace to source rows", () => {
  for (const id of IDS) {
    const c = CANONICAL_CASES[id];
    it(`${id}: every figure's rows add up to the figure`, () => {
      const fin = selectFinancialSummary(c);
      for (const k of KEYS) {
        const f = selectMoneyFigure(c, k);
        expect(sumMoneyRows(f.rows), `${id} ${k}`).toBe(f.totalInr);
        expect(f.rows.every((r) => r.caseId === id && r.sourceFile && r.sourceRow !== null)).toBe(true);
      }
      expect(selectMoneyFigure(c, "loss").totalInr).toBe(fin.bookedLossInr);
      expect(selectMoneyFigure(c, "recoverable").totalInr).toBe(fin.recoverableInr);
    });

    it(`${id}: every account's in / out / held rows add up`, () => {
      for (const a of c.accounts) {
        for (const kind of ["inflow", "outflow", "held"] as const) {
          const f = selectAccountMoneyFigure(c, a.nodeId, kind)!;
          expect(sumMoneyRows(f.rows), `${id} ${a.nodeId} ${kind}`).toBe(f.totalInr);
        }
      }
    });
  }

  it("portfolio figure is the sum of case figures and its rows reconcile", () => {
    const cases = IDS.map((id) => CANONICAL_CASES[id]);
    for (const k of KEYS) {
      const p = selectPortfolioMoneyFigure(cases, k);
      expect(p.totalInr).toBe(cases.reduce((s, c) => s + selectMoneyFigure(c, k).totalInr, 0));
      expect(sumMoneyRows(p.rows)).toBe(p.totalInr);
    }
  });

  it("unknown account returns null", () => {
    expect(selectAccountMoneyFigure(CANONICAL_CASES[IDS[0]], "nope", "held")).toBeNull();
  });
});
