"""Per-case derived evidence store: streaming bank/UPI parse → transactions, identifiers, rejected rows.

shortcut: one SQLite file per case (stdlib, no new dependency); move to DuckDB/Parquet when
cross-case analytics or multi-GB scans get slow.
"""

from __future__ import annotations

import csv
import json
import math
import re
import sqlite3
import threading
import time
from collections import Counter, defaultdict
from contextlib import closing
from pathlib import Path
import datetime
from typing import Any, Callable, Dict, List, Optional

from dateutil import parser as dt_parser

import tarka.core  # noqa: F401  must load before tarka.parsers (the two packages import each other)
from tarka.parsers.bank_upi import IST_TIMEZONE, BankUPIParser

BATCH_ROWS = 50_000

IDENTIFIER_PATTERNS = {
    "vpa": re.compile(r"\b[\w.\-]{2,}@[a-zA-Z]{2,}\b"),
    "ifsc": re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b"),
    "phone": re.compile(r"(?<!\d)(?:\+?91[\-\s]?)?[6-9]\d{9}(?!\d)"),
    "account": re.compile(r"(?<!\d)\d{9,18}(?!\d)"),
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS txns (job_id TEXT, line INTEGER, ts REAL, payer TEXT, payee TEXT, amount REAL, ref TEXT);
CREATE TABLE IF NOT EXISTS rejected (job_id TEXT, line INTEGER, raw TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS identifiers (job_id TEXT, kind TEXT, value TEXT, hits INTEGER,
                                        PRIMARY KEY (job_id, kind, value));
CREATE TABLE IF NOT EXISTS receipts (
    job_id TEXT PRIMARY KEY,
    artifact_id TEXT,
    filename TEXT,
    extracted_at REAL,
    amount REAL,
    currency TEXT,
    utr_rrn TEXT,
    vpa TEXT,
    txn_date TEXT,
    txn_time TEXT,
    upi_app TEXT,
    status TEXT,
    composite_anomaly_score REAL,
    assessment TEXT,
    forensics_json TEXT,
    reconciliation_json TEXT
);
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    job_id TEXT,
    line INTEGER,
    ts_raw TEXT,
    sender TEXT,
    body TEXT,
    identifiers_json TEXT
);
CREATE INDEX IF NOT EXISTS txns_job ON txns(job_id);
CREATE INDEX IF NOT EXISTS txns_ts ON txns(ts, line);
CREATE INDEX IF NOT EXISTS rejected_job ON rejected(job_id, line);
CREATE INDEX IF NOT EXISTS wa_job ON whatsapp_messages(job_id, line);
"""


def extract_identifiers(text: str) -> List[tuple]:
    """(kind, value) pairs; a phone number is not also counted as an account number."""
    found = []
    phones = set()
    for m in IDENTIFIER_PATTERNS["phone"].finditer(text):
        digits = re.sub(r"\D", "", m.group(0))[-10:]
        phones.add(digits)
        found.append(("phone", digits))
    for kind in ("vpa", "ifsc"):
        found.extend((kind, m.group(0)) for m in IDENTIFIER_PATTERNS[kind].finditer(text))
    found.extend(
        ("account", m.group(0)) for m in IDENTIFIER_PATTERNS["account"].finditer(text) if m.group(0)[-10:] not in phones
    )
    return found


def looks_like_bank_statement(header_line: str) -> bool:
    cols = BankUPIParser.map_columns(next(csv.reader([header_line]), []))
    return "date" in cols and "amount" in cols


def read_header(path: Path) -> List[str]:
    with open(path, "r", encoding="utf-8", errors="replace", newline="") as f:
        return next(csv.reader(f), [])


def read_sample_rows(path: Path, n: int = 5) -> List[List[str]]:
    """First n non-empty data rows (after the header), for the column-mapping preview."""
    out: List[List[str]] = []
    with open(path, "r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if row and any(c.strip() for c in row):
                out.append([c[:200] for c in row[:60]])
                if len(out) >= n:
                    break
    return out


def columns_from_names(header: List[str], names: Dict[str, str]) -> Dict[str, int]:
    """{field: header name} → {field: column index}. Date and amount are required."""
    norm = [h.strip().lower() for h in header]
    cols: Dict[str, int] = {}
    for field, name in names.items():
        if field not in ("date", "time", "payer", "payee", "amount", "ref") or not name:
            continue
        try:
            cols[field] = norm.index(name.strip().lower())
        except ValueError:
            raise ValueError(f"Column '{name}' is not in this file's header.")
    if "date" not in cols or "amount" not in cols:
        raise ValueError("Pick the date and amount columns.")
    return cols


_DT_FORMATS = (
    "%d/%m/%Y %H:%M:%S", "%d-%m-%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M", "%d-%b-%Y %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d",
)


# Payment rail guessed from the reference and the account format (statements rarely carry a rail column).
RAIL_SQL = """CASE
 WHEN upper(ref) LIKE '%RTGS%' THEN 'RTGS'
 WHEN upper(ref) LIKE '%NEFT%' THEN 'NEFT'
 WHEN upper(ref) LIKE '%IMPS%' THEN 'IMPS'
 WHEN instr(payer, '@') > 0 OR instr(payee, '@') > 0 OR upper(ref) LIKE '%UPI%' THEN 'UPI'
 WHEN upper(payer || ' ' || payee) LIKE '%ATM%' OR upper(payee) LIKE '%CASH%' THEN 'Cash'
 ELSE 'Other' END"""
RAILS = ("UPI", "IMPS", "NEFT", "RTGS", "Cash", "Other")
# "Failed to parse datetime 'x': ..." → "Failed to parse datetime" so one bad format is one group.
REASON_SQL = "CASE WHEN instr(reason, ' ''') > 0 THEN substr(reason, 1, instr(reason, ' ''') - 1) ELSE reason END"


class _DateParser:
    """Fast path: remember the strptime format that last worked; fall back to dateutil (day-first)."""

    def __init__(self):
        self.fmt: Optional[str] = None
        self._day: Dict[str, float] = {}  # date text -> epoch; statements repeat a few hundred dates millions of times

    def epoch_of(self, date_s: str, time_s: str) -> float:
        """Same result as epoch(f"{date_s} {time_s}"), parsing each distinct date once and the time by hand."""
        parts = time_s.split(":") if time_s else ()
        if len(parts) in (2, 3) and all(x.isdigit() and len(x) <= 2 for x in parts):
            day = self._day.get(date_s)
            if day is None:
                if len(self._day) > 100_000:  # a full timestamp in the date column: don't grow without bound
                    self._day.clear()
                day = self._day[date_s] = self.epoch(date_s)
            h, m, sec = (int(x) for x in (parts + ["0"])[:3])
            if h > 23 or m > 59 or sec > 59:
                raise ValueError(f"time out of range: {time_s}")
            return day + h * 3600 + m * 60 + sec
        return self.epoch(f"{date_s} {time_s}".strip())

    def epoch(self, text: str) -> float:
        for fmt in ((self.fmt,) if self.fmt else ()) + _DT_FORMATS:
            try:
                dt = datetime.datetime.strptime(text, fmt)
                self.fmt = fmt
                break
            except ValueError:
                continue
        else:
            dt = dt_parser.parse(text, dayfirst=True)  # raises on garbage → row is rejected
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST_TIMEZONE)
        return dt.timestamp()


# One ingest at a time per case file: two writers would fight for SQLite's write lock while indexes rebuild.
_CASE_LOCKS: Dict[str, threading.RLock] = defaultdict(threading.RLock)
_BULK_DROPPED_INDEXES = ("txns_ts", "txns_job", "txns_key")
# A row of this job that the case already holds (same time, payer, payee, amount and reference): overlapping bank
# statements (Jan–Mar, then Feb–Apr) are normal, and the same money must be counted once.
_REPEATED_ROWS = ("FROM txns t WHERE t.job_id = ? AND EXISTS (SELECT 1 FROM txns o WHERE o.ts = t.ts AND "
                  "o.payer = t.payer AND o.payee = t.payee AND o.amount = t.amount AND o.ref = t.ref AND o.rowid < t.rowid)")


class DerivedStore:
    def __init__(self, case_dir: Path):
        case_dir.mkdir(parents=True, exist_ok=True)
        self.path = case_dir / "derived.sqlite"
        self.lock = _CASE_LOCKS[str(self.path.resolve())]
        # A running ingest has dropped the txns indexes on purpose and rebuilds them when done; don't re-add them mid-load.
        if self.lock.acquire(blocking=False):
            try:
                with closing(self._connect()) as db:
                    db.executescript(_SCHEMA)
            finally:
                self.lock.release()

    def _connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.path)
        # WAL + NORMAL: no corruption on a crash (at worst the last batch is lost, and a job re-run replaces its rows),
        # and far cheaper commits than the default rollback journal with a full sync per batch.
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA synchronous=NORMAL")
        return db

    def ingest_bank_csv(self, job_id: str, csv_path: Path, columns: Optional[Dict[str, int]] = None,
                        progress: Optional[Callable[[int, int], None]] = None) -> Dict[str, Any]:
        """Load one statement with the txns indexes dropped, then rebuild them once (1M rows: 16 s -> 6.5 s).

        progress(rows_read, chars_read) is called once the case is free and after every batch.
        """
        with self.lock:
            if progress:
                progress(0, 0)
            with closing(self._connect()) as db:
                for table in ("txns", "rejected", "identifiers"):
                    db.execute(f"DELETE FROM {table} WHERE job_id = ?", (job_id,))  # re-run replaces; uses the index
                for name in _BULK_DROPPED_INDEXES:
                    db.execute(f"DROP INDEX IF EXISTS {name}")
                db.commit()
            try:
                summary = self._load_bank_csv(job_id, csv_path, columns, progress)
            finally:
                with closing(self._connect()) as db:
                    db.executescript(_SCHEMA)  # rebuilds the dropped indexes, also after a failed load
            repeated, repeated_amount = 0, 0.0
            with closing(self._connect()) as db:
                # First file in a case: nothing to overlap with, so skip the check (and its index) entirely.
                # shortcut: exact repeats inside that first file are kept; collapse them too if banks send such files.
                if db.execute("SELECT 1 FROM txns WHERE job_id <> ? LIMIT 1", (job_id,)).fetchone():
                    db.execute("CREATE INDEX IF NOT EXISTS txns_key ON txns(ts, payer, payee, amount, ref)")
                    found = db.execute(f"SELECT t.rowid, t.amount {_REPEATED_ROWS}", (job_id,)).fetchall()
                    repeated, repeated_amount = len(found), sum(amount for _, amount in found)
                    db.executemany("DELETE FROM txns WHERE rowid = ?", [(rowid,) for rowid, _ in found])
                    db.commit()
            summary["rows_already_in_case"] = repeated
            summary["total_amount_inr"] = round(summary["total_amount_inr"] - repeated_amount, 2)
            # Re-reconcile any already-uploaded receipts against updated bank rows
            with closing(self._connect()) as db:
                has_receipts = db.execute("SELECT 1 FROM receipts LIMIT 1").fetchone()
            if has_receipts:
                self.reconcile_all_receipts()
            return summary

    def _load_bank_csv(self, job_id: str, csv_path: Path, columns: Optional[Dict[str, int]] = None,
                       progress: Optional[Callable[[int, int], None]] = None) -> Dict[str, Any]:
        """Stream a bank/UPI CSV row by row, writing BATCH_ROWS at a time.

        Same column rules and amount cleaning as BankUPIParser, without building a Fact per row
        (that costs ~6 KB and ~0.3 ms per row, far too much for multi-GB statements).
        """
        rows_read = accepted = rejected = 0
        total_amount = 0.0
        party_counts: Counter = Counter()
        dates = _DateParser()
        with closing(self._connect()) as db, open(csv_path, "r", encoding="utf-8", errors="replace", newline="") as f:
            chars = [0]

            def counted(lines):  # text files can't tell() while iterating; count characters read instead
                for line in lines:
                    chars[0] += len(line)
                    yield line

            reader = csv.reader(counted(f))
            header = next(reader, [])
            cols = columns if columns is not None else BankUPIParser.map_columns(header)
            get = lambda row, key, default="": row[cols[key]].strip() if key in cols and cols[key] < len(row) else default
            txns: List[tuple] = []
            bad: List[tuple] = []

            def flush():
                db.executemany("INSERT INTO txns VALUES (?,?,?,?,?,?,?)", txns)
                db.executemany("INSERT INTO rejected VALUES (?,?,?,?)", bad)
                db.commit()
                txns.clear()
                bad.clear()

            for row in reader:
                if not row or all(not c.strip() for c in row):
                    continue
                rows_read += 1
                line = reader.line_num  # physical line, correct even with quoted multi-line cells
                date_s = get(row, "date")
                if not date_s:
                    bad.append((job_id, line, ",".join(row)[:2000], "Missing or empty transaction date field"))
                else:
                    time_s = get(row, "time")
                    when = f"{date_s} {time_s}".strip()
                    try:
                        ts = dates.epoch_of(date_s, time_s)
                    except (ValueError, OverflowError) as e:
                        bad.append((job_id, line, ",".join(row)[:2000], f"Failed to parse datetime '{when}': {e}"))
                    else:
                        raw_amt = get(row, "amount")
                        try:  # fast path: plain "2,85,000.00"; anything else goes through the full cleaner
                            amount = float(raw_amt.replace(",", ""))
                            if not math.isfinite(amount):
                                raise ValueError
                        except ValueError:
                            amt = BankUPIParser._clean_amount(raw_amt)
                            amount = float(amt) if amt is not None else 0.0
                        payer = get(row, "payer", "ACCOUNT_HOLDER") or "ACCOUNT_HOLDER"
                        payee = get(row, "payee", "BENEFICIARY") or "BENEFICIARY"
                        txns.append((job_id, line, ts, payer, payee, amount, get(row, "ref", f"TXN_{line}")))
                        party_counts[payer] += 1
                        party_counts[payee] += 1
                        total_amount += amount
                        accepted += 1
                if len(txns) + len(bad) >= BATCH_ROWS:
                    rejected += len(bad)
                    flush()
                    if progress:
                        progress(rows_read, chars[0])
            rejected += len(bad)
            flush()

            # Identifiers once per distinct party (parties repeat heavily), weighted by occurrences.
            id_counts: Counter = Counter()
            for party, n in party_counts.items():
                for ident in extract_identifiers(party):
                    id_counts[ident] += n
            db.executemany(
                "INSERT INTO identifiers VALUES (?,?,?,?)",
                [(job_id, kind, value, n) for (kind, value), n in id_counts.items()],
            )
            db.commit()
        by_kind: Counter = Counter(kind for kind, _ in id_counts)
        return {
            "parser": "bank_upi",
            "rows_read": rows_read,
            "rows_accepted": accepted,
            "rows_rejected": rejected,
            "total_amount_inr": round(total_amount, 2),
            "unique_parties": len(party_counts),
            "identifiers_by_kind": dict(by_kind),
        }

    def query_txns(
        self,
        *,
        offset: int = 0,
        limit: int = 200,
        keys: Optional[set] = None,
        party: str = "",
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        from_ts: Optional[float] = None,
        to_ts: Optional[float] = None,
        rail: str = "",
        ref: str = "",
        job_id: str = "",
    ) -> Dict[str, Any]:
        """One page of ledger rows (oldest first) plus the count and ₹ sum of every row matching the filters.

        keys: lower(trim()) party keys (a network or one account); a row matches when payer or payee is one of them.
        """
        where, args = [], []
        if job_id:
            where.append("job_id = ?")
            args.append(job_id)
        if party:
            where.append("(payer LIKE ? OR payee LIKE ?)")
            args += [f"%{party}%"] * 2
        for cond, val in (("amount >= ?", min_amount), ("amount <= ?", max_amount), ("ts >= ?", from_ts), ("ts <= ?", to_ts)):
            if val is not None:
                where.append(cond)
                args.append(val)
        if rail:
            where.append(f"{RAIL_SQL} = ?")
            args.append(rail)
        if ref:
            where.append("(ref = ? OR ref LIKE ?)")
            args += [ref, f"%{ref}%"]
        with closing(self._connect()) as db:
            if keys is not None:
                db.execute("CREATE TEMP TABLE k (n TEXT PRIMARY KEY)")
                db.executemany("INSERT INTO k VALUES (?)", [(n,) for n in keys])
                where.append("(lower(trim(payer)) IN (SELECT n FROM k) OR lower(trim(payee)) IN (SELECT n FROM k))")
            clause = f"WHERE {' AND '.join(where)} " if where else ""
            # Totals: one sequential scan beats index hops back into the table (0.3 s vs 5 s on 1M rows).
            # Page: walk the (ts, line) index only when nothing but dates filter (it stops after `limit` rows);
            # otherwise scan once and sort the matches — walking the index for a rare match visits every row.
            scan = "txns NOT INDEXED" if where else "txns"
            page_src = "txns" if all(w.startswith("ts ") for w in where) else "txns NOT INDEXED"
            total, total_inr = db.execute(f"SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM {scan} {clause}", args).fetchone()
            rows = db.execute(
                f"SELECT job_id, line, ts, payer, payee, amount, ref, {RAIL_SQL} FROM {page_src} {clause}"
                "ORDER BY ts, line LIMIT ? OFFSET ?",
                [*args, limit, offset],
            ).fetchall()
        cols = ("job_id", "line", "ts", "payer", "payee", "amount", "ref", "rail")
        return {"total": total, "total_inr": round(total_inr, 2), "rows": [dict(zip(cols, r)) for r in rows]}

    def rejected_page(self, job_id: str, offset: int = 0, limit: int = 100) -> Dict[str, Any]:
        """Rejected rows of one file with why, plus counts per reason (the value-specific tail of a reason is dropped)."""
        with closing(self._connect()) as db:
            total = db.execute("SELECT COUNT(*) FROM rejected WHERE job_id=?", (job_id,)).fetchone()[0]
            groups = db.execute(
                f"SELECT {REASON_SQL} AS r, COUNT(*) FROM rejected WHERE job_id=? GROUP BY r ORDER BY COUNT(*) DESC",
                (job_id,),
            ).fetchall()
            rows = db.execute(
                "SELECT line, raw, reason FROM rejected WHERE job_id=? ORDER BY line LIMIT ? OFFSET ?",
                (job_id, limit, offset),
            ).fetchall()
        return {
            "total": total,
            "by_reason": [{"reason": r, "count": n} for r, n in groups],
            "rows": [{"line": l, "raw": raw, "reason": why} for l, raw, why in rows],
        }

    def rejected_rows(self, job_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        with closing(self._connect()) as db:
            rows = db.execute(
                "SELECT line, raw, reason FROM rejected WHERE job_id=? ORDER BY line LIMIT ?", (job_id, limit)
            ).fetchall()
        return [{"line": l, "raw": r, "reason": why} for l, r, why in rows]

    def rows_for_groups(self, groups: Dict[str, set]) -> Dict[str, List[tuple]]:
        """One pass over the case: each row whose payer and payee both belong to a group (lower(trim()) party keys).

        A party can sit in several groups (a shared ATM); a row goes to every group holding both its ends.
        """
        owner: Dict[str, set] = defaultdict(set)
        for gid, keys in groups.items():
            for k in keys:
                owner[k].add(gid)
        out: Dict[str, List[tuple]] = {gid: [] for gid in groups}
        with closing(self._connect()) as db:
            cur = db.execute("SELECT line, ts, payer, payee, amount, ref FROM txns")
            while batch := cur.fetchmany(50_000):
                for row in batch:
                    a, b = owner.get(row[2].strip().lower()), owner.get(row[3].strip().lower())
                    if a and b:
                        for gid in a & b:
                            out[gid].append(row)  # bounded by the networks' size, not the case's
        return out

    def copy_subgraph(self, target: "DerivedStore", keys: set, job_id: str) -> int:
        """Copy rows whose payer and payee (lower(trim()) keys) are both in `keys` into another case's store."""
        return self.copy_rows(target, self.rows_for_groups({"g": keys})["g"], job_id)

    def copy_rows(self, target: "DerivedStore", rows: List[tuple], job_id: str) -> int:
        """Write (line, ts, payer, payee, amount, ref) rows into another case, skipping ones it already holds."""
        keys = {r[2].strip().lower() for r in rows} | {r[3].strip().lower() for r in rows}
        counts: Counter = Counter()
        for r in rows:
            counts[r[2]] += 1
            counts[r[3]] += 1
        ids: Counter = Counter()
        for party, n in counts.items():
            for ident in extract_identifiers(party):
                ids[ident] += n
        with closing(target._connect()) as db:
            for table in ("txns", "rejected", "identifiers"):
                db.execute(f"DELETE FROM {table} WHERE job_id = ?", (job_id,))
            # The target may already hold these transactions (same file uploaded there, or an earlier copy):
            # copying them again would count the same money twice.
            db.execute("CREATE TEMP TABLE k (n TEXT PRIMARY KEY)")
            db.executemany("INSERT INTO k VALUES (?)", [(n,) for n in keys])
            have = set(db.execute(
                "SELECT ts, payer, payee, amount, ref FROM txns "
                "WHERE lower(trim(payer)) IN (SELECT n FROM k) AND lower(trim(payee)) IN (SELECT n FROM k)"
            ))
            rows = [r for r in rows if r[1:] not in have]
            db.executemany("INSERT INTO txns VALUES (?,?,?,?,?,?,?)", [(job_id, *r) for r in rows])
            db.executemany("INSERT INTO identifiers VALUES (?,?,?,?)", [(job_id, k, v, n) for (k, v), n in ids.items()])
            db.commit()
        return len(rows)

    def graph(self, max_edges: int = 500, keys: Optional[set] = None) -> Optional[Dict[str, Any]]:
        """Aggregate payer→payee money flows across every job in the case. None when nothing ingested.

        keys: lower(trim()) party keys; when given, only flows touching one of them (e.g. suspected mules).
        """
        with closing(self._connect()) as db:
            where = ""
            if keys is not None:
                db.execute("CREATE TEMP TABLE k (n TEXT PRIMARY KEY)")
                db.executemany("INSERT INTO k VALUES (?)", [(n,) for n in keys])
                where = ("WHERE lower(trim(payer)) IN (SELECT n FROM k) OR lower(trim(payee)) IN (SELECT n FROM k) ")
            # shortcut: top-N edges by amount keeps the payload small; page or stream for 50k+ node views (Phase 2 WebGL).
            edges = db.execute(
                f"SELECT payer, payee, SUM(amount), COUNT(*), MIN(ts) FROM txns {where}GROUP BY payer, payee "
                "ORDER BY SUM(amount) DESC LIMIT ?",
                (max_edges,),
            ).fetchall()
            total_rows = db.execute("SELECT COUNT(*) FROM txns").fetchone()[0]
        if not edges:
            return None
        return {"edges": edges, "total_rows": total_rows}

    # ────────────────────────────────────────────────────────────────────
    # Receipt OCR, Forensics & Statement Reconciliation
    # ────────────────────────────────────────────────────────────────────

    def _candidate_bank_rows(
        self,
        db: sqlite3.Connection,
        utr_rrn: Optional[str],
        amount: Optional[float],
        job_names: Optional[Dict[str, str]] = None,
    ) -> tuple[bool, List[Dict[str, Any]]]:
        """Query candidate bank rows matching RRN or amount without loading huge statements."""
        has_txns = db.execute("SELECT 1 FROM txns LIMIT 1").fetchone() is not None
        if not has_txns:
            return False, []
        cols = ("job_id", "line", "ts", "payer", "payee", "amount", "ref")
        seen = set()
        rows_out: List[Dict[str, Any]] = []

        def _collect(sql: str, params: tuple) -> None:
            for r in db.execute(sql, params).fetchall():
                key = (r[0], r[1])
                if key in seen:
                    continue
                seen.add(key)
                d = dict(zip(cols, r))
                d["filename"] = (job_names or {}).get(d["job_id"], d["job_id"])
                rows_out.append(d)

        if utr_rrn:
            pat = f"%{utr_rrn}%"
            _collect(
                "SELECT job_id, line, ts, payer, payee, amount, ref FROM txns "
                "WHERE ref LIKE ? OR payer LIKE ? OR payee LIKE ? LIMIT 50",
                (pat, pat, pat),
            )
        if amount is not None:
            _collect(
                "SELECT job_id, line, ts, payer, payee, amount, ref FROM txns "
                "WHERE ABS(amount - ?) < 0.01 LIMIT 50",
                (float(amount),),
            )
        return True, rows_out

    def _reconcile_receipt_fields(
        self,
        db: sqlite3.Connection,
        fields: Dict[str, Any],
        job_names: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        from app.adapters.trace_payment_forensics import TracePaymentForensics

        utr_rrn = str(fields.get("utr_rrn") or "").strip() or None
        raw_amt = fields.get("amount")
        amount = float(raw_amt) if raw_amt is not None else None
        if utr_rrn is None and amount is None:
            return {
                "reconciliation_status": "NOT_ENOUGH_DETAIL",
                "match_type": "NONE",
                "matched_row": None,
                "discrepancy": None,
                "summary": "No amount or reference number could be read, so nothing to compare with the statement.",
                "reconciled_at_iso": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
        has_txns, candidates = self._candidate_bank_rows(db, utr_rrn, amount, job_names=job_names)
        if not has_txns:
            return TracePaymentForensics(ocr_extractor=False).reconcile_against_derived_rows(fields, [])
        if not candidates:
            # Pass a sentinel dummy empty list only when no rows exist vs unmatched:
            # reconcile_against_derived_rows returns NO_BANK_ROWS_YET when list is empty,
            # so when txns has rows but none matched, build UNMATCHED_IN_STATEMENT directly.
            return {
                "reconciliation_status": "UNMATCHED_IN_STATEMENT",
                "match_type": "NONE",
                "matched_row": None,
                "discrepancy": {
                    "discrepancy_type": "MISSING_FROM_STATEMENT",
                    "receipt_claim_amount": amount,
                    "matched_rrn": utr_rrn,
                    "finding_title": (
                        "No matching bank row found in uploaded statements — possible manipulation or missing statement, needs examiner review."
                    ),
                },
                "summary": "No matching bank row found in uploaded statements — possible manipulation or missing statement, needs examiner review.",
                "reconciled_at_iso": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
        return TracePaymentForensics(ocr_extractor=False).reconcile_against_derived_rows(fields, candidates)

    def save_receipt_forensics(
        self,
        job_id: str,
        artifact_id: str,
        filename: str,
        exam: Dict[str, Any],
        job_names: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Persist OCR + manipulation examination for an uploaded receipt and reconcile against txns."""
        ocr_analysis = exam.get("ocr_analysis") or {}
        fields = ocr_analysis.get("extracted_fields") or {}
        amount = fields.get("amount")
        currency = fields.get("currency") or "INR"
        utr_rrn = fields.get("utr_rrn")
        vpa = fields.get("vpa")
        txn_date = fields.get("transaction_date")
        txn_time = fields.get("transaction_time")
        upi_app = fields.get("upi_app")
        status_val = fields.get("status")
        score = float(exam.get("composite_anomaly_score") or 0.0)
        assessment = str(exam.get("preliminary_assessment") or "Needs examiner review")

        with self.lock, closing(self._connect()) as db:
            db.executescript(_SCHEMA)
            recon = self._reconcile_receipt_fields(db, fields, job_names=job_names)
            exam_to_store = {
                **exam,
                "reconciliation_findings": (
                    [recon["discrepancy"]] if recon.get("discrepancy") else []
                ),
            }
            db.execute(
                "INSERT OR REPLACE INTO receipts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    job_id,
                    artifact_id,
                    filename,
                    time.time(),
                    float(amount) if amount is not None else None,
                    currency,
                    utr_rrn,
                    vpa,
                    txn_date,
                    txn_time,
                    upi_app,
                    status_val,
                    score,
                    assessment,
                    json.dumps(exam_to_store, default=str),
                    json.dumps(recon, default=str),
                ),
            )
            db.execute("DELETE FROM identifiers WHERE job_id = ?", (job_id,))
            ident_rows = []
            if vpa:
                ident_rows.append((job_id, "vpa", str(vpa).lower(), 1))
            if utr_rrn:
                ident_rows.append((job_id, "utr", str(utr_rrn), 1))
            if ident_rows:
                db.executemany("INSERT OR REPLACE INTO identifiers VALUES (?,?,?,?)", ident_rows)
            db.commit()
        return {
            "job_id": job_id,
            "artifact_id": artifact_id,
            "filename": filename,
            "extracted_fields": fields,
            "composite_anomaly_score": score,
            "preliminary_assessment": assessment,
            "reconciliation": recon,
        }

    def reconcile_all_receipts(self, job_names: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Re-run reconciliation for every receipt stored in this case against current txns."""
        out: List[Dict[str, Any]] = []
        with self.lock, closing(self._connect()) as db:
            rows = db.execute(
                "SELECT job_id, artifact_id, filename, forensics_json FROM receipts"
            ).fetchall()
            for job_id, artifact_id, filename, fjson in rows:
                exam = json.loads(fjson or "{}")
                fields = (exam.get("ocr_analysis") or {}).get("extracted_fields") or {}
                recon = self._reconcile_receipt_fields(db, fields, job_names=job_names)
                exam["reconciliation_findings"] = [recon["discrepancy"]] if recon.get("discrepancy") else []
                db.execute(
                    "UPDATE receipts SET forensics_json = ?, reconciliation_json = ? WHERE job_id = ?",
                    (json.dumps(exam, default=str), json.dumps(recon, default=str), job_id),
                )
                out.append({"job_id": job_id, "artifact_id": artifact_id, "filename": filename, "reconciliation": recon})
            db.commit()
        return out

    def list_receipts(
        self,
        job_names: Optional[Dict[str, str]] = None,
        refresh_reconciliation: bool = True,
    ) -> List[Dict[str, Any]]:
        """List all receipt OCR + manipulation + reconciliation summaries for this case."""
        if refresh_reconciliation:
            self.reconcile_all_receipts(job_names=job_names)
        with closing(self._connect()) as db:
            rows = db.execute(
                "SELECT job_id, artifact_id, filename, extracted_at, amount, currency, utr_rrn, vpa, "
                "txn_date, txn_time, upi_app, status, composite_anomaly_score, assessment, forensics_json, reconciliation_json "
                "FROM receipts ORDER BY extracted_at DESC"
            ).fetchall()
        out = []
        for (job_id, artifact_id, filename, extracted_at, amount, currency, utr_rrn, vpa,
             txn_date, txn_time, upi_app, status_val, score, assessment, fjson, rjson) in rows:
            exam = json.loads(fjson or "{}")
            recon = json.loads(rjson or "{}")
            manip = exam.get("manipulation_analysis") or {}
            meta = exam.get("metadata_analysis") or {}
            ocr = exam.get("ocr_analysis") or {}
            out.append({
                "job_id": job_id,
                "artifact_id": artifact_id,
                "filename": filename,
                "extracted_at": extracted_at,
                "extracted_fields": {
                    "amount": amount,
                    "currency": currency,
                    "utr_rrn": utr_rrn,
                    "vpa": vpa,
                    "transaction_date": txn_date,
                    "transaction_time": txn_time,
                    "upi_app": upi_app,
                    "status": status_val,
                },
                "composite_anomaly_score": score,
                "preliminary_assessment": assessment,
                "assessment_code": manip.get("assessment_code"),
                "findings": exam.get("findings") or manip.get("findings") or [],
                "ocr_token_count": ocr.get("token_count", 0),
                "ocr_engine": ocr.get("engine"),
                "exif_present": meta.get("exif_present", False),
                "software_trace": meta.get("software_trace"),
                "reconciliation": recon,
            })
        return out

    def get_receipt_forensics(
        self,
        job_id: str,
        job_names: Optional[Dict[str, str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Return full examination payload (ELA preview, OCR polygons, metadata, reconciliation) for a receipt job."""
        with closing(self._connect()) as db:
            row = db.execute(
                "SELECT forensics_json, reconciliation_json FROM receipts WHERE job_id = ?",
                (job_id,),
            ).fetchone()
            if not row:
                return None
            exam = json.loads(row[0] or "{}")
            fields = (exam.get("ocr_analysis") or {}).get("extracted_fields") or {}
            recon = self._reconcile_receipt_fields(db, fields, job_names=job_names)
            exam["reconciliation"] = recon
            exam["reconciliation_findings"] = [recon["discrepancy"]] if recon.get("discrepancy") else []
            return exam

    def ingest_whatsapp_export(self, job_id: str, parsed: Dict[str, Any]) -> Dict[str, Any]:
        """Store parsed WhatsApp messages and extracted identifiers in the case's derived store."""
        msgs = parsed.get("messages") or []
        idents = parsed.get("identifiers") or {}
        with self.lock, closing(self._connect()) as db:
            db.executescript(_SCHEMA)
            db.execute("DELETE FROM whatsapp_messages WHERE job_id = ?", (job_id,))
            db.execute("DELETE FROM identifiers WHERE job_id = ?", (job_id,))
            db.executemany(
                "INSERT INTO whatsapp_messages VALUES (?,?,?,?,?,?)",
                [
                    (
                        job_id,
                        int(m.get("line") or 0),
                        str(m.get("timestamp_raw") or ""),
                        str(m.get("sender") or ""),
                        str(m.get("text") or "")[:4000],
                        json.dumps(m.get("identifiers") or {}),
                    )
                    for m in msgs
                ],
            )
            ident_rows = []
            for kind, key in (("phone", "phones"), ("vpa", "vpas"), ("account", "accounts"), ("ifsc", "ifscs")):
                for val in idents.get(key) or []:
                    ident_rows.append((job_id, kind, str(val), 1))
            if ident_rows:
                db.executemany("INSERT OR REPLACE INTO identifiers VALUES (?,?,?,?)", ident_rows)
            db.commit()
        return {
            "parser": "whatsapp_export",
            "format": "WHATSAPP_CHAT",
            "message_count": len(msgs),
            "participants": parsed.get("participants") or [],
            "identifiers_by_kind": parsed.get("identifiers_by_kind") or {},
            "identifiers": idents,
        }

    def list_whatsapp_messages(self, limit: int = 200) -> Dict[str, Any]:
        with closing(self._connect()) as db:
            rows = db.execute(
                "SELECT job_id, line, ts_raw, sender, body, identifiers_json FROM whatsapp_messages ORDER BY line LIMIT ?",
                (limit,),
            ).fetchall()
            total = db.execute("SELECT COUNT(*) FROM whatsapp_messages").fetchone()[0]
        return {
            "total": total,
            "messages": [
                {
                    "job_id": j,
                    "line": l,
                    "timestamp_raw": ts,
                    "sender": s,
                    "text": b,
                    "identifiers": json.loads(ij or "{}"),
                }
                for j, l, ts, s, b, ij in rows
            ],
        }
