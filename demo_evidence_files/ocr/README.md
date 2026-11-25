# OCR demo files (fictional, repeatable)

Made by `python scripts/make_ocr_demo_files.py` (reads the demo case's statement, read-only) and uploaded with
`python scripts/upload_ocr_demo_files.py http://127.0.0.1:8071 CASE-2026-886A726C`. Generic "UPI Payment Receipt"
styling, no real bank branding. The transaction is a real row of `CASE-2026-886A726C`'s statement
(`demo_bank_statements.csv`, row/line 353008): victim0_4@oksbi paid mule0_a0@okaxis, ₹76,000, ref 700000353006, 10 Sep 2026 09:33 IST.

| File | What it is | OCR should extract |
|---|---|---|
| `upi_receipt_genuine.png` | Receipt that exactly matches the statement row | Amount ₹76,000 · UTR/RRN 700000353006 · UPI ID mule0_a0@okaxis · Date 10 Sep 2026 · Time 09:33 AM. Statement: **matches row #353008**. Editing checks: nothing unusual. |
| `upi_receipt_tampered.png` | Same receipt, amount region pasted over with ₹7,600 and an editing-software tag left in the file | Amount ₹7,600 · same UTR/RRN and UPI ID. Statement: **same reference, different amount (row #353008 shows ₹76,000)**. Finding: editing software tag present. All wording is "possible manipulation, needs examiner review". |
| `bank_statement_page.pdf` | One-page statement, 9 real rows of the same account including the transaction | Several different reference numbers, so TARKA takes **no** payment fields and says it looks like a statement. |

Notes: the pixel/compression (ELA) check did not flag the pasted amount on this clean computer-made image; the editing tag and the
statement comparison did. Missing fields stay empty ("Not found"); nothing is guessed. See it in the app: Evidence page, file row, "OCR view".
