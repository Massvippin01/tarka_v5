"""Render the fictional OCR demo files for CASE-2026-886A726C (reads the case's derived.sqlite read-only).

Usage: python scripts/make_ocr_demo_files.py [path/to/derived.sqlite]
"""
import datetime as dt
import io
import sqlite3
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "demo_evidence_files" / "ocr"
DB = sys.argv[1] if len(sys.argv) > 1 else str(
    Path(__file__).resolve().parents[1] / "data/ingestion/derived/CASE-2026-886A726C/derived.sqlite")
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
ROW_LINE = 353008  # a real mule0_a0 credit in the demo statement


def font(size, bold=False):
    return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)


def rows():
    c = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    main = c.execute("SELECT line,ts,payer,payee,amount,ref FROM txns WHERE line=?", (ROW_LINE,)).fetchone()
    others = c.execute(
        "SELECT line,ts,payer,payee,amount,ref FROM txns WHERE payee='mule0_a0@okaxis' AND line<>? "
        "ORDER BY line LIMIT 8", (ROW_LINE,)).fetchall()
    return main, others


def receipt(main, amount_text):
    line, ts, payer, payee, _, ref = main
    when = dt.datetime.fromtimestamp(ts, IST)
    img = Image.new("RGB", (720, 1100), (236, 240, 245))
    d = ImageDraw.Draw(img)
    d.rectangle([30, 30, 690, 1070], fill="white", outline=(200, 206, 215), width=2)
    d.rectangle([30, 30, 690, 150], fill=(34, 90, 160))
    d.text((70, 62), "UPI Payment Receipt", fill="white", font=font(42, True))
    d.text((70, 190), "Payment Successful", fill=(20, 120, 60), font=font(34, True))
    d.text((70, 280), "Amount", fill=(90, 100, 115), font=font(28))
    d.text((70, 320), amount_text, fill=(15, 25, 45), font=font(64, True))
    rowsx = [("Paid to", payee), ("Paid from", payer),
             ("UPI Ref No", ref),
             ("Date", when.strftime("%d %b %Y")),
             ("Time", when.strftime("%I:%M %p"))]
    y = 460
    for k, v in rowsx:
        d.text((70, y), k, fill=(90, 100, 115), font=font(26))
        d.text((70, y + 36), v, fill=(15, 25, 45), font=font(34, True))
        y += 120
    d.text((70, 1010), "Sample document for software demonstration only", fill=(140, 148, 160), font=font(20))
    return img


def main_():
    OUT.mkdir(parents=True, exist_ok=True)
    main, others = rows()
    genuine = receipt(main, "₹76,000.00")
    genuine.save(OUT / "upi_receipt_genuine.png")

    # tamper: re-render only the amount, JPEG-compress that patch, paste it back over the original amount
    box = (60, 310, 500, 400)
    patch = receipt(main, "₹7,600.00").crop(box)
    buf = io.BytesIO()
    patch.save(buf, "JPEG", quality=55)
    tampered = genuine.copy()
    tampered.paste(Image.open(io.BytesIO(buf.getvalue())), box[:2])
    exif = Image.Exif()
    exif[0x0131] = "Adobe Photoshop 25.0 (Windows)"  # editors often leave this tag behind
    tampered.save(OUT / "upi_receipt_tampered.png", exif=exif)

    # one-page statement with the same transaction among real neighbouring rows
    page = Image.new("RGB", (1240, 1754), "white")
    d = ImageDraw.Draw(page)
    d.text((80, 80), "Account Statement (sample)", fill=(15, 25, 45), font=font(48, True))
    d.text((80, 150), "Account: mule0_a0@okaxis   Period: Sep 2026", fill=(90, 100, 115), font=font(28))
    cols = [60, 140, 380, 650, 910, 1030]
    heads = ["Row", "Date & time", "From", "To", "Amount", "Ref no"]
    y = 240
    for x, h in zip(cols, heads):
        d.text((x, y), h, fill=(15, 25, 45), font=font(24, True))
    d.line([80, y + 40, 1160, y + 40], fill=(120, 120, 120), width=2)
    allrows = sorted([main] + others, key=lambda r: r[1])
    for r in allrows:
        y += 80
        when = dt.datetime.fromtimestamp(r[1], IST).strftime("%d/%m/%Y %H:%M")
        vals = [str(r[0]), when, r[2], r[3], f"{r[4]:,.2f}", r[5]]
        for x, v in zip(cols, vals):
            d.text((x, y), v, fill=(15, 25, 45), font=font(20))
    page.save(OUT / "bank_statement_page.pdf", "PDF", resolution=150)
    print("written", OUT, "row", main)


main_()
