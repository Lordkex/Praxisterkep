"""Missing primary care in the neighbouring countries (source V).

One publisher per country, and only where an official table can be fetched
and reused. Today that is Slovakia: the healthcare surveillance authority
(ÚDZS) evaluates the "public optimal network" of general practice every year
per okres, for adults and for children.

Its "missing surgeries" are NOT vacant districts. They are the distance to a
norm, in standard surgeries of 35 hours a week. A Hungarian vacant district
is an existing district without a contracted physician. The two are never
put in one rate or one ranking.

The two workbooks and the authority's summary are archived; each workbook's
missing surgeries must add up to the total the summary prints. A new year is
a new YEAR and FOLDER and one run with --refresh.

Usage:
  python etl/neighbours.py [--refresh]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

import openpyxl
import pdfplumber
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from parse_dental import ParseError

ROOT = Path(__file__).resolve().parent.parent
YEAR, FOLDER = "2026", "2026/06"
RAW = ROOT / "data" / "raw" / "udzs" / YEAR
OUT = ROOT / "data" / "neighbours.json"
SCHEMA_VERSION = 1

PAGE = ("https://www.udzs-sk.sk/urad/udaje-o-vyhodnoteni-sieti-poskytovatelov-"
        "ambulantnej-starostlivosti-podla-zakona-c-578-2004-z-z/")
BASE = f"https://www.udzs-sk.sk/wp-content/uploads/{FOLDER}/"
FILES = {"adult": f"Vysledky_vyhodnotenia_stavu_VOS_VLD_{YEAR}.xlsx",
         "child": f"Vysledky_vyhodnotenia_stavu_VOS_VLDD_{YEAR}.xlsx",
         "summary": f"Vyhodnotenie_stavu_VOS_{YEAR}.pdf"}
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; open-data-fetch/1.0)"}
COLUMNS = ["Kraj", "Okres", "Optimálna kapacita", "Počet ambulancií vo verejnej sieti",
           "Počet chýbajúcich ambulancií", "Miera naplnenia optimálnej kapacity"]
KRAJ = {"BA", "TT", "TN", "NR", "ZA", "BB", "PO", "KE"}
# the kraje that share a border with Hungary
BORDER = ["BA", "TT", "NR", "BB", "KE"]


def refresh() -> None:
    files = {}
    for key, name in FILES.items():
        response = requests.get(BASE + name, headers=HEADERS, timeout=120)
        response.raise_for_status()
        files[key] = response.content
    RAW.mkdir(parents=True, exist_ok=True)
    for key, name in FILES.items():
        (RAW / name).write_bytes(files[key])
    (RAW / "manifest.json").write_text(json.dumps(
        {"fetched": dt.date.today().isoformat(), "base": BASE, "files": FILES},
        indent=1) + "\n", encoding="utf-8")


def parse(rows: list[tuple]) -> list[dict]:
    head = next((i for i, r in enumerate(rows) if len(r) > 1 and r[1] == "Kraj"), None)
    if head is None:
        raise ParseError("neighbours: no header row")
    for cell, expected in zip(rows[head][1:7], COLUMNS, strict=True):
        if not str(cell or "").startswith(expected):
            raise ParseError(f"neighbours: column {cell!r}, expected {expected!r}")
    out = []
    for r in rows[head + 1:]:
        if r[1] not in KRAJ:
            continue
        kraj, okres, optimal, present, missing, fill = r[1:7]
        if not all(isinstance(v, int | float) for v in (optimal, present, missing, fill)):
            raise ParseError(f"neighbours: {okres} has a value that is not a number")
        out.append({"kraj": kraj, "okres": okres.strip(), "optimal": round(optimal, 1),
                    "present": round(present, 1), "missing": round(missing), "fill": round(fill, 4)})
    return out


def printed_totals(summary: str) -> list[int]:
    """The missing totals the authority prints: adults first, then children."""
    found = re.findall(r"chýbalo\s+spolu\s+(\d[\d ]*?)\s+ambulancií\s+všeobecného", summary)
    if len(found) != 2:
        raise ParseError(f"neighbours: {len(found)} printed totals, expected 2")
    return [int(v.replace(" ", "")) for v in found]


def summarise(rows: list[dict], printed: int) -> dict:
    total = sum(r["missing"] for r in rows)
    if total != printed:
        raise ParseError(f"neighbours: okresy add up to {total}, the summary prints {printed}")
    return {"missing": total, "short": sum(1 for r in rows if r["missing"] > 0),
            "districts": len(rows),
            "borderMissing": sum(r["missing"] for r in rows if r["kraj"] in BORDER),
            "rows": rows}


def build() -> dict:
    if not (RAW / "manifest.json").exists():
        raise ParseError("neighbours: no archive, run with --refresh")
    manifest = json.loads((RAW / "manifest.json").read_text(encoding="utf-8"))
    with pdfplumber.open(RAW / FILES["summary"]) as pdf:
        totals = printed_totals("\n".join(p.extract_text() or "" for p in pdf.pages))
    kinds = {}
    for key, printed in zip(("adult", "child"), totals, strict=True):
        book = openpyxl.load_workbook(RAW / FILES[key], data_only=True)
        kinds[key] = summarise(parse(list(book.worksheets[0].values)), printed)
    return {"schemaVersion": SCHEMA_VERSION,
            "slovakia": {"asOf": f"{YEAR}-01-01", "fetched": manifest["fetched"], "url": PAGE,
                         "border": BORDER, "kinds": kinds}}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true")
    if parser.parse_args().refresh:
        refresh()
    out = build()
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUT}: " + ", ".join(
        f"{k} {v['missing']} missing in {v['short']}/{v['districts']}"
        for k, v in out["slovakia"]["kinds"].items()))


if __name__ == "__main__":
    main()
