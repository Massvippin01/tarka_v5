"""Per-case derived evidence store: streaming bank/UPI parse → transactions, identifiers, rejected rows.

shortcut: one SQLite file per case (stdlib, no new dependency); move to DuckDB/Parquet when
cross-case analytics or multi-GB scans get slow.
"""

from __future__ import annotations

import csv
import re
import sqlite3
from collections import Counter
from contextlib import closing
from pathlib import Path
import datetime
from typing import Any, Dict, List, Optional

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
CREATE INDEX IF NOT EXISTS txns_job ON txns(job_id);
CREATE INDEX IF NOT EXISTS txns_ts ON txns(ts, line);
CREATE INDEX IF NOT EXISTS rejected_job ON rejected(job_id, line);
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


class DerivedStore:
    def __init__(self, case_dir: Path):
        case_dir.mkdir(parents=True, exist_ok=True)
        self.path = case_dir / "derived.sqlite"
        with closing(self._connect()) as db:
            db.executescript(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def ingest_bank_csv(self, job_id: str, csv_path: Path, columns: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """Stream a bank/UPI CSV row by row, writing BATCH_ROWS at a time. Re-running a job replaces its rows.

        Same column rules and amount cleaning as BankUPIParser, without building a Fact per row
        (that costs ~6 KB and ~0.3 ms per row, far too much for multi-GB statements).
        """
        rows_read = accepted = rejected = 0
        total_amount = 0.0
        party_counts: Counter = Counter()
        dates = _DateParser()
        with closing(self._connect()) as db, open(csv_path, "r", encoding="utf-8", errors="replace", newline="") as f:
            for table in ("txns", "rejected", "identifiers"):
                db.execute(f"DELETE FROM {table} WHERE job_id = ?", (job_id,))
            reader = csv.reader(f)
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
                    when = f"{date_s} {get(row, 'time')}".strip()
                    try:
                        ts = dates.epoch(when)
                    except (ValueError, OverflowError) as e:
                        bad.append((job_id, line, ",".join(row)[:2000], f"Failed to parse datetime '{when}': {e}"))
                    else:
                        amt = BankUPIParser._clean_amount(get(row, "amount"))
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

    def copy_subgraph(self, target: "DerivedStore", keys: set, job_id: str) -> int:
        """Copy rows whose payer and payee (lower(trim()) keys) are both in `keys` into another case's store."""
        with closing(self._connect()) as db:
            db.execute("CREATE TEMP TABLE k (n TEXT PRIMARY KEY)")
            db.executemany("INSERT INTO k VALUES (?)", [(n,) for n in keys])
            rows = db.execute(
                "SELECT line, ts, payer, payee, amount, ref FROM txns "
                "WHERE lower(trim(payer)) IN (SELECT n FROM k) AND lower(trim(payee)) IN (SELECT n FROM k)"
            ).fetchall()  # bounded by the network's size, not the case's
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
