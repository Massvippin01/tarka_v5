"""Make a fresh set of bank-statement files for trying TARKA's upload and bulk intake.

    PYTHONPATH=backend venv/Scripts/python backend/tools/make_test_uploads.py [--big-rows 1000000]

Writes to data/test_uploads/ (git-ignored):
- statement_1.csv … statement_5.csv: ordinary activity with planted mule gangs. Gang labels are unique per run,
  so files never collide with earlier uploads (no DUPLICATE results).
- One gang is split across statement_2 and statement_3, so TARKA should join it into one network.
- answer_key.json: which accounts are planted mules and victims, per file.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import validate_mule_scoring as v  # noqa: E402

OUT = Path("data/test_uploads")


def make(path: Path, rows: int, gangs: int, seed: int, tag: str) -> dict:
    """One statement; every planted label gets a run- and file-specific prefix."""
    tmp = path.with_suffix(".tmp")
    key = v.generate(tmp, rows, gangs, seed=seed)
    text = tmp.read_text(encoding="utf-8").replace("mule", f"{tag}mule").replace("victim", f"{tag}victim")
    path.write_text(text, encoding="utf-8")
    tmp.unlink()
    fix = lambda xs: [x.replace("mule", f"{tag}mule").replace("victim", f"{tag}victim") for x in xs]
    return {"file": path.name, "rows": key["rows"], "gangs": len(key["gangs"]),
            "mules": fix(key["mules"]), "victims": fix(key["victims"])}


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--big-rows", type=int, default=1_000_000, help="rows in statement_1 (the large one)")
    args = ap.parse_args(argv)
    OUT.mkdir(parents=True, exist_ok=True)
    run = time.strftime("r%d%H%M")  # unique per run, so nothing is a duplicate of an earlier upload
    plan = [(args.big_rows, 30), (200_000, 8), (200_000, 8), (100_000, 5), (50_000, 3)]
    files = []
    for i, (rows, gangs) in enumerate(plan, start=1):
        files.append(make(OUT / f"statement_{i}.csv", rows, gangs, seed=100 + i, tag=f"{run}f{i}"))
        print(f"statement_{i}.csv  {rows:,} rows, {gangs} gangs")

    # Join one gang across files: statement_2's first mule pays statement_3's first mules,
    # and statement_3 shows a cash-out from it, so the two files' gangs form one network.
    a, b = files[1]["mules"][0], files[2]["mules"][0]
    # The gangs are active on different days, so link them through a middleman account: a pays it during a's
    # active hours, it pays b during b's. Each mule keeps its short-burst pattern; the middleman ties the networks.
    first_seen = lambda name, who: next(line.split(",")[:2] for line in open(OUT / name, encoding="utf-8")
                                        if f",{who}," in line)
    relay = f"{run}relay@ybl"
    wa, wb = first_seen("statement_2.csv", a), first_seen("statement_3.csv", b)
    with open(OUT / "statement_3.csv", "a", encoding="utf-8") as f:
        f.write(f"{wa[0]},{wa[1]},{a},{relay},20000,{900000000000}\n")
        f.write(f"{wb[0]},{wb[1]},{relay},{b},19000,{900000000001}\n")
    (OUT / "answer_key.json").write_text(json.dumps(
        {"run": run, "files": files, "cross_file_link": {"from": a, "via": relay, "to": b,
                                                         "files": ["statement_2.csv", "statement_3.csv"]}}, indent=1))
    total = sum(f["rows"] for f in files)
    print(f"done: {total:,} rows in {OUT.resolve()} (answer_key.json lists the planted mules)")


if __name__ == "__main__":
    main()
