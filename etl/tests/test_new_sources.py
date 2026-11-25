"""Sources S-V: what each parser reads, and what must make it fail."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import communities
import hospital_access
import neighbours
import waitlist
from parse_dental import ParseError

HEAD = "".join(f"<th>{m}</th>" for m in waitlist.MEASURES)
PROC = {"code": "O22", "name": "Csípőprotézis műtét", "group": "mandatory"}


def overview(over60=5, served=10, national=True, note=""):
    first = ("<tr><td><strong>Országos átlag</strong></td><td>9</td><td>90</td>"
             "<td>20 nap</td><td>30 nap</td></tr>") if national else ""
    return (f"<table><tr><th>Térség neve</th>{HEAD}</tr>{note}{first}"
            f"<tr><td>Minden térség</td><td>{over60}</td><td>{served}</td><td>7 nap</td><td>9 nap</td></tr>"
            f"<tr><td>Dél-Alföld</td><td>{over60}</td><td>{served}</td><td>7 nap</td><td>9 nap</td></tr></table>")


def detail(over60=5, served=10, median=7):
    return (f"<table><tr><th>Várólista neve</th><th>Térség</th><th>Intézmény neve</th>{HEAD}</tr>"
            f"<tr><td>Csípőprotézis műtét</td><td>Dél-Alföld</td><td>Vas Vármegyei Györ Kórház</td>"
            f"<td>{over60}</td><td>{served}</td><td>{median} nap</td><td>9 nap</td></tr></table>")


def test_waitlist_keeps_the_national_row_as_published():
    out = waitlist.parse(PROC, overview(), detail())
    assert out["national"] == {"over60": 9, "served": 90, "median": 20, "mean": 30}
    assert out["institutions"][0]["median"] == 7


def test_waitlist_shows_megye_and_repairs_the_lost_accent():
    assert waitlist.parse(PROC, overview(), detail())["institutions"][0]["name"] == "Vas Megyei Győr Kórház"


def test_waitlist_fails_when_those_waiting_do_not_add_up():
    with pytest.raises(ParseError, match="add up"):
        waitlist.parse(PROC, overview(over60=6), detail(over60=5))


def test_waitlist_allows_a_closed_list_but_not_extra_operations():
    waitlist.parse(PROC, overview(served=12), detail(served=10))
    with pytest.raises(ParseError, match="more operations"):
        waitlist.parse(PROC, overview(served=10), detail(served=12))


def test_waitlist_never_reads_no_operations_as_zero_days():
    row = waitlist.parse(PROC, overview(served=0), detail(served=0, median=0))["institutions"][0]
    assert row["median"] is None and row["mean"] is None


def test_waitlist_capacity_caveat_is_not_a_row():
    note = f"<tr><td colspan='5'>{waitlist.CAPACITY_NOTE} esetében …</td></tr>"
    out = waitlist.parse({**PROC, "group": "capacity"}, overview(national=False, note=note), detail())
    assert out["national"] is None and len(out["regions"]) == 1


def test_waitlist_mandatory_needs_its_national_row():
    with pytest.raises(ParseError, match="no national row"):
        waitlist.parse(PROC, overview(national=False), detail())


def test_waitlist_changed_columns_fail():
    with pytest.raises(ParseError, match="columns changed"):
        waitlist.parse(PROC, overview().replace("Térség neve", "Régió"), detail())


PAGE = ("<p>Keszthelyi járás (PK193) – Lenti járás (PK194) 3. Nagykanizsai járás (PK196)</p>"
        "<p>Budapest 01. ker. (PK001)</p>")


def district(name, county="Zala", total=10, vacant=2, dissolved=0):
    counts = {"total": total, "vacant": vacant, "dissolved": dissolved, "longTerm": 0}
    return {"name": name, "county": county, "population": 100,
            "gpDistricts": counts, "dentalDistricts": counts}


def test_communities_split_at_the_list_number_run_into_a_line():
    assert [[m["name"] for m in g] for g in communities.parse(PAGE)] == [
        ["Keszthelyi", "Lenti"], ["Nagykanizsai"], ["Budapest 01. ker."]]


def test_communities_rate_comes_from_the_sums():
    group = [[{"name": "A", "code": "PK001"}, {"name": "B", "code": "PK002"}]]
    out = communities.combine(group, [district("A", total=90, vacant=0), district("B", total=10, vacant=10)])
    assert out[0]["gp"]["rate"] == 0.1  # the mean of the two rates would be 0.5


def test_communities_fail_on_a_jaras_left_out():
    with pytest.raises(ParseError, match="differ"):
        communities.combine([[{"name": "A", "code": "PK001"}]], [district("A"), district("B")])


def test_communities_fail_across_a_county_border():
    group = [[{"name": "A", "code": "PK001"}, {"name": "B", "code": "PK002"}]]
    with pytest.raises(ParseError, match="county border"):
        communities.combine(group, [district("A"), district("B", county="Vas")])


def square(code, x, y=0):
    return {"properties": {"NUTS_ID": code, "NUTS_NAME": code}, "geometry": {
        "type": "Polygon", "coordinates": [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]]}}


def test_hospital_pairs_need_an_edge_not_a_corner():
    _, pairs = hospital_access.borders([square("HU110", 0), square("AT111", 1), square("RS121", 1, 1)])
    assert pairs == [["HU110", "AT111"]]


def test_hospital_median_is_weighted_by_people():
    assert hospital_access.weighted_median([(1, 10), (30, 80), (90, 10)]) == 30


def test_hospital_guard_needs_every_megye():
    with pytest.raises(ParseError, match="every megye"):
        hospital_access.guard({}, {"HU110": "Budapest"})


def test_neighbours_must_match_the_printed_total():
    rows = [{"kraj": "BA", "okres": "A", "missing": 3}, {"kraj": "ZA", "okres": "B", "missing": 2}]
    assert neighbours.summarise(rows, 5)["borderMissing"] == 3
    with pytest.raises(ParseError, match="prints 6"):
        neighbours.summarise(rows, 6)


def test_neighbours_read_both_printed_totals():
    body = ("chýbalo\nspolu 408 ambulancií všeobecného lekárstva. "
            "chýbalo spolu 107 ambulancií všeobecného lekárstva pre deti")
    assert neighbours.printed_totals(body) == [408, 107]
