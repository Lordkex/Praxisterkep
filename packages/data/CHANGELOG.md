# Changelog

Verziók: `év.hónap.javítás`, a legújabb archivált hónapból. A kiadás címkéje
`data-<verzió>`.

Versions: `year.month.patch`, from the newest archived month. The release tag
is `data-<version>`.

## 2026.11.0 - 2026-11-23

Első kiadás. / First release.

- Minden archivált hónap 2017 októberétől 2026 novemberéig: 40 hónap;
  28 hónapban háziorvosi (2019 márciusától), 31-ben fogorvosi pillanatkép,
  JSON-ban és négy CSV-táblában, orvos- és szolgáltatónevek nélkül.
- A koordináták külön fájlban, ODbL 1.0 alatt.
- `manifest.json`: minden fájl SHA-256-ja, a git-commit, a nyers
  forrásfájlok ujjlenyomata és GitHub-linkje.
- TypeScript-kliens (Node és böngésző) és parancssori eszköz: `months`,
  `national`, `counties`, `longest`, `history`, `diff`, `verify`.

- Every archived month from October 2017 to November 2026: 40 months; 28 of
  them have a GP snapshot (from March 2019), 31 a dental one, as JSON and four
  CSV tables, without physician or provider names.
- Coordinates in a separate file, under ODbL 1.0.
- `manifest.json`: SHA-256 of every file, the git commit, the fingerprint and
  GitHub link of each raw source file.
- TypeScript client (Node and browser) and command-line tool: `months`,
  `national`, `counties`, `longest`, `history`, `diff`, `verify`.
