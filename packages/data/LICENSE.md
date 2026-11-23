# Licenc / License

A csomag három része három licenc alatt áll. / The package has three parts
under three licences.

| Rész / Part | Fájlok / Files | Licenc / Licence |
|---|---|---|
| Kód / Code | `lib/`, `package.json` | MIT |
| Feldolgozott adat / Processed data | `months/*/*.json`, `months/*/*.csv` a koordinátafájlok kivételével / except the coordinates files, `manifest.json`, `schema/` | CC BY 4.0 |
| Koordináták / Coordinates | `months/*/*-coordinates.csv` | ODbL 1.0 |

> A NEAK adatai tájékoztató jellegűek.

## A kód — MIT / Code — MIT

Copyright (c) 2026 Dul Zoltán

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## A feldolgozott adat — CC BY 4.0 / Processed data — CC BY 4.0

A feldolgozott adatot a
[Creative Commons Nevezd meg! 4.0 Nemzetközi](https://creativecommons.org/licenses/by/4.0/deed.hu)
licenc alatt tesszük közzé. Felhasználáskor a megjelölés:
**Praxistérkép / Dul Zoltán, forrás: NEAK** (Nemzeti Egészségbiztosítási
Alapkezelő). Az adat a NEAK havonta közzétett nyilvános listáiból készült
(betöltetlen háziorvosi és fogorvosi szolgálatok, megszűnt fogorvosi
szolgálatok, szerződött szolgáltatók), a KSH Helységnévtárának
lakosságszámaival kiegészítve.

The processed data is published under the
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
licence. Attribution: **Praxistérkép / Dul Zoltán, source: NEAK** (National
Health Insurance Fund of Hungary). The data is built from NEAK's monthly
public lists (vacant GP and dental services, dissolved dental services,
contracted providers), with population figures from the KSH gazetteer.

## A koordináták — ODbL 1.0 / Coordinates — ODbL 1.0

A `months/*/*-coordinates.csv` fájlok a rendelők címének geokódolásából
készültek, a Nominatim szolgáltatással, az OpenStreetMap adatain. Ezek a
fájlok az [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
alatt állnak: © OpenStreetMap contributors. Aki ezeket a fájlokat használja
vagy továbbadja, annak az ODbL feltételeit kell követnie: a forrás
megjelölését, és ha belőlük származtatott adatbázist tesz közzé, annak
ugyanilyen licenc alatti megosztását. A JSON-fájlokban koordináta nincs, csak
a `geoApprox` jelző, ezért azokra ez a kötelezettség nem vonatkozik.

The `months/*/*-coordinates.csv` files come from geocoding the surgeries'
addresses with Nominatim, on OpenStreetMap data. They are under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/):
© OpenStreetMap contributors. Using or redistributing these files brings the
ODbL obligations: attribution, and sharing any derived database you publish
under the same licence. The JSON files carry no coordinates, only the
`geoApprox` flag, so the obligation does not reach them.

## Nevek / Names

A csomag nem tartalmaz orvos- és szolgáltatóneveket. A nyers NEAK-fájlok,
amelyekben nevek vannak, nincsenek a csomagban; a
[GitHub-repóban](https://github.com/ZoliQua/Praxisterkep) maradnak, a
kibocsátó feltételei szerint.

The package contains no physician or provider names. The raw NEAK files,
which do contain names, are not in the package; they stay in the
[GitHub repository](https://github.com/ZoliQua/Praxisterkep) under their
publisher's terms.
