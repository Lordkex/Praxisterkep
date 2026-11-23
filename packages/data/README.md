# hungarian-praxismap

A [Praxistérkép](https://praxisterkep.hu) havi adatai egy csomagban: a magyar
háziorvosi és fogorvosi körzetek betöltetlensége 2017 októberétől, a NEAK
nyilvános adataiból, orvosnevek nélkül.

Monthly data of [Praxistérkép](https://praxisterkep.hu) in one package: vacant
Hungarian GP and dental districts since October 2017, built from NEAK's open
data, without physicians' names. [English below.](#english)

> A NEAK adatai tájékoztató jellegűek.

---

## Magyarul

### Mi van a csomagban?

Minden archivált hónap, áganként (`gp` = háziorvos, `dental` = fogorvos),
JSON-ban és CSV-ben. Nem minden hónapban van meg mindkét ág: a lenti táblázat
mutatja, melyik hónapban melyik.

| Fájl | Tartalom |
|---|---|
| `months/<hónap>/<ág>.json` | a havi pillanatkép az eredeti szerkezetben, nevek és koordináták nélkül (a `geoApprox` jelző megmarad) |
| `months/<hónap>/<ág>-praxes.csv` | a betöltetlen és a megszűnt körzetek, rendelőnként egy sor |
| `months/<hónap>/<ág>-filled.csv` | a betöltött körzetek a NEAK szerződött szolgáltatói jegyzékéből, név nélkül |
| `months/<hónap>/<ág>-counties.csv` | megyénként: körzetek, betöltetlenek, megszűntek, arány, érintett lakosság, típusonként |
| `months/<hónap>/<ág>-settlements.csv` | településenként: lakosság, betöltött körzetek, a betöltetlen és a megszűnt körzetek FIN-kódja |
| `months/<hónap>/<ág>-coordinates.csv` | a rendelők koordinátái (FIN, rendelő sorszáma, lat, lon, `geoApprox`) — **ODbL 1.0**, lásd lent |
| `manifest.json` | minden fájl SHA-256-ja és mérete, a git-commit, a nyers forrásfájlok jegyzéke |
| `schema/*.json` | JSON Schema a pillanatképre és a jegyzékre |
| `lib/` | TypeScript-kliens és parancssori eszköz, futásidejű függőség nélkül |

A CSV-k UTF-8 kódolásúak, vesszővel tagoltak, az RFC 4180 szerint idézőjelezve.
A hiányzó érték üres cella (régi hónapokban például a körzetszám vagy az arány).
A listák (például `servedSettlements`, `vacantPraxisIds`) egy cellában, `; `
elválasztással állnak. A `vacancyRate` és a `populationShare` 0 és 1 közötti
arány. A FIN-kódot és a KSH-kódot (`kshId`) szövegként olvasd be, mert vezető
nullával kezdődhet.

Néhány hónapból hiányzik a NEAK szerződött szolgáltatói jegyzéke. Ezekben a
`filled` fájl üres, és egy nem betöltetlen körzet állapota `unknown`
(ismeretlen), soha nem „betöltött”.

#### Hónapok

<!-- months -->
<!-- /months -->

### Betöltetlen ≠ ellátatlan

A betöltetlen körzetnek nincs szerződött orvosa, de a betegeit általában
helyettesítő orvos ellátja. A csomag a betöltetlenséget méri, nem az
ellátatlanságot: azt, hogy egy településen valóban nincs-e elérhető ellátás,
ezek az adatok nem mondják meg. Kérlek, a két fogalmat írásban se keverd.

### Nevek

A csomagban nincs orvos- és szolgáltatónév. A Praxistérkép csak ott mutat
nevet, ahol a NEAK maga közzéteszi, ez a csomag pedig egyet sem terjeszt: a
szolgáltató neve gyakran maga az orvos neve („Dr. Minta Bt.”), és egy
közzétett csomagverzió nem vonható vissza. A build minden kimeneti értéket
összevet az archívum összes nevével, és egyezésnél leáll.

Ismert korlát: a FIN-kód összekapcsolható a NEAK saját nyilvános
regiszterével, ahol a betöltött körzet szerződött orvosának neve szerepel. Mi
nevet nem terjesztünk, de amit a NEAK közzétesz, azt nem tudjuk és nem is
akarjuk elrejteni.

### Ami nincs benne

- **A nyers forrásfájlok** (NEAK PDF-ek és XLS-ek). A szolgáltatói jegyzék
  neveket tartalmaz, ezért ezek a GitHub-repóban maradnak (`data/raw/`). A
  `manifest.json` mindegyiket megnevezi SHA-256-tal, mérettel és a build
  commitjára rögzített GitHub-linkkel; ha egy hónapból hiányzik egy nyers
  fájl, a jegyzék ezt kiírja (`missingRaw`), nem pótolja.
- **Az oldal elemző fájljai** (kockázat, túlélés, kimenetek stb.): ezeknek
  nincs havi archívuma, és többjükben szolgáltatónév van.
- **Határpoligonok** (megye, járás).

### Telepítés és használat

```sh
npm install hungarian-praxismap
```

Node (22.18 vagy újabb) — a csomag saját fájljaiból olvas:

```js
import { client, countyRanking } from 'hungarian-praxismap';

const months = await client.months('gp');            // ['2019-03', …]
const snap = await client.snapshot('2026-11', 'gp'); // a teljes pillanatkép
console.table(countyRanking(snap));                  // megyei rangsor
```

A kliens további hívásai: `national(kind)` (havi országos idősor),
`praxisHistory(fin)` (egy körzet állapota hónapról hónapra, mindkét ágon),
`diff(from, to, kind)` (két hónap között megváltozott körzetek),
`coordinates(month, kind)` (az ODbL-fájl), `verify()` és `manifest()`.
Nem archivált hónapra vagy ágra a kliens hibát ad, és felsorolja az elérhető
hónapokat.

Böngészőben, telepítés nélkül, rögzített verzióval a jsDelivr-ről:

```html
<script type="module">
  import { client } from 'https://cdn.jsdelivr.net/npm/hungarian-praxismap@2026.11.0/lib/index.js';
  console.log(await client.national('dental'));
</script>
```

R és Python, egy CSV közvetlenül a jsDelivr-címről:

```r
d <- read.csv("https://cdn.jsdelivr.net/npm/hungarian-praxismap@2026.11.0/months/2026-11/gp-counties.csv", encoding = "UTF-8")
```

```python
import pandas as pd; d = pd.read_csv("https://cdn.jsdelivr.net/npm/hungarian-praxismap@2026.11.0/months/2026-11/gp-counties.csv")
```

A címben mindig rögzítsd a verziót (itt `2026.11.0`): így egy elemzés később
is pontosan ugyanazt az adatot tölti be. Verzió nélküli cím a legújabb
kiadásra mutat, és a következő hónapban mást adhat. A körzet- és
településfájlokban a kódoszlopokat szövegként olvasd be (R:
`colClasses = "character"`, pandas: `dtype=str`).

### Parancssor

```sh
npx hungarian-praxismap months                     # archivált hónapok
npx hungarian-praxismap national --kind dental     # országos idősor
npx hungarian-praxismap counties 2026-11           # megyei rangsor
npx hungarian-praxismap longest 2026-11 --limit 20 # a legrégebben betöltetlen körzetek
npx hungarian-praxismap history 050091387          # egy körzet hónapról hónapra
npx hungarian-praxismap diff 2026-10 2026-11       # változott körzetek
npx hungarian-praxismap verify                     # fájlok a jegyzék hash-eihez
```

Minden parancs CSV-t ír a szabványos kimenetre. A `--kind gp|dental`
alapértéke `gp`. A megyei rangsorban az azonos arányú megyék közös helyen
állnak, a hiányzó arányú megye a végén, hely nélkül.

### Ellenőrzés

`npx hungarian-praxismap verify` minden fájlt összevet a `manifest.json`
SHA-256-jaival. A jegyzék megadja a git-commitot, amelyből a csomag készült,
és minden hónapnál a nyers forrásfájlok SHA-256-ját és GitHub-linkjét azon a
commiton (`https://github.com/ZoliQua/Praxisterkep/blob/<commit>/data/raw/<hónap>/<fájl>`).
Így bármelyik szám visszakövethető a NEAK eredeti fájljáig. A csomag npm
provenance igazolással jelenik meg: az npm-oldalon látszik, melyik commitból
és melyik workflow-futásból készült.

### Licenc

- **Kód** (`lib/`): MIT.
- **Feldolgozott adat** (JSON és CSV, a koordinátafájl kivételével): CC BY
  4.0. Hivatkozás: Praxistérkép / Dul Zoltán, forrás: NEAK.
- **Koordináták** (`*-coordinates.csv`): ODbL 1.0 — © OpenStreetMap
  contributors, a címeket a Nominatim geokódolta. Ha ezt a fájlt használod
  vagy továbbadod, az ODbL feltételei (forrásmegjelölés, és a belőle készült
  adatbázis azonos licenc alatti megosztása) vonatkoznak rád. A JSON-fájlokban
  nincs koordináta, csak a `geoApprox` jelző (igaz, ha a pont csak
  település-középpont, nem a pontos cím).

Részletek: [LICENSE.md](LICENSE.md).

### Hivatkozás

Koncepció-DOI (minden verzió):
[10.5281/zenodo.23460426](https://doi.org/10.5281/zenodo.23460426), és a
felhasznált verzió GitHub-címkéje, például `data-2026.11.0`. Minden
csomagverzió saját GitHub-kiadást és azon keresztül saját Zenodo-DOI-t kap.
Ez a verzió-DOI csak a közzététel után születik meg, ezért a csomagban nem
szerepelhet: a Zenodo-rekordon található.

> Dul Zoltán: Praxistérkép — hungarian-praxismap, 2026.11.0 verzió (címke:
> data-2026.11.0). Forrás: NEAK. https://doi.org/10.5281/zenodo.23460426

Változások: [CHANGELOG.md](CHANGELOG.md). Hibát a
[GitHub-repóban](https://github.com/ZoliQua/Praxisterkep/issues) lehet jelezni.

---

## English

### What is inside

Every archived month, per branch (`gp` = general practice, `dental`), as JSON
and CSV. Not every month has both branches: the months table in the Hungarian
part above shows which month has which.

| File | Content |
|---|---|
| `months/<month>/<kind>.json` | the monthly snapshot in its original structure, without names and coordinates (the `geoApprox` flag stays) |
| `months/<month>/<kind>-praxes.csv` | vacant and dissolved districts, one row per surgery |
| `months/<month>/<kind>-filled.csv` | filled districts from NEAK's register of contracted providers, without names |
| `months/<month>/<kind>-counties.csv` | per county: districts, vacant, dissolved, rate, affected population, by type |
| `months/<month>/<kind>-settlements.csv` | per settlement: population, filled districts, FIN codes of the vacant and dissolved districts |
| `months/<month>/<kind>-coordinates.csv` | surgery coordinates (FIN, surgery index, lat, lon, `geoApprox`) — **ODbL 1.0**, see below |
| `manifest.json` | SHA-256 and size of every file, the git commit, the list of raw source files |
| `schema/*.json` | JSON Schema for the snapshot and the manifest |
| `lib/` | TypeScript client and command-line tool, no runtime dependencies |

The CSV files are UTF-8, comma-separated, quoted per RFC 4180. A missing value
is an empty cell (in old months, for example, the district count or the rate).
Lists (such as `servedSettlements`, `vacantPraxisIds`) sit in one cell,
separated by `; `. `vacancyRate` and `populationShare` are fractions between 0
and 1. Read FIN codes and KSH codes (`kshId`) as text: they can start with a
zero.

A few months lack NEAK's register of contracted providers. In those the
`filled` file is empty, and a district that is not vacant has the status
`unknown`, never "filled".

### Vacant is not unserved (Betöltetlen ≠ ellátatlan)

A vacant district has no contracted physician, but its patients are usually
seen by a substitute. The package measures vacancy, not lack of care: whether
a settlement really has no care available is something these data do not say.
Please keep the two terms apart in writing too.

### Names

The package holds no physician or provider names. Praxistérkép shows a name
only where NEAK itself publishes it, and this package distributes none: a
provider's name is often the physician's own ("Dr. Minta Bt."), and a
published package version cannot be withdrawn. The build checks every output
value against every name in the archive and stops on a match.

Known limit: a FIN code can be joined to NEAK's own public register, where the
contracted physician of a filled district is named. We do not distribute
names, but we cannot and do not want to hide what NEAK publishes.

### What is not included

- **Raw source files** (NEAK PDFs and XLS files). The provider register holds
  names, so they stay in the GitHub repository (`data/raw/`). `manifest.json`
  names each one with its SHA-256, size and a GitHub link pinned to the build
  commit; when a month lacks a raw file, the manifest says so (`missingRaw`)
  rather than filling it in.
- **The site's analysis files** (risk, survival, outcomes and so on): they
  have no monthly archive, and several of them carry provider names.
- **Boundaries** (county and járás polygons).

### Install and use

```sh
npm install hungarian-praxismap
```

Node (22.18 or later) reads the package's own files:

```js
import { client, countyRanking } from 'hungarian-praxismap';

const months = await client.months('gp');            // ['2019-03', …]
const snap = await client.snapshot('2026-11', 'gp'); // the full snapshot
console.table(countyRanking(snap));                  // county ranking
```

More client calls: `national(kind)` (monthly national series),
`praxisHistory(fin)` (one district's status month by month, both branches),
`diff(from, to, kind)` (districts that changed between two months),
`coordinates(month, kind)` (the ODbL file), `verify()` and `manifest()`.
For a month or branch that is not archived the client throws an error that
lists the available months.

In a browser, without installing, pinned to a version on jsDelivr:

```html
<script type="module">
  import { client } from 'https://cdn.jsdelivr.net/npm/hungarian-praxismap@2026.11.0/lib/index.js';
  console.log(await client.national('dental'));
</script>
```

R and Python, one CSV straight from the jsDelivr URL:

```r
d <- read.csv("https://cdn.jsdelivr.net/npm/hungarian-praxismap@2026.11.0/months/2026-11/gp-counties.csv", encoding = "UTF-8")
```

```python
import pandas as pd; d = pd.read_csv("https://cdn.jsdelivr.net/npm/hungarian-praxismap@2026.11.0/months/2026-11/gp-counties.csv")
```

Always pin the version in the URL (here `2026.11.0`), so an analysis loads
exactly the same data later. A URL without a version points at the newest
release and may return something else next month. In the district and
settlement files, read the code columns as text (R: `colClasses =
"character"`, pandas: `dtype=str`).

### Command line

```sh
npx hungarian-praxismap months                     # archived months
npx hungarian-praxismap national --kind dental     # national series
npx hungarian-praxismap counties 2026-11           # county ranking
npx hungarian-praxismap longest 2026-11 --limit 20 # longest-vacant districts
npx hungarian-praxismap history 050091387          # one district month by month
npx hungarian-praxismap diff 2026-10 2026-11       # districts that changed
npx hungarian-praxismap verify                     # files against the manifest hashes
```

Every command writes CSV to standard output. `--kind gp|dental` defaults to
`gp`. In the county ranking, counties with equal rates share a place; a county
without a rate comes last, unranked.

### Verifying

`npx hungarian-praxismap verify` checks every file against the SHA-256 values
in `manifest.json`. The manifest names the git commit the package was built
from and, for every month, the SHA-256 and GitHub link of each raw source file
at that commit
(`https://github.com/ZoliQua/Praxisterkep/blob/<commit>/data/raw/<month>/<file>`).
Every number can thus be traced back to NEAK's original file. The package is
published with npm provenance: its npm page shows which commit and which
workflow run produced it.

### Licence

- **Code** (`lib/`): MIT.
- **Processed data** (JSON and CSV, except the coordinates file): CC BY 4.0.
  Attribution: Praxistérkép / Dul Zoltán, source: NEAK.
- **Coordinates** (`*-coordinates.csv`): ODbL 1.0 — © OpenStreetMap
  contributors, addresses geocoded with Nominatim. Using or redistributing
  this file brings the ODbL obligations (attribution, and sharing a database
  built from it under the same licence). The JSON files carry no coordinates,
  only the `geoApprox` flag (true when the point is only a settlement centre,
  not the exact address).

Details: [LICENSE.md](LICENSE.md).

### How to cite

Concept DOI (all versions):
[10.5281/zenodo.23460426](https://doi.org/10.5281/zenodo.23460426), plus the
GitHub tag of the version you used, for example `data-2026.11.0`. Every
package version gets its own GitHub release and, through it, its own Zenodo
DOI. That version DOI is minted only after publishing, so it cannot be inside
the package: you find it on the Zenodo record.

> Dul Zoltán: Praxistérkép — hungarian-praxismap, version 2026.11.0 (tag
> data-2026.11.0). Source: NEAK. https://doi.org/10.5281/zenodo.23460426

Changes: [CHANGELOG.md](CHANGELOG.md). Report errors in the
[GitHub repository](https://github.com/ZoliQua/Praxisterkep/issues).
