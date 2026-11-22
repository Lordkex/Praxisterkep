"""Collegial praxis communities (source T): which járás form one community.

OKFŐ, the praxis manager, publishes the territorial division as a web page:
one line per community, each járás with its PK code. NEAK publishes no list
of praxis communities. This page is a division, NOT a membership list: it
does not say which practice joined, and the close ("szoros") and the járás
dental communities are not on it. So no effect of membership can be read
from it; what can be read is how many districts of a community are vacant.

Only the HTML page is fetched. OKFŐ's robots.txt closes /wp-content/uploads/,
so nothing is ever requested from there.

Counts are summed from the járás profiles and the rate is made from the
sums; a rate is never averaged up a level. The járás of the page must be
exactly the járás of districts.json, each once.

Usage:
  python etl/communities.py [--offline]
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from parse_dental import ParseError

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "communities"
DISTRICTS = ROOT / "data" / "districts.json"
OUT = ROOT / "data" / "communities.json"
SCHEMA_VERSION = 1

URL = "https://alapellatas.okfo.gov.hu/a-kollegialis-praxiskozossegek-teruleti-beosztasa"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; open-data-fetch/1.0)"}
MEMBER = re.compile(r"(Budapest \d\d\. ker\.|[^\W\d_][\w -]*? járás) ?\((PK\d{3})\)")


def lines(page: str) -> list[str]:
    body = re.sub(r"(?is)<(script|style).*?</\1>", " ", page)
    body = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|div|tr)>", "\n", body)
    body = html.unescape(re.sub(r"<[^>]+>", "", body))
    out = []
    for line in body.split("\n"):
        line = " ".join(line.split())
        if "(PK" in line:
            # the Zala line runs two communities together at a list number: "… (PK193) 3. …"
            out += re.split(r"(?<=\)) \d+\. ", line)
    return out


def parse(page: str) -> list[list[dict]]:
    out = []
    for line in lines(page):
        found = MEMBER.findall(line)
        if len(found) != line.count("(PK"):
            raise ParseError(f"communities: unreadable line {line!r}")
        out.append([{"name": name.removesuffix(" járás").strip(), "code": code}
                    for name, code in found])
    if not out:
        raise ParseError("communities: the page lists none")
    return out


def rate_of(counts: dict) -> float | None:
    if not counts["total"]:
        return None
    return round((counts["vacant"] + counts["dissolved"]) / counts["total"], 4)


def combine(groups: list[list[dict]], districts: list[dict]) -> list[dict]:
    named = [m["name"] for g in groups for m in g]
    known = {d["name"]: d for d in districts}
    if len(named) != len(set(named)) or set(named) != set(known):
        raise ParseError(f"communities: járás differ from districts.json: "
                         f"{sorted(set(named) ^ set(known))[:8]}")
    out = []
    for group in groups:
        rows = [known[m["name"]] for m in group]
        if len({r["county"] for r in rows}) != 1:
            raise ParseError(f"communities: {group[0]['name']} crosses a county border")
        record = {"id": group[0]["code"], "county": rows[0]["county"], "members": group,
                  "population": sum(r["population"] for r in rows)}
        for kind in ("gp", "dental"):
            counts = {k: sum(r[f"{kind}Districts"][k] for r in rows)
                      for k in ("total", "vacant", "dissolved", "longTerm")}
            record[kind] = {**counts, "rate": rate_of(counts)}
        out.append(record)
    return out


def build(offline: bool = False) -> dict:
    if offline:
        archived = sorted(RAW.glob("*/page.html"))
        if not archived:
            raise ParseError("communities: nothing archived")
        fetched, page = archived[-1].parent.name, archived[-1].read_text(encoding="utf-8")
    else:
        response = requests.get(URL, headers=HEADERS, timeout=60)
        response.raise_for_status()
        response.encoding = "utf-8"
        fetched, page = dt.date.today().isoformat(), response.text
    groups = parse(page)
    profiles = json.loads(DISTRICTS.read_text(encoding="utf-8"))
    rows = combine(groups, profiles["districts"])
    if not offline:
        folder = RAW / fetched
        folder.mkdir(parents=True, exist_ok=True)
        # only the list: the page around it carries the office's contacts
        kept = "".join(f"<p>{html.escape(line)}</p>\n" for line in lines(page))
        (folder / "page.html").write_text(kept, encoding="utf-8")
    return {"schemaVersion": SCHEMA_VERSION, "fetched": fetched, "url": URL,
            "dataMonth": profiles["dataMonth"], "communities": rows,
            "stats": {"communities": len(rows), "districts": sum(len(g) for g in groups),
                      "single": sum(1 for g in groups if len(g) == 1)}}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    out = build(parser.parse_args().offline)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUT}: {out['stats']}")


if __name__ == "__main__":
    main()
