"""
WhatsApp Export Text Parser & Financial Identifier Extractor.

Parses exported WhatsApp chat text files (.txt) without webhooks or cloud simulators:
- Supports standard Android/iOS exports and ISO-timestamped forensic chat logs.
- Extracts messages, senders, timestamps, phones, VPAs, accounts, IFSCs, RRNs, and amounts.
- Strictly DATA_ONLY: chat claims are unverified assertions requiring bank-record corroboration.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

from app.services.ingestion.derived_store import extract_identifiers

_WA_ANDROID_IOS_RE = re.compile(
    r"^(?:\[)?(?P<date>\d{1,4}[/\-\.]\d{1,2}[/\-\.]\d{2,4}),?\s+"
    r"(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)(?:\s+IST)?(?:\])?"
    r"(?:\s+-\s+|\s+)(?P<rest>.*)$"
)
_AMOUNT_RE = re.compile(r"(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)", re.IGNORECASE)
_RRN_RE = re.compile(r"\b(\d{12})\b")

_SYSTEM_PHRASES = (
    "messages and calls are end-to-end encrypted",
    "created group",
    "added you",
    "was added",
    "changed the subject",
    "security code changed",
    "you're now an admin",
)


def looks_like_whatsapp_export(sample_text: str) -> bool:
    """Return True if at least 2 lines in the sample match WhatsApp export timestamp headers."""
    if not sample_text:
        return False
    hits = 0
    for line in sample_text.splitlines()[:40]:
        s = line.strip()
        if s and _WA_ANDROID_IOS_RE.match(s):
            hits += 1
            if hits >= 2:
                return True
    return False


def parse_whatsapp_export(text: str, filename: str = "whatsapp_chat.txt") -> Dict[str, Any]:
    """
    Parse WhatsApp export text into structured messages and extracted financial/contact identifiers.
    Streams line-by-line with bounded message preview storage.
    """
    messages: List[Dict[str, Any]] = []
    participants: set = set()
    phones: set = set()
    vpas: set = set()
    accounts: set = set()
    ifscs: set = set()
    rrns: set = set()
    amounts: List[float] = []

    current: Dict[str, Any] | None = None
    lines_read = 0

    def _collect_identifiers(body: str) -> Dict[str, List[Any]]:
        found = extract_identifiers(body)
        msg_phones = []
        msg_vpas = []
        msg_accts = []
        msg_ifscs = []
        for kind, val in found:
            if kind == "phone":
                phones.add(val)
                msg_phones.append(val)
            elif kind == "vpa":
                vpas.add(val.lower())
                msg_vpas.append(val.lower())
            elif kind == "account":
                accounts.add(val)
                msg_accts.append(val)
            elif kind == "ifsc":
                ifscs.add(val)
                msg_ifscs.append(val)

        msg_rrns = []
        for rm in _RRN_RE.finditer(body):
            rrn_val = rm.group(1)
            if rrn_val not in phones:
                rrns.add(rrn_val)
                msg_rrns.append(rrn_val)

        msg_amounts = []
        for am in _AMOUNT_RE.finditer(body):
            try:
                val = float(am.group(1).replace(",", ""))
                if val > 0:
                    amounts.append(val)
                    msg_amounts.append(val)
            except ValueError:
                pass

        return {
            "phones": msg_phones,
            "vpas": msg_vpas,
            "accounts": msg_accts,
            "ifscs": msg_ifscs,
            "rrns": msg_rrns,
            "amounts": msg_amounts,
        }

    def _flush(msg: Dict[str, Any]) -> None:
        ident = _collect_identifiers(f"{msg['sender']} {msg['text']}")
        msg["identifiers"] = ident
        if len(messages) < 5000:
            messages.append(msg)

    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        lines_read = line_no
        stripped = raw_line.strip()
        if not stripped:
            continue
        m = _WA_ANDROID_IOS_RE.match(stripped)
        if m:
            if current is not None:
                _flush(current)
            rest = m.group("rest").strip()
            is_system = any(p in rest.lower() for p in _SYSTEM_PHRASES)
            if ":" in rest and not is_system:
                sender, body = rest.split(":", 1)
                sender = sender.strip()
                body = body.strip()
                participants.add(sender)
            else:
                sender = "SYSTEM"
                body = rest
            current = {
                "line": line_no,
                "timestamp_raw": f"{m.group('date')} {m.group('time')}".strip(),
                "sender": sender,
                "text": body,
                "is_system": is_system,
            }
        elif current is not None:
            current["text"] = f"{current['text']}\n{stripped}"

    if current is not None:
        _flush(current)

    return {
        "parser": "whatsapp_export",
        "format": "WHATSAPP_CHAT",
        "filename": filename,
        "status": "PARSED",
        "lines_read": lines_read,
        "message_count": len(messages),
        "participants": sorted(participants),
        "identifiers": {
            "phones": sorted(phones),
            "vpas": sorted(vpas),
            "accounts": sorted(accounts),
            "ifscs": sorted(ifscs),
            "rrns": sorted(rrns),
            "amounts_inr": amounts[:200],
        },
        "identifiers_by_kind": {
            "phone": len(phones),
            "vpa": len(vpas),
            "account": len(accounts),
            "ifsc": len(ifscs),
        },
        "messages": messages,
    }
