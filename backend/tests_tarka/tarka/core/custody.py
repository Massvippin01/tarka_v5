"""Tamper-evident, hash-chained SQLite custody ledger for TARKA.

All evidence ingestion, parsing, analysis, and hypothesis evaluations
are permanently chained in an append-only cryptographic log.
Any subsequent mutation, deletion, or bit-flip in the database is detected
and pinpoints the compromised record index.
Full chain rewrites are prevented via out-of-band chain-head anchor export.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tarka.core.models import CustodyEntry, Fact


GENESIS_PREV_HASH = hashlib.sha256(b"TARKA_GENESIS_BLOCK").hexdigest()


class TamperReport(BaseModel):
    """Forensic verification report assessing the cryptographic chain of custody."""
    is_valid: bool = Field(description="True if chain and all stored payloads are untampered")
    total_entries: int = Field(description="Number of verified custody entries")
    compromised_seq: Optional[int] = Field(
        default=None,
        description="First sequence number where cryptographic integrity failed"
    )
    compromised_fact_id: Optional[str] = Field(
        default=None,
        description="ID of compromised fact if payload tampering was detected"
    )
    details: str = Field(description="Technical diagnostic message")


class CustodyLedger:
    """Tamper-evident SQLite custody log implementing an append-only hash chain."""

    def __init__(self, db_path: str | Path):
        self.db_path = str(db_path)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initializes SQLite schema for custody log and facts storage."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS custody_chain (
                    seq INTEGER PRIMARY KEY,
                    prev_hash TEXT NOT NULL,
                    timestamp_iso TEXT NOT NULL,
                    action TEXT NOT NULL,
                    fact_id TEXT,
                    payload_sha256 TEXT NOT NULL,
                    entry_hash TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS stored_facts (
                    fact_id TEXT PRIMARY KEY,
                    fact_sha256 TEXT NOT NULL,
                    source_file TEXT NOT NULL,
                    source_sha256 TEXT NOT NULL,
                    canonical_json TEXT NOT NULL,
                    ingested_at TEXT NOT NULL
                )
                """
            )
            conn.commit()

    @staticmethod
    def calculate_entry_hash(
        seq: int,
        prev_hash: str,
        timestamp_iso: str,
        action: str,
        fact_id: Optional[str],
        payload_sha256: str,
    ) -> str:
        """Computes deterministic SHA-256 hash sealing a custody entry."""
        fid = fact_id or ""
        msg = f"{seq}|{prev_hash}|{timestamp_iso}|{action}|{fid}|{payload_sha256}"
        return hashlib.sha256(msg.encode("utf-8")).hexdigest()

    def get_latest_entry(self) -> Optional[CustodyEntry]:
        """Returns the most recent entry in the chain, or None if empty."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT seq, prev_hash, timestamp_iso, action, fact_id, payload_sha256, entry_hash "
                "FROM custody_chain ORDER BY seq DESC LIMIT 1"
            )
            row = cursor.fetchone()
            if not row:
                return None
            return CustodyEntry(
                seq=row["seq"],
                prev_hash=row["prev_hash"],
                timestamp_iso=row["timestamp_iso"],
                action=row["action"],
                fact_id=row["fact_id"],
                payload_sha256=row["payload_sha256"],
                entry_hash=row["entry_hash"],
            )

    def get_all_entries(self) -> List[CustodyEntry]:
        """Returns all custody entries in chronological sequence."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT seq, prev_hash, timestamp_iso, action, fact_id, payload_sha256, entry_hash "
                "FROM custody_chain ORDER BY seq ASC"
            )
            return [
                CustodyEntry(
                    seq=row["seq"],
                    prev_hash=row["prev_hash"],
                    timestamp_iso=row["timestamp_iso"],
                    action=row["action"],
                    fact_id=row["fact_id"],
                    payload_sha256=row["payload_sha256"],
                    entry_hash=row["entry_hash"],
                )
                for row in cursor.fetchall()
            ]

    def get_chain_head_hash(self) -> str:
        """Returns the current chain head hash (latest entry_hash or GENESIS if empty)."""
        latest = self.get_latest_entry()
        if latest is None:
            return GENESIS_PREV_HASH
        return latest.entry_hash

    def export_anchor(self, anchor_path: str | Path) -> str:
        """Exports the current chain-head hash into an external anchor file."""
        latest = self.get_latest_entry()
        anchor_data = {
            "head_hash": latest.entry_hash if latest else GENESIS_PREV_HASH,
            "seq": latest.seq if latest else -1,
            "timestamp_iso": latest.timestamp_iso if latest else datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        out_p = Path(anchor_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(anchor_data, f, indent=2)
        return anchor_data["head_hash"]

    def append_action(
        self,
        action: str,
        payload_data: Any = None,
        fact_id: Optional[str] = None,
        timestamp_iso: Optional[str] = None,
    ) -> CustodyEntry:
        """Appends a generic audited action to the custody chain."""
        if payload_data is None:
            payload_str = ""
        elif isinstance(payload_data, str):
            payload_str = payload_data
        elif isinstance(payload_data, (dict, list)):
            payload_str = json.dumps(payload_data, sort_keys=True)
        else:
            payload_str = str(payload_data)

        payload_sha256 = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
        ts = timestamp_iso or datetime.datetime.now(datetime.timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT seq, entry_hash FROM custody_chain ORDER BY seq DESC LIMIT 1"
            )
            latest = cursor.fetchone()

            if latest is None:
                next_seq = 0
                prev_hash = GENESIS_PREV_HASH
            else:
                next_seq = latest["seq"] + 1
                prev_hash = latest["entry_hash"]

            entry_hash = self.calculate_entry_hash(
                seq=next_seq,
                prev_hash=prev_hash,
                timestamp_iso=ts,
                action=action,
                fact_id=fact_id,
                payload_sha256=payload_sha256,
            )

            cursor.execute(
                """
                INSERT INTO custody_chain (seq, prev_hash, timestamp_iso, action, fact_id, payload_sha256, entry_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (next_seq, prev_hash, ts, action, fact_id, payload_sha256, entry_hash),
            )
            conn.commit()

        return CustodyEntry(
            seq=next_seq,
            prev_hash=prev_hash,
            timestamp_iso=ts,
            action=action,
            fact_id=fact_id,
            payload_sha256=payload_sha256,
            entry_hash=entry_hash,
        )

    def append_fact(self, fact: Fact) -> CustodyEntry:
        """Ingests and records a Fact into both the fact store and custody chain."""
        fact_sha256 = fact.compute_fact_sha256()
        canonical_json = fact.canonical_json()
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO stored_facts (fact_id, fact_sha256, source_file, source_sha256, canonical_json, ingested_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (fact.id, fact_sha256, fact.source_file, fact.sha256, canonical_json, now_iso),
            )
            conn.commit()

        return self.append_action(
            action="INGEST_FACT",
            payload_data=canonical_json,
            fact_id=fact.id,
            timestamp_iso=now_iso,
        )

    def get_fact(self, fact_id: str) -> Optional[Fact]:
        """Retrieves and deserializes a Fact by its identifier."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT canonical_json FROM stored_facts WHERE fact_id = ?",
                (fact_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            data = json.loads(row["canonical_json"])
            return Fact.model_validate(data)

    def get_all_facts(self) -> List[Fact]:
        """Returns all ingested facts in order of storage."""
        facts: List[Fact] = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT canonical_json FROM stored_facts ORDER BY rowid ASC"
            )
            for row in cursor.fetchall():
                data = json.loads(row["canonical_json"])
                facts.append(Fact.model_validate(data))
        return facts

    def verify_chain(self, anchored_head_hash: Optional[str] = None) -> TamperReport:
        """Verifies full cryptographic integrity of the custody hash chain and fact store.

        If anchored_head_hash is provided, also asserts that the final chain-head
        matches the trusted anchor, defeating full-chain database rewrites.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 1. Verify Custody Chain entries
            cursor.execute(
                "SELECT seq, prev_hash, timestamp_iso, action, fact_id, payload_sha256, entry_hash "
                "FROM custody_chain ORDER BY seq ASC"
            )
            rows = cursor.fetchall()

            if not rows:
                if anchored_head_hash and anchored_head_hash != GENESIS_PREV_HASH:
                    return TamperReport(
                        is_valid=False,
                        total_entries=0,
                        details="Chain is empty but anchored head hash expected entries.",
                    )
                return TamperReport(
                    is_valid=True,
                    total_entries=0,
                    details="Custody chain is empty (initial state).",
                )

            expected_prev_hash = GENESIS_PREV_HASH
            for expected_seq, row in enumerate(rows):
                seq = row["seq"]
                prev_hash = row["prev_hash"]
                ts = row["timestamp_iso"]
                action = row["action"]
                fact_id = row["fact_id"]
                payload_sha256 = row["payload_sha256"]
                stored_entry_hash = row["entry_hash"]

                if seq != expected_seq:
                    return TamperReport(
                        is_valid=False,
                        total_entries=len(rows),
                        compromised_seq=seq,
                        details=f"Sequence gap or reordering detected at index {expected_seq}: got seq={seq}.",
                    )

                if prev_hash != expected_prev_hash:
                    return TamperReport(
                        is_valid=False,
                        total_entries=len(rows),
                        compromised_seq=seq,
                        details=(
                            f"Broken chain pointer at seq={seq}. "
                            f"Stored prev_hash does not match expected entry_hash of preceding block."
                        ),
                    )

                computed_hash = self.calculate_entry_hash(
                    seq=seq,
                    prev_hash=prev_hash,
                    timestamp_iso=ts,
                    action=action,
                    fact_id=fact_id,
                    payload_sha256=payload_sha256,
                )
                if computed_hash != stored_entry_hash:
                    return TamperReport(
                        is_valid=False,
                        total_entries=len(rows),
                        compromised_seq=seq,
                        details=(
                            f"Cryptographic hash mismatch at seq={seq}. "
                            f"Stored hash={stored_entry_hash}, computed hash={computed_hash}. "
                            f"One or more fields in this row were modified."
                        ),
                    )

                expected_prev_hash = stored_entry_hash

            # 2. Check against external anchored head hash (prevents full-chain forge)
            if anchored_head_hash is not None and expected_prev_hash != anchored_head_hash:
                return TamperReport(
                    is_valid=False,
                    total_entries=len(rows),
                    compromised_seq=len(rows) - 1,
                    details=(
                        f"Chain-head anchor mismatch! Current head={expected_prev_hash}, "
                        f"anchored head={anchored_head_hash}. A full-chain rewrite or rollback occurred."
                    ),
                )

            # 3. Verify integrity of stored fact payloads
            cursor.execute(
                "SELECT fact_id, fact_sha256, canonical_json FROM stored_facts"
            )
            fact_rows = cursor.fetchall()
            for f_row in fact_rows:
                fact_id = f_row["fact_id"]
                stored_fact_sha256 = f_row["fact_sha256"]
                canonical_json = f_row["canonical_json"]

                computed_fact_sha256 = hashlib.sha256(
                    canonical_json.encode("utf-8")
                ).hexdigest()

                if computed_fact_sha256 != stored_fact_sha256:
                    return TamperReport(
                        is_valid=False,
                        total_entries=len(rows),
                        compromised_fact_id=fact_id,
                        details=(
                            f"Payload corruption detected in stored fact '{fact_id}'. "
                            f"Expected SHA-256={stored_fact_sha256}, actual SHA-256={computed_fact_sha256}."
                        ),
                    )

            return TamperReport(
                is_valid=True,
                total_entries=len(rows),
                details=f"All {len(rows)} custody records and {len(fact_rows)} fact payloads verified untampered.",
            )
