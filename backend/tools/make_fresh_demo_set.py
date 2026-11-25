"""Build a fresh, never-uploaded 4-file demo set: 1 big bank CSV with planted gangs, 2 UPI receipt
images (genuine + amount-edited) and 1 statement-page PDF, all linked to one real mule credit in the CSV.

Usage: PYTHONPATH=backend venv/Scripts/python backend/tools/make_fresh_demo_set.py [--out DIR] [--rows N] [--gangs N]
Every run uses a new label prefix, so the files are never duplicates of an earlier upload.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from make_test_uploads import make  # noqa: E402

IST = dt.timezone(dt.timedelta(hours=5, minutes=30))


def font(size: int, bold: bool = False):
    try:
        return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def inr(x: float) -> str:
    """Indian grouping: 1234567.5 -> 12,34,567.50"""
    whole, frac = f"{x:.2f}".split(".")
    head, tail = whole[:-3], whole[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups + [tail]) + "." + frac


def parse_ts(date: str, time_: str) -> dt.datetime:
    return dt.datetime.strptime(f"{date} {time_}", "%d/%m/%Y %H:%M:%S").replace(tzinfo=IST)


def receipt(row: dict, amount_text: str) -> Image.Image:
    img = Image.new("RGB", (720, 1100), (236, 240, 245))
    d = ImageDraw.Draw(img)
    d.rectangle([30, 30, 690, 1070], fill="white", outline=(200, 206, 215), width=2)
    d.rectangle([30, 30, 690, 150], fill=(34, 90, 160))
    d.text((70, 62), "UPI Payment Receipt", fill="white", font=font(42, True))
    d.text((70, 190), "Payment Successful", fill=(20, 120, 60), font=font(34, True))
    d.text((70, 280), "Amount", fill=(90, 100, 115), font=font(28))
    d.text((70, 320), amount_text, fill=(15, 25, 45), font=font(64, True))
    when = row["when"]
    y = 460
    for k, v in [("Paid to", row["payee"]), ("Paid from", row["payer"]), ("UPI Ref No", row["rrn"]),
                 ("Date", when.strftime("%d %b %Y")), ("Time", when.strftime("%I:%M %p"))]:
        d.text((70, y), k, fill=(90, 100, 115), font=font(26))
        d.text((70, y + 36), v, fill=(15, 25, 45), font=font(34, True))
        y += 120
    d.text((70, 1010), "Sample document for software demonstration only", fill=(140, 148, 160), font=font(20))
    return img


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="fresh_demo_set")
    ap.add_argument("--rows", type=int, default=600_000)
    ap.add_argument("--gangs", type=int, default=25)
    args = ap.parse_args(argv)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    tag = time.strftime("x%d%H%M")
    csv_path = out / "bank_statements_operation_cyber_shield.csv"
    key = make(csv_path, args.rows, args.gangs, seed=int(time.time()) % 100_000, tag=tag)
    mules = set(key["mules"])

    # Pick a clear mule credit: payee is a planted mule, amount >= 25,000, has a reference number.
    with csv_path.open(encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f)]
    for i, r in enumerate(rows):
        r["line"] = i + 2  # header is line 1
    credits = [r for r in rows if r["payee"] in mules and float(r["amount"]) >= 25_000 and r.get("rrn")]
    if not credits:
        raise SystemExit("no suitable mule credit found; try more rows")
    main_row = max(credits, key=lambda r: float(r["amount"]))
    main_row["when"] = parse_ts(main_row["txn_date"], main_row["txn_time"])
    amount = float(main_row["amount"])

    genuine = receipt(main_row, "₹" + inr(amount))
    genuine.save(out / "upi_receipt_genuine.png")

    # Tampered: re-render only the amount (a tenth of it), JPEG the patch, paste it over the original.
    box = (60, 310, 560, 400)
    patch = receipt(main_row, "₹" + inr(round(amount / 10))).crop(box)
    buf = io.BytesIO()
    patch.save(buf, "JPEG", quality=55)
    tampered = genuine.copy()
    tampered.paste(Image.open(io.BytesIO(buf.getvalue())), box[:2])
    exif = Image.Exif()
    exif[0x0131] = "Adobe Photoshop 25.0 (Windows)"
    tampered.save(out / "upi_receipt_tampered.png", exif=exif)

    # One-page statement for the mule account, around the same transaction.
    acct_rows = sorted((r for r in rows if main_row["payee"] in (r["payer"], r["payee"])),
                       key=lambda r: parse_ts(r["txn_date"], r["txn_time"]))[:10]
    page = Image.new("RGB", (1240, 1754), "white")
    d = ImageDraw.Draw(page)
    d.text((80, 80), "Account Statement (sample)", fill=(15, 25, 45), font=font(48, True))
    d.text((80, 150), f"Account: {main_row['payee']}", fill=(90, 100, 115), font=font(28))
    cols, y = [60, 300, 560, 860, 1050], 240
    for x, h in zip(cols, ["Date & time", "From", "To", "Amount", "Ref no"]):
        d.text((x, y), h, fill=(15, 25, 45), font=font(24, True))
    d.line([60, y + 40, 1180, y + 40], fill=(120, 120, 120), width=2)
    for r in acct_rows:
        y += 80
        when = parse_ts(r["txn_date"], r["txn_time"]).strftime("%d/%m/%Y %H:%M")
        for x, v in zip(cols, [when, r["payer"], r["payee"], inr(float(r["amount"])), r["rrn"]]):
            d.text((x, y), v, fill=(15, 25, 45), font=font(18))
    page.save(out / "bank_statement_page.pdf", "PDF", resolution=150)

    expected = {"tag": tag, "csv_rows": key["rows"], "planted_gangs": key["gangs"], "planted_mules": len(mules),
                "receipt_row": {"csv_line": main_row["line"], "amount": amount, "rrn": main_row["rrn"],
                                "payer": main_row["payer"], "payee": main_row["payee"],
                                "time_ist": main_row["when"].strftime("%d %b %Y %H:%M")},
                "tampered_amount": round(amount / 10)}
    (out / "_answer_key_DO_NOT_UPLOAD.json").write_text(json.dumps(expected, indent=1), encoding="utf-8")
    print(json.dumps(expected, indent=1))


if __name__ == "__main__":
    main()
