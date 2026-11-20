# Közreműködők

## Szerző és fenntartó

- **Dr. Dul Zoltán** — ötlet, adatgyűjtés, ETL, elemzések, felület,
  szövegek, üzemeltetés · GitHub: [@ZoliQua](https://github.com/ZoliQua)

A praxisterkep.hu domain a Mackó Dental Kft. nevén van bejegyezve, amely a
domaint és a technikai hátteret adja; az oldal tartalmáért és az
adatkezelésért Dr. Dul Zoltán felel (lásd az
[adatkezelési tájékoztatót](https://praxisterkep.hu/adatkezeles.html)).

## Fejlesztői közreműködők

- **Dr. Tyukodi Levente** (PTE Gyógyszerésztudományi Kar) · GitHub:
  [@Lordkex](https://github.com/Lordkex) — a módszertani oldal tipográfiája
  ([#5](https://github.com/ZoliQua/Praxisterkep/issues/5)): a parciális
  korreláció és az előrejelzés képletei MathML-lel szedve (tört- és gyökjel,
  képernyőolvasóval is olvasható), tesztekkel; egységes szövegszélesség az
  egész oldalon; az oldalsó menü nem ugrál és nem tördel, az aktív pont
  látható marad; a beágyazási kód a letöltésekhez került; a havi
  adatkönyvtár sorában közvetlen link a legutóbbi hónap fájljaira.
  A főoldal átdolgozása
  ([#6](https://github.com/ZoliQua/Praxisterkep/issues/6)): a települési
  kereső az első képernyőn, a háziorvos/fogorvos váltóval és látható
  táblázatnézet-gombbal; a körzetállomány halmozott oszlopdiagramon, saját
  színnel a TEK nélküli praxisoknak, diagram/táblázat váltóval és a TEK
  nélküli oldalra vezető kártyával; a térkép szűrőpanelje Nézet / Szűrők /
  Rétegek csoportokba rendezve, a PNG-mentés a térkép sarkában, a
  kedvezményezett települések rétegének kirajzolása, egymást nem takaró
  városfeliratok; a kiemelő kártyák ági címkével és érthetőbb szövegekkel;
  egységes szegmentált váltók az egész főoldalon; nyugodtabb, öt lépésből
  álló görgetős bevezető idősorral.

## Adatközlők

Az oldal minden száma az alábbi intézmények nyilvános adataiból épül. Ők nem
közreműködői a projektnek, és nem felelnek az itteni elemzésekért — de
nélkülük nem volna mit elemezni:

- **NEAK** — Nemzeti Egészségbiztosítási Alapkezelő
- **OKFŐ** — Országos Kórházi Főigazgatóság
- **EESZT** — Elektronikus Egészségügyi Szolgáltatási Tér, törzspublikáció
- **KSH** — Központi Statisztikai Hivatal (Helységnévtár, 2022. évi
  népszámlálás, TIMEA)
- **NNGYK** — Nemzeti Népegészségügyi és Gyógyszerészeti Központ
- **NFSZ** — Nemzeti Foglalkoztatási Szolgálat
- **OpenStreetMap** közreműködők és a **Geofabrik**
- **MÁV Személyszállítási Zrt.** és a **KTI** (Volánbusz GTFS)

A források pontos listája, linkje és licence: [README](README.md#adatforrások)
és [LICENSE.md](LICENSE.md).

## Hogyan lehet közreműködni?

- **Adathiba vagy furcsaság** — nyiss egy
  [issue-t](https://github.com/ZoliQua/Praxisterkep/issues): melyik oldalon,
  melyik szám, és mi a forrásod. Egy település hibás adata a legértékesebb
  bejelentés.
- **Új nyilvános forrás** — ha tudsz olyan közölt adatról (például járási
  szűrési részvételről vagy átoltottságról), ami hiányzik, írd meg a
  közlő intézménnyel és a linkkel együtt. Becsült vagy nem nyilvános adatot
  nem tudunk felhasználni.
- **Kód** — pull requestet szívesen fogadok. Mielőtt nagyobb munkába
  kezdesz, nyiss egy issue-t, hogy egyeztessünk. Elvárások:
  - a kód, a kommentek és a commitüzenetek angolul, a felületi szöveg
    magyarul, kizárólag a `web/src/i18n/hu.json`-ban (és `en.json`-ban);
  - minden új szám egy archivált forrásfájlra vezethető vissza, és a
    feldolgozó hangosan hibázik, ha a forrás nem olyan, mint vártuk;
  - az ETL-hez pytest-teszt, a felület logikájához Vitest-teszt tartozik;
  - `python -m pytest etl/tests`, `cd web && npm test && npx tsc -b` hiba
    nélkül fut.
- Minden közreműködésre a [magatartási kódex](CODE_OF_CONDUCT.md) vonatkozik.

Akinek a közreműködése bekerül a projektbe, a nevét — ha kéri — ide
felvesszük.
