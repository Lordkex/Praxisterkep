"""Surgical waiting lists (source S): NEAK's public register, aggregates only.

https://jogviszony.neak.gov.hu/varolista_pub/ answers two questions per
procedure: one row per care region, and one row per institution's list. Both
are kept. The case-by-case query ("tételes lekérdezés") is never requested,
and neither is the operators' application behind the login.

What the register's numbers are, and are not:
  * the wait is the one actually served by the patients operated on in the
    six months before the current month, not a forecast for someone joining;
  * "waiting" counts only those already past 60 days;
  * the institutions are a subset. A capacity list names only providers with
    lasting waits over 60 days (the register says so above each table) and
    has no national row; on the mandatory lists the national row holds
    several times the operations of the institutions shown. The national row
    is shown as published, and the subset's "Minden térség" and region rows
    never stand in for the country or a region. No median is averaged.

Those waiting over 60 days must add up exactly from institution to region to
"Minden térség", or the build fails. Operations may fall short (a list that
closed inside the six months is still counted in its region) but never exceed.

The register has no history, so each fetch is archived under
data/raw/waitlist/<date>/tables.json (the result tables as served).

Usage:
  python etl/waitlist.py [--offline]
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from parse_dental import ParseError

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "waitlist"
OUT = ROOT / "data" / "waitlist.json"
SCHEMA_VERSION = 1

URL = "https://jogviszony.neak.gov.hu/varolista_pub/varolistak-hosszanak-lekerdezese/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; open-data-fetch/1.0)"}
GROUPS = {"Kötelező vezetésű várólisták": "mandatory",
          "Kapacitáshiány miatt vezetett várólisták": "capacity"}
MEASURES = ["60 napot meghaladóan várakozók száma",
            "Tárgyhónapot megelőző 6 hónapban ellátott esetek száma",
            "Medián tényleges várakozási idő a megelőző 6 hónapban",
            "Átlagos tényleges várakozási idő a megelőző 6 hónapban"]
CAPACITY_NOTE = "Az ún. kapacitáshiány miatt vezetett várólisták"
NATIONAL, LISTED = "Országos átlag", "Minden térség"
# the register's code page loses ő; only these words are repaired
SPELLING = {"Györ": "Győr", "Rendelöintézet": "Rendelőintézet", "Felelösségü": "Felelősségű"}


def text(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", "", fragment)).split())


def options(page: str) -> list[dict]:
    out = []
    for label, body in re.findall(r"(?is)<optgroup label='([^']+)'>(.*?)</optgroup>", page):
        group = GROUPS.get(html.unescape(label))
        if not group:
            raise ParseError(f"waitlist: unknown group {label!r}")
        for code, name in re.findall(r"(?is)<option value='([^']+)'>(.*?)</option>", body):
            out.append({"code": code, "name": text(name), "group": group})
    if not out:
        raise ParseError("waitlist: the procedure list is empty")
    return out


def table(page: str) -> str:
    found = [t for t in re.findall(r"(?is)<table.*?</table>", page) if MEASURES[0] in text(t)]
    if len(found) > 1:
        raise ParseError("waitlist: more than one result table")
    return found[0] if found else ""


def cells(fragment: str, lead: list[str]) -> list[list[str]]:
    if not fragment:
        return []
    rows = [[text(c) for c in re.findall(r"(?is)<t[hd][^>]*>(.*?)</t[hd]>", r)]
            for r in re.findall(r"(?is)<tr.*?</tr>", fragment)]
    if rows[0] != lead + MEASURES:
        raise ParseError(f"waitlist: the columns changed: {rows[0]}")
    # the capacity tables open with their caveat in one cell across the width
    rows = [rows[0]] + [r for r in rows[1:] if not (len(r) == 1 and r[0].startswith(CAPACITY_NOTE))]
    if any(len(r) != len(rows[0]) for r in rows):
        raise ParseError("waitlist: a row of another width")
    return rows[1:]


def numbers(values: list[str]) -> dict:
    parsed = []
    for value, unit in zip(values, ("", "", " nap", " nap"), strict=True):
        m = re.fullmatch(rf"(\d+){unit}", value)
        if not m and value not in ("", "-"):
            raise ParseError(f"waitlist: unreadable value {value!r}")
        parsed.append(int(m.group(1)) if m else None)
    over60, served, median, mean = parsed
    if over60 is None or served is None:
        raise ParseError("waitlist: a row without its counts")
    if not served:
        median = mean = None  # nobody was operated on: no wait, not zero days
    return {"over60": over60, "served": served, "median": median, "mean": mean}


def shown_name(name: str) -> str:
    for wrong, right in SPELLING.items():
        name = name.replace(wrong, right)
    return name.replace("Vármegyei", "Megyei").replace("vármegyei", "megyei")


def parse(procedure: dict, overview: str, detail: str) -> dict:
    national = listed = None
    regions = []
    for name, *values in cells(overview, ["Térség neve"]):
        row = numbers(values)
        if name == NATIONAL:
            national = row
        elif name == LISTED:
            listed = row
        else:
            regions.append({"name": name, **row})
    institutions = [
        {"list": shown_name(r[0]), "region": r[1], "name": shown_name(r[2]), **numbers(r[3:])}
        for r in cells(detail, ["Várólista neve", "Térség", "Intézmény neve"])]

    totals = [(r, [i for i in institutions if i["region"] == r["name"]]) for r in regions]
    totals.append((listed or {"over60": 0, "served": 0}, institutions))
    for row, members in totals:
        where = f"waitlist {procedure['code']}, {row.get('name', LISTED)}"
        waiting = sum(i["over60"] for i in members)
        if waiting != row["over60"]:
            raise ParseError(f"{where}: {row['over60']} waiting, its institutions add up to {waiting}")
        if sum(i["served"] for i in members) > row["served"]:
            raise ParseError(f"{where}: more operations in the institutions than in the total")
    if procedure["group"] == "mandatory" and listed and not national:
        raise ParseError(f"waitlist {procedure['code']}: no national row")
    return {**procedure, "national": national, "listed": listed,
            "regions": regions, "institutions": institutions}


def fetch() -> dict:
    session = requests.Session()
    session.headers.update(HEADERS)

    def get(params: dict | None = None) -> str:
        response = session.get(URL, params=params, timeout=60)
        response.raise_for_status()
        response.encoding = "utf-8"
        time.sleep(1)
        return response.text

    procedures = options(get())
    for p in procedures:
        p["overview"] = table(get({"ocsk": p["code"]}))
        p["detail"] = table(get({"ocsk": p["code"], "tk": "MIND"})) if p["overview"] else ""
    return {"fetched": dt.date.today().isoformat(), "url": URL, "procedures": procedures}


def build(offline: bool = False) -> dict:
    if offline:
        archived = sorted(RAW.glob("*/tables.json"))
        if not archived:
            raise ParseError("waitlist: nothing archived")
        raw = json.loads(archived[-1].read_text(encoding="utf-8"))
    else:
        raw = fetch()
    procedures = [parse({k: p[k] for k in ("code", "name", "group")}, p["overview"], p["detail"])
                  for p in raw["procedures"]]
    guard(procedures)
    if not offline:
        folder = RAW / raw["fetched"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "tables.json").write_text(
            json.dumps(raw, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return {"schemaVersion": SCHEMA_VERSION, "fetched": raw["fetched"], "url": URL,
            "procedures": procedures,
            "stats": {"procedures": len(procedures),
                      "lists": sum(len(p["institutions"]) for p in procedures)}}


def guard(procedures: list[dict]) -> None:
    if len(procedures) < 15:
        raise ParseError(f"waitlist: only {len(procedures)} procedures")
    if not any(p["institutions"] for p in procedures):
        raise ParseError("waitlist: no institution in any list")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    out = build(parser.parse_args().offline)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUT}: {out['stats']}")


if __name__ == "__main__":
    main()
