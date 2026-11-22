"""Driving time to hospital across Europe (source U): Eurostat GISCO.

"Accessibility to healthcare services", population-weighted over the 2021
census grid on the TomTom road network, published for NUTS 2024. NUTS 3 is
the megye, so a county stands beside the region across its border.

The reference year is 2023. The 2026 release is preliminary and repeats 2023
services where a country sent none, and 2020 runs on another road network, so
no change over time is printed. Ukraine and Serbia are not in the dataset.

The full table is 213 MB and is not kept. data/raw/gisco_access/<version>/
holds the rows used (cut without change), the region names with the border
pairs, and the SHA-256 of the file they were cut from. The monthly run builds
from that archive; a new release is a new VERSION and one run with --refresh.

It is also the outside check on our own traveltime.json: `check` puts each
megye's GISCO median beside ours, weighted by settlement population. The
layer that answers the same question is `sbo`, the emergency departments
(national median 11.5 against 11.85 minutes at the 2026-11 run). `inpatient`
does not: it counts every contracted site, chronic care and nursing too. The
two differ in method and neither corrects the other.

Usage:
  python etl/hospital_access.py [--refresh]
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import sys
import tempfile
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from parse_dental import ParseError

ROOT = Path(__file__).resolve().parent.parent
VERSION = "v2026_10"
RAW = ROOT / "data" / "raw" / "gisco_access" / VERSION
TRAVEL = ROOT / "data" / "traveltime.json"
OUT = ROOT / "data" / "hospital_access.json"
SCHEMA_VERSION = 1

YEAR = "2023"
URL = ("https://ec.europa.eu/eurostat/cache/GISCO/pub/accessibility/services/"
       f"euro_access_healthcare_NUTS_2024_CAR_MN_{VERSION}.csv")
SHAPES_URL = ("https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
              "NUTS_RG_20M_2024_4326_LEVL_3.geojson")
PAGE = "https://ec.europa.eu/eurostat/web/gisco/geodata/geographic-accessibility"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; open-data-fetch/1.0)"}
FIELDS = {("AVG", "MN"): "mean", ("MED", "MN"): "median", ("GT_20_MN", "PC"): "over20",
          ("GT_45_MN", "PC"): "over45", ("TOTAL", "NR"): "population"}


def wanted(row: dict, regions: set[str]) -> bool:
    return (row["ACCESS_INDIC"] == "N1" and row["AGE"] == "T" and row["DEG_URB"] == "TOTAL"
            and row["TIME"] == YEAR and (row["STATINFO"], row["UNIT"]) in FIELDS
            and (len(row["GEO"]) == 2 or row["GEO"] in regions))


def borders(features: list[dict]) -> tuple[dict, list[list[str]]]:
    """The megye, the regions sharing an edge with one, and the pairs."""
    names, points = {}, {}
    for f in features:
        g = f["geometry"]
        polygons = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        code = f["properties"]["NUTS_ID"]
        points[code] = {tuple(round(c, 3) for c in q) for p in polygons for ring in p for q in ring}
        names[code] = f["properties"].get("NAME_LATN") or f["properties"]["NUTS_NAME"]
    home = sorted(c for c in points if c.startswith("HU"))
    # two shared points make an edge; one is three countries meeting in a point
    pairs = [[h, c] for h in home for c in sorted(points)
             if not c.startswith("HU") and len(points[h] & points[c]) >= 2]
    keep = set(home) | {c for _, c in pairs}
    return {c: names[c] for c in sorted(keep)}, pairs


def refresh() -> None:
    response = requests.get(SHAPES_URL, headers=HEADERS, timeout=120)
    response.raise_for_status()
    names, pairs = borders(response.json()["features"])
    digest = hashlib.sha256()
    kept = io.StringIO()
    with tempfile.TemporaryFile() as full:
        with requests.get(URL, headers=HEADERS, timeout=600, stream=True) as download:
            download.raise_for_status()
            for chunk in download.iter_content(1 << 20):
                digest.update(chunk)
                full.write(chunk)
        full.seek(0)
        reader = csv.DictReader(io.TextIOWrapper(full, encoding="utf-8"))
        writer = csv.DictWriter(kept, reader.fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(r for r in reader if wanted(r, set(names)))
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / "rows.csv").write_text(kept.getvalue(), encoding="utf-8")
    (RAW / "manifest.json").write_text(json.dumps({
        "url": URL, "sha256": digest.hexdigest(), "shapes": SHAPES_URL,
        "fetched": dt.date.today().isoformat(), "year": YEAR, "names": names, "pairs": pairs,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def parse(rows) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for r in rows:
        key = FIELDS.get((r["STATINFO"], r["UNIT"]))
        if key and r["VALUE"]:
            value = float(r["VALUE"])
            out.setdefault(r["GEO"], {})[key] = round(value) if key == "population" else value
    return out


def weighted_median(pairs: list[tuple[float, float]]) -> float | None:
    pairs = sorted(pairs)
    half, seen = sum(w for _, w in pairs) / 2, 0.0
    for value, weight in pairs:
        seen += weight
        if seen >= half:
            return value
    return None


def own_medians(settlements: list[dict]) -> dict[str, float | None]:
    by: dict[str, list[tuple[float, float]]] = {}
    for s in settlements:
        if s.get("sboMin") is not None and s.get("population"):
            by.setdefault(s["county"], []).append((s["sboMin"], s["population"]))
    return {county: weighted_median(v) for county, v in by.items()}


def own_national(settlements: list[dict]) -> dict:
    rows = [(s["sboMin"], s["population"]) for s in settlements
            if s.get("sboMin") is not None and s.get("population")]
    total = sum(w for _, w in rows)
    return {"median": weighted_median(rows),
            "over20": round(100 * sum(w for v, w in rows if v > 20) / total, 2)}


def guard(values: dict, names: dict) -> None:
    home = [c for c in names if c.startswith("HU")]
    if len(home) != 20 or any(c not in values for c in [*home, "HU"]):
        raise ParseError("hospital access: not every megye has values")
    total = sum(values[c]["population"] for c in home)
    if abs(total - values["HU"]["population"]) > 20:
        raise ParseError(f"hospital access: the megye hold {total} people, "
                         f"the country {values['HU']['population']}")
    for geo, v in values.items():
        if set(v) != set(FIELDS.values()):
            raise ParseError(f"hospital access: {geo} is incomplete")
        if not 0 <= v["over45"] <= v["over20"] <= 100:
            raise ParseError(f"hospital access: the shares of {geo} are out of order")


def build() -> dict:
    if not (RAW / "manifest.json").exists():
        raise ParseError("hospital access: no archive, run with --refresh")
    manifest = json.loads((RAW / "manifest.json").read_text(encoding="utf-8"))
    values = parse(csv.DictReader(io.StringIO((RAW / "rows.csv").read_text(encoding="utf-8"))))
    names = manifest["names"]
    guard(values, names)
    settlements = json.loads(TRAVEL.read_text(encoding="utf-8"))["settlements"]
    ours = own_medians(settlements)
    check = []
    for code, name in names.items():
        if code.startswith("HU"):
            if name not in ours:
                raise ParseError(f"hospital access: no driving times for {name}")
            check.append({"geo": code, "gisco": values[code]["median"], "own": ours[name]})
    return {"schemaVersion": SCHEMA_VERSION, "year": manifest["year"], "version": VERSION,
            "fetched": manifest["fetched"], "url": PAGE,
            "countries": {g: v for g, v in values.items() if len(g) == 2},
            "regions": {g: {"name": names[g], **values[g]} for g in names if g in values},
            "pairs": [p for p in manifest["pairs"] if p[1] in values],
            "check": check, "ownNational": own_national(settlements)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true")
    if parser.parse_args().refresh:
        refresh()
    out = build()
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUT}: {len(out['countries'])} countries, {len(out['regions'])} regions")


if __name__ == "__main__":
    main()
