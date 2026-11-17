"""Device / login-log evidence: CDR, IPDR and bank login logs streamed into the case's derived.sqlite.

One row = one sighting: an account (UPI id / account no.) or phone seen with an IMEI, IMSI, IP, Wi-Fi BSSID or
device id at a time. Accounts that share an identifier form a cluster — often the strongest sign that
"different" mules are one person.
"""

from __future__ import annotations

import csv
import re
import sqlite3
from collections import defaultdict
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.services.ingestion.derived_store import BATCH_ROWS, DerivedStore, _DateParser

DEVICE_KINDS = ("imei", "imsi", "device_id", "bssid", "ip")  # strongest evidence of "one person" first
_TABLE_KINDS = ("imei", "imsi", "ip", "bssid", "device_id")  # device_events column order
# An identifier seen on more accounts than this is a carrier NAT / public Wi-Fi / shared kiosk, not one person.
COMMON_LIMIT = 25

# header token → field; checked in order, so "device_id" wins over "id", "imei" over "device".
_ALIASES = [
    ("imei", ("imei",)),
    ("imsi", ("imsi",)),
    ("bssid", ("bssid", "wifi_mac", "wifi", "ap_mac")),
    ("device_id", ("device_id", "deviceid", "android_id", "device_fingerprint", "device")),
    ("ip", ("ip", "client_ip", "public_ip", "source_ip", "src_ip", "ip_address", "ipv4", "ipv6")),
    ("phone", ("msisdn", "mobile", "phone", "a_number", "a_party", "caller", "calling_number")),
    ("account", ("account", "acct", "vpa", "upi", "upi_id", "customer", "customer_id", "user_id", "party")),
    ("time", ("timestamp", "datetime", "date_time", "time", "date", "start_time", "login_time", "event_time")),
    ("event", ("event", "event_type", "action", "activity", "call_type", "type")),
]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS device_events (job_id TEXT, line INTEGER, ts REAL, acct TEXT, phone TEXT,
    imei TEXT, imsi TEXT, ip TEXT, bssid TEXT, device_id TEXT, event TEXT);
CREATE INDEX IF NOT EXISTS device_events_acct ON device_events(acct, ts);
"""


def _norm(h: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", h.strip().lower()).strip("_")


def map_device_columns(header: List[str]) -> Dict[str, int]:
    cols: Dict[str, int] = {}
    for i, h in enumerate(header):
        name = _norm(h)
        tokens = set(name.split("_"))
        for field, aliases in _ALIASES:
            if field not in cols and (name in aliases or any(a in tokens for a in aliases if "_" not in a)):
                cols[field] = i
                break
    return cols


def looks_like_device_log(header: List[str]) -> bool:
    """A sighting log: who (account or phone) + when + at least one device identifier, and no money column."""
    if any("amount" in _norm(h) for h in header):
        return False
    cols = map_device_columns(header)
    return "time" in cols and ("account" in cols or "phone" in cols) and any(k in cols for k in DEVICE_KINDS)


def _phone(s: str) -> str:
    digits = re.sub(r"\D", "", s)
    return digits[-10:] if len(digits) >= 10 else ""


def ingest_device_csv(case_dir: Path, job_id: str, csv_path: Path) -> Dict[str, Any]:
    """Stream rows into device_events; rows without a time, owner or identifier go to `rejected` with a reason."""
    store = DerivedStore(case_dir)  # makes sure the shared tables (txns, rejected, identifiers) exist
    rows_read = accepted = rejected = 0
    accounts, seen = set(), {k: set() for k in DEVICE_KINDS}
    dates = _DateParser()
    with closing(sqlite3.connect(store.path)) as db, open(csv_path, "r", encoding="utf-8", errors="replace", newline="") as f:
        db.executescript(_SCHEMA)
        for table in ("device_events", "rejected"):
            db.execute(f"DELETE FROM {table} WHERE job_id = ?", (job_id,))
        reader = csv.reader(f)
        cols = map_device_columns(next(reader, []))
        get = lambda row, key: row[cols[key]].strip() if key in cols and cols[key] < len(row) else ""
        good: List[tuple] = []
        bad: List[tuple] = []

        def flush():
            db.executemany("INSERT INTO device_events VALUES (?,?,?,?,?,?,?,?,?,?,?)", good)
            db.executemany("INSERT INTO rejected VALUES (?,?,?,?)", bad)
            db.commit()
            good.clear()
            bad.clear()

        for row in reader:
            if not row or all(not c.strip() for c in row):
                continue
            rows_read += 1
            line, raw = reader.line_num, ",".join(row)[:2000]
            phone = _phone(get(row, "phone"))
            acct = get(row, "account").lower() or phone
            ids = {k: get(row, k).upper() if k in ("imei", "imsi", "bssid") else get(row, k) for k in DEVICE_KINDS}
            if ids["imei"]:
                ids["imei"] = re.sub(r"\D", "", ids["imei"])[:15]  # IMEISV / spaced IMEI → 15 digits
            when = get(row, "time")
            reason = None
            if not acct:
                reason = "No account or phone number on this row"
            elif not any(ids.values()):
                reason = "No IMEI, IMSI, IP, Wi-Fi or device id on this row"
            elif not when:
                reason = "Missing time"
            if reason is None:
                try:
                    ts = dates.epoch(when)
                except (ValueError, OverflowError) as e:
                    reason = f"Failed to parse datetime '{when}': {e}"
            if reason:
                bad.append((job_id, line, raw, reason))
            else:
                good.append((job_id, line, ts, acct, phone, *(ids[k] or None for k in _TABLE_KINDS), get(row, "event") or None))
                accounts.add(acct)
                for k in DEVICE_KINDS:
                    if ids[k]:
                        seen[k].add(ids[k])
                accepted += 1
            if len(good) + len(bad) >= BATCH_ROWS:
                rejected += len(bad)
                flush()
        rejected += len(bad)
        flush()
    return {
        "parser": "device_log",
        "rows_read": rows_read,
        "rows_accepted": accepted,
        "rows_rejected": rejected,
        "unique_parties": len(accounts),
        "identifiers_by_kind": {k: len(v) for k, v in seen.items() if v},
    }


_SIM_EVENT = re.compile(r"sim|swap|port|imsi|reissue", re.I)


def case_devices(case_dir: Path, account: Optional[str] = None, kind: Optional[str] = None,
                 value: Optional[str] = None, limit: int = 500) -> Dict[str, Any]:
    """Shared-identifier clusters, SIM changes and (optionally) the source rows for one account or identifier."""
    empty = {"has_device_data": False, "events_total": 0, "accounts_total": 0, "clusters": [],
             "common_identifiers": [], "sim_changes": [], "accounts": [], "rows": None}
    path = case_dir / "derived.sqlite"
    if not path.exists():
        return empty
    with closing(sqlite3.connect(path)) as db:
        if not db.execute("SELECT 1 FROM sqlite_master WHERE name='device_events'").fetchone():
            return empty
        total = db.execute("SELECT COUNT(*) FROM device_events").fetchone()[0]
        if not total:
            return empty

        # value → accounts, with counts and time span
        holders: Dict[tuple, Dict[str, Any]] = {}
        per_acct: Dict[str, Dict[str, Any]] = {}
        for k in DEVICE_KINDS:
            q = f"SELECT {k}, acct, MAX(phone), COUNT(*), MIN(ts), MAX(ts) FROM device_events WHERE {k} IS NOT NULL GROUP BY {k}, acct"
            for val, acct, phone, n, t0, t1 in db.execute(q):
                h = holders.setdefault((k, val), {"kind": k, "value": val, "accounts": [], "events": 0, "first_ts": t0, "last_ts": t1})
                h["accounts"].append(acct)
                h["events"] += n
                h["first_ts"], h["last_ts"] = min(h["first_ts"], t0), max(h["last_ts"], t1)
                a = per_acct.setdefault(acct, {"key": acct, "phone": phone or None, "identifiers": {kk: [] for kk in DEVICE_KINDS}})
                a["identifiers"][k].append(val)
        for acct, n, t0, t1 in db.execute("SELECT acct, COUNT(*), MIN(ts), MAX(ts) FROM device_events GROUP BY acct"):
            per_acct[acct].update(events=n, first_ts=t0, last_ts=t1)

        shared = [h for h in holders.values() if 1 < len(h["accounts"]) <= COMMON_LIMIT]
        common = [{**{k: v for k, v in h.items() if k != "accounts"}, "account_count": len(h["accounts"])}
                  for h in holders.values() if len(h["accounts"]) > COMMON_LIMIT]

        # union-find over accounts joined by a shared identifier
        parent: Dict[str, str] = {}

        def find(x: str) -> str:
            while parent.setdefault(x, x) != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        for h in shared:
            for other in h["accounts"][1:]:
                parent[find(other)] = find(h["accounts"][0])
        groups: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"accounts": set(), "links": []})
        for h in shared:
            g = groups[find(h["accounts"][0])]
            g["accounts"].update(h["accounts"])
            g["links"].append(h)
        clusters = []
        for g in groups.values():
            accts = sorted(g["accounts"])
            links = sorted(g["links"], key=lambda l: (DEVICE_KINDS.index(l["kind"]), -len(l["accounts"])))
            clusters.append({
                "accounts": accts,
                "links": [{**l, "accounts": sorted(l["accounts"])} for l in links],
                # strongest evidence first: same handset / SIM beats same IP
                "strongest_kind": links[0]["kind"],
                "events": sum(per_acct[a]["events"] for a in accts),
            })
        clusters.sort(key=lambda c: (DEVICE_KINDS.index(c["strongest_kind"]) > 2, -len(c["accounts"]), c["accounts"][0]))
        for i, c in enumerate(clusters):
            c["cluster_id"] = f"DC-{i + 1:03d}"  # readable ids in display order

        # SIM changes: an account's IMSI changes, or the log itself says SIM swap / port
        sim_changes: List[Dict[str, Any]] = []
        prev: Dict[str, str] = {}
        for job_id, line, ts, acct, imsi, imei, event in db.execute(
                "SELECT job_id, line, ts, acct, imsi, imei, event FROM device_events ORDER BY acct, ts, line"):
            if imsi and acct in prev and prev[acct] != imsi:
                sim_changes.append({"account": acct, "ts": ts, "kind": "new_sim", "from": prev[acct], "to": imsi, "event": event,
                                    "imei": imei, "job_id": job_id, "line": line})
            elif event and _SIM_EVENT.search(event):
                sim_changes.append({"account": acct, "ts": ts, "kind": "logged", "event": event, "to": imsi,
                                    "imei": imei, "job_id": job_id, "line": line})
            if imsi:
                prev[acct] = imsi
        sim_changes.sort(key=lambda s: s["ts"])

        rows = None
        if account or (kind in DEVICE_KINDS and value):
            where, args = ("acct = ?", [account.strip().lower()]) if account else (f"{kind} = ?", [value])
            if account and kind in DEVICE_KINDS and value:
                where, args = where + f" AND {kind} = ?", args + [value]
            cur = db.execute(f"SELECT job_id, line, ts, acct, phone, imei, imsi, ip, bssid, device_id, event "
                             f"FROM device_events WHERE {where} ORDER BY ts, line LIMIT ?", (*args, limit))
            names = [d[0] for d in cur.description]
            rows = [dict(zip(names, r)) for r in cur]

    return {
        "has_device_data": True,
        "events_total": total,
        "accounts_total": len(per_acct),
        "clusters": clusters,
        "common_identifiers": sorted(common, key=lambda c: -c["account_count"])[:50],
        "sim_changes": sim_changes[:limit],
        "sim_changes_total": len(sim_changes),
        # shortcut: every account's identifiers in one payload; page it past ~20k accounts.
        "accounts": sorted(per_acct.values(), key=lambda a: a["key"]),
        "rows": rows,
    }
