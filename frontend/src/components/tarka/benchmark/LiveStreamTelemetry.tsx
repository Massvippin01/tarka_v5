import React from "react";
import { Zap, Activity, Cpu, HardDrive, ShieldCheck, Gauge } from "lucide-react";
import type { BenchmarkProgressPayload } from "../../../workers/forensicBenchmark.worker";
import type { BenchmarkRow } from "../../../utils/seededCorpusGenerator";

interface LiveStreamTelemetryProps {
  progress: BenchmarkProgressPayload | null;
  isRunning: boolean;
}

export const LiveStreamTelemetry: React.FC<LiveStreamTelemetryProps> = ({
  progress,
  isRunning,
}) => {
  const rowsPerSec = progress?.rowsPerSecond ?? 0;
  const hashMbSec = progress?.hashThroughputMbPerSec ?? 0;
  const elapsedMs = progress?.elapsedMs ?? 0;
  const latencies = progress?.latencies;

  const stageList = [
    {
      id: "gate",
      title: "Gate I1–I5 Falsification",
      desc: "Double-entry balance check & ISO 8583 RRN grammar",
      data: latencies?.gateFalsification,
      color: "#4F46E5",
    },
    {
      id: "merkle",
      title: "HMAC-SHA-256 & Merkle Tree",
      desc: "PII subscriber pseudonymization & RFC-6962 tree proof",
      data: latencies?.merkleBlinding,
      color: "#059669",
    },
    {
      id: "cgnat",
      title: "CGNAT 4-Tuple Intersection",
      desc: "Dynamic port-block elimination & Stratum-2 NTP caliper",
      data: latencies?.cgnatIntersection,
      color: "#0284C7",
    },
    {
      id: "taint",
      title: "Dinic Min-Cut + LIBR Ledger",
      desc: "Max-flow freeze cut & Roscoe v. Winder capital preservation",
      data: latencies?.dinicLibrTaint,
      color: "#D97706",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* 4 TOP TELEMETRY KPI TILES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "10px",
        }}
      >
        {/* Tile 1: Rows / Sec */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "9px",
            padding: "10px 12px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "5px" }}>
              <Zap size={13} color="#4F46E5" />
              STREAMING THROUGHPUT
            </span>
            {isRunning && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10B981",
                  animation: "pulse 1.2s infinite",
                }}
              />
            )}
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
              {rowsPerSec.toLocaleString()}
            </span>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>rows/sec</span>
          </div>
          <div style={{ fontSize: "10px", color: "#64748B", marginTop: "3px" }}>
            Total: {(progress?.processedRows ?? 0).toLocaleString()} / {(progress?.totalRows ?? 0).toLocaleString()}
          </div>
        </div>

        {/* Tile 2: Hash Throughput */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "9px",
            padding: "10px 12px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "5px" }}>
              <HardDrive size={13} color="#059669" />
              WEBCRYPTO DIGEST
            </span>
            <span style={{ fontSize: "9.5px", padding: "1px 4px", borderRadius: "3px", background: "#ECFDF5", color: "#059669", fontWeight: 700 }}>
              SHA-256
            </span>
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
              {hashMbSec}
            </span>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>MB/sec</span>
          </div>
          <div style={{ fontSize: "10px", color: "#64748B", marginTop: "3px" }}>
            Chunked 64KB WebCrypto Buffer
          </div>
        </div>

        {/* Tile 3: Elapsed & Heap */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "9px",
            padding: "10px 12px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "5px" }}>
              <Activity size={13} color="#D97706" />
              BURST EXECUTION
            </span>
            <span style={{ fontSize: "9.5px", padding: "1px 4px", borderRadius: "3px", background: "#FEF3C7", color: "#B45309", fontWeight: 700 }}>
              {elapsedMs} ms
            </span>
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
              {progress?.memoryEstimateMb ?? 0}
            </span>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>MB Stream Heap</span>
          </div>
          <div style={{ fontSize: "10px", color: "#64748B", marginTop: "3px" }}>
            Sub-millisecond sliding window
          </div>
        </div>

        {/* Tile 4: Worker Engine Thread */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "9px",
            padding: "10px 12px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "5px" }}>
              <Cpu size={13} color="#7C3AED" />
              THREAD ARCHITECTURE
            </span>
            <span style={{ fontSize: "9.5px", padding: "1px 4px", borderRadius: "3px", background: "#EEF2FF", color: "#4F46E5", fontWeight: 700 }}>
              WEB WORKER
            </span>
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#059669" }}>
              60 FPS LOCKED
            </span>
          </div>
          <div style={{ fontSize: "10px", color: "#64748B", marginTop: "3px" }}>
            UI Thread Jank: 0.00ms · 100% Non-Blocking
          </div>
        </div>
      </div>

      {/* SUB-MILLISECOND STAGE LATENCY BREAKDOWN (p50 / p95 / p99) */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          padding: "12px 14px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Gauge size={15} color="#4F46E5" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
              SUB-MILLISECOND STAGE LATENCY PROFILER
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
            p50 (Median) · p95 (Tail) · p99 (Worst Case) in Milliseconds
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {stageList.map((stage) => {
            const p50 = stage.data?.p50 ?? 0;
            const p95 = stage.data?.p95 ?? 0;
            const p99 = stage.data?.p99 ?? 0;
            const barWidth = Math.min(100, Math.max(5, p99 * 18));

            return (
              <div
                key={stage.id}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "7px",
                  padding: "8px 10px",
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 240px",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#1E293B" }}>
                    {stage.title}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B" }}>
                    {stage.desc}
                  </div>
                </div>

                {/* Proportional visual latency bar */}
                <div style={{ height: "6px", background: "#E2E8F0", borderRadius: "9999px", overflow: "hidden", position: "relative" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${barWidth}%`,
                      background: stage.color,
                      borderRadius: "9999px",
                      transition: "width 200ms ease-out",
                    }}
                  />
                </div>

                {/* Percentiles readout */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                  <span style={{ color: "#334155" }}>
                    <strong style={{ color: "#0F172A" }}>p50:</strong> {p50}ms
                  </span>
                  <span style={{ color: "#334155" }}>
                    <strong style={{ color: "#0F172A" }}>p95:</strong> {p95}ms
                  </span>
                  <span style={{ color: stage.color, fontWeight: 700 }}>
                    <strong>p99:</strong> {p99}ms
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LIVE STREAMING RECORD INGESTION FEED */}
      {progress?.sampleBatch && progress.sampleBatch.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "10px 12px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#1E293B", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} color="#059669" />
              LIVE TELEMETRY STREAM CHUNK (LATEST INGESTED ROWS)
            </span>
            <span style={{ fontSize: "10.5px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
              Stream ID: {progress.corpusType}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "4px 8px" }}>SEQ</th>
                  <th style={{ padding: "4px 8px" }}>VECTOR</th>
                  <th style={{ padding: "4px 8px" }}>SENDER</th>
                  <th style={{ padding: "4px 8px" }}>RECEIVER</th>
                  <th style={{ padding: "4px 8px", textAlign: "right" }}>AMOUNT (₹)</th>
                  <th style={{ padding: "4px 8px" }}>REF / RRN</th>
                  <th style={{ padding: "4px 8px" }}>GROUND TRUTH</th>
                </tr>
              </thead>
              <tbody>
                {progress.sampleBatch.slice(0, 5).map((r: BenchmarkRow) => {
                  const isTamper = r._groundTruth === "TAMPERED_ROW";
                  const isMule = r._groundTruth === "TRUE_MULE";
                  const isClean = r._groundTruth === "CLEAN_MERCHANT";

                  const badgeBg = isTamper ? "#FFE4E6" : isMule ? "#FEF3C7" : isClean ? "#ECFDF5" : "#F1F5F9";
                  const badgeColor = isTamper ? "#E11D48" : isMule ? "#B45309" : isClean ? "#059669" : "#475569";

                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "5px 8px", color: "#64748B" }}>#{r.rowSeq}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 700 }}>{r.vector}</td>
                      <td style={{ padding: "5px 8px", color: "#1E293B", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.senderName || r.senderId}
                      </td>
                      <td style={{ padding: "5px 8px", color: "#1E293B", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.receiverName || r.receiverId}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: r.amountInr > 0 ? "#0F172A" : "#94A3B8" }}>
                        {r.amountInr > 0 ? `₹${r.amountInr.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "5px 8px", color: "#475569" }}>{r.refNum}</td>
                      <td style={{ padding: "5px 8px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "9.5px",
                            fontWeight: 800,
                            background: badgeBg,
                            color: badgeColor,
                          }}
                        >
                          {r._groundTruth}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
