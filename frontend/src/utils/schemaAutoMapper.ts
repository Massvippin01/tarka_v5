/**
 * TARKA v9.5 — Intelligent Schema Auto-Mapper & Chunked Dataset Streamer
 *
 * Automatically detects and normalizes real-world forensic datasets
 * (e.g. Kaggle PaySim, IBM AML, Finacle Core Banking CSVs, Telco CGNAT IPDR)
 * into TARKA's canonical BenchmarkRow schema.
 */

import type { BenchmarkRow, GroundTruthLabel, IngestionVector } from "./seededCorpusGenerator";

export interface ColumnMappingConfig {
  timestampCol?: string;
  senderIdCol?: string;
  senderNameCol?: string;
  receiverIdCol?: string;
  receiverNameCol?: string;
  amountCol?: string;
  openingBalCol?: string;
  closingBalCol?: string;
  refNumCol?: string;
  groundTruthCol?: string;
  vectorCol?: string;
}

export interface DatasetInspectionResult {
  detectedFormat: "PAYSIM" | "IBM_AML" | "FINACLE_CBS" | "TELCO_IPDR" | "GENERIC_CSV" | "NDJSON";
  totalEstimatedRows: number;
  headers: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: ColumnMappingConfig;
}

/**
 * Common column name heuristic matches (case-insensitive substring)
 */
const HEURISTICS = {
  timestamp: ["timestamp", "date", "trans_date", "step", "time", "tran date", "value date", "sessionstart"],
  amount: ["amount", "amt", "tx_amount", "amount paid", "amount received", "withdrawal", "deposit", "value"],
  senderId: ["sender", "source", "nameorig", "from account", "account", "from_acc", "dr_acc", "msisdn", "payer"],
  senderName: ["sender_name", "payer_name", "from_name", "particulars", "nameorig"],
  receiverId: ["receiver", "dest", "namedest", "to account", "account.1", "to_acc", "cr_acc", "payee", "destinationip"],
  receiverName: ["receiver_name", "payee_name", "to_name", "beneficiary", "namedest"],
  openingBal: ["oldbalanceorg", "oldbalanceorig", "opening", "opening_bal", "balance_before"],
  closingBal: ["newbalanceorig", "newbalanceorg", "closing", "closing_bal", "balance"],
  refNum: ["rrn", "utr", "ref", "reference", "tran id", "recordid", "chq/ref no", "tx_hash"],
  groundTruth: ["isfraud", "is laundering", "fraud", "label", "is_fraud", "class", "is_laundering"],
};

function matchHeader(headers: string[], candidates: string[]): string | undefined {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lowerHeaders.findIndex((h) => h === candidate || h.includes(candidate));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

/**
 * Inspect first chunk of CSV / NDJSON to extract headers and detect schema
 */
export function inspectDatasetSample(rawText: string): DatasetInspectionResult {
  const isNdjson = rawText.trim().startsWith("{") && rawText.includes("\n{");

  if (isNdjson) {
    const lines = rawText.split("\n").filter((l) => l.trim().length > 0).slice(0, 10);
    const parsedSample = lines.map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return {};
      }
    });
    const headers = Array.from(new Set(parsedSample.flatMap((obj) => Object.keys(obj))));
    const sampleRecord = parsedSample.slice(0, 5).map((row) => {
      const rec: Record<string, string> = {};
      for (const h of headers) rec[h] = String(row[h] ?? "");
      return rec;
    });

    return {
      detectedFormat: "NDJSON",
      totalEstimatedRows: Math.max(1, rawText.split("\n").length),
      headers,
      sampleRows: sampleRecord,
      suggestedMapping: buildSuggestedMapping(headers),
    };
  }

  // Parse CSV
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      detectedFormat: "GENERIC_CSV",
      totalEstimatedRows: 0,
      headers: [],
      sampleRows: [],
      suggestedMapping: {},
    };
  }

  const headerLine = lines[0];
  const headers = parseCsvRow(headerLine);

  const sampleRows: Record<string, string>[] = [];
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const rowVals = parseCsvRow(lines[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = rowVals[idx] ?? "";
    });
    sampleRows.push(rec);
  }

  // Detect specific dataset formats
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  let detectedFormat: DatasetInspectionResult["detectedFormat"] = "GENERIC_CSV";

  if (lowerHeaders.includes("step") && lowerHeaders.includes("type") && lowerHeaders.includes("isfraud")) {
    detectedFormat = "PAYSIM";
  } else if (lowerHeaders.includes("is laundering") || lowerHeaders.includes("payment format")) {
    detectedFormat = "IBM_AML";
  } else if (lowerHeaders.includes("tran date") || lowerHeaders.includes("withdrawal (dr)")) {
    detectedFormat = "FINACLE_CBS";
  } else if (lowerHeaders.includes("privateip") || lowerHeaders.includes("destinationport")) {
    detectedFormat = "TELCO_IPDR";
  }

  return {
    detectedFormat,
    totalEstimatedRows: lines.length - 1,
    headers,
    sampleRows,
    suggestedMapping: buildSuggestedMapping(headers, detectedFormat),
  };
}

/**
 * Builds suggested mapping given headers & detected preset
 */
function buildSuggestedMapping(headers: string[], preset?: DatasetInspectionResult["detectedFormat"]): ColumnMappingConfig {
  if (preset === "PAYSIM") {
    return {
      timestampCol: matchHeader(headers, ["step"]),
      senderIdCol: matchHeader(headers, ["nameorig"]),
      receiverIdCol: matchHeader(headers, ["namedest"]),
      amountCol: matchHeader(headers, ["amount"]),
      openingBalCol: matchHeader(headers, ["oldbalanceorg", "oldbalanceorig"]),
      closingBalCol: matchHeader(headers, ["newbalanceorig", "newbalanceorg"]),
      groundTruthCol: matchHeader(headers, ["isfraud"]),
    };
  }

  if (preset === "IBM_AML") {
    return {
      timestampCol: matchHeader(headers, ["timestamp"]),
      senderIdCol: matchHeader(headers, ["account"]),
      receiverIdCol: matchHeader(headers, ["account.1", "to bank"]),
      amountCol: matchHeader(headers, ["amount paid", "amount received"]),
      groundTruthCol: matchHeader(headers, ["is laundering"]),
    };
  }

  return {
    timestampCol: matchHeader(headers, HEURISTICS.timestamp),
    amountCol: matchHeader(headers, HEURISTICS.amount),
    senderIdCol: matchHeader(headers, HEURISTICS.senderId),
    senderNameCol: matchHeader(headers, HEURISTICS.senderName),
    receiverIdCol: matchHeader(headers, HEURISTICS.receiverId),
    receiverNameCol: matchHeader(headers, HEURISTICS.receiverName),
    openingBalCol: matchHeader(headers, HEURISTICS.openingBal),
    closingBalCol: matchHeader(headers, HEURISTICS.closingBal),
    refNumCol: matchHeader(headers, HEURISTICS.refNum),
    groundTruthCol: matchHeader(headers, HEURISTICS.groundTruth),
  };
}

/**
 * Robust CSV row tokenizer respecting quotes
 */
export function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Maps raw dictionary record to a canonical TARKA BenchmarkRow
 */
export function mapRecordToBenchmarkRow(
  record: Record<string, string>,
  mapping: ColumnMappingConfig,
  rowSeq: number
): BenchmarkRow {
  const rawAmt = mapping.amountCol ? parseFloat(record[mapping.amountCol] || "0") : 0;
  const amountInr = isNaN(rawAmt) ? 0 : Math.abs(rawAmt);

  const rawOpen = mapping.openingBalCol ? parseFloat(record[mapping.openingBalCol] || "0") : 0;
  const openingBal = isNaN(rawOpen) ? 0 : rawOpen;

  const rawClose = mapping.closingBalCol ? parseFloat(record[mapping.closingBalCol] || "0") : 0;
  const closingBal = isNaN(rawClose) ? 0 : rawClose;

  // Ground truth evaluation
  let groundTruth: GroundTruthLabel = "INNOCENT_SUBSCRIBER";
  if (mapping.groundTruthCol && record[mapping.groundTruthCol]) {
    const val = record[mapping.groundTruthCol].toString().toLowerCase().trim();
    if (val === "1" || val === "true" || val === "fraud" || val === "laundering" || val === "mule") {
      groundTruth = "TRUE_MULE";
    } else if (val === "tampered" || val === "deficit") {
      groundTruth = "TAMPERED_ROW";
    } else if (val === "merchant" || val === "clean") {
      groundTruth = "CLEAN_MERCHANT";
    }
  }

  const senderId = (mapping.senderIdCol ? record[mapping.senderIdCol] : "") || `ACC-EXT-${rowSeq}`;
  const senderName = (mapping.senderNameCol ? record[mapping.senderNameCol] : "") || senderId;

  const receiverId = (mapping.receiverIdCol ? record[mapping.receiverIdCol] : "") || `DEST-EXT-${rowSeq}`;
  const receiverName = (mapping.receiverNameCol ? record[mapping.receiverNameCol] : "") || receiverId;

  const rawTime = (mapping.timestampCol ? record[mapping.timestampCol] : "") || new Date().toISOString();
  let epochMs = Date.parse(rawTime);
  if (isNaN(epochMs)) {
    epochMs = Date.now() + rowSeq * 1000;
  }

  const refNum = (mapping.refNumCol ? record[mapping.refNumCol] : "") || `EXT-RRN-${rowSeq}`;
  const vector: IngestionVector = (mapping.vectorCol && (record[mapping.vectorCol] as IngestionVector)) || "CBS";

  return {
    rowSeq,
    id: `EXT-ROW-${String(rowSeq).padStart(6, "0")}`,
    timestamp: new Date(epochMs).toISOString(),
    epochMs,
    corpusType: "EXTERNAL_UPLOAD",
    vector,
    senderId,
    senderName,
    receiverId,
    receiverName,
    amountInr,
    openingBal,
    closingBal,
    refNum,
    _groundTruth: groundTruth,
    _metadata: record,
  };
}

