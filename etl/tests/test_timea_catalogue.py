"""KSH dropping an indicator from the TIMEA catalogue (2026-11) must not stop
the run while an archived catalogue still names its years and label."""
import gzip
import json

import ksh_timea


def _archive(root, day, rows, name="INDIKATOR1.json"):
    folder = root / day
    folder.mkdir(parents=True)
    body = json.dumps({"features": [{"attributes": r} for r in rows]}).encode()
    (folder / f"{name}.gz").write_bytes(gzip.compress(body))
    (folder / "manifest.json").write_text("{}")


def test_carried_from_newest_archive_that_lists_it(tmp_path):
    _archive(tmp_path, "2026-09-01", [{"MUTATO_KOD": "TYWJ001", "TELEP": "2023"}])
    _archive(tmp_path, "2026-10-18", [{"MUTATO_KOD": "TYWJ001", "TELEP": "2024"},
                                      {"MUTATO_KOD": "TYWA001", "TELEP": "2024"}])
    _archive(tmp_path, "2026-11-20", [{"MUTATO_KOD": "TYWA001"}])
    got = ksh_timea.carried_catalogue(["TYWJ001"], tmp_path)
    assert got == {"TYWJ001": {"MUTATO_KOD": "TYWJ001", "TELEP": "2024"}}


def test_carried_file_is_read_again(tmp_path):
    _archive(tmp_path, "2026-11-20", [{"MUTATO_KOD": "TYWJ011", "JARAS": "2025"}],
             name="INDIKATOR1_carried.json")
    assert ksh_timea.carried_catalogue(["TYWJ011"], tmp_path)["TYWJ011"]["JARAS"] == "2025"


def test_unknown_code_is_not_invented(tmp_path):
    _archive(tmp_path, "2026-10-18", [{"MUTATO_KOD": "TYWA001"}])
    assert ksh_timea.carried_catalogue(["TYWJ999"], tmp_path) == {}
