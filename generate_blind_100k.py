import csv
import json
import random

random.seed(202604)

OUTPUT_CSV = "SUTRAM_100K_BLIND_TORTURE_TEST.csv"
ANSWER_KEY_JSON = "SUTRAM_SECRET_ANSWER_KEY.json"
TOTAL_ROWS = 100_000

# ---------------------------------------------------------------------------
# SECRET GROUND TRUTH (Never written to the CSV - saved only to ANSWER_KEY)
# ---------------------------------------------------------------------------
secret_answer_key = {
    "total_rows": TOTAL_ROWS,
    "doctored_balance_rows": [
        {"row_num": 14205, "tx_id": "TXN-0014205", "src_acct": "SBI_VIC_ARJUN_MEHTA", "booked_debit": 280000, "claimed_bal_error": 200000},
        {"row_num": 48912, "tx_id": "TXN-0048912", "src_acct": "HDFC_VIC_KAVITA_RAO", "booked_debit": 350000, "claimed_bal_error": 150000},
        {"row_num": 83104, "tx_id": "TXN-0083104", "src_acct": "ICICI_VIC_RAJESH_NAIR", "booked_debit": 195000, "claimed_bal_error": 100000},
    ],
    "forged_rrn_rows": [
        {"row_num": 22150, "rrn": "610514882109", "tx_timestamp": "2026-09-22T10:15:00Z", "reason": "Julian day 105 (Apr 15) != Sep 22 (Day 265)"},
        {"row_num": 61400, "rrn": "626522991044", "tx_timestamp": "2026-09-22T11:05:00Z", "reason": "RRN Hour 22 IST != 11:05 IST (+11h skew)"},
    ],
    "hidden_syndicates": [
        {
            "syndicate_id": "SYNDICATE_ALPHA_SCATTER_GATHER",
            "victim_acct": "SBI_VIC_ARJUN_MEHTA",
            "total_stolen_inr": 840000,
            "layer1_conduit": "AXIS_MULE_KARAN_DAS",
            "layer2_split_conduits": ["YES_MULE_PRIYA_SHARMA", "KOTAK_MULE_DEV_PATEL"],
            "innocent_merchant": "ICICI_MERCH_METRO_GOLD_GST",
            "merchant_tainted_inflow": 320000,
            "merchant_clean_inflow": 450000,
            "expected_libr_lien_on_merchant": 320000,
            "atm_cashout_sink": "ATM_GURUGRAM_CYBERHUB_09",
            "atm_cashed_out_inr": 220000,
            "retained_in_l2_mules_inr": 300000,
            "kingpin_imei": "359988007766552",
            "kingpin_ja4": "t13d1516h2_99aabbccddeeff01",
            "hotspot_bssid": "AA:BB:CC:11:22:33",
            "expected_cgnat_funnel": [412, 53, 7, 1],
        },
        {
            "syndicate_id": "SYNDICATE_BETA_SMURFING_FANOUT",
            "victim_acct": "HDFC_VIC_KAVITA_RAO",
            "total_stolen_inr": 495000,
            "layer1_conduit": "PNB_MULE_SURESH_YADAV",
            "layer2_split_conduits": [
                "BOI_MULE_SMURF_01",
                "BOI_MULE_SMURF_02",
                "BOI_MULE_SMURF_03",
                "BOI_MULE_SMURF_04",
                "BOI_MULE_SMURF_05",
            ],
            "structuring_tranche_inr": 99000,
            "kingpin_imei": "861122003344990",
            "kingpin_ja4": "t13d1516h2_77665544332211ff",
            "expected_cgnat_funnel": [288, 31, 4, 1],
        },
    ],
}

# Build CGNAT background noise pool so the set intersection must actually compute [412 -> 53 -> 7 -> 1]
alpha_pool_step1 = [f"35100000000{i:04d}" for i in range(411)] + ["359988007766552"]
alpha_pool_step2 = alpha_pool_step1[:52] + ["359988007766552"]
alpha_pool_step3 = alpha_pool_step2[:6] + ["359988007766552"]
alpha_pool_step4 = ["359988007766552"]

special_rows = {}

# 1. Plant Doctored Double-Entry Balance Rows
for item in secret_answer_key["doctored_balance_rows"]:
    r = item["row_num"]
    old_b = 900000
    debit = item["booked_debit"]
    doctored_new_b = (old_b - debit) + item["claimed_bal_error"]  # Violates conservation!
    special_rows[r] = {
        "tx_id": item["tx_id"],
        "timestamp_ist": "2026-09-22T10:00:14+05:30",
        "rrn_12": f"626510{r % 1000000:06d}",
        "rail": "UPI",
        "src_acct": item["src_acct"],
        "dst_acct": "AXIS_MULE_KARAN_DAS" if r == 14205 else "PNB_MULE_SURESH_YADAV",
        "amount_inr": debit,
        "src_old_bal": old_b,
        "src_new_bal": doctored_new_b,
        "dst_old_bal": 12000,
        "dst_new_bal": 12000 + debit,
        "cgnat_ip": "49.36.128.90",
        "source_port": "",
        "candidate_imeis_pipe": "|".join(alpha_pool_step1[:20]),
        "imei_observed": "359988007766552",
        "ja4_tls": "t13d1516h2_99aabbccddeeff01",
        "bssid_hotspot": "AA:BB:CC:11:22:33",
        "packet_ttl": 63,
        "merchant_gstin": "",
    }

# 2. Plant Forged RRN Rows
for item in secret_answer_key["forged_rrn_rows"]:
    r = item["row_num"]
    special_rows[r] = {
        "tx_id": f"TXN-{r:07d}",
        "timestamp_ist": item["tx_timestamp"],
        "rrn_12": item["rrn"],
        "rail": "UPI",
        "src_acct": f"SBI_CUST_{r}",
        "dst_acct": f"HDFC_MULE_{r}",
        "amount_inr": 45000,
        "src_old_bal": 100000,
        "src_new_bal": 55000,
        "dst_old_bal": 5000,
        "dst_new_bal": 50000,
        "cgnat_ip": "49.36.200.11",
        "source_port": "44120",
        "candidate_imeis_pipe": "354433221100998",
        "imei_observed": "354433221100998",
        "ja4_tls": "t13d1516h2_aa11bb22cc33dd44",
        "bssid_hotspot": "",
        "packet_ttl": 64,
        "merchant_gstin": "",
    }

# 3. Plant SYNDICATE_ALPHA Multi-Hop Flow (Rows 30001..30006)
alpha_hops = [
    # Hop 1: Victim Arjun Mehta -> L1 Karan Das (₹8,40,000)
    (30001, "SBI_VIC_ARJUN_MEHTA", "AXIS_MULE_KARAN_DAS", 840000, 1000000, 160000, 5000, 845000, alpha_pool_step1, ""),
    # Hop 2A: L1 Karan Das -> L2A Priya Sharma (₹5,00,000)
    (30002, "AXIS_MULE_KARAN_DAS", "YES_MULE_PRIYA_SHARMA", 500000, 845000, 345000, 2000, 502000, alpha_pool_step2, ""),
    # Hop 2B: L1 Karan Das -> L2B Dev Patel (₹3,40,000)
    (30003, "AXIS_MULE_KARAN_DAS", "KOTAK_MULE_DEV_PATEL", 340000, 345000, 5000, 1000, 341000, alpha_pool_step3, ""),
    # Hop 3A: L2A Priya Sharma -> Innocent Merchant Metro Gold (₹3,20,000 tainted)
    (30004, "YES_MULE_PRIYA_SHARMA", "ICICI_MERCH_METRO_GOLD_GST", 320000, 502000, 182000, 100000, 420000, alpha_pool_step4, "07AABCM9988F1Z2"),
    # Hop 3B: L2B Dev Patel -> Gurugram ATM Cashout (₹2,20,000 cashed out)
    (30005, "KOTAK_MULE_DEV_PATEL", "ATM_GURUGRAM_CYBERHUB_09", 220000, 341000, 121000, 0, 220000, alpha_pool_step4, ""),
    # Hop 3C: Clean Retail Customers -> Innocent Merchant Metro Gold (+₹4,50,000 clean working capital!)
    (30006, "RETAIL_CUSTOMERS_BATCH", "ICICI_MERCH_METRO_GOLD_GST", 450000, 900000, 450000, 420000, 870000, ["351111111111111"], "07AABCM9988F1Z2"),
]

for r, src, dst, amt, s_old, s_new, d_old, d_new, pool, gstin in alpha_hops:
    special_rows[r] = {
        "tx_id": f"TXN-{r:07d}",
        "timestamp_ist": f"2026-09-22T10:0{r - 30000}:15+05:30",
        "rrn_12": f"626510{r % 1000000:06d}",
        "rail": "UPI" if amt <= 500000 else "IMPS",
        "src_acct": src,
        "dst_acct": dst,
        "amount_inr": amt,
        "src_old_bal": s_old,
        "src_new_bal": s_new,
        "dst_old_bal": d_old,
        "dst_new_bal": d_new,
        "cgnat_ip": "103.21.144.92",
        "source_port": "",
        "candidate_imeis_pipe": "|".join(pool),
        "imei_observed": "359988007766552" if not gstin else "351111111111111",
        "ja4_tls": "t13d1516h2_99aabbccddeeff01" if not gstin else "t13d1516h2_clean_pos",
        "bssid_hotspot": "AA:BB:CC:11:22:33" if not gstin else "",
        "packet_ttl": 63 if not gstin else 64,
        "merchant_gstin": gstin,
    }

# 4. Plant SYNDICATE_BETA Smurfing Fan-Out (Rows 55000..55005)
beta_pool_1 = [f"86200000000{i:04d}" for i in range(287)] + ["861122003344990"]
beta_pool_2 = beta_pool_1[:30] + ["861122003344990"]
beta_pool_3 = beta_pool_2[:3] + ["861122003344990"]
beta_pool_4 = ["861122003344990"]

special_rows[55000] = {
    "tx_id": "TXN-0055000",
    "timestamp_ist": "2026-09-22T11:10:05+05:30",
    "rrn_12": "626511055000",
    "rail": "IMPS",
    "src_acct": "HDFC_VIC_KAVITA_RAO",
    "dst_acct": "PNB_MULE_SURESH_YADAV",
    "amount_inr": 495000,
    "src_old_bal": 600000,
    "src_new_bal": 105000,
    "dst_old_bal": 1000,
    "dst_new_bal": 496000,
    "cgnat_ip": "106.215.88.14",
    "source_port": "",
    "candidate_imeis_pipe": "|".join(beta_pool_1),
    "imei_observed": "861122003344990",
    "ja4_tls": "t13d1516h2_77665544332211ff",
    "bssid_hotspot": "DD:EE:FF:44:55:66",
    "packet_ttl": 63,
    "merchant_gstin": "",
}

for idx in range(1, 6):
    r = 55000 + idx
    pool = beta_pool_2 if idx == 1 else (beta_pool_3 if idx == 2 else beta_pool_4)
    special_rows[r] = {
        "tx_id": f"TXN-{r:07d}",
        "timestamp_ist": f"2026-09-22T11:1{idx}:20+05:30",
        "rrn_12": f"626511{r % 1000000:06d}",
        "rail": "UPI",
        "src_acct": "PNB_MULE_SURESH_YADAV",
        "dst_acct": f"BOI_MULE_SMURF_0{idx}",
        "amount_inr": 99000,
        "src_old_bal": 496000 - (idx - 1) * 99000,
        "src_new_bal": 496000 - idx * 99000,
        "dst_old_bal": 500,
        "dst_new_bal": 99500,
        "cgnat_ip": "106.215.88.14",
        "source_port": "",
        "candidate_imeis_pipe": "|".join(pool),
        "imei_observed": "861122003344990",
        "ja4_tls": "t13d1516h2_77665544332211ff",
        "bssid_hotspot": "DD:EE:FF:44:55:66",
        "packet_ttl": 63,
        "merchant_gstin": "",
    }

fieldnames = [
    "tx_id", "timestamp_ist", "rrn_12", "rail", "src_acct", "dst_acct",
    "amount_inr", "src_old_bal", "src_new_bal", "dst_old_bal", "dst_new_bal",
    "cgnat_ip", "source_port", "candidate_imeis_pipe", "imei_observed",
    "ja4_tls", "bssid_hotspot", "packet_ttl", "merchant_gstin"
]

with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for r in range(1, TOTAL_ROWS + 1):
        if r in special_rows:
            writer.writerow(special_rows[r])
        else:
            amt = random.randint(150, 18500)
            s_old = random.randint(25000, 400000)
            d_old = random.randint(10000, 500000)
            is_merch = (r % 3 == 0)
            writer.writerow({
                "tx_id": f"TXN-{r:07d}",
                "timestamp_ist": "2026-09-22T10:12:00+05:30",
                "rrn_12": f"626510{r % 1000000:06d}",
                "rail": "UPI",
                "src_acct": f"CITIZEN_ACCT_{r % 12000:05d}",
                "dst_acct": f"MERCH_RETAIL_{r % 1500:04d}" if is_merch else f"PEER_ACCT_{r % 9000:05d}",
                "amount_inr": amt,
                "src_old_bal": s_old,
                "src_new_bal": s_old - amt,
                "dst_old_bal": d_old,
                "dst_new_bal": d_old + amt,
                "cgnat_ip": f"49.36.{r % 250}.{(r * 7) % 250}",
                "source_port": str(30000 + (r % 20000)),
                "candidate_imeis_pipe": f"35800000{r % 9999999:07d}",
                "imei_observed": f"35800000{r % 9999999:07d}",
                "ja4_tls": "t13d1516h2_standard_android",
                "bssid_hotspot": "",
                "packet_ttl": 64,
                "merchant_gstin": f"27AAACM{r % 9000:04d}F1Z5" if is_merch else "",
            })

with open(ANSWER_KEY_JSON, "w", encoding="utf-8") as f:
    json.dump(secret_answer_key, f, indent=2)

print(f"[SUCCESS] Generated {TOTAL_ROWS:,} unlabelled rows -> {OUTPUT_CSV}")
print(f"[KEY] Saved secret verification key -> {ANSWER_KEY_JSON}")
