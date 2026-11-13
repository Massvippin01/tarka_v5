import { describe, it, expect } from "vitest";
import { generateForensicCorpus } from "../seededCorpusGenerator";
import { evaluateClassification, computePercentiles } from "../confusionMatrixEvaluator";
import { inspectDatasetSample, parseCsvRow } from "../schemaAutoMapper";

describe("TARKA v9.5 Forensic Benchmark & Statistical Calibration Suite", () => {
  it("generates deterministic corpus with identical hashes for same seed", () => {
    const seed = "TARKA-I4C-2026-BENCH-TEST";
    const run1 = generateForensicCorpus("NPCI_BURST", 500, seed);
    const run2 = generateForensicCorpus("NPCI_BURST", 500, seed);

    expect(run1.length).toBe(500);
    expect(run2.length).toBe(500);
    expect(run1[0].id).toBe(run2[0].id);
    expect(run1[0].amountInr).toBe(run2[0].amountInr);
    expect(run1[499].refNum).toBe(run2[499].refNum);
  });

  it("verifies 0.000% False Positive Rate (FPR) on GSTIN commercial merchants via LIBR", () => {
    const rows = generateForensicCorpus("GSTIN_POS_FLOOD", 2500, "TARKA-LIBR-TEST-01", {
      comminglingRatio: 20,
    });

    const result = evaluateClassification(rows);
    const tarka = result.tarkaEngine;
    const naive = result.naiveFifoBaseline;

    // Strict mathematical invariant
    expect(tarka.fp).toBe(0);
    expect(tarka.fpr).toBe(0.0);
    expect(tarka.precision).toBe(1.0);
    expect(tarka.librCapitalSavedInr).toBeGreaterThan(0);

    // Naive baseline should demonstrate false positive contamination on merchants
    expect(naive.fp).toBeGreaterThan(0);
    expect(naive.fpr).toBeGreaterThan(0);
  });

  it("achieves 100% True Positive catch rate on adversarial red-team tampers", () => {
    const rows = generateForensicCorpus("ADVERSARIAL_TAMPER", 1000, "TARKA-REDTEAM-01");
    const result = evaluateClassification(rows);
    const tarka = result.tarkaEngine;

    expect(tarka.tp).toBe(1000);
    expect(tarka.fn).toBe(0);
    expect(tarka.recall).toBe(1.0);
    expect(tarka.accuracy).toBe(1.0);
  });

  it("completes 10,000-row deterministic benchmark stream in < 250ms", () => {
    // Warm-up iteration to stabilize V8 JIT optimization & pre-allocate memory
    const warmupRows = generateForensicCorpus("NPCI_BURST", 1000, "WARMUP-INIT");
    evaluateClassification(warmupRows);

    // Multi-trial benchmark (best of 3) to protect against OS thread scheduler preemption & GC spikes
    let minDuration = Infinity;
    let bestGen = 0;
    let bestEval = 0;
    let bestTotalEvaluated = 0;
    let bestRowsLength = 0;

    for (let trial = 0; trial < 3; trial++) {
      const t0 = performance.now();
      const rows = generateForensicCorpus("NPCI_BURST", 10000, `TARKA-SPEED-TEST-${trial}`);
      const tGen = performance.now();
      const result = evaluateClassification(rows);
      const tEval = performance.now();
      const trialDuration = tEval - t0;

      if (trialDuration < minDuration) {
        minDuration = trialDuration;
        bestGen = tGen - t0;
        bestEval = tEval - tGen;
        bestTotalEvaluated = result.tarkaEngine.totalEvaluated;
        bestRowsLength = rows.length;
      }
    }

    console.log(`[BENCHMARK PROFILE (Best of 3)] Gen 10k: ${bestGen.toFixed(2)}ms | Eval 10k: ${bestEval.toFixed(2)}ms | Total: ${minDuration.toFixed(2)}ms`);

    expect(bestRowsLength).toBe(10000);
    expect(bestTotalEvaluated).toBe(10000);
    expect(minDuration).toBeLessThan(250); // Sub-250ms performance gate
  });

  it("inspects and auto-maps external PaySim and generic CSV datasets accurately", () => {
    const paysimCsv = `step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,newbalanceDest,isFraud
1,PAYMENT,9839.64,C1231006815,170136.0,160296.36,M1979787155,0.0,0
1,TRANSFER,181.0,C1305486145,181.0,0.0,C553264065,0.0,1`;

    const inspection = inspectDatasetSample(paysimCsv);
    expect(inspection.detectedFormat).toBe("PAYSIM");
    expect(inspection.suggestedMapping.amountCol).toBe("amount");
    expect(inspection.suggestedMapping.senderIdCol).toBe("nameOrig");
    expect(inspection.suggestedMapping.groundTruthCol).toBe("isFraud");

    const row1 = parseCsvRow("1,PAYMENT,9839.64,C1231006815");
    expect(row1.length).toBe(4);
    expect(row1[2]).toBe("9839.64");
  });

  it("computes accurate sub-millisecond percentiles (p50, p95, p99)", () => {
    const samples = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const p = computePercentiles(samples);
    expect(p.min).toBe(0.1);
    expect(p.max).toBe(1.0);
    expect(p.p50).toBe(0.6); // index 5 of 10 items
    expect(p.p95).toBe(1.0); // index 9 of 10 items
  });
});
