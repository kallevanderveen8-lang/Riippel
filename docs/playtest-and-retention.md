# Spelonderzoek en voortgang — 23 oktober 2026

> Historical review. The current desktop-only scope and latest changes are documented in [Desktop design and retention](desktop-design-and-retention.md).

## Beoordeling

Ripple heeft een duidelijke kern: stenen plaatsen, golven bekijken, bijstellen en alle lantaarns aansteken. De rustige vormgeving en korte pogingen passen bij een browserspel. De grootste verbeterkans zat in de motivatie na de eerste levels: alle vier oorspronkelijke sferen waren bij 30 sterren beschikbaar, meesterschap van een hoofdstuk had geen eigen beloning en de dagelijkse reeks vroeg meteen relatief moeilijke puzzels.

De aangepaste versie biedt meer zichtbare doelen en hulp bij vastlopen. Dit is een onderbouwde verbetering van de spelstructuur. Langere sessies en terugkeerpercentages moeten nog bij echte spelers worden gemeten.

## Wat daadwerkelijk is onderzocht

- De code voor levels, golven, saves, beloningen, advertenties, dagelijkse reeksen en hints is gelezen; bestaande release- en benchmarkrapporten zijn meegenomen.
- Levels 1–3 zijn in Chromium met gewone muisklikken gespeeld. Levels 1 en 2 lukten in één drop. In level 3 mislukte één steen; een tweede steen aan de andere kant maakte de oplossing compleet. De gespeelde acties gebruikten geen `solve()`-functie. De ontwikkelhulp is alleen gebruikt om de toestand vast te leggen.
- Het resultatenscherm blokkeerde muisklikken op Collection, hoewel de knop actief leek. Een directe dagboekknop op het resultatenscherm verhelpt die route.
- De bestaande automatische browserdoorloop speelt alle tien vaste levels, dagelijkse stages, saves en SDK-scenario's. Die doorloop gebruikt bekende oplossingen en is een functionele test, geen menselijke speeltest.
- Een deterministische blinde zoekbot kreeg de echte geometrie van campaignlevels 1–20 en maximaal 24 pogingen per level. Hij loste 12/20 op. De bot las geen oplossingen. Hij miste ook level 1, dat in de muisdoorloop direct lukte: de uitkomst mag daarom niet als menselijke moeilijkheid of speeltijd worden geïnterpreteerd.
- De actuele externe CrazyGames-documentatie kon niet opnieuw worden geopend: het netwerk gaf HTTP 403. De bestaande releasechecklist verwijst naar eerder geraadpleegde officiële documentatie. Er wordt geen nieuwe externe documentcontrole geclaimd.

## Aangebrachte verbeteringen

| Probleem | Aanpassing | Bedoelde uitkomst |
| --- | --- | --- |
| Na de eerste unlocks ontbreekt een verder doel | Autumn glow bij 60 sterren en Alpine dawn bij 120; oude unlocks blijven geldig | Meer cosmetische doelen tijdens de reis |
| Levels opnieuw spelen heeft weinig zichtbare structuur | Hoofdstuknummer, sterrenoverzicht, 15-sterrenmeesterschap en eenmalig twee extra hints | Een duidelijk doel voor het verbeteren van eerdere levels |
| Terugkeer hangt vooral aan een dagelijkse streak | Zes blijvende keepsakes, waaronder drie en zeven voltooide trails op verschillende dagen | Ook na een gemiste dag blijft opbouw zichtbaar |
| Beloningen zijn soms onduidelijk: drie levelsterren, maar zeven verdiende sterren | Resultaat vermeldt nieuwe dagelijkse bonussterren, sferen, meesterschap en keepsakes | Begrijpelijke beloningen |
| Speler blijft gokken op een moeilijke puzzel | Gratis hulpringen na vier mislukte drops, ongeacht hintsaldo; voorbeeldopstelling na zes | Een uitweg met behoud van voortgang |
| Verzamelen en hervatten zijn lastig te vinden | Dagboek vanaf resultaat; hoofdstukken bovenaan; springknoppen; hervatten van hoogste vrijgespeelde level | Eenvoudiger terugkeren naar een concreet doel |

Beloningen worden eenmaal toegekend en opgeslagen. Oude saves worden aangevuld met ontbrekende velden. Er zijn geen levens, betaalde blokkades of nieuwe aftellers toegevoegd. Dagelijkse keepsakes eisen geen opeenvolgende dagen. De physics en gecertificeerde levelgeometrie zijn behouden.

## Vervolgmeting met spelers

Laat eerst 5–8 mensen zonder uitleg spelen, waaronder enkele spelers op een telefoon. Observeer waar zij stoppen, wat zij denken dat de gouden zones betekenen en of zij het effect van twee golven kunnen voorspellen. Vraag na afloop welk doel zij hierna zouden kiezen en waarom zij morgen zouden terugkomen.

Meet bij een Basic Launch de bestaande portalstatistieken voor speeltijd en terugkeer. Vergelijk daarnaast in begeleide tests:

1. Hoeveel spelers de eerste drop uitvoeren en level 3 bereiken zonder uitleg.
2. Pogingen, tijd en vastlopen bij levels 3, 7, 10 en 15; onderscheid zelfstandig spelen, hulpringen en voorbeeldopstellingen.
3. Of spelers hoofdstuksterren en de volgende sfeer begrijpen, en of zij na een replay hun reis kunnen hervatten.
4. Hoeveel spelers de eerste dagelijkse trail beginnen en afronden; let op de sprong in moeilijkheid na het ontgrendelen.
5. Of spelers uit zichzelf een volgend doel kiezen en op een volgende dag terugkomen.

Gebruik die waarnemingen om de volgende wijziging te kiezen. Meer benodigde pogingen of extra wachttijd zijn geen bewijs van betere betrokkenheid. De eerder genoemde commerciële speeltijd- en retentiedoelen zijn nog geen gemeten resultaten.

## Reproduceerbare controle

Deze revisie slaagt voor 26 unittests en 20 Chromium-browsergroepen, zonder browserfouten. Beide productiebuilds en ZIP-controles slagen. De Basic ZIP is 35.546 bytes. Een afzonderlijke mobiele doorloop van de productiebuild controleerde een touch-oplossing, beloningsuitleg, dagboeknavigatie en doorgaan naar level 2; de ontwikkeloplossingshulp ontbreekt in die build.

`npm test` controleert onder andere eenmalige mastery- en journalbeloningen, terugkeer na niet-opeenvolgende dagen, save-migratie, hintlimieten en de uitleg van bonussterren. De uitgebreide browsercontrole bevat het dagboek, mobiele breedte van 320 pixels, behoud van een actieve opstelling, gratis hulp en hervatten.

Voer builds en browsertests uit in een tijdelijke kopie zoals vastgelegd in de cloudopstartinstructies: de bestaande scripts overschrijven bijgehouden release- en rapportbestanden. Gebruik voor de eerste CrazyGames-upload de Basic ZIP. Doorloop daarna de [portalchecklist](crazygames-release.md), inclusief echte telefoons en gast/account-opslag. Toelating en publieksresultaten worden niet door lokale tests bewezen.
