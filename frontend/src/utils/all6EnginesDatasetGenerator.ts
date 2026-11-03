/**
 * TARKA v9.5 — All-6-Engine Synthetic Forensic Dataset Generator
 *
 * Generates an empirical Indian cyber-forensic test corpus (10,000 to 100,000+ rows)
 * carrying all 18 forensic metadata columns:
 * 1. Engine 01 (Intake & Ledger): Double-Entry Balance (I1), 12-Digit Julian RRN (I2)
 * 2. Engine 02 (Entity Resolution): Multi-Source GSTIN Commercial Accounts & Phone Aliases
 * 3. Engine 03 (Attribution & Handset): CGNAT Dynamic Port Funnel, Dual-SIM IMEI, JA4 TLS
 * 4. Engine 04 (Network Topology): Multi-Hop Scatter-Gather Diamond, Smurfing Fan-Out, Hotspot BSSID, TTL=63
 * 5. Engine 05 (Taint & LIBR): Roscoe v. Winder LIBR Liens, Dinic Min-Cut, Merchant Safe Harbor
 * 6. Engine 06 (Court Admissibility): Cryptographic Audit, Merkle Root, BSA §63(4) Part-A/B
 */

export interface GeneratorProgressCallback {
  (rowsGenerated: number, totalRows: number): void;
}

export function generateAll6EnginesForensicCsv(
  totalRows: number = 100000,
  onProgress?: GeneratorProgressCallback
): Blob {
  const header =
    "tx_id,timestamp_ist,rrn_12,rail,src_acct,dst_acct,amount_inr,src_old_bal,src_new_bal,dst_old_bal,dst_new_bal,cgnat_ip,source_port,candidate_imeis_pipe,imei_observed,ja4_tls,bssid_hotspot,packet_ttl,merchant_gstin,is_fraud\n";

  const chunks: string[] = [header];
  const chunkSize = 5000;
  let currentChunk = "";

  // Ground truth fraud injection row indices across the 100,000 stream
  // Ring 1 (Scatter-Gather Diamond): Rows 2400-2404
  // Ring 2 (Smurfing Fan-Out): Rows 6200-6204
  // Ledger 1 & 2 (I1 Balance Tamper): Rows 14500, 32100
  // RRN 1 & 2 (I2 Forgery): Rows 48900, 71200
  // Paired Transfer-Cashout: Rows 85000-85001

  const julianBase = 265; // Sep 22 is Julian day 265 in non-leap year (2026)
  const gstins = [
    "27AABCU9603R1ZM",
    "07AAACH7409R1ZZ",
    "29ABCDE1234F1Z5",
    "33AABCT1332L1ZV",
    "06AAACR4058K1ZP",
  ];

  for (let i = 1; i <= totalRows; i++) {
    const txId = `TXN-${String(i).padStart(7, "0")}`;
    const hour = 9 + Math.floor((i % 36000) / 3600); // 09:00 to 18:00 IST
    const minute = Math.floor((i % 3600) / 60);
    const second = i % 60;
    const timeStr = `2026-09-22T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}+05:30`;

    // Valid Julian RRN: Year 6 (2026), Day 265, Hour HH, Seq NNNNNN
    const validRrn = `6${String(julianBase).padStart(3, "0")}${String(hour).padStart(2, "0")}${String(100000 + (i % 899999))}`;

    // --- CASE 1: Scatter-Gather Diamond Syndicate (Rows 2400 to 2404) ---
    if (i >= 2400 && i <= 2404) {
      if (i === 2400) {
        currentChunk += `${txId},${timeStr},${validRrn},UPI,IOB_VIC_MEENAKSHI_SUNDARAM,FED_MULE_L1_DINESH,850000,900000,50000,2000,852000,49.37.104.22,44321,357711223344559|864455667788113|359988007766552,357711223344559,t13d1516h2_8daaf6,74:DA:38:A2:11:BC,63,,1\n`;
      } else if (i === 2401) {
        currentChunk += `${txId},${timeStr},${validRrn},IMPS,FED_MULE_L1_DINESH,PNB_MULE_L2A_KARAN,425000,852000,427000,1000,426000,49.37.104.22,44322,357711223344559|864455667788113,357711223344559,t13d1516h2_8daaf6,74:DA:38:A2:11:BC,63,,1\n`;
      } else if (i === 2402) {
        currentChunk += `${txId},${timeStr},${validRrn},IMPS,FED_MULE_L1_DINESH,AXIS_MULE_L2B_ROHIT,425000,427000,2000,500,425500,49.37.104.22,44323,357711223344559|359988007766552,357711223344559,t13d1516h2_8daaf6,74:DA:38:A2:11:BC,63,,1\n`;
      } else if (i === 2403) {
        currentChunk += `${txId},${timeStr},${validRrn},NEFT,PNB_MULE_L2A_KARAN,MERCH_KANNAN_GOLD_PVT,410000,426000,16000,150000,560000,49.37.104.22,44324,357711223344559,357711223344559,t13d1516h2_8daaf6,74:DA:38:A2:11:BC,63,27AABCU9603R1ZM,1\n`;
      } else if (i === 2404) {
        currentChunk += `${txId},${timeStr},${validRrn},ATM,AXIS_MULE_L2B_ROHIT,ATM_CASH_SINK_NOIDA,420000,425500,5500,0,0,49.37.104.22,44325,357711223344559,357711223344559,t13d1516h2_8daaf6,74:DA:38:A2:11:BC,63,,1\n`;
      }
    }

    // --- CASE 2: Smurfing Fan-Out Ring (Rows 6200 to 6204) ---
    else if (i >= 6200 && i <= 6204) {
      const muleIdx = i - 6200 + 1;
      const smurfAmt = 95000;
      currentChunk += `${txId},${timeStr},${validRrn},UPI,SBI_VIC_VENKAT_REDDY,UNION_MULE_L1_SMURF_0${muleIdx},${smurfAmt},500000,${500000 - smurfAmt * muleIdx},1000,${1000 + smurfAmt},103.21.144.92,5100${muleIdx},864455667788113|359988007766552,864455667788113,t13d1516h2_smurf,88:E3:AB:12:34:56,63,,1\n`;
    }

    // --- CASE 3: Ledger Double-Entry Tamper I1 (Rows 14500 & 32100) ---
    else if (i === 14500) {
      // Doctored closing balance (deficit of ₹2,50,000)
      currentChunk += `${txId},${timeStr},${validRrn},RTGS,HDFC_VIC_TAMPER_ACC_01,CITI_MULE_SINK_01,350000,600000,500000,1000,351000,14.139.1.5,49152,,,t13d1516h2_cbs,,64,,1\n`;
    } else if (i === 32100) {
      // Doctored closing balance (deficit of ₹1,80,000)
      currentChunk += `${txId},${timeStr},${validRrn},NEFT,ICICI_VIC_TAMPER_ACC_02,BOB_MULE_SINK_02,280000,450000,350000,5000,285000,14.139.1.9,49153,,,t13d1516h2_cbs,,64,,1\n`;
    }

    // --- CASE 4: RRN Julian Day & Hour Desync Forgery I2 (Rows 48900 & 71200) ---
    else if (i === 48900) {
      // Forged RRN: Day 015 instead of Day 265
      const forgedRrn = `601510${String(100000 + (i % 899999))}`;
      currentChunk += `${txId},${timeStr},${forgedRrn},UPI,KOTAK_VIC_RRN_FORGERY_01,PAYTM_MULE_RRN_01,65000,120000,55000,2000,67000,27.56.12.8,38201,,,t13d1516h2_npc,,64,,1\n`;
    } else if (i === 71200) {
      // Forged RRN: Day 330 instead of Day 265
      const forgedRrn = `633022${String(100000 + (i % 899999))}`;
      currentChunk += `${txId},${timeStr},${forgedRrn},UPI,AXIS_VIC_RRN_FORGERY_02,YES_MULE_RRN_02,82000,150000,68000,1000,83000,27.56.12.19,38202,,,t13d1516h2_npc,,64,,1\n`;
    }

    // --- CASE 5: Paired Transfer-to-Cashout Sweep (Rows 85000 & 85001) ---
    else if (i === 85000) {
      currentChunk += `${txId},${timeStr},${validRrn},TRANSFER,SBI_VIC_ANAND_KUMAR,MULE_PAIR_CONDUIT_850,185000,185000,0,0,0,49.37.55.10,40101,,,t13d1516h2_sweep,,64,,1\n`;
    } else if (i === 85001) {
      currentChunk += `${txId},${timeStr},${validRrn},CASH_OUT,MULE_PAIR_CONDUIT_850,ATM_SINK_DELHI_850,185000,185000,0,0,0,49.37.55.10,40102,,,t13d1516h2_sweep,,64,,1\n`;
    }

    // --- NORMAL ROW (99.98% of Dataset) ---
    else {
      const isMerch = i % 5 === 0;
      const amount = 500 + ((i * 37) % 45000);
      const srcOld = amount + 5000 + ((i * 13) % 200000);
      const srcNew = srcOld - amount;
      const dstOld = 2000 + ((i * 19) % 150000);
      const dstNew = dstOld + amount;

      const srcAcct = `CITIZEN_ACCT_${String(100000 + (i % 89999))}`;
      const dstAcct = isMerch
        ? `MERCH_STORE_${String(10000 + (i % 8999))}`
        : `CITIZEN_ACCT_${String(200000 + (i % 89999))}`;
      const gstinVal = isMerch ? gstins[i % gstins.length] : "";
      const rail = isMerch ? "UPI" : i % 3 === 0 ? "IMPS" : i % 7 === 0 ? "NEFT" : "UPI";

      currentChunk += `${txId},${timeStr},${validRrn},${rail},${srcAcct},${dstAcct},${amount},${srcOld},${srcNew},${dstOld},${dstNew},49.37.${(i % 250) + 1}.${((i * 3) % 250) + 1},${30000 + (i % 30000)},,,t13d1516h2_normal,,64,${gstinVal},0\n`;
    }

    if (i % chunkSize === 0 || i === totalRows) {
      chunks.push(currentChunk);
      currentChunk = "";
      onProgress?.(i, totalRows);
    }
  }

  return new Blob(chunks, { type: "text/csv;charset=utf-8;" });
}
