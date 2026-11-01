/**
 * TARKA v9.5 — Seeded Deterministic Forensic Corpus Generator
 *
 * Implements high-throughput xoshiro128** PRNG initialized via SplitMix32.
 * Produces 100% reproducible benchmark streams (1,000 to 250,000+ rows)
 * across 5 specialized Indian Cyber-Forensic test corpora.
 *
 * Every generated row carries an immutable `_groundTruth` tag for
 * statistical classification calibration (Precision, Recall, FPR, FNR).
 */

export type GroundTruthLabel =
  | "TRUE_MULE"
  | "CLEAN_MERCHANT"
  | "INNOCENT_SUBSCRIBER"
  | "TAMPERED_ROW";

export type CorpusType =
  | "NPCI_BURST"
  | "CGNAT_HAYSTACK"
  | "GSTIN_POS_FLOOD"
  | "ADVERSARIAL_TAMPER"
  | "SYNDICATE_GRAPH"
  | "EXTERNAL_UPLOAD";

export type IngestionVector = "CBS" | "UPI" | "IPDR" | "PDF" | "DEVICE_XML";

export interface BenchmarkRow {
  rowSeq: number;
  id: string;
  timestamp: string;
  epochMs: number;
  corpusType: CorpusType;
  vector: IngestionVector;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amountInr: number;
  openingBal: number;
  closingBal: number;
  refNum: string; // ISO 8583 RRN or UTR
  ipAddress?: string;
  srcPort?: number | null;
  dstPort?: number;
  deviceBssid?: string;
  ja4Fingerprint?: string;
  imei?: string;
  cellId?: string;
  pdfTrailerCount?: number;
  _groundTruth: GroundTruthLabel;
  _tamperReason?: string;
  _metadata?: Record<string, unknown>;
}

export interface NoiseOptions {
  cgnatPortDropRate?: number; // 0.0 to 0.25 (fraction of IPDR records missing srcPort)
  ntpSkewSeconds?: number;    // 0.0 to 10.0 (simulated NTP clock offset jitter)
  comminglingRatio?: number;  // 1 to 50 (clean POS transactions per tainted syndicate credit)
}

/**
 * SplitMix32: Hashes string seed into four 32-bit seeds for xoshiro128**
 */
function createSplitMix32(seedStr: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let s = h >>> 0;
  return function () {
    s = (s + 0x9e3779b9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
}

/**
 * Xoshiro128** PRNG: 32-bit state, period 2^128 - 1, ultra-fast for in-browser streaming
 */
export class Xoshiro128StarStar {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: string = "TARKA-I4C-2026-BENCH-01") {
    const sm = createSplitMix32(seed);
    this.s0 = (sm() * 0xffffffff) >>> 0;
    this.s1 = (sm() * 0xffffffff) >>> 0;
    this.s2 = (sm() * 0xffffffff) >>> 0;
    this.s3 = (sm() * 0xffffffff) >>> 0;
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) {
      this.s0 = 1;
    }
  }

  /** Returns float in [0, 1) */
  next(): number {
    const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));
    const result = (Math.imul(rotl(Math.imul(this.s1, 5), 7), 9)) >>> 0;
    const t = (this.s1 << 9) >>> 0;

    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;

    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11) >>> 0;

    return result / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Box-Muller Gaussian jitter */
  nextGaussian(mean: number = 0, stdev: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdev;
  }
}

// Fixed canonical naming pools for realistic Indian banking forensics
const INDIAN_FIRST_NAMES = ["Amit", "Rohit", "Vikram", "Sameer", "Deepak", "Rajesh", "Pooja", "Sunil", "Manish", "Ankit", "Priyanka", "Suresh"];
const INDIAN_LAST_NAMES = ["Kumar", "Verma", "Shah", "Khan", "Gupta", "Sharma", "Yadav", "Patel", "Singh", "Joshi", "Chauhan", "Reddy"];
const GSTIN_MERCHANTS = [
  { name: "Apex Electronics Pvt Ltd", gstin: "07AAACA1234F1Z8", bank: "ICICI Bank", acc: "001405008129" },
  { name: "Siddhivinayak Retailers", gstin: "27AADCS5678B1Z2", bank: "HDFC Bank", acc: "5020008819201" },
  { name: "Bharat Traders Wholesale", gstin: "09AAFCB9921C1Z4", bank: "State Bank of India", acc: "389100298192" },
  { name: "Kaveri Telematics & Mobile", gstin: "29AABCK1122D1Z9", bank: "Axis Bank", acc: "9180200119283" },
  { name: "Zenith Digital Store", gstin: "36AAECZ4433E1Z1", bank: "Kotak Mahindra", acc: "771829910281" },
];

/**
 * Format timestamp into standard ISO string with UTC+05:30 offset
 */
function formatIst(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yr = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const hr = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const sc = pad(d.getSeconds());
  return `${yr}-${mo}-${da}T${hr}:${mi}:${sc}+05:30`;
}

/**
 * Generate ISO 8583 DE-37 format RRN: YDDDHHSSSSSS
 */
function generateRrn(epochMs: number, prng: Xoshiro128StarStar, forceMalformed: boolean = false): string {
  if (forceMalformed) {
    return "636725999999"; // Day 367, Hour 25 (Syntactically invalid Julian date)
  }
  const d = new Date(epochMs);
  const y = String(d.getFullYear() % 10);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.min(365, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const ddd = String(dayOfYear).padStart(3, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const ssssss = String(prng.nextInt(100000, 999999));
  return `${y}${ddd}${hh}${ssssss}`;
}

/**
 * CORPUS 01: NPCI 1930 Golden-Hour High-Velocity Burst (CBS + UPI Switch Stream)
 * Simulates a multi-tier mule fan-out, circular smurfing, and balance conservation.
 */
export function generateNpciBurstStream(
  rowCount: number,
  prng: Xoshiro128StarStar,
  noise: NoiseOptions = {}
): BenchmarkRow[] {
  const rows: BenchmarkRow[] = [];
  const baseTime = new Date("2026-09-22T10:00:00+05:30").getTime();
  let runningBal = 1250000;

  for (let i = 0; i < rowCount; i++) {
    const isMuleHop = i % 7 === 0;
    const isSmurfSplit = i % 13 === 0;
    const isTampered = i % 100 === 99; // 1% injected tamper
    const timeDeltaMs = i * prng.nextInt(800, 4200) + (noise.ntpSkewSeconds ? noise.ntpSkewSeconds * 1000 : 0);
    const rowEpoch = baseTime + timeDeltaMs;

    let amount = prng.nextInt(1200, 48000); // Sub-50k structuring
    if (isMuleHop) amount = prng.nextInt(85000, 285000);

    const prevBal = runningBal;
    let nextBal = prevBal - amount;
    let groundTruth: GroundTruthLabel = "INNOCENT_SUBSCRIBER";
    let tamperReason: string | undefined;

    if (isTampered) {
      groundTruth = "TAMPERED_ROW";
      tamperReason = "Double-entry deficit: balance jump of ₹2,00,000 bypassing debit log";
      nextBal = prevBal; // Balance not debited (Deficit invariant violation)
    } else if (isMuleHop) {
      groundTruth = "TRUE_MULE";
    } else if (isSmurfSplit) {
      groundTruth = "TRUE_MULE";
    }

    runningBal = Math.max(10000, nextBal);

    rows.push({
      rowSeq: i + 1,
      id: `NPCI-BURST-${String(i + 1).padStart(6, "0")}`,
      timestamp: formatIst(rowEpoch),
      epochMs: rowEpoch,
      corpusType: "NPCI_BURST",
      vector: i % 2 === 0 ? "UPI" : "CBS",
      senderId: `SBIN-${prng.nextInt(10000000, 99999999)}`,
      senderName: `${prng.pick(INDIAN_FIRST_NAMES)} ${prng.pick(INDIAN_LAST_NAMES)}`,
      receiverId: isMuleHop ? "HDFC-5010029419920" : `AXIS-${prng.nextInt(10000000, 99999999)}`,
      receiverName: isMuleHop ? "Rohit Verma (L2A Mule)" : `${prng.pick(INDIAN_FIRST_NAMES)} ${prng.pick(INDIAN_LAST_NAMES)}`,
      amountInr: amount,
      openingBal: prevBal,
      closingBal: nextBal,
      refNum: generateRrn(rowEpoch, prng, isTampered && i % 200 === 199),
      _groundTruth: groundTruth,
      _tamperReason: tamperReason,
    });
  }

  return rows;
}

/**
 * CORPUS 02: DoT 5G CGNAT Mega-Haystack (100,000+ Concurrent Subscribers)
 * 4-tuple set intersection benchmark (100,000 -> 340 -> 41 -> 6 -> 1)
 */
export function generateCgnatHaystackStream(
  rowCount: number,
  prng: Xoshiro128StarStar,
  noise: NoiseOptions = {}
): BenchmarkRow[] {
  const rows: BenchmarkRow[] = [];
  const baseTime = new Date("2026-09-22T10:00:14+05:30").getTime();
  const portDropRate = noise.cgnatPortDropRate ?? 0;
  const targetRowIdx = Math.floor(rowCount * 0.42);

  for (let i = 0; i < rowCount; i++) {
    const isTargetSuspect = i === targetRowIdx;
    const isSamePortBlock = i < 340 || Math.abs(i - targetRowIdx) < 20;
    const isExactPort = isTargetSuspect || (i < 41 && i % 2 === 0);
    const dropPort = prng.next() < portDropRate;

    const jitter = prng.nextGaussian(0, noise.ntpSkewSeconds ? Math.max(0.2, noise.ntpSkewSeconds) : 0.4);
    const rowEpoch = baseTime + Math.round(jitter * 1000);

    const srcPort = dropPort
      ? null
      : isTargetSuspect
      ? 40018
      : isExactPort
      ? 40018
      : isSamePortBlock
      ? prng.nextInt(40000, 40063)
      : prng.nextInt(1024, 65535);

    const msisdn = isTargetSuspect
      ? "+91-98711-23941"
      : `+91-98${prng.nextInt(10000000, 99999999)}`;

    const imei = isTargetSuspect
      ? "867492061234564"
      : `86749206${prng.nextInt(1000000, 9999999)}`;

    rows.push({
      rowSeq: i + 1,
      id: `CGNAT-${String(i + 1).padStart(7, "0")}`,
      timestamp: formatIst(rowEpoch),
      epochMs: rowEpoch,
      corpusType: "CGNAT_HAYSTACK",
      vector: "IPDR",
      senderId: msisdn,
      senderName: isTargetSuspect ? "Target Suspect Handset" : `Civilian Subscriber #${i + 1}`,
      receiverId: "NPCI-UPI-GW:443",
      receiverName: "NPCI Central Switch Gateway",
      amountInr: 0,
      openingBal: 0,
      closingBal: 0,
      refNum: isTargetSuspect ? "626510149921" : `IPDR-${prng.nextInt(1000000, 9999999)}`,
      ipAddress: "122.161.48.19",
      srcPort,
      dstPort: 443,
      imei,
      cellId: isTargetSuspect ? "DL-TWR-891-S2" : `DL-TWR-${prng.nextInt(100, 999)}-S1`,
      _groundTruth: isTargetSuspect ? "TRUE_MULE" : "INNOCENT_SUBSCRIBER",
      _tamperReason: dropPort ? "CARRIER_SOURCE_PORT_SUPPRESSED" : undefined,
    });
  }

  return rows;
}

/**
 * CORPUS 03: Commingled GSTIN Commercial POS Flood (LIBR vs FIFO Stress Test)
 * Interleaves legitimate commercial POS sales with tainted syndicate credits.
 */
export function generateGstinPosFloodStream(
  rowCount: number,
  prng: Xoshiro128StarStar,
  noise: NoiseOptions = {}
): BenchmarkRow[] {
  const rows: BenchmarkRow[] = [];
  const baseTime = new Date("2026-09-22T08:00:00+05:30").getTime();
  const comminglingRatio = noise.comminglingRatio ?? 15; // 15 clean POS to 1 tainted credit

  let merchantBal = 110000; // Apex opening balance

  for (let i = 0; i < rowCount; i++) {
    const isTaintedCredit = i > 0 && i % Math.max(2, Math.floor(comminglingRatio)) === 0;
    const rowEpoch = baseTime + i * prng.nextInt(12000, 45000);
    const m = prng.pick(GSTIN_MERCHANTS);

    let amount: number;
    let groundTruth: GroundTruthLabel;
    let senderName: string;
    let senderId: string;

    if (isTaintedCredit) {
      amount = prng.nextInt(120000, 280000);
      groundTruth = "TRUE_MULE";
      senderName = "Rohit Verma (Layer-2A Mule Conduit)";
      senderId = "HDFC-5010029419920";
    } else {
      amount = prng.nextInt(250, 8500); // Typical retail customer purchase
      groundTruth = "CLEAN_MERCHANT";
      senderName = `Retail Walk-in Customer #${i}`;
      senderId = `UPI-RETAIL-${prng.nextInt(100000, 999999)}`;
    }

    const prevBal = merchantBal;
    merchantBal += amount;

    rows.push({
      rowSeq: i + 1,
      id: `POS-FLOOD-${String(i + 1).padStart(6, "0")}`,
      timestamp: formatIst(rowEpoch),
      epochMs: rowEpoch,
      corpusType: "GSTIN_POS_FLOOD",
      vector: "CBS",
      senderId,
      senderName,
      receiverId: m.acc,
      receiverName: `${m.name} [GSTIN: ${m.gstin}]`,
      amountInr: amount,
      openingBal: prevBal,
      closingBal: merchantBal,
      refNum: generateRrn(rowEpoch, prng),
      _groundTruth: groundTruth,
      _metadata: { gstin: m.gstin, isPosTerminal: !isTaintedCredit },
    });
  }

  return rows;
}

/**
 * CORPUS 04: Adversarial Defense Tamper & Corruption Suite (Red-Team Fuzzing)
 * Streams malformed PDFs, CBS balance deficits, forged RRNs, and flipped custody bytes.
 */
export function generateAdversarialTamperStream(
  rowCount: number,
  prng: Xoshiro128StarStar
): BenchmarkRow[] {
  const rows: BenchmarkRow[] = [];
  const baseTime = new Date("2026-09-22T10:00:14+05:30").getTime();

  for (let i = 0; i < rowCount; i++) {
    const tamperType = i % 4; // 0: PDF %%EOF, 1: CBS deficit, 2: RRN Julian date, 3: Bit flip
    const rowEpoch = baseTime + i * 2000;

    let vector: IngestionVector = "CBS";
    let pdfTrailerCount = 1;
    let refNum = generateRrn(rowEpoch, prng);
    let tamperReason = "";
    let openingBal = 500000;
    let closingBal = 450000;
    let amount = 50000;

    if (tamperType === 0) {
      vector = "PDF";
      pdfTrailerCount = prng.nextInt(2, 5); // Multi-trailer Canva modification
      tamperReason = `Secondary XRef incremental trailer detected (%%EOF count = ${pdfTrailerCount})`;
    } else if (tamperType === 1) {
      vector = "CBS";
      amount = 200000;
      closingBal = openingBal; // Stolen ₹2L deficit concealed from closing balance
      tamperReason = "Double-entry deficit: ₹2,00,000 debited without balance reduction";
    } else if (tamperType === 2) {
      vector = "UPI";
      refNum = generateRrn(rowEpoch, prng, true); // Julian day 367, Hour 25
      tamperReason = "ISO 8583 DE-37 format contradiction: Julian Day 367 > 365";
    } else {
      vector = "CBS";
      tamperReason = "SHA-256 genesis hash mismatch: 1-bit flip in raw custodial block";
    }

    rows.push({
      rowSeq: i + 1,
      id: `TAMPER-FUZZ-${String(i + 1).padStart(6, "0")}`,
      timestamp: formatIst(rowEpoch),
      epochMs: rowEpoch,
      corpusType: "ADVERSARIAL_TAMPER",
      vector,
      senderId: "SBIN-30910029101",
      senderName: "Sunil Kumar (Complainant)",
      receiverId: "HDFC-5010029419920",
      receiverName: "Vikram Shah (L1 Mule)",
      amountInr: amount,
      openingBal,
      closingBal,
      refNum,
      pdfTrailerCount,
      _groundTruth: "TAMPERED_ROW",
      _tamperReason: tamperReason,
    });
  }

  return rows;
}

/**
 * CORPUS 05: Multi-State Syndicate Graph (I4C Samanvaya Scale)
 * 50,000 cross-bank edges with shared JA4, BSSID hops, and Dual-SIM tower telemetry.
 */
export function generateSyndicateGraphStream(
  rowCount: number,
  prng: Xoshiro128StarStar
): BenchmarkRow[] {
  const rows: BenchmarkRow[] = [];
  const baseTime = new Date("2026-09-22T09:30:00+05:30").getTime();

  for (let i = 0; i < rowCount; i++) {
    const isSyndicateAnchor = i % 8 === 0;
    const rowEpoch = baseTime + i * prng.nextInt(1500, 8000);

    const bssid = isSyndicateAnchor ? "74:DA:38:A2:11:BC" : `00:${prng.nextInt(10, 99)}:${prng.nextInt(10, 99)}:AA:BB:CC`;
    const ja4 = isSyndicateAnchor ? "t13d1516h2_8daaf6" : `t13d${prng.nextInt(1000, 9999)}h2_${prng.nextInt(1000, 9999)}`;
    const imei = isSyndicateAnchor ? "867492061234564" : `8674920${prng.nextInt(10000000, 99999999)}`;

    rows.push({
      rowSeq: i + 1,
      id: `SYN-GRAPH-${String(i + 1).padStart(6, "0")}`,
      timestamp: formatIst(rowEpoch),
      epochMs: rowEpoch,
      corpusType: "SYNDICATE_GRAPH",
      vector: "DEVICE_XML",
      senderId: isSyndicateAnchor ? "MULE-CORE-001" : `MULE-RAND-${i}`,
      senderName: isSyndicateAnchor ? "Kingpin Tethered Handset" : `Peripheral Account #${i}`,
      receiverId: "TERMINAL-PAYTM-1109",
      receiverName: "Syndicate Cashout Sink",
      amountInr: prng.nextInt(25000, 185000),
      openingBal: 0,
      closingBal: 0,
      refNum: `SYN-${prng.nextInt(100000, 999999)}`,
      deviceBssid: bssid,
      ja4Fingerprint: ja4,
      imei,
      cellId: isSyndicateAnchor ? "DL-TWR-891-S2" : `MH-TWR-${prng.nextInt(100, 999)}`,
      _groundTruth: isSyndicateAnchor ? "TRUE_MULE" : "INNOCENT_SUBSCRIBER",
      _tamperReason: isSyndicateAnchor ? "TTL=63 3-Factor Tethering Corroboration" : undefined,
    });
  }

  return rows;
}

/**
 * Dispatcher: Generate benchmark rows for any selected corpus
 */
export function generateForensicCorpus(
  corpusType: CorpusType,
  rowCount: number,
  seed: string = "TARKA-I4C-2026-BENCH-01",
  noise: NoiseOptions = {}
): BenchmarkRow[] {
  const prng = new Xoshiro128StarStar(seed);
  switch (corpusType) {
    case "NPCI_BURST":
      return generateNpciBurstStream(rowCount, prng, noise);
    case "CGNAT_HAYSTACK":
      return generateCgnatHaystackStream(rowCount, prng, noise);
    case "GSTIN_POS_FLOOD":
      return generateGstinPosFloodStream(rowCount, prng, noise);
    case "ADVERSARIAL_TAMPER":
      return generateAdversarialTamperStream(rowCount, prng);
    case "SYNDICATE_GRAPH":
      return generateSyndicateGraphStream(rowCount, prng);
    default:
      return generateNpciBurstStream(rowCount, prng, noise);
  }
}

