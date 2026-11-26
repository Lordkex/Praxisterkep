# Menü, járás- és megyeoldal – az átalakítás összefoglalója

Ág: `ui/menu` · Készítette: Claude Opus 5.5 (2026. november)

> **Funkcióban, képletekben, számolásban nincs változás.** Az adatok, a mutatók számítása, a viszonyítási alapok és a rangsorolás logikája ugyanaz, mint korábban. A munka a megjelenítésre összpontosított: szerkezet, elrendezés, egységes vezérlők, olvashatóság. Ahol a felületen új dolog jelent meg (rendezhető táblázat, kattintható sor, animáció, néhány eddig nem mutatott mutató), az is a már meglévő adatokat jeleníti meg.

## Cél

A menü legyen rövidebb és átláthatóbb, a háziorvosi kék és a fogorvosi zöld szín az egész oldalon ugyanazt jelentse. A járás- és a megyeoldal témánként, egységes kártyákkal mutassa meg, hol áll a terület. Legyen kevesebb ismétlés, olvashatóbb szám és felirat, és ne legyenek üres vagy egymásra csúszó részek.

## 1. Mit módosítottunk és miért

### Menü

**Változások:**
- A Térkép, Elemző és Európa lenyílók rövidebbek, csoportfejlécekkel és rövid leírásokkal. A „Továbbiak” alatt megjelent a TEK nélküli praxisok oldala.
- Rövidebb menücímek: „Megyék”, „Járások”, „Település keresése”.
- A háziorvos/fogorvos kapcsoló a kezdőoldaléval egyező stílusú.
- Az ágfüggetlen oldalak semleges kiemelőszínt kapnak.
- A statikus településoldalak menüje ugyanabból a forrásból készül.

**Miért:**
- Kb. 90 menüsor mutatott ugyanarra a néhány oldalra.
- Az ágszín korábban véletlenszerűen szürkült ki vagy váltott.

### Járásoldal

**Változások:**
- **Témánkénti szerkezet:** Összkép → Ellátás → Elérhetőség → Népesség → Gazdaság és társadalom → Egészség → Települések → Országos összehasonlítás → Legveszélyeztetettebb járások. Az oldalmenü ugyanezt követi.
- **Összkép:** a cím mellett az átlagos járással való összevetés, alatta három egyforma gyűrű (korösszetétel, háziorvos, fogorvos), táblázatszerű jelmagyarázattal.
- **Egységes kártyák:** érték, csík az összes vidéki járásról, medián, helyezés. Az ismétlődő számok kikerültek.
- **„Milyen járás ez?”:** bal oldalon a szám és a skála, jobb oldalon olvasható lista a besorolásról és a csoportokról.
- **Összehasonlítás:** csoportosított, egy sorba férő mérőszámválasztó. A szórásdiagramon a kiválasztott járás pulzál, a pontok átúsznak az új helyükre.
- **Legveszélyeztetettebb járások:** rendezhető oszlopok, minden érték a saját sávja fölött.
- **Táblázatok és apróságok:**
  - a település- és járássorok kattinthatók;
  - a hosszú táblázatok saját dobozban görgetnek;
  - a hisztogram alatti lista nem tolja el az oldalt;
  - a halálokok csökkenő sorrendben állnak.

**Miért:**
- Az oldal az adatfájlokat követte, nem a kérdéseket. Tizenöt kártya állt egy blokkban, és több szám kétszer-ötször is szerepelt.

### Megyeoldal

**Változások:**
- **Szerkezet:** ugyanaz a témánkénti felépítés, mint a járásoldalon, a végén az **Országosan** csoporttal (a megye a többi mellett, orvosváltások, megyei rangsor).
- **Felül:** a térkép a választó, a legördülő lista a sarkában. A **tippjáték** az adatok előtt áll, hogy a válasz még ne látszódjon.
- **Rangsorok:** kilenc 20 soros lista helyett témánként kártyák, és egyetlen rangsor mérőszámválasztóval, animált átrendeződéssel.
- **Előrejelzés és támogatások:** két kártya, bal oldalon a „ma / egy év múlva” szám és egy tartományskála, jobb oldalon a részletek.
- **Ügyeleti pontok és mentőállomások:** csoportosítva, az ismétlődő hely egyszer szerepel („×2”), rámutatásra látszik az ellátó neve.
- **Járások és települések táblázata:**
  - a járástáblázat rendezhető, a sorok kattinthatók;
  - a településlista alapból 30 sort mutat, „Mind a … mutatása” gombbal.
- **Megye-összehasonlító:** megye – diagram – megye elrendezés, csoportosított adatokkal.
- **Kisebb javítások:**
  - a megyenevek nem fedik egymást a térképen;
  - a táblázatgombok a blokk jobb felső sarkában állnak;
  - a nagy számok mérete az oldalhoz illik;
  - a hőtérkép szélesebb.
- **Oldalhossz:** a Baranya-oldal kb. 22 000 px-ről kb. 12 600 px-re rövidült.

**Miért:**
- Az oldal egyetlen hosszú szakasz volt kis alcímekkel. A rangsorok kb. 1500 px-t, a településlista kb. 11 000 px-t foglalt el.
- Több elem félig üres volt, átfedett vagy kilógott.

### Közös elemek

**Változások:**
- **Kapcsolók:** mindenhol a kezdőoldallal egyező stílusúak. A régi gombsorok lecserélődtek.
- **Más oldalra mutató „tovább” linkek:** egységes gombok.
- **Címek:** három jól elkülönülő címszint (témacím, alcím, diagramcím).
- **Jövedelem:** mindenhol „éves, adózás előtti” jövedelemként szerepel, a táblázatok bevezetője is elmagyarázza.
- **Az „Ahová busz sem visz” kártya:**
  - a lista táblázat lett, sávval arra, mióta üres a körzet;
  - csökkenő sorrendben áll;
  - a kártya nem marad félig üres.
- **Közvetlen busz nélküli települések:** áthúzott busz ikon és pontrács.
- **Újrajátszás ikon:** minden animációban körbeforduló nyíl.

**Miért:**
- Egységes kép.
- Ami ugyanazt jelenti, mindenhol ugyanúgy nézzen ki.

### Fejlesztés

- A fejlesztői szerver a legutóbbi buildből kiszolgálja a statikus településoldalakat. Eddig ezek helyett a kezdőlap jött be.
- A **[rules.md](rules.md)** összefoglalja a munka során kialakult szerkesztési és stílusszabályokat, egy ellenőrzőlistával. Ennek alapján egy hasonló átalakítás elsőre közel kész lehet.

## 2. Új komponensek és minták

| Elem | Mire |
| --- | --- |
| `PageLink.tsx` | Más oldalra mutató „tovább” gomb |
| `Headline.tsx` | Szám és felirat a gyűrű mellett, ugrás nélkül |
| `SegmentedControl` `fit` módja | A feliratuk szélességét kapó gombok (mérőszámválasztó) |
| Ábra + lista kártya (`dev-card`) | Bal oldalon szám és grafikon, jobb oldalon olvasható lista, a gomb alul |
| `IconBusOff`, sűrű `ShareDots` | Hiány ikonnal és pontráccsal |
| Rendezhető fejléc (`th-sort`), `table-tools` | Rendezés, első N sor és „mind mutatása” |

## 3. Érintett fájlok

| Terület | Fájlok |
| --- | --- |
| Menü | `lib/siteNav.json`, `lib/siteNav.ts`, `NavMenu.tsx`, `PageNav.tsx`, `scripts/settlement-pages.mjs` |
| Oldalmenük | `lib/pageSections.json` |
| Járásoldal | `DistrictPage.tsx`, `DistrictOutcomes.tsx`, `VulnerableDistricts.tsx`, `charts/District*.tsx` |
| Megyeoldal | `CountyPage.tsx`, `CountyOutcomes.tsx`, `CountyPicker.tsx`, `CountyCompare.tsx`, `CountyChurn.tsx`, `CountyRanking.tsx`, `GuessGame.tsx`, `AgeBlock.tsx`, `charts/PointGrid.tsx` |
| Közös | `CrossSection.tsx`, `SegmentedControl.tsx`, `PageLink.tsx` *(új)*, `Headline.tsx` *(új)*, `icons.tsx`, `charts/Donut.tsx`, `charts/AgePie.tsx`, `story/*` |
| Megjelenés és szöveg | `web/src/index.css`, `web/src/i18n/hu.json`, `web/src/i18n/en.json` |
| Fejlesztés | `web/vite.config.ts`, `rules.md` *(új)* |

A komponensek a `web/src/components/` mappában vannak.

## 4. Ellenőrzés

- Típusellenőrzés, build, és mind a 230 teszt rendben lefutott.
- Képernyőképes ellenőrzés és mérések:
  - 1366 px-en, kb. 1100 px-en és telefonos (390 px) nézetben;
  - több megyén és járáson (Baranya, Borsod-Abaúj-Zemplén, Szabolcs-Szatmár-Bereg, Edelényi, Szeghalmi);
  - igazítás, kilógás, feliratátfedés, egy sorba férés, ugrásmentesség és animáció mérése.
- Az interakciók végig vannak kattintva: rendezés, „mind mutatása”, mérőszámváltás, sorra kattintás, tippjáték, táblázat megnyitása.
