# Nyitóoldal – az átalakítás összefoglalója

Ág: `ui/homepage` · Első változat: Codex GPT-6 Astra High (2026-11-16) · Átdolgozás és véglegesítés: Claude Opus 5.5 High (2026-11-18–19)

## Cél

A nyitóoldal hatékonyan és letisztultan mutassa meg, mi a helyzet a látogató településén, mekkora a hiány országosan, és miért fontos az alapellátás. Ehhez kevesebb ismétlés, rövidebb szöveg, egyértelmű sorrend és egységes megjelenés kell.

## 1. Szekciósorrend

1. **Nyitóblokk:** a kérdés (például „Hol a háziorvos?”), egy leíró mondat, a **Mi a helyzet nálam?** kereső, a „Fontos:” megjegyzés, az adat dátuma, valamint az eredmények animált bemutatása.
2. **Görgetős országos kép**, öt lépésben.
3. **Miért számít az alapellátás?** Három kártya, alattuk a prevenciós lánc.
4. **Térkép.**
5. **A körzetek mekkora része betöltetlen?**
6. **Amit eddig senki nem számolt ki.**
7. **Mit nézz meg ezután?**
8. **Lábléc**, benne a széles adatkezelési tájékoztató.

## 2. Mit módosítottunk és miért

### Nyitóblokk és kereső

**Változások:**
- A kereső a nyitóblokkba került.
- A háziorvos/fogorvos kapcsoló a keresőben is ott van.
- A „Táblázat nézet” kiemelt gomb lett.
- Visszakerült az eredeti leíró mondat („Interaktív térkép és statisztikai elemző oldal…”).
- Az eredmények animált bemutatója nyitva, a kereső alatt látszik. Szövegleirata csak a képernyőolvasóknak szól.

**Miért:**
- A látogató elsősorban a saját települését keresi.
- A táblázat nézetet korábban alig lehetett megtalálni.
- A lenyitott animációt senki nem indította el.

### Görgetős országos kép

**Változások:**
- A lépést a görgetés mértéke vezérli, így az animáció nem ugrik át lépéseket és nem akad el.
- Kikerültek a keretes szövegek, a „01 / 03” számláló és az alsó sávok.
- Az öt lépés:
  1. betöltetlen körzetek száma;
  2. **változás az első archivált hónap óta**, kirajzolódó vonallal és nullától induló skálával;
  3. érintett lakosság;
  4. a legrosszabb megye;
  5. **a leghosszabb ideje üres körzet**.

**Miért:**
- Az előző változat animációja félig volt kész..
- A trend és a „leghosszabb ideje üres” lépés az eredeti oldalról jött vissza.

### Miért számít az alapellátás?

**Változások:**
- A kártyákon az ikon a cím mellett áll, a betű nagyobb, a szöveg sorkizárt, a kulcsszavak félkövérek.
- A prevenciós lánc nem lenyitható: magától játszik, és a lépések közötti vonal töltődik.
- A felirat mindig ugyanakkora helyet foglal, így nem ugrál.
- Az „X / Y körzetben működik ma ez a lánc” adat az animációba került.
- A felesleges magyarázatok és a záró megjegyzés kikerült.

**Miért:**
- Átfuthatóság.
- Az animáció alatti adatsor nehezen kelti fel a figyelmet animáció után.

### A körzetek mekkora része betöltetlen?

**Változások:**
- Az összesítő sávon a számok a szakaszokon állnak, a százalék jobbra.
- Típusonként halmozott sávdiagram, a számok a szakaszokon.
- A TEK nélküli praxisok saját színt kaptak, a jelmagyarázat szerint.
- Diagram / Táblázat kapcsoló.
- A TEK-oldalra kártya vezet.

**Miért:**
- A táblázatnál szemléletesebb így.

### Amit eddig senki nem számolt ki

**Változások:
- Az ág és az „Európa” címke a jobb felső sarokba került, ikonnal.
- A kulcskifejezés a szövegben kék.
- A „letelepedési támogatás” ÚJ megfogalmazást kapott.
- A fogorvosi kártyán „87 / 301” helyett „87 üres 10 éve” áll.
- Az európai kártyák halványan eltérnek a többitől.

**Miért:**
- Átfuthatóság, érthetőség.

### Térkép

A térképnél még lehetne jobbra designolni, de egyelőre ez lett.

**Változások:**
- Nézet, Szűrők, Rétegek.
- A PNG-mentés a térkép jobb felső sarkába került.
- A városfeliratok nem fedik egymást, nagyításkor több jelenik meg.
- A „Kedvezményezett települések” réteg most már rajzol.
- A „Nagyobb városok” réteg kikerült.
- A pontok mérete a nagyítással nő.
- Lejátszás közben csak a hónap látszik, a dátumformátum pedig egységes („2026. január” / „January 2026”). Adathiányosság mutatásának kérdése?

**Miért:**
- Kedvezményezett  városok kapcsoló eddig nem működött, a feliratok zsúfoltak voltak.


### Szöveg és egységes megjelenés

**Változások:**
- A nyitóoldal folyószövegéből kikerültek a gondolatjelek (em dashek). 
- A szövegek és a képek egyforma szélesek.
- Az oldal végén kisebbek a térközök.
- Minden kapcsoló egységes stílust kapott.
- Lábléc nyilvános adatokról szóló tájékoztató teljes szélességben, magyarul és angolul.

**Miért:**
- A nyitóoldal nem hosszú folyószöveg, mint a módszertan.
- Egységes kép.
- 

## 3. Felhasznált design-minták

A mintákat saját React-kóddal és CSS-sel valósítottuk meg, a könyvtárakat nem telepítettük. Így nincs új függőség, és minden elem követi az oldal világos/sötét módját és a választható színskálákat.

| Minta | Hol használjuk | Eredeti dokumentáció |
| --- | --- | --- |
| Mantine SegmentedControl | Minden kapcsoló: felső sáv, kereső, prevenciós lánc, megszűnt körzetek, térképpanel, Diagram / Táblázat | <https://mantine.dev/core/segmented-control/> |
| Mantine Table (keretes, csíkozott, kiemelés egér alatt) | A körzetállomány táblázat nézete | <https://mantine.dev/core/table/> |
| Mantine Chip | A térkép rétegkapcsolói | <https://mantine.dev/core/chip/> |
| nivo vízszintes halmozott sávdiagram | A körzetállomány összesítő és típusonkénti sávjai | <https://nivo.rocks/bar/> |

A diagram színeit (betöltött, betöltetlen, TEK nélküli) színtévesztés-szimulációval ellenőriztük.

## 4. Érintett fájlok

| Terület | Fájlok |
| --- | --- |
| Szekciósorrend | `web/src/App.tsx` |
| Nyitóblokk és kereső | `Hero.tsx`, `SearchSection.tsx`, `ResultsStory.tsx` *(új)*, `lib/highlights.ts` *(új)* |
| Görgetős országos kép | `ScrollyIntro.tsx`, `IntroTrend.tsx` *(új)* |
| Alapellátás | `WhySection.tsx`, `PreventionStory.tsx`, `Emph.tsx` *(új, kiemelés a szövegben)* |
| Körzetállomány | `PraxisBalance.tsx`, `BalanceTypeChart.tsx` *(új)* |
| Kiemelések | `Highlights.tsx`, `EuropeHighlights.tsx` |
| Térkép | `MapSection.tsx`, `useOrientationLayers.ts`, `lib/mapLayers.ts`, `lib/mapColors.ts` |
| Kapcsoló | `SegmentedControl.tsx` *(új)*, `DissolvedSwitch.tsx` |
| Megjelenés és szöveg | `web/src/index.css`, `web/src/i18n/hu.json`, `web/src/i18n/en.json` |

A komponensek a `web/src/components/` mappában vannak.

## 5. Ellenőrzés

- Típusellenőrzés, build, és mind a 215 teszt rendben lefutott.
- A `settlementStory` teszt erősen terhelt gépen néha túllépi az 5 másodperces időkorlátot, külön futtatva átmegy.
- Képernyőképes ellenőrzés:
  - asztali és mobil (390 px) nézetben;
  - világos és sötét módban;
  - magyarul és angolul;
  - háziorvosi és fogorvosi ágon.
