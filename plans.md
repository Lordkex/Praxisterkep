# Menü egyszerűsítése – terv

Branch: `ui/menu` (a `main`-ből, v1.58.0 után)
Állapot: javaslat, még nincs megvalósítva

## Cél

A felső menü ma 5 főpontból áll, a lenyílókban összesen kb. 90 sor van. Ezek többsége ugyanarra a néhány oldalra mutat, csak más horgonyra. A cél egy rövidebb, könnyebben átlátható menü, és hogy a háziorvosi kék és a fogorvosi zöld szín az egész oldalon ugyanazt jelentse.

A menü egy helyen van leírva, a [web/src/lib/siteNav.json](web/src/lib/siteNav.json) fájlban. Ugyanezt olvassa a 3177 statikus településoldal is ([web/scripts/settlement-pages.mjs](web/scripts/settlement-pages.mjs)), így egy módosítás mindenhol érvényes lesz. A csoportfejléces lenyílót (`"group"`) mindkét megjelenítés már ma is kezeli.

---

## 0. Már javítva: a mobilmenüben elérhetetlen almenük

Ez hibajavítás, nem javaslat: a `ui/menu` ágon már megvan.

**Hibák telefonon (≤ 720px):**
- **A lenyitott Térkép eltakarta a menü többi részét.** A menüpanel oszlopa a felső sáv `flex-wrap: wrap` beállítását örökölte, és a magassága korlátozva volt. A képernyőnél magasabb Térkép almenü (927px) mellett az Elemző, Európa, Továbbiak, Módszertan, valamint a téma- és nyelvváltó egy második oszlopba tördelődött, a képernyőn kívülre. Az Elemző almenüvel ugyanez történt.
- **A nyitott almenüt nem lehetett a nyíllal bezárni.** Ilyenkor csak a menügomb segített.
- **A nyíl gombja rálógott az almenüre.** A gomb láthatatlan érintési felülete a nyitott almenü teljes magasságán végigfutott, és egy 26px-es sávban elkapta a linkekre szánt érintéseket.
- **A 3177 statikus településoldalon az almenük egyáltalán nem nyíltak meg.** Ott nincs nyíl-gomb, csak az egér ráhúzása nyitja őket, ezt pedig mobilon a CSS szándékosan kikapcsolja. Telefonon így a megyék, a járás és az elemzések menüpontjai elérhetetlenek voltak.

- **A „Térkép” felirat nem a térképre vitt** (ez volt a legszembetűnőbb). A `/` címre mutatott, vagyis a főoldal tetejére. A főoldalon ezért úgy tűnt, mintha semmi sem történne, más oldalról pedig a térkép helyett a nyitókép jött be. Ez asztali nézetben is így volt, de mobilon a legfeltűnőbb.

**Javítás:**
- A „Térkép” felirat a térképszakaszra visz (`/#terkep`, [web/src/lib/siteNav.json](web/src/lib/siteNav.json)), ugyanúgy, ahogy az Elemző vagy a Módszertan a saját oldalára.
- A mobilmenü egyetlen görgethető oszlop. A görgetés a menüben marad, nem mozdítja el mögötte az oldalt.
- Az almenü mindig a felirata alatt jelenik meg.
- A nyíl érintési felülete csak a felirat sorát fedi.
- Érintéssel a nyíl zárni is tud. Egérrel marad a mostani viselkedés.
- A statikus oldalak ugyanazt a nyíl-gombot és egy kis szkriptet kapnak, ugyanazokkal a zárási szabályokkal: a mutató elhagyja, Escape, kattintás a menün kívül.

Fájlok: [web/src/index.css](web/src/index.css), [web/src/components/NavMenu.tsx](web/src/components/NavMenu.tsx), [web/scripts/settlement-pages.mjs](web/scripts/settlement-pages.mjs).

Ellenőrizve 390px-en az appban és a generált településoldalakon, valamint 1280px-en, ahol a ráhúzás továbbra is nyit. `tsc`, 219 teszt és a build hibátlan.

Ha az 1. és 3. pont megvalósul, a lenyílók eleve rövidek lesznek, de a fenti javítás ettől függetlenül szükséges.

---

## 1. Térkép: csak a három szint

**Jelenleg:** A lenyíló négy csoportból áll, összesen 50 sorral:
- *Kiemelések*: a főoldal szakaszai (Körzetállomány, TEK nélküli háziorvosok, Nálam, Miért fontos?);
- *Megye*: a 20 megye egyenként;
- *Járás*;
- *Település*: ismét a 20 megye.

**Javaslat:** A lenyílóban csak három sor maradjon:

| Menüpont  | Cél             |
| --------- | --------------- |
| Megye     | `/megye.html`   |
| Járás     | `/jaras.html`   |
| Település | `/telepules/`   |

Maga a „Térkép” felirat továbbra is a főoldalra visz.

**Miért:** Mindhárom oldalon van saját választó (megye-, járás-, településkereső). A menüben felsorolt 20+20 megye ismétlés, a főoldal szakaszai görgetéssel úgyis elérhetők.

A *TEK nélküli háziorvosok* oldalnak ([tek-nelkul.html](web/tek-nelkul.html)) 
javaslat: kerüljön át a *Továbbiak* alá. A főoldali körzetállomány-blokkból továbbra is van rá link.

---

## 2. Egységes ág-színek (kék = háziorvos, zöld = fogorvos)

**Jelenleg:** Az Elemző oldalon a kiemelőszín (aktív fül, csoportcím, kártyakeret) mindig zöld, akkor is, ha háziorvosi nézet van kiválasztva. A főoldalon viszont a zöld a fogorvosi ág színe, így a két oldal mást mond ugyanazzal a színnel.

**Ok:** Az [web/src/elemzo.tsx](web/src/elemzo.tsx) fixen `dataset.kind = 'dental'`-t állít be, ahelyett hogy a kiválasztott ágat követné. A `--accent` alapértéke a fogorvosi zöld, és csak a `data-kind='gp'` váltja kékre ([web/src/index.css](web/src/index.css), 21. és 65. sor). Ugyanez a fix érték szerepel még:

| Oldal                       | Most                     | Javaslat                                    |
| --------------------------- | ------------------------ | ------------------------------------------- |
| Elemző (`elemzo.tsx`)       | mindig zöld              | a kiválasztott ágat követi, mint a Megye oldal |
| Továbbiak (`szakellato.tsx`) | mindig zöld              | semleges kiemelőszín                        |
| Adatkezelés (`adatkezeles.tsx`) | mindig zöld          | semleges kiemelőszín                        |
| Sajtó (`media.tsx`)         | mindig kék               | semleges kiemelőszín                        |
| Statikus településoldalak   | nincs `data-kind`, zöld  | semleges, mert mindkét ágat mutatják        |
| TEK nélküli (`teknelkul.tsx`) | mindig kék             | marad, háziorvosi tartalom                  |

**Javaslat:**
- Az ágválasztóval rendelkező oldalak az ágat kövessék. Ez az Elemzőnél egysoros javítás a [web/src/megye.tsx](web/src/megye.tsx) mintájára.
- Az ág nélküli oldalak kapjanak egy harmadik, semleges kiemelőszínt (pl. `data-kind='none'` → `--accent: var(--ink)` vagy egy külön token). Így a zöld és a kék csak az ágat jelenti.

---

## 3. Elemző: a hat rész a menüben, a szakaszok az oldalon

**Jelenleg:** A lenyíló 6 csoportfejlécből és 27 szakaszlinkből áll. Mind az [elemzo.html](web/elemzo.html) oldalra visz. Az oldal már részekre bontva töltődik be (`?resz=`), és minden részen van fül-sor, tartalomjegyzék és oldalmenü a szakaszokhoz.

**Javaslat:** A lenyílóban csak a 6 rész szerepeljen, mindegyik alatt egy rövid sorral, ami elmondja, mit talál ott az olvasó. A szöveg az oldal meglévő `analysis.groupLead.*` mondataiból rövidítve készülne.

| Rész               | Rövid leírás (vázlat)                              |
| ------------------ | -------------------------------------------------- |
| Országos kép       | trendek, háziorvos és fogorvos, lefedettség        |
| Mi változott?      | évről évre, hónapról hónapra                        |
| Mi várható?        | kockázat, túlélés, egy év múlva, támogatások        |
| Járások és megyék  | halálozás, jövedelem, népesség, összefüggések       |
| Elérhetőség        | ügyelet, távolság, menetidő, busz                   |
| Települések        | összetett index, keresztmetszetek, hiányterületek   |

Felül vagy alul egy „Összes elemzés” link vigyen az áttekintő oldalra.

**Miért:**
- A szakaszok így sem vesznek el: a részen belül a fülek és az oldalmenü ugyanazt tudják, és jobban, mert a többi szakasz is látszik mellettük.
- A lenyíló 33 sorról 7-re csökken.
- A régi `#szakasz` linkek továbbra is működnek, mert a [web/src/lib/analysisParts.ts](web/src/lib/analysisParts.ts) a horgonyból nyitja meg a megfelelő részt.

**Technikailag:** A `NavEntry` children kap egy opcionális leírásmezőt, vagy egy negyedik elemet a tömbben. Ezt a [web/src/components/NavMenu.tsx](web/src/components/NavMenu.tsx) és a `settlement-pages.mjs` egyaránt kirajzolja.

---

## 4. Európa: csoportosítás

**Jelenleg:** A lenyíló 11 sorból áll, csoportok nélkül. Az oldal saját oldalmenüje csak két csoportot ismer (Országok, Régiók; [web/src/lib/pageSections.json](web/src/lib/pageSections.json)).

**Javaslat:** Öt csoport, az oldal sorrendjében. Ugyanezek a csoportok kerüljenek az oldal oldalmenüjébe is, hogy a felső menü és az oldalmenü ugyanazt mutassa.

| Csoport (vázlat)          | Szakaszok                                                                 |
| ------------------------- | ------------------------------------------------------------------------- |
| Áttekintés                | Áttekintés                                                                |
| Igény és orvosok          | Kinek kell az ellátás? · Ki van a rendelőben? · Honnan jönnek, hová mennek az orvosok? |
| Hozzáférés és eredmény    | Eljut-e a beteg? · Mit ér el az ellátás?                                  |
| Pénz                      | Mennyit költünk rá? · Mennyit keres az orvos?                             |
| Összevetés és régiók      | Két mutató egymás mellett · Régiók térképe · A határ két oldalán          |

**Miért:** Az olvasó a csoportcímek alapján egy pillantással eldöntheti, merre induljon. A szakaszok nem tűnnek el a menüből, és ehhez nem kell új komponens, mert a csoportfejléces megjelenítés már létezik.

---

## Ami nem változik

- *Továbbiak* és *Módszertan*: marad. Ha az 1. pont szerint ide kerül a TEK nélküli oldal, a *Továbbiak* öt sorra nő.
- Mobilnézet, belső oldalra visszavezető link (`?belso=true`), az ág és a terület továbbadása a linkekben (`withContext`): nem változik.

## Érintett fájlok

- [web/src/lib/siteNav.json](web/src/lib/siteNav.json): a menü tartalma (1., 3., 4. pont)
- [web/src/components/NavMenu.tsx](web/src/components/NavMenu.tsx) és [web/scripts/settlement-pages.mjs](web/scripts/settlement-pages.mjs): leírássor a lenyílóban (3. pont)
- [web/src/lib/pageSections.json](web/src/lib/pageSections.json) és `europe.side.*` a fordításokban: az Európa oldalmenü csoportjai (4. pont)
- `web/src/{elemzo,szakellato,adatkezeles,media}.tsx` és [web/src/index.css](web/src/index.css): a kiemelőszín (2. pont)
- [web/src/i18n/hu.json](web/src/i18n/hu.json), [web/src/i18n/en.json](web/src/i18n/en.json): új csoportnevek és rövid leírások

## Ellenőrzés

- Asztali és mobil nézet, magyar és angol, mindkét ág. Ugyanaz a menü a főoldalon, egy önálló oldalon és egy statikus településoldalon.
- A régi Elemző-horgonyok (pl. `/elemzo.html#menetido`) továbbra is a jó részt nyitják.
- `npm test`, `tsc`, `vite build`, és a statikus oldalak újragenerálása.
