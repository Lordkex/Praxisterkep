# Praxistérkép – designterv

Modell: GPT-6 Astra | Effort: High | Dátum: 2026-11-16

A látogató értse meg gyorsan, miért fontos az alapellátás, találja meg a saját települését, és egyértelmű út vezessen a részletes elemzésekhez. A nyitóoldal szekciósorrendjét és szövegezését a [tartalmi terv](plans.md) rögzíti.

## 1. Javasolt irány

**A meglévő React, MapLibre és D3 alapokra építsünk.** A térkép motorja és a speciális statisztikai ábrák már rendelkezésre állnak. A legnagyobb javulást az ismétlődő mutatók kiszűrése, a fő adatok kiemelése és a kezelőfelület egységesítése hozhatja.

- **Felület:** a shadcn/ui legyen az első próba. A Park UI és a Mantine legyen a két fő összehasonlítási alap.
- **Térkép:** a MapLibre maradjon. A kereső, a szűrők, a jelmagyarázat és a kiválasztott terület adatlapja kapjon új elrendezést.
- **Diagramok:** a meglévő D3-ábrák kapjanak közös megjelenést. Új könyvtár akkor indokolt, ha egy konkrét ábrán egyszerűbb megvalósítást vagy jobb használhatóságot ad.

## 2. Mit lásson először a látogató?

| Felület | Látogatói kérdés | Elsőként látható tartalom |
| --- | --- | --- |
| Nyitóoldal | Mi a probléma, és miért fontos? | Rövid, görgetésre épülő bevezető, legfeljebb három fő mutató és egy kiemelt trend. |
| Helyi keresés és térkép | Mi a helyzet nálam? | Településkereső, térkép és a kiválasztott terület összefoglalója. |
| Részletes elemzőoldalak | Hogyan változik, és mivel jár együtt? | Összehasonlítások, részletes ábrák, táblázatok és módszertan. |

A nyitóoldalon egy mutatónak legyen egy elsődleges helye. A részletes bontások lenyithatók vagy külön oldalon érhetők el. Az adat értelmezéséhez szükséges időszak, mértékegység, nevező és lényeges korlát közvetlenül a kimutatásnál legyen látható.

## 3. Ingyenes design elemek és technológiai lehetőségek

### 3.1. Kezelőfelület

| Eszköz | Mit ad? | Hol érdemes kipróbálni? | Hivatalos forrás |
| --- | --- | --- | --- |
| **shadcn/ui** | Szerkeszthető, MIT-licencű komponensek. A hivatalos Vite-beállítás Tailwind CSS-t használ. | **Első próba:** kereső, szűrőpanel, nézetváltó és lenyitható részletek. | [Komponensek](https://ui.shadcn.com/docs) · [Vite](https://ui.shadcn.com/docs/installation/vite) · [Licenc](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) |
| **Park UI** | Szerkeszthető, MIT-licencű komponensek Ark UI és Panda CSS alapokon. | **Fő alternatíva:** ha fontos a komponenskód feletti közvetlen kontroll. Ugyanazon a térképes panelen hasonlítsuk össze a shadcnnel. | [Dokumentáció](https://park-ui.com/) · [Forrás és licenc](https://github.com/chakra-ui/park-ui) |
| **Mantine** | Kész React-komponensek, űrlapok, táblázat, dátumválasztók és külön diagramcsomag. | **Fő alternatíva:** ha a bonyolultabb szűrés és az összetett adatkezelés gyorsan megoldható a kész komponensekkel. | [Komponensek](https://mantine.dev/) · [Diagramok](https://mantine.dev/charts/getting-started/) · [Forrás és licenc](https://github.com/mantinedev/mantine) |
| **HeroUI** | React Aria és Tailwind CSS alapú, kész megjelenésű komponensek. Az alapkönyvtár ingyenes és nyílt forrású. | Keresőmező, szűrők és mobil adatpanel kipróbálására. A kész vizuális stílust a Praxistérkép arculatához kell igazítani. | [Dokumentáció](https://heroui.com/en/docs/react/getting-started) · [Ingyenes és Pro kínálat](https://heroui.com/) |
| **daisyUI** | Tailwind CSS-komponensek, előre elkészített és testreszabható témák. | Gyors szín- és felületpróbákhoz, például kártyák és gombok összevetéséhez. | [Komponensek és témák](https://daisyui.com/) · [Forrás és licenc](https://github.com/saadeghi/daisyui) |
| **Base UI** | Stílus nélküli React-komponensek, hozzáférhető interakciós alapokkal. | Saját megjelenési rendszerhez, ha van idő a teljes vizuális réteg kialakítására. | [Dokumentáció](https://base-ui.com/) |
| **Lucide** | Egységes vonalvezetésű SVG-ikonok. | Keresés, szűrés, lejátszás és becsukás. Az ikonok kapjanak egyértelmű feliratot vagy hozzáférhető nevet. | [Ikonkészlet](https://lucide.dev/) · [Licenc](https://lucide.dev/license) |

### 3.2. Diagramok és adattáblák

| Eszköz | Javasolt szerep a Praxistérképen | Hivatalos forrás |
| --- | --- | --- |
| **Meglévő D3** | Első választás az egyedi statisztikai ábrákhoz. Közös feliratokkal és vezérlőkkel egységesíthető. | [D3](https://d3js.org/) |
| **shadcn Charts / Recharts** | Egyszerű vonal-, oszlop- és területdiagramokhoz érdemes összevetni a meglévő D3-megoldással. | [shadcn Charts](https://ui.shadcn.com/docs/components/chart) |
| **Tremor** | Rangsorok, kis trendábrák és mutatók mintái. Az alapkomponensek nyílt forrásúak, a sablonok között vannak fizetősek. | [Komponensek](https://www.tremor.so/) · [Apache-2.0 licenc](https://github.com/tremorlabs/tremor) |
| **Apache ECharts** | Akkor érdemes kipróbálni, ha sok összetett ábrát szeretnénk egy SVG- és Canvas-megjelenítést támogató motorra hozni. | [Dokumentáció](https://echarts.apache.org/en/index.html) · [Apache-2.0 licenc](https://github.com/apache/echarts) |
| **Nivo** | React- és D3-alapú alternatíva változatos statisztikai diagramokhoz és területszínezett áttekintő ábrákhoz. | [Diagramkatalógus](https://nivo.rocks/) · [MIT-licenc](https://github.com/plouc/nivo) |
| **TanStack Table** | Hosszú, rendezhető és szűrhető rangsorokhoz vagy oszlopválasztást igénylő adatnézetekhez. | [Dokumentáció](https://tanstack.com/table/latest) · [MIT-licenc](https://github.com/TanStack/table) |

### 3.3. Térképes könyvtárak

| Eszköz | Mikor érdemes használni? | Hivatalos forrás |
| --- | --- | --- |
| **MapLibre GL JS** | A jelenlegi fő térkép alapja. Kezeli a pontokat, a területi rétegeket és az adatvezérelt színezést. | [Dokumentáció](https://maplibre.org/projects/gl-js/) · [BSD-3-Clause licenc](https://github.com/maplibre/maplibre-gl-js) |
| **Leaflet** | Különálló, egyszerű kétdimenziós térképekhez lehet alternatíva. | [Dokumentáció és példák](https://leafletjs.com/) |
| **deck.gl** | A MapLibre mellett is vizsgálható, ha a nagy adatmennyiség vagy egy speciális térbeli réteg konkrét igényt teremt rá. | [Rétegek és integráció](https://deck.gl/) |

Az alaptérkép adatforrásának licencét és kiszolgálási költségét a térképmotor licencétől függetlenül kell mérlegelni.

### 3.4. Asztali alkalmazáspéldák a korábbi jegyzetből

Ezek akkor válnak relevánssá, ha felmerül egy külön asztali alkalmazás. A Tauri az operációs rendszer WebView-ját használja, ami kisebb csomagot eredményezhet és platformonként eltérhet. Az Electron a Chromiumot és a Node.js-t a csomag részeként biztosítja. [Tauri](https://v2.tauri.app/concept/process-model/) · [Electron](https://www.electronjs.org/docs/latest/)

| Felhasználás | Példa összeállítás |
| --- | --- |
| Minimalista tudományos vagy laboratóriumi adatelemző | Tauri + React + shadcn/ui + Recharts + TanStack Table + Lucide |
| Összetett adatkezelő, sok űrlappal és szűrővel | Electron + React + Mantine + Apache ECharts + TanStack Table |
| Térképes dashboard földrajzi adatokhoz | Tauri + React + Park UI + MapLibre + Recharts |

## 4. Térképes felület

| Elem | Javasolt megjelenés |
| --- | --- |
| Fő vezérlők | Településkereső, időszak és egy fő mutatóválasztó a térkép felett. |
| Térkép | Nagy felület, visszafogott háttér, jól olvasható jelmagyarázat. |
| Kiválasztott terület | Három fő adat és egy kis idősor. Asztali nézetben a térkép mellett, mobilon bezárható alsó panelen. |
| További szűrők | Külön megnyitható panelen. Mobilon nyitásig a térkép használható területe szabad marad. |
| Nézetváltás | **Térkép / Rangsor / Idősor** közös terület-, időszak- és szűrőállapottal. |

- [ ] A területi összehasonlítás alapértelmezett mutatója legyen arány, például a betöltetlen körzetek aránya. A darabszám külön választható.
- [ ] Az animáció teljes időszakára legyen rögzített színskála. Vizsgáljuk felül a megyei színezés jelenlegi, havonta változó maximumát.
- [ ] Külön jelölés mutassa a hiányzó adatot, a tényleges nullát és a kijelölt területet.
- [ ] Lejátszás közben a változó státuszfeliratokat váltsa fel a hónapjelzés, például **2026. január** és **January 2026**.

## 5. Meglévő kimutatások áttervezése

| Jelenlegi elem | Egyszerűbb megjelenítés | Mit kell megőrizni? |
| --- | --- | --- |
| Automatikusan váltó, hatmutatós bemutató | Három állandó fő mutató. A többi a kapcsolódó részletes szekcióba kerül. | Minden érdemi adat elérhetősége. |
| Nagy kördiagram egyetlen százalékhoz | Kompakt aránysáv, szám és rövid felirat. | Nevező, időszak, kategória. |
| Körzetállomány teljes táblázata | Egy fő mutató, összetételsáv, rövid típusonkénti bontás és lenyitható teljes táblázat. | A körzet és a praxis eltérő fogalma, a kategóriák és összesítések. |
| Megyei és járási rangsor | Rendezett vízszintes sávok a saját terület és az országos referencia kiemelésével. | Pontos értékek és a teljes rangsor. |
| Összefüggések | Kérdésenként egy fő ábra és rövid értelmezés, további választható bontással. | Módszertani korlátok és az együttjárás értelmezése. |
| Speciális statisztikai ábrák | A meglévő D3-ábra egységes feliratokkal és vezérlőkkel. | Az ábratípus jelentése, például a túlélési görbe lépcsőzetessége. |

## 6. Közös megjelenési szabályok

**Az elemzési blokkok sorrendje:** kérdés → fő állítás → ábra → időszak és forrás → megnyitható részletek.

- [ ] **Szerkezet:** közös tartalomszélesség, térközök, belső margók és sarokkerekítés. A szöveges részeket elsősorban térköz, az önálló kezelőpaneleket szükség szerint keret tagolja.
- [ ] **Tipográfia:** egységes címek, fő mutatók, ábrafeliratok és forrássorok. A kis vagy halvány jelölések kontrasztja legyen megfelelő.
- [ ] **Színek:** ugyanaz az adatfogalom kapjon következetes színt. A státusz és a kijelölés szín mellett szöveggel vagy körvonallal is legyen felismerhető.
- [ ] **Vezérlők:** közös hover-, kijelölési és fókuszjelzés. Az aktív elem aláhúzása helyett legyen vizuálisan egyértelmű kijelölés, látható billentyűzetes fókusszal.
- [ ] **Diagramok:** egységes információbuborék, jelmagyarázat, dátum- és számformátum. A mértékegység, a referenciaérték és a forrás kiszámítható helyen jelenjen meg.
- [ ] **Használhatóság:** a fő adatok érintéssel és billentyűzettel is elérhetők legyenek. Az animáció vegye figyelembe a csökkentett mozgás beállítását, az elrendezés pedig férjen el magyar és angol feliratokkal.

## 7. Próba három felületen

| Prototípus | Mit mutasson? | Milyen döntést segítsen? |
| --- | --- | --- |
| Körzetállomány | Fő mutató, összetételsáv, típusonkénti bontás, lenyitható teljes táblázat. | Gyorsabban leolvasható-e a fő állítás a meglévő adatmegjelenítéssel? |
| Térkép és helyi adatpanel | Keresés, kiválasztás, három fő adat, kis idősor és további szűrők mobilon is. | Melyik UI-készlettel működik a legjobban a keresés és a szűrés a MapLibre mellett? |
| Részletes elemzési kártya | Kérdés, fő megállapítás, ábra, módszertani korlátok és forrás. | Elég-e a meglévő D3 megjelenésének egységesítése, vagy mérhető előnyt ad új könyvtár? |

A minták valós adatokkal készüljenek. Az értékelés nézze az első pillantásra érthető fő állítást, a részletek megtalálhatóságát, a mobilos és kétnyelvű használatot, valamint a bevezetési és karbantartási munkát.

## 8. Megvalósítási sorrend

1. **Leltár.** Minden kimutatáshoz rögzíteni a látogatói kérdést, a helyét és az ismétlődő tartalmat.
2. **Közös szabályok.** Meghatározni a tipográfiát, a térközöket, a színeket és az interaktív állapotokat.
3. **Prototípusok.** Kipróbálni a három mintát mobilon és asztali nézetben. A shadcn próba során ellenőrizni a Tailwind fokozatos bevezetését és a meglévő CSS-sel való együttműködést.
4. **Csomagválasztás.** A konkrét példák alapján dönteni a komponenskészletről és az esetleges diagramkönyvtárról. Ellenőrizni a kiválasztott csomagok verzióit és licenceit.
5. **Fokozatos átalakítás.** Először a nyitóoldal és a térképes keresés, aztán a részletes elemzések. A prototípusokon igazolt előnyök vezessék a komponenscseréket.

## 9. Elfogadási feltételek

- [ ] A helyi keresés a részletes országos kimutatások előtt elérhető.
- [ ] Minden kiemelt kimutatás egy világos kérdésre válaszol, az ismétlések eltűntek, az adatok visszakereshetők.
- [ ] A térképes nézetváltás megőrzi a kiválasztást és a szűrést. Az időbeli összevetésnél a színskála rögzített, a hiányzó adatok jelölése egyértelmű.
- [ ] A tipográfia, a keretek, a térközök, a színjelentések és az interakciók következetesek.
- [ ] A felület mobilon, billentyűzettel, magyarul és angolul is használható.
