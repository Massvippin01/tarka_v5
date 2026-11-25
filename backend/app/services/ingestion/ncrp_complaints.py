"""NCRP cyber-crime complaint CSV import, deterministic case matching, and golden-hour step timing.

Rules (PLAN.md):
- Never invent missing fields: blank CSV columns stay empty / None.
- Match complaints strictly against rows already ingested in derived.sqlite (by account/VPA/phone,
  amount tolerance, and optional timestamp window). Every unmatched complaint explains why.
- Persist complaints and per-step golden-hour timestamps in projects.sqlite, keyed by project_id / case_id.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sqlite3
import time
import uuid
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.services.ingestion.derived_store import _DateParser

_SCHEMA = """
CREATE TABLE IF NOT EXISTS ncrp_complaints (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    case_id TEXT NOT NULL,
    ack_no TEXT NOT NULL,
    victim_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    account_vpa TEXT NOT NULL,
    amount_inr REAL,
    complaint_ts REAL,
    complaint_ts_raw TEXT NOT NULL,
    typology TEXT NOT NULL,
    status TEXT NOT NULL,
    match_reason TEXT NOT NULL,
    matched_account TEXT,
    matched_network_id TEXT,
    matched_txns_json TEXT NOT NULL,
    imported_by TEXT NOT NULL,
    imported_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ncrp_case ON ncrp_complaints(case_id, imported_at DESC);
CREATE INDEX IF NOT EXISTS ncrp_project ON ncrp_complaints(project_id, imported_at DESC);

CREATE TABLE IF NOT EXISTS golden_hour_steps (
    case_id TEXT PRIMARY KEY,
    complaint_ts REAL,
    complaint_received_at REAL,
    uploaded_at REAL,
    traced_at REAL,
    mules_found_at REAL,
    freeze_drafted_at REAL,
    target_mins REAL NOT NULL DEFAULT 5.0
);
"""

_HEADER_ALIASES = {
    "ack_no": ("ack_no", "ackno", "acknowledgement_no", "acknowledgment_no", "ack", "ncrp_ack_no", "complaint_no", "complaint_id"),
    "victim_name": ("victim_name", "victim", "complainant_name", "complainant", "name", "applicant_name"),
    "phone": ("phone", "mobile", "mobile_no", "victim_phone", "phone_number", "msisdn", "contact"),
    "account_vpa": ("account_vpa", "account", "vpa", "upi", "upi_id", "victim_account", "payer", "account_no", "acct"),
    "amount_inr": ("amount_inr", "amount", "loss", "claimed_loss", "claimed_loss_inr", "fraud_amount", "disputed_amount"),
    "complaint_ts": ("complaint_ts", "date_time", "datetime", "timestamp", "complaint_date", "complaint_time", "incident_date", "ts", "date"),
    "typology": ("typology", "fraud_type", "scam_type", "category", "sub_category", "crime_type"),
}

_DATE_PARSER = _DateParser()


def _norm_header(h: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (h or "").strip().lower()).strip("_")


def _clean_amount(raw: str) -> Optional[float]:
    s = re.sub(r"[₹,\s]", "", (raw or "").strip())
    if not s:
        return None
    try:
        val = float(s)
        return round(val, 2) if val >= 0 else None
    except ValueError:
        return None


def _norm_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    return digits[-10:] if len(digits) >= 10 else digits


def parse_ncrp_csv(content: str | bytes) -> List[Dict[str, Any]]:
    """Parse an NCRP complaint CSV without inventing any absent values."""
    text = content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content
    reader = csv.reader(io.StringIO(text))
    header = next(reader, None)
    if not header:
        return []

    cols: Dict[str, int] = {}
    for idx, col in enumerate(header):
        norm = _norm_header(col)
        for field, aliases in _HEADER_ALIASES.items():
            if field not in cols and norm in aliases:
                cols[field] = idx
                break

    if not cols:
        raise ValueError("CSV header must contain at least one NCRP column (ack no., victim name, phone, account/VPA, amount, date/time, typology).")

    def cell(row: List[str], field: str) -> str:
        i = cols.get(field)
        return row[i].strip() if i is not None and i < len(row) else ""

    records: List[Dict[str, Any]] = []
    for row in reader:
        if not row or not any(c.strip() for c in row):
            continue
        ts_raw = cell(row, "complaint_ts")
        try:
            ts_epoch = _DATE_PARSER.epoch_of(ts_raw, "") if ts_raw else None
        except Exception:
            ts_epoch = None
        records.append({
            "ack_no": cell(row, "ack_no"),
            "victim_name": cell(row, "victim_name"),
            "phone": _norm_phone(cell(row, "phone")),
            "account_vpa": cell(row, "account_vpa"),
            "amount_inr": _clean_amount(cell(row, "amount_inr")),
            "complaint_ts": ts_epoch,
            "complaint_ts_raw": ts_raw,
            "typology": cell(row, "typology"),
        })
    return records


def _matched_side(
    payer: str,
    payee: str,
    acct_raw: str,
    phone: str,
    phone_candidates: set[str],
) -> tuple[Optional[str], bool]:
    """Return (matched_account_label, is_victim_debit) choosing whichever party actually matched."""
    pk = str(payer or "").strip().lower()
    qk = str(payee or "").strip().lower()
    if acct_raw:
        if pk == acct_raw:
            return payer, True
        if qk == acct_raw:
            return payee, False
    if pk in phone_candidates:
        return payer, True
    if qk in phone_candidates:
        return payee, False
    if phone and len(phone) >= 10:
        if phone in pk or phone in re.sub(r"\D", "", pk):
            return payer, True
        if phone in qk or phone in re.sub(r"\D", "", qk):
            return payee, False
    return None, True


def match_complaint_to_case(
    derived_dir: Path,
    case_id: str,
    complaint: Dict[str, Any],
    nets_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Match a single parsed NCRP complaint deterministically against ingested derived.sqlite rows."""
    db_path = derived_dir / case_id / "derived.sqlite"
    if not db_path.exists():
        return {
            "status": "UNMATCHED",
            "match_reason": f"No transaction ledger exists for case '{case_id}' yet. Upload bank statements first.",
            "matched_account": None,
            "matched_network_id": None,
            "matched_txns": [],
        }

    acct_raw = (complaint.get("account_vpa") or "").strip().lower()
    phone = (complaint.get("phone") or "").strip()
    amount = complaint.get("amount_inr")
    ts_epoch = complaint.get("complaint_ts")

    if not acct_raw and not phone:
        return {
            "status": "UNMATCHED",
            "match_reason": "Complaint has neither an account/VPA nor a phone number to match against statements.",
            "matched_account": None,
            "matched_network_id": None,
            "matched_txns": [],
        }

    member_to_net: Dict[str, str] = {}
    if nets_result:
        for net in nets_result.get("networks", []):
            nid = net.get("network_id")
            for m in net.get("members", []):
                if m.get("id"):
                    member_to_net[str(m["id"]).lower()] = nid
                if m.get("label"):
                    member_to_net[str(m["label"]).strip().lower()] = nid

    window_rows: List[tuple] = []
    any_match_count = 0
    phone_candidates: List[str] = []
    with closing(sqlite3.connect(db_path)) as db:
        has_txns = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='txns'").fetchone()
        if not has_txns:
            return {
                "status": "UNMATCHED",
                "match_reason": "No transactions imported into this case's statement ledger.",
                "matched_account": None,
                "matched_network_id": None,
                "matched_txns": [],
            }

        clauses: List[str] = []
        id_params: List[Any] = []
        if acct_raw:
            clauses.append("LOWER(TRIM(payer)) = ?")
            clauses.append("LOWER(TRIM(payee)) = ?")
            id_params.extend([acct_raw, acct_raw])
        if phone and len(phone) >= 10:
            like = f"%{phone}%"
            clauses.extend(["payer LIKE ?", "payee LIKE ?", "ref LIKE ?"])
            id_params.extend([like, like, like])
            has_dev = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='device_events'").fetchone()
            if has_dev:
                dev_accts = db.execute(
                    "SELECT DISTINCT LOWER(TRIM(acct)) FROM device_events WHERE phone LIKE ? AND acct != ''",
                    (like,),
                ).fetchall()
                phone_candidates = [r[0] for r in dev_accts if r[0]]
                if phone_candidates:
                    placeholders = ",".join("?" for _ in phone_candidates)
                    clauses.append(f"LOWER(TRIM(payer)) IN ({placeholders})")
                    clauses.append(f"LOWER(TRIM(payee)) IN ({placeholders})")
                    id_params.extend(phone_candidates)
                    id_params.extend(phone_candidates)

        id_where = f"({' OR '.join(clauses)})"
        where_parts = [id_where]
        params: List[Any] = list(id_params)

        # Apply ±72h time window in SQL BEFORE LIMIT so busy accounts with long histories don't get cut off
        if ts_epoch is not None:
            where_parts.append("ts BETWEEN ? AND ?")
            params.extend([float(ts_epoch) - 72 * 3600, float(ts_epoch) + 72 * 3600])
            order_sql = "ORDER BY ABS(ts - ?) ASC LIMIT 500"
            order_params: List[Any] = [float(ts_epoch)]
        else:
            order_sql = "ORDER BY ts DESC LIMIT 500"
            order_params = []

        sql = f"SELECT job_id, line, ts, payer, payee, amount, ref FROM txns WHERE {' AND '.join(where_parts)} {order_sql}"
        window_rows = db.execute(sql, [*params, *order_params]).fetchall()
        if not window_rows and ts_epoch is not None:
            any_match_count = int(db.execute(f"SELECT COUNT(*) FROM txns WHERE {id_where}", id_params).fetchone()[0] or 0)

    if not window_rows:
        target_desc = acct_raw or phone
        if ts_epoch is not None and any_match_count > 0:
            return {
                "status": "UNMATCHED",
                "match_reason": f"Found {any_match_count} transaction(s) for '{target_desc}', but none within ±72 hours of the complaint timestamp.",
                "matched_account": None,
                "matched_network_id": None,
                "matched_txns": [],
            }
        return {
            "status": "UNMATCHED",
            "match_reason": f"No ingested transaction mentions '{target_desc}' in payer, payee, or device records.",
            "matched_account": None,
            "matched_network_id": None,
            "matched_txns": [],
        }

    phone_cand_set = set(phone_candidates)
    annotated = []
    for r in window_rows:
        m_acct, is_debit = _matched_side(r[3], r[4], acct_raw, phone, phone_cand_set)
        annotated.append((r, m_acct, is_debit))

    # Filter / score by amount if supplied
    chosen = annotated
    if amount is not None and amount > 0:
        tol = max(500.0, amount * 0.25)
        close = [item for item in annotated if abs(float(item[0][5]) - amount) <= tol]
        if close:
            chosen = close
        else:
            # Sum only debits where the matched victim account was on the payer side
            debit_items = [item for item in annotated if item[2]]
            total_out = sum(float(item[0][5]) for item in debit_items)
            if debit_items and abs(total_out - amount) <= tol:
                chosen = debit_items
            else:
                return {
                    "status": "UNMATCHED",
                    "match_reason": (
                        f"Found {len(debit_items)} outgoing debit row(s) for '{acct_raw or phone}' totalling "
                        f"₹{total_out:,.0f}, outside the claimed ₹{amount:,.0f} tolerance."
                    ),
                    "matched_account": None,
                    "matched_network_id": None,
                    "matched_txns": [],
                }

    matched_acct = None
    matched_net = None
    matched_txns = []
    for (job_id, line, ts_val, payer, payee, amt, ref), row_acct, _is_debit in chosen[:25]:
        pk = str(payer or "").strip().lower()
        qk = str(payee or "").strip().lower()
        if not matched_acct:
            matched_acct = row_acct or (payer if not qk else payee)
        net_id = member_to_net.get(pk) or member_to_net.get(qk)
        if not matched_net and net_id:
            matched_net = net_id
        matched_txns.append({
            "job_id": job_id,
            "line": line,
            "ts": ts_val,
            "payer": payer,
            "payee": payee,
            "amount": round(float(amt), 2),
            "ref": ref or "",
            "network_id": net_id,
        })

    tot = sum(float(item[0][5]) for item in chosen)
    net_note = f" in {matched_net}" if matched_net else ""
    return {
        "status": "MATCHED",
        "match_reason": f"Matched '{matched_acct or acct_raw or phone}' to {len(chosen)} transaction(s) totalling ₹{tot:,.0f}{net_note}.",
        "matched_account": matched_acct,
        "matched_network_id": matched_net,
        "matched_txns": matched_txns,
    }


class NcrpComplaintStore:
    def __init__(self, base_dir: Path):
        base_dir.mkdir(parents=True, exist_ok=True)
        self.path = base_dir / "projects.sqlite"
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(_SCHEMA)

    def _db(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def mark_golden_step(self, case_id: str, step: str, at: Optional[float] = None, *, complaint_ts: Optional[float] = None) -> Dict[str, Any]:
        """Record an actual milestone timestamp for the case's golden-hour workflow clock (only sets earliest or explicitly provided)."""
        allowed = {"complaint_received_at", "uploaded_at", "traced_at", "mules_found_at", "freeze_drafted_at"}
        if step not in allowed:
            raise ValueError(f"Unknown golden-hour step '{step}'.")
        now = float(at if at is not None else time.time())
        with closing(self._db()) as db:
            row = db.execute(
                "SELECT complaint_ts, complaint_received_at, uploaded_at, traced_at, mules_found_at, freeze_drafted_at, target_mins "
                "FROM golden_hour_steps WHERE case_id = ?",
                (case_id,),
            ).fetchone()
            if not row:
                vals = {
                    "complaint_ts": complaint_ts,
                    "complaint_received_at": now if step == "complaint_received_at" else None,
                    "uploaded_at": now if step == "uploaded_at" else None,
                    "traced_at": now if step == "traced_at" else None,
                    "mules_found_at": now if step == "mules_found_at" else None,
                    "freeze_drafted_at": now if step == "freeze_drafted_at" else None,
                    "target_mins": 5.0,
                }
                db.execute(
                    "INSERT INTO golden_hour_steps (case_id, complaint_ts, complaint_received_at, uploaded_at, traced_at, mules_found_at, freeze_drafted_at, target_mins) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (case_id, vals["complaint_ts"], vals["complaint_received_at"], vals["uploaded_at"], vals["traced_at"], vals["mules_found_at"], vals["freeze_drafted_at"], vals["target_mins"]),
                )
            else:
                cols = ("complaint_ts", "complaint_received_at", "uploaded_at", "traced_at", "mules_found_at", "freeze_drafted_at", "target_mins")
                vals = dict(zip(cols, row))
                if complaint_ts is not None and vals["complaint_ts"] is None:
                    vals["complaint_ts"] = complaint_ts
                if vals[step] is None:
                    vals[step] = now
                db.execute(
                    f"UPDATE golden_hour_steps SET complaint_ts = ?, {step} = ? WHERE case_id = ?",
                    (vals["complaint_ts"], vals[step], case_id),
                )
            db.commit()
        return self.golden_hour_status(case_id)

    def golden_hour_status(self, case_id: str) -> Dict[str, Any]:
        with closing(self._db()) as db:
            row = db.execute(
                "SELECT complaint_ts, complaint_received_at, uploaded_at, traced_at, mules_found_at, freeze_drafted_at, target_mins "
                "FROM golden_hour_steps WHERE case_id = ?",
                (case_id,),
            ).fetchone()
        if not row:
            return {
                "active": False,
                "complaint_ts": None,
                "started_at": None,
                "target_mins": 5.0,
                "steps": [],
            }
        complaint_ts, rec_at, up_at, tr_at, mules_at, freeze_at, target_mins = row
        # Clock baseline: when workflow began inside TARKA (complaint import or upload), plus original incident complaint_ts
        start = rec_at or up_at or tr_at or mules_at or freeze_at
        def _elapsed(at: Optional[float]) -> Optional[float]:
            if at is None or start is None:
                return None
            return round(max(0.0, at - start), 1)
        steps = [
            {"key": "complaint", "label": "Complaint received", "at": rec_at, "elapsed_secs": _elapsed(rec_at)},
            {"key": "upload", "label": "Statements ingested", "at": up_at, "elapsed_secs": _elapsed(up_at)},
            {"key": "trace", "label": "Money traced", "at": tr_at, "elapsed_secs": _elapsed(tr_at)},
            {"key": "mules", "label": "Mules identified", "at": mules_at, "elapsed_secs": _elapsed(mules_at)},
            {"key": "freeze", "label": "Freeze notices drafted", "at": freeze_at, "elapsed_secs": _elapsed(freeze_at)},
        ]
        return {
            "active": start is not None,
            "complaint_ts": complaint_ts,
            "started_at": start,
            "target_mins": target_mins,
            "total_elapsed_secs": _elapsed(freeze_at) if freeze_at else None,
            "steps": steps,
        }

    def save_batch(
        self,
        *,
        project_id: Optional[str],
        case_id: str,
        items: List[Dict[str, Any]],
        imported_by: str,
    ) -> List[Dict[str, Any]]:
        now = time.time()
        saved: List[Dict[str, Any]] = []
        earliest_ts: Optional[float] = None
        with closing(self._db()) as db:
            for item in items:
                cid = f"NCRP-{uuid.uuid4().hex[:10].upper()}"
                ts = item.get("complaint_ts")
                if ts is not None and (earliest_ts is None or ts < earliest_ts):
                    earliest_ts = ts
                matched_txns = item.get("matched_txns") or []
                rec = {
                    "id": cid,
                    "project_id": project_id,
                    "case_id": case_id,
                    "ack_no": item.get("ack_no", ""),
                    "victim_name": item.get("victim_name", ""),
                    "phone": item.get("phone", ""),
                    "account_vpa": item.get("account_vpa", ""),
                    "amount_inr": item.get("amount_inr"),
                    "complaint_ts": ts,
                    "complaint_ts_raw": item.get("complaint_ts_raw", ""),
                    "typology": item.get("typology", ""),
                    "status": item.get("status", "UNMATCHED"),
                    "match_reason": item.get("match_reason", ""),
                    "matched_account": item.get("matched_account"),
                    "matched_network_id": item.get("matched_network_id"),
                    "matched_txns": matched_txns,
                    "imported_by": imported_by,
                    "imported_at": now,
                }
                db.execute(
                    "INSERT INTO ncrp_complaints (id, project_id, case_id, ack_no, victim_name, phone, account_vpa, amount_inr, "
                    "complaint_ts, complaint_ts_raw, typology, status, match_reason, matched_account, matched_network_id, "
                    "matched_txns_json, imported_by, imported_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        rec["id"], rec["project_id"], rec["case_id"], rec["ack_no"], rec["victim_name"],
                        rec["phone"], rec["account_vpa"], rec["amount_inr"], rec["complaint_ts"], rec["complaint_ts_raw"],
                        rec["typology"], rec["status"], rec["match_reason"], rec["matched_account"], rec["matched_network_id"],
                        json.dumps(matched_txns), rec["imported_by"], rec["imported_at"],
                    ),
                )
                saved.append(rec)
            db.commit()
        if saved:
            self.mark_golden_step(case_id, "complaint_received_at", now, complaint_ts=earliest_ts)
        return saved

    def list_for_case(self, case_id: str) -> List[Dict[str, Any]]:
        with closing(self._db()) as db:
            rows = db.execute(
                "SELECT id, project_id, case_id, ack_no, victim_name, phone, account_vpa, amount_inr, complaint_ts, "
                "complaint_ts_raw, typology, status, match_reason, matched_account, matched_network_id, matched_txns_json, "
                "imported_by, imported_at FROM ncrp_complaints WHERE case_id = ? ORDER BY imported_at DESC, id DESC",
                (case_id,),
            ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    def list_for_project(self, project_id: str) -> List[Dict[str, Any]]:
        with closing(self._db()) as db:
            rows = db.execute(
                "SELECT id, project_id, case_id, ack_no, victim_name, phone, account_vpa, amount_inr, complaint_ts, "
                "complaint_ts_raw, typology, status, match_reason, matched_account, matched_network_id, matched_txns_json, "
                "imported_by, imported_at FROM ncrp_complaints WHERE project_id = ? ORDER BY imported_at DESC, id DESC",
                (project_id,),
            ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    @staticmethod
    def _row_to_dict(r: tuple) -> Dict[str, Any]:
        return {
            "id": r[0],
            "project_id": r[1],
            "case_id": r[2],
            "ack_no": r[3],
            "victim_name": r[4],
            "phone": r[5],
            "account_vpa": r[6],
            "amount_inr": r[7],
            "complaint_ts": r[8],
            "complaint_ts_raw": r[9],
            "typology": r[10],
            "status": r[11],
            "match_reason": r[12],
            "matched_account": r[13],
            "matched_network_id": r[14],
            "matched_txns": json.loads(r[15] or "[]"),
            "imported_by": r[16],
            "imported_at": r[17],
        }
