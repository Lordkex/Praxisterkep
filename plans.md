# Nyitóoldal – tartalmi és vizuális átalakítási terv

Modell: GPT-6 Astra| Effort: High| Dátum: 2026-11-16

## Cél

A nyitóoldal gyorsabban tegye érthetővé, miért fontos az alapellátás, mekkora a háziorvoshiány, és mi a helyzet a látogató környezetében. Kevesebb ismétlés, rövidebb szövegek, egyértelmű információs sorrend és egységes vizuális megjelenés szükséges.

A nyitóoldal átalakítása elkészült. A keresőt, a megye kiválasztását, a térképes lejátszást és a részletek megnyitását magyar és angol felületen, mobil- és asztali szélességen is ellenőriztük (2026-11-18).

## 1. Javasolt szekciósorrend

1. **Rövid nyitóblokk és görgetésre épülő bevezető:** mit mutat az oldal, néhány jól elkülönített állítással.
2. **Miért számít az alapellátás?** A projekt indokoltsága már az oldal elején legyen világos.
3. **Mi a helyzet nálam?** A rövid tájékoztatás után kapjon kiemelt helyet a településkeresés.
4. **Térkép:** közvetlenül a kereső után, hogy a találat és annak területi környezete együtt legyen értelmezhető.
5. **Hogyan áll a háziorvosi körzetállomány?** Újratervezett, könnyen áttekinthető országos összkép.
6. **Amit eddig senki nem számolt ki:** a megtartandó elemzési blokk, egységesített megjelenéssel.
7. **További elemzések és kapcsolódó oldalak.**
8. **Lábléc:** széles adatkezelési és forráskezelési tájékoztató.

A pontos sorrend megvalósítási javaslat; a rögzített prioritás az alapellátás jelentőségének és a helyi keresésnek az előrehozása. A bevezető ne nyúljon olyan hosszúra, hogy ezek ismét az oldal aljára szoruljanak.

## 2. Tartalmi egyszerűsítés és ismétlések megszüntetése

### P1 – Hosszú bevezető helyett görgetésre épülő bemutatás

- [x] ~~Az „Interaktív térkép és statisztikai elemző oldal…” kezdetű tömböt rövid, görgetés közben megjelenő tartalmi egységekre bontani.~~
- [x] ~~Egy egység egy fő gondolatot közvetítsen: az oldal célja; havi frissítés és nyilvános NEAK-forrás; területi bontások és európai kitekintés; a hiánnyal együtt járó társadalmi és egészségi mutatók.~~
- [x] ~~Az összefüggések bemutatásánál közvetlenül megőrizni a korlátot: **„Ez együttjárás, nem bizonyított ok-okozat.”**~~
- [x] ~~A meglévő görgetős bevezetőt felhasználni, az új szövegezést abba beépíteni.~~
- [x] ~~A hosszú bevezető ne maradjon mellette második, azonos tartalmú szövegként.~~

### P1 – Felesleges magyarázatok és duplikált mutatók eltávolítása

- [x] ~~Az „És a betöltetlenség nem átmeneti állapot…” kezdetű külön magyarázó bekezdést elhagyni; a szükséges információt a hozzá tartozó adat rövid felirata közvetítse.~~
- [x] ~~A hasonló, már látható adatot újramondó magyarázó szövegeket átnézni és rövidíteni vagy törölni.~~
- [x] ~~A bevezető, a történetmesélő elemek és a csatolt képen látható mutatóválasztó közötti átfedést megszüntetni: ugyanaz a mutató ne kapjon több teljes értékű bemutatást egymás után.~~
- [x] ~~Elsődleges irányként a görgetős bemutatást megtartani; a képen látható ismétlődő blokkot elhagyni, vagy csak a másutt nem szereplő információira szűkíteni.~~
- [x] ~~Az egysoros feliratokból önmagukban is derüljön ki, mit jelent az adat. A szükséges definíció és forrás maradjon elérhető.~~

A képen szereplő számok az aktuális megjelenés példái, nem rögzítendő tartalmak; továbbra is az adatokból kell származniuk.

## 3. Kiemelt szekciók átalakítása

### P1 – „Miért számít az alapellátás?” előrehozása

- [x] ~~A szekciót a rövid bevezető után elhelyezni.~~
- [x] ~~Röviden, jól tagoltan megmutatni, miért lényeges az alapellátás és miért készült a projekt.~~
- [x] ~~Kerülni a bevezető és az elemzések szövegének ismétlését.~~

### P1 – „Mi a helyzet nálam?” előrehozása

- [x] ~~A keresőt az alapvető tájékoztatást követően, az országos részletes kimutatások elé tenni.~~
- [x] ~~Egyértelművé tenni a településkeresés lehetőségét és a következő lépést.~~
- [x] ~~Megőrizni a kereső és a térkép közvetlen kapcsolatát, valamint a meglévő szekcióhivatkozásokat.~~

### P1 – „Hogyan áll a háziorvosi körzetállomány?” teljes újratervezése

**Probléma:** a jelenlegi blokk túl sok információt mutat egyszerre, ezért a lényegi állítás nehezen található meg.

- [x] ~~Meghatározni a blokk egyetlen fő kérdését és az azt megválaszoló fő mutatót.~~
- [x] ~~A fő számot és rövid értelmezését kiemelni; a kiegészítő adatokat kisebb hangsúllyal, elkülönítve elhelyezni.~~
- [x] ~~A részletes bontásokat és módszertani magyarázatokat másodlagos, megnyitható részbe vagy a kapcsolódó elemzésre tenni.~~
- [x] ~~A diagramokat, feliratokat és jelmagyarázatokat egyszerűsíteni, az ismétlődő adatközlést megszüntetni.~~
- [x] ~~A mutatók nevezője, időpontja és eltérő kategóriái továbbra is egyértelműek legyenek.~~
- [x] ~~Mobilon is jól követhető, egymás alá rendezett információs hierarchiát kialakítani.~~

### P2 – „Amit eddig senki nem számolt ki” finomhangolása

- [x] ~~A blokk alapvető felépítését és tartalmát megtartani.~~
- [x] ~~A színeket az oldal közös palettájához igazítani.~~
- [x] ~~A kurzor alatti és aktív elem zavaró aláhúzását megszüntetni; a kijelölés más, következetes vizuális jelzést kapjon.~~
- [x] ~~A billentyűzetes fókusz láthatóságát megőrizni.~~

## 4. Térkép és kimutatások

### P1 – Áttekinthetőség és láthatóság javítása

- [x] ~~A térkép alapvető működését megtartva javítani a kezelőszervek, feliratok és jelmagyarázat olvashatóságát.~~
- [x] ~~A térképhez tartozó kimutatás információs sorrendjét átgondolni: először a kiválasztott terület fő adatai, utána a részletek.~~
- [x] ~~Egységesíteni a térkép körüli panelek kereteit, belső térközeit és igazítását.~~
- [x] ~~A szűrők, kijelölt állapotok és eredmények vizuálisan könnyen megkülönböztethetők legyenek.~~

### P1 – Animáció egyszerűsítése és dátumformátumok

- [x] ~~Az animáció közbeni státuszfeliratokat elrejteni; az animációs visszajelzésként csak az aktuális év és hónap maradjon látható.~~
- [x] ~~A lejátszás kezeléséhez szükséges vezérlőket megtartani.~~
- [x] ~~Magyarul egységes dátumformátumot használni, például: **2026. január**.~~
- [x] ~~Angolul ennek megfelelő, következetes lokalizált formátumot használni, például: **January 2026**.~~
- [x] ~~Mindkét nyelven azonos megjelenési szabályokat és hónappontosságot alkalmazni, kevert nyelvű feliratok nélkül.~~

## 5. Egységes vizuális rendszer az egész oldalon

### P1 – Keretek, térközök és tartalomszélességek

- [x] ~~Közös értékeket használni a keretszínre, keretvastagságra, sarokkerekítésre és belső térközökre.~~
- [x] ~~Egységesíteni a szekciók közötti távolságot, a címek alatti helyet és a kártyák közötti hézagokat.~~
- [x] ~~A fő tartalmi blokkok széleit közös konténerhez igazítani.~~
- [x] ~~Következetes betűméret- és színhierarchiát kialakítani a címek, fő mutatók, leírások és forrásjelölések között.~~
- [x] ~~A kisebb, halvány feliratok olvashatóságát javítani, különösen a képen látható sötét felületeken.~~
- [x] ~~Az állapotjelzéseket, hover- és fókuszmegjelenést összehangolni.~~
- [x] ~~Az egységesítést mobilon és asztali nézetben, magyar és angol szövegekkel is ellenőrizni.~~

## 6. Széles tájékoztató a lap alján

### P1 – Lábléc átrendezése

- [x] ~~Az alábbi szöveget a lap alján, a lábléc teljes tartalomszélességét kihasználó önálló sávban megjeleníteni, keskeny oszlopba tördelés nélkül.~~
- [x] ~~A szöveget változatlan tartalommal megtartani; mobilon természetes sortörést és megfelelő oldalsó térközt biztosítani.~~
- [x] ~~Az angol változatot ugyanebben az elrendezésben kezelni.~~

> Ez az oldal kizárólag nyilvánosan közzétett hatósági és statisztikai adatokkal dolgozik: havonta letölti őket, változatlan formában archiválja — az archívum az ellenőrizhetőség kedvéért nyilvános —, és összesítve elemzi. Saját adatfelvételt nem végzünk: sem a látogatókról, sem betegekről nem gyűjtünk adatot, és beteg- vagy más személyes egészségügyi adat az oldalon nem szerepel.

## 7. Megvalósítási támpontok

| Terület | Kiinduló fájlok |
| --- | --- |
| Szekciók sorrendje | `web/src/App.tsx` |
| Bevezető és ismétlődő mutatók | `web/src/components/Hero.tsx`, `web/src/components/ScrollyIntro.tsx` |
| Körzetállomány | `web/src/components/PraxisBalance.tsx` |
| Kiemelt elemzések | `web/src/components/Highlights.tsx` |
| Helyi keresés és alapellátás | `web/src/components/SearchSection.tsx`, `web/src/components/WhySection.tsx` |
| Térkép | `web/src/components/MapSection.tsx` és kapcsolódó vezérlői |
| Lábléc | `web/src/components/Footer.tsx` |
| Közös megjelenés | `web/src/index.css`, `web/src/theme.css` |
| Magyar és angol szövegek | `web/src/i18n/hu.json`, `web/src/i18n/en.json` |

## 8. Javasolt munkasorrend és elfogadás

1. ~~Tartalmi leltár: ismétlések kijelölése, szövegrövidítés, végleges szekciósorrend.~~
2. ~~Közös vizuális értékek meghatározása, majd a körzetállomány és a térképes kimutatás új elrendezése.~~
3. ~~Szekciók áthelyezése, görgetős bevezető és széles lábléc kialakítása.~~
4. ~~Térképes animáció, dátumformátumok és kiemelt elemzések finomhangolása.~~
5. ~~Vizuális és működési ellenőrzés mobilon és asztali nézetben, mindkét nyelven.~~

**A munka akkor kész, ha:**

- [x] ~~A projekt indokoltsága és a helyi kereső a részletes országos elemzések előtt elérhető.~~
- [x] ~~A nyitóoldal nem ismétli ugyanazokat a mutatókat és magyarázatokat egymást követő blokkokban.~~
- [x] ~~A körzetállomány fő üzenete a részletes magyarázat elolvasása nélkül is érthető.~~
- [x] ~~A térkép, a keresés és a lejátszás működik az átrendezés után is.~~
- [x] ~~Az animációnál csak az időszak jelenik meg státuszszövegek helyett, mindkét nyelven következetesen.~~
- [x] ~~A keretek, térközök, színek és interaktív állapotok egységesek; nincs levágott szöveg vagy vízszintes túlcsordulás.~~
- [x] ~~A nyilvános adatokról szóló teljes tájékoztató a lap alján, széles elrendezésben olvasható.~~
- [x] ~~A források, definíciók és az együttjárásra vonatkozó értelmezési korlát megmaradtak.~~
