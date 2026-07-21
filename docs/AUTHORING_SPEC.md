# DrinkCogs — Data Authoring Specification

This document is the single source of truth for authoring encyclopedia data.
All data lives in JSON files under `data/`. The site is fully static — these
files ARE the database.

## General rules

- **Valid JSON only.** No comments, no trailing commas. Verify with
  `python3 -m json.tool <file>` before finishing.
- Files in `data/bottles/` and `data/producers/` each contain a **JSON array**
  of entries. The build script (`scripts/build_data.py`) merges every array in
  those folders into `data/bottles.json` / `data/producers.json`.
- **Accuracy matters.** This is an encyclopedia. Use real, verifiable facts.
  Prices are approximate typical USD figures (that's fine — they're labeled as
  estimates in the UI). If a spec is undisclosed (e.g. a mash bill), use `null`
  and say "undisclosed" in the prose. Do not invent awards, dates, or people.
- **Original prose only.** Write your own encyclopedic descriptions. Never copy
  marketing copy or Wikipedia text.
- Tone: neutral, informative, Wikipedia-meets-Discogs. No superlatives-stuffed
  marketing voice. It's fine to note critical consensus ("widely regarded as…").
- All text in English. Metric + imperial where natural (ABV always; proof for
  US spirits).

## Controlled vocabularies

### Categories & subcategories (`category` / `subcategory`)

| category  | subcategories                                                            |
|-----------|--------------------------------------------------------------------------|
| `whiskey` | `bourbon`, `rye`, `american`, `scotch`, `irish`, `japanese`, `canadian`, `world` |
| `rum`     | `null`                                                                    |
| `gin`     | `null`                                                                    |
| `vodka`   | `null`, `aquavit`                                                         |
| `agave`   | `tequila`, `mezcal`                                                       |
| `brandy`  | `cognac`, `armagnac`, `calvados`, `other`                                 |
| `liqueur` | `herbal`, `amaro`, `orange`, `floral`, `cherry`, `coffee`, `anise`, `other` |
| `wine`    | `red`, `white`, `rose`, `champagne`, `sparkling`, `fortified`             |
| `beer`    | `lager`, `pale-ale`, `ipa`, `stout-porter`, `belgian-trappist`, `sour-wild`, `other` |
| `sake`    | `null`                                                                    |
| `soju`    | `null`                                                                    |
| `cider`   | `null`                                                                    |
| `rtd`     | `null`                                                                    |

### Country ids (`countryId`)

`united-states`, `scotland`, `ireland`, `england`, `japan`, `canada`,
`taiwan`, `india`, `iceland`, `jamaica`, `barbados`, `guyana`, `venezuela`,
`mexico`, `france`, `germany`, `italy`, `spain`, `portugal`, `belgium`,
`new-zealand`, `south-korea`

### Region ids (`regionId`) — use `null` when none applies

- united-states: `kentucky`, `tennessee`, `texas`, `vermont`, `washington-state`, `napa-valley`, `california`
- scotland: `speyside`, `highlands`, `islay`, `islands`, `campbeltown`, `lowlands`
- ireland: `county-cork`, `county-antrim`
- japan: `osaka`, `yamanashi`, `yamaguchi`, `niigata`
- canada: `manitoba`, `ontario`
- france: `cognac`, `armagnac`, `champagne`, `bordeaux`, `burgundy`, `provence`, `normandy`, `alsace`
- mexico: `jalisco`, `oaxaca`
- germany: `mosel`, `black-forest`
- italy: `tuscany`, `veneto`, `lombardy`
- spain: `catalonia`, `jerez`
- portugal: `douro`
- belgium: `west-flanders`, `hainaut`, `gaume`
- new-zealand: `marlborough`
- taiwan: `yilan`
- india: `karnataka`
- jamaica: `trelawny`, `saint-elizabeth`
- barbados: `saint-lucy`, `saint-michael`
- guyana: `demerara`

### Availability (`availability`)

`widely-available` | `seasonal` | `allocated` | `limited` | `rare` | `discontinued`

### Bottle shapes (`shape`)

`whiskey` (standard shouldered), `square` (JD-style), `decanter` (round-bodied,
Blanton's/Crown Royal/Hibiki), `wine-bordeaux` (high shoulder), `wine-burgundy`
(sloped shoulder), `champagne`, `apothecary` (squat round, Hendrick's/mezcal),
`tall` (slim column — vodka, Chartreuse, Campari, hock Riesling, Don Julio 1942),
`cognac` (wide low decanter with arched shoulders), `beer` (longneck),
`belgian` (stubby corked beer), `sake` (slender 720 ml), `can`

### Flavor dimensions (`flavor` object — ALL 20 keys required, integers 0–10)

`sweetness`, `oak`, `smoke`, `fruit`, `vanilla`, `chocolate`, `coffee`, `nut`,
`herbal`, `earthy`, `spice`, `pepper`, `caramel`, `honey`, `leather`, `citrus`,
`floral`, `body`, `finish`, `complexity`

Body = weight/mouthfeel; finish = length of finish; complexity = layered-ness.
0 means absent. Be honest and differentiating — a vodka should not score like a
sherried scotch. Values are used for radar charts and recommendations, so
differences between bottles matter more than absolute precision.

### Glassware (`glassware` — array of strings, pick from)

`Glencairn`, `Rocks glass`, `Highball`, `Coupe`, `Martini glass`, `Copita`,
`Snifter`, `Tulip`, `Flute`, `White wine glass`, `Red wine glass`, `Bordeaux glass`,
`Pint glass`, `Chalice`, `Ochoko`, `Shot glass`, `Copper mug`, `Nick & Nora`,
`Wine tumbler`, `Sake cup`

### Cocktail ids (for `cocktailIds`)

`old-fashioned`, `manhattan`, `whiskey-sour`, `sazerac-cocktail`, `mint-julep`,
`highball`, `penicillin`, `boulevardier`, `irish-coffee`, `daiquiri`, `mai-tai`,
`mojito`, `negroni`, `aperol-spritz`, `martini`, `gin-and-tonic`, `last-word`,
`margarita`, `paloma`, `espresso-martini`, `moscow-mule`, `sidecar`, `french-75`

## Bottle schema

Every field must be present (use `null` where not applicable).

```json
{
  "id": "buffalo-trace",
  "name": "Buffalo Trace Kentucky Straight Bourbon",
  "shortName": "Buffalo Trace",
  "brand": "Buffalo Trace",
  "producerId": "buffalo-trace-distillery",
  "category": "whiskey",
  "subcategory": "bourbon",
  "style": "Kentucky Straight Bourbon",
  "countryId": "united-states",
  "regionId": "kentucky",
  "abv": 45.0,
  "proof": 90,
  "ageStatement": "NAS",
  "ageYears": null,
  "vintage": null,
  "releaseYear": 1999,
  "sizeMl": 750,
  "msrp": 30,
  "estValue": 35,
  "availability": "widely-available",
  "limited": false,
  "discontinued": false,
  "featured": true,
  "color": "#b5651d",
  "colorName": "Deep amber",
  "glassColor": null,
  "shape": "whiskey",
  "description": "…120–180 words, what it is and why it matters…",
  "history": "…80–140 words…",
  "production": "…60–120 words on how it is made…",
  "mashBill": {"corn": 80, "rye": 10, "malted barley": 10},
  "grapes": null,
  "botanicals": null,
  "barrel": "New charred American white oak, aged in warehouses…",
  "finishCask": null,
  "filtration": "Chill filtered",
  "coloring": "No added coloring (required for straight bourbon)",
  "tastingNotes": {
    "nose": "…", "palate": "…", "finish": "…"
  },
  "flavor": {"sweetness": 6, "oak": 6, "smoke": 1, "fruit": 4, "vanilla": 7,
             "chocolate": 3, "coffee": 2, "nut": 3, "herbal": 2, "earthy": 2,
             "spice": 5, "pepper": 4, "caramel": 7, "honey": 4, "leather": 3,
             "citrus": 2, "floral": 1, "body": 6, "finish": 6, "complexity": 6},
  "glassware": ["Glencairn", "Rocks glass"],
  "servingTemp": "Neat at room temperature (18–22 °C), or with a single large cube",
  "pairings": ["Dark chocolate", "Pecan pie", "Smoked brisket"],
  "cocktailIds": ["old-fashioned", "manhattan", "whiskey-sour"],
  "awards": [
    {"year": 2021, "award": "Double Gold — San Francisco World Spirits Competition"}
  ],
  "facts": [
    "Named for the ancient buffalo migration route that crossed the Kentucky River at Frankfort.",
    "The distillery kept operating through Prohibition under a medicinal whiskey permit."
  ],
  "relatedIds": ["eagle-rare-10", "eh-taylor-small-batch", "wild-turkey-101"],
  "timeline": [
    {"year": 1999, "event": "Buffalo Trace launched as the distillery's new flagship bourbon", "type": "release"},
    {"year": 2006, "event": "Distillery named to the National Register of Historic Places", "type": "milestone"}
  ],
  "tags": ["flagship", "value-pick"]
}
```

Field notes:

- `id`: kebab-case, globally unique. Use the ids from the roster below EXACTLY.
- `proof`: `abv × 2` for US spirits; `null` for wine/beer/sake/non-US where proof isn't customary.
- `ageStatement`: display string ("12 Years", "NAS", "Solera — avg. 6 years"); `ageYears` numeric or null (drives stats).
- `vintage`: only wine/champagne (e.g. 2013). `releaseYear`: first year this expression existed, if known.
- `msrp` / `estValue`: USD. `estValue` is realistic current street/secondary price (important for allocated bourbon).
- `color`: hex of the LIQUID. `glassColor`: hex when the bottle glass itself is dark (red wine, Hendrick's, stouts) else null.
- `finishCask`: secondary cask finish only ("Oloroso sherry finish"), null when none.
- `mashBill` percentages ints summing ≈100, or null if undisclosed. `grapes`: array of variety names for wine/cognac/champagne. `botanicals`: array for gin.
- `coloring` / `filtration`: brief factual strings, or null if unknown.
- `timeline.type`: `release` | `change` | `award` | `discontinued` | `reintroduced` | `milestone` | `packaging`.
- `awards`: real ones only; empty array is fine.
- `facts`: 2–4 genuinely interesting, true items.
- `relatedIds`: 3–6 ids from the GLOBAL roster (cross-category encouraged where meaningful).
- `tags`: freeform kebab-case ("wheated", "cask-strength", "peated", "single-estate", "value-pick", "unicorn", …).
- `featured`: set `true` ONLY where the roster says so.

## Producer schema

```json
{
  "id": "buffalo-trace-distillery",
  "name": "Buffalo Trace Distillery",
  "type": "distillery",
  "countryId": "united-states",
  "regionId": "kentucky",
  "location": "Frankfort, Kentucky, USA",
  "lat": 38.2154,
  "lng": -84.8695,
  "founded": 1858,
  "parentCompany": "Sazerac Company",
  "masterDistiller": "Harlen Wheatley",
  "website": "buffalotracedistillery.com",
  "description": "…60–100 words: who they are, what defines the house style…",
  "history": "…100–160 words…",
  "signatureBottleIds": ["buffalo-trace", "eagle-rare-10", "blantons-original"],
  "facts": ["…", "…"],
  "timeline": [
    {"year": 1858, "event": "First modern distillery built on the site by Daniel Swigert", "type": "milestone"},
    {"year": 1999, "event": "Renamed Buffalo Trace Distillery under Sazerac ownership", "type": "change"}
  ]
}
```

- `type`: `distillery` | `brewery` | `winery` | `producer` | `blender` | `brand`.
- `masterDistiller`: current master distiller / blender / cellar master / brewmaster (`null` if not meaningful). Use the role-appropriate person.
- `lat`/`lng`: approximate site coordinates (2–4 decimals). For brands without a public site, use the company HQ.
- `founded`: year (int) or null.

## Cocktail schema (data/cocktails.json — single array)

```json
{
  "id": "old-fashioned",
  "name": "Old Fashioned",
  "era": "1880s",
  "origin": "Louisville / New York, USA",
  "description": "…40–80 words…",
  "ingredients": [
    {"amount": "60 ml (2 oz)", "item": "Bourbon or rye whiskey"},
    {"amount": "1 cube (or 5 ml syrup)", "item": "Sugar"},
    {"amount": "2–3 dashes", "item": "Angostura bitters"},
    {"amount": "1 piece", "item": "Orange peel"}
  ],
  "method": ["Muddle sugar with bitters and a few drops of water…", "Add whiskey and ice…", "Stir until chilled…", "Express orange peel over the top…"],
  "glass": "Rocks glass",
  "garnish": "Orange peel, optional cocktail cherry",
  "suitedBottleIds": ["buffalo-trace", "eagle-rare-10", "rittenhouse-rye"]
}
```

## GLOBAL ROSTER

Every bottle in the database, with its assigned id, producer, category and
notes. `F` = set `"featured": true`. `LIM` = limited:true. `DISC` = discontinued:true.
Use these ids verbatim for `relatedIds` cross-references.

### Group A — American & Canadian whiskey (file: `data/bottles/american-whiskey.json`, producers: `data/producers/american-whiskey.json`)

| id | name | producerId | cat/sub | shape | notes |
|---|---|---|---|---|---|
| buffalo-trace | Buffalo Trace Kentucky Straight Bourbon | buffalo-trace-distillery | whiskey/bourbon | whiskey | F — example above, refine freely |
| eagle-rare-10 | Eagle Rare 10 Year | buffalo-trace-distillery | whiskey/bourbon | whiskey | allocated |
| eh-taylor-small-batch | E.H. Taylor, Jr. Small Batch | buffalo-trace-distillery | whiskey/bourbon | whiskey | bottled-in-bond, allocated |
| weller-special-reserve | W.L. Weller Special Reserve | buffalo-trace-distillery | whiskey/bourbon | whiskey | wheated, allocated |
| blantons-original | Blanton's Original Single Barrel | buffalo-trace-distillery | whiskey/bourbon | decanter | allocated, horse stopper |
| george-t-stagg | George T. Stagg | buffalo-trace-distillery | whiskey/bourbon | whiskey | LIM rare, BTAC, cask strength |
| pappy-van-winkle-23 | Pappy Van Winkle's Family Reserve 23 Year | buffalo-trace-distillery | whiskey/bourbon | whiskey | LIM rare, wheated, unicorn |
| makers-mark | Maker's Mark | makers-mark-distillery | whiskey/bourbon | whiskey | F wheated, wax seal |
| four-roses-single-barrel | Four Roses Single Barrel | four-roses-distillery | whiskey/bourbon | whiskey | 10 recipes story |
| knob-creek-9 | Knob Creek 9 Year Small Batch | jim-beam-distillery | whiskey/bourbon | square | |
| woodford-reserve | Woodford Reserve Distiller's Select | woodford-reserve-distillery | whiskey/bourbon | whiskey | pot+column |
| wild-turkey-101 | Wild Turkey 101 | wild-turkey-distillery | whiskey/bourbon | whiskey | value pick |
| sazerac-rye | Sazerac Rye | buffalo-trace-distillery | whiskey/rye | whiskey | |
| rittenhouse-rye | Rittenhouse Rye Bottled-in-Bond | heaven-hill-distillery | whiskey/rye | whiskey | bartender staple |
| whistlepig-10 | WhistlePig 10 Year | whistlepig-farm | whiskey/rye | whiskey | Canadian-sourced rye |
| jack-daniels-old-no-7 | Jack Daniel's Old No. 7 | jack-daniel-distillery | whiskey/american | square | Tennessee, Lincoln County process |
| westland-american-oak | Westland American Oak | westland-distillery | whiskey/american | whiskey | American single malt |
| crown-royal-deluxe | Crown Royal Deluxe | crown-royal-distillery | whiskey/canadian | decanter | bag story |
| lot-no-40 | Lot No. 40 Rye | hiram-walker-distillery | whiskey/canadian | whiskey | 100% rye pot still |

Producers: buffalo-trace-distillery, makers-mark-distillery, four-roses-distillery,
jim-beam-distillery, woodford-reserve-distillery, wild-turkey-distillery,
heaven-hill-distillery, whistlepig-farm, jack-daniel-distillery,
westland-distillery, crown-royal-distillery (Gimli, Manitoba),
hiram-walker-distillery (Windsor, Ontario).

### Group B — Scotch, Irish, Japanese & world whisky (files: `world-whisky.json` in both folders)

| id | name | producerId | cat/sub | shape | notes |
|---|---|---|---|---|---|
| glenfiddich-12 | Glenfiddich 12 Year | glenfiddich-distillery | whiskey/scotch | whiskey | Speyside |
| macallan-12-sherry-oak | The Macallan Sherry Oak 12 Year | macallan-distillery | whiskey/scotch | whiskey | sherry-seasoned oak |
| lagavulin-16 | Lagavulin 16 Year | lagavulin-distillery | whiskey/scotch | whiskey | F Islay peat icon |
| ardbeg-10 | Ardbeg 10 Year | ardbeg-distillery | whiskey/scotch | whiskey | heavily peated |
| laphroaig-10 | Laphroaig 10 Year | laphroaig-distillery | whiskey/scotch | whiskey | medicinal peat |
| talisker-10 | Talisker 10 Year | talisker-distillery | whiskey/scotch | whiskey | Skye, maritime |
| highland-park-12 | Highland Park 12 Year Viking Honour | highland-park-distillery | whiskey/scotch | whiskey | Orkney, heather peat |
| springbank-10 | Springbank 10 Year | springbank-distillery | whiskey/scotch | whiskey | Campbeltown, allocated |
| johnnie-walker-black | Johnnie Walker Black Label 12 Year | johnnie-walker | whiskey/scotch | square | blended |
| jameson | Jameson Irish Whiskey | midleton-distillery | whiskey/irish | whiskey | F best-selling Irish |
| redbreast-12 | Redbreast 12 Year | midleton-distillery | whiskey/irish | whiskey | single pot still |
| green-spot | Green Spot | midleton-distillery | whiskey/irish | whiskey | bonder heritage |
| bushmills-10 | Bushmills 10 Year Single Malt | bushmills-distillery | whiskey/irish | whiskey | oldest licensed distillery claim |
| yamazaki-12 | Yamazaki 12 Year | yamazaki-distillery | whiskey/japanese | whiskey | F allocated, mizunara |
| hakushu-12 | Hakushu 12 Year | hakushu-distillery | whiskey/japanese | whiskey | allocated, forest distillery |
| hibiki-harmony | Hibiki Japanese Harmony | suntory | whiskey/japanese | decanter | 24-facet bottle |
| nikka-from-the-barrel | Nikka From the Barrel | nikka-whisky | whiskey/japanese | square | 51.4%, tiny square bottle (500 ml) |
| kavalan-classic | Kavalan Classic Single Malt | kavalan-distillery | whiskey/world | whiskey | Taiwan, tropical aging |
| amrut-fusion | Amrut Fusion | amrut-distillery | whiskey/world | whiskey | India |
| floki-single-malt | Flóki Icelandic Single Malt | eimverk-distillery | whiskey/world | square | Iceland, young barley whisky |

Producers: glenfiddich-distillery, macallan-distillery, lagavulin-distillery,
ardbeg-distillery, laphroaig-distillery, talisker-distillery,
highland-park-distillery, springbank-distillery, johnnie-walker (type blender),
midleton-distillery, bushmills-distillery, yamazaki-distillery,
hakushu-distillery, suntory (type blender), nikka-whisky (type blender),
kavalan-distillery (yilan), amrut-distillery (karnataka), eimverk-distillery (Iceland).

### Group C — Rum, gin, vodka, agave (files: `rum-gin-vodka-agave.json` in both folders)

| id | name | producerId | cat/sub | shape | notes |
|---|---|---|---|---|---|
| appleton-estate-12 | Appleton Estate 12 Year Rare Casks | appleton-estate | rum | whiskey | Jamaica, Nassau Valley |
| hampden-estate-8 | Hampden Estate 8 Year | hampden-estate | rum | whiskey | F high-ester funk |
| el-dorado-12 | El Dorado 12 Year | demerara-distillers | rum | whiskey | Guyana, wooden stills |
| diplomatico-reserva-exclusiva | Diplomático Reserva Exclusiva | destilerias-unidas | rum | apothecary | Venezuela, sweeter profile — note added sugar honestly |
| mount-gay-xo | Mount Gay XO Triple Cask | mount-gay-distillery | rum | whiskey | Barbados |
| planteray-barbados-5 | Planteray Barbados 5 Year (Grande Réserve) | maison-ferrand | rum | whiskey | ex-Plantation, renamed 2023, cognac-cask finish |
| tanqueray-london-dry | Tanqueray London Dry | tanqueray | gin | apothecary | 4 botanicals |
| hendricks | Hendrick's Gin | hendricks-gin-palace | gin | apothecary | F cucumber & rose, dark glass #2f2b33 |
| monkey-47 | Monkey 47 Schwarzwald Dry Gin | black-forest-distillers | gin | apothecary | 47 botanicals, 500 ml |
| the-botanist | The Botanist Islay Dry Gin | bruichladdich-distillery | gin | tall | 22 foraged Islay botanicals |
| plymouth-gin | Plymouth Gin | plymouth-distillery | gin | whiskey | protected style heritage |
| grey-goose | Grey Goose | grey-goose | vodka | tall | Picardy wheat |
| titos | Tito's Handmade Vodka | titos-distillery | vodka | tall | corn, Austin TX |
| reyka | Reyka Vodka | reyka-distillery | vodka | tall | F Iceland, lava rock filtration, geothermal |
| brennivin | Brennivín | olgerdin-brewery | vodka/aquavit | square | Iceland's caraway "Black Death" |
| fortaleza-blanco | Fortaleza Blanco | tequila-fortaleza | agave/tequila | apothecary | F tahona, allocated |
| el-tesoro-reposado | El Tesoro Reposado | la-altena-distillery | agave/tequila | whiskey | highlands |
| don-julio-1942 | Don Julio 1942 | don-julio-distillery | agave/tequila | tall | luxury añejo |
| del-maguey-vida | Del Maguey Vida | del-maguey | agave/mezcal | apothecary | F village mezcal entry point |
| ilegal-joven | Ilegal Mezcal Joven | ilegal-mezcal | agave/mezcal | apothecary | |

Producers: appleton-estate, hampden-estate, demerara-distillers,
destilerias-unidas, mount-gay-distillery, maison-ferrand (also makes Pierre
Ferrand cognac — type producer, based Cognac France), tanqueray (Cameronbridge,
Fife; type brand), hendricks-gin-palace (Girvan), black-forest-distillers,
bruichladdich-distillery (Islay — also a scotch distillery), plymouth-distillery,
grey-goose (type brand, Picardy/Cognac France), titos-distillery (Austin, TX),
reyka-distillery (Borgarnes, Iceland), olgerdin-brewery (Reykjavík, Iceland —
also brews beer), tequila-fortaleza (Tequila town, Jalisco),
la-altena-distillery (Arandas, Jalisco), don-julio-distillery (Atotonilco, Jalisco),
del-maguey (Oaxaca, type producer), ilegal-mezcal (Oaxaca, type brand).

### Group D — Brandy, liqueurs, RTD + all cocktails (files: `brandy-liqueurs-rtd.json` in both folders + `data/cocktails.json`)

| id | name | producerId | cat/sub | shape | notes |
|---|---|---|---|---|---|
| hennessy-vs | Hennessy V.S | maison-hennessy | brandy/cognac | cognac | F world's best-selling cognac |
| remy-martin-xo | Rémy Martin XO | remy-martin | brandy/cognac | cognac | Fine Champagne |
| pierre-ferrand-1840 | Pierre Ferrand 1840 Original Formula | maison-ferrand | brandy/cognac | whiskey | cocktail cognac |
| chateau-de-laubade-vsop | Château de Laubade VSOP | chateau-de-laubade | brandy/armagnac | cognac | Bas-Armagnac estate |
| christian-drouin-selection | Christian Drouin Sélection Calvados | christian-drouin | brandy/calvados | whiskey | Pays d'Auge apples |
| green-chartreuse | Green Chartreuse | chartreuse-diffusion | liqueur/herbal | tall | F 130 herbs, Carthusian monks, allocated |
| campari | Campari | campari-group | liqueur/amaro | tall | red bitter |
| aperol | Aperol | campari-group | liqueur/amaro | tall | spritz |
| grand-marnier | Grand Marnier Cordon Rouge | marnier-lapostolle | liqueur/orange | cognac | cognac + bitter orange |
| st-germain-elderflower | St-Germain Elderflower | st-germain | liqueur/floral | apothecary | art-deco bottle |
| luxardo-maraschino | Luxardo Maraschino Originale | luxardo-distillery | liqueur/cherry | tall | straw-wrapped heritage |
| fernet-branca | Fernet-Branca | fratelli-branca | liqueur/amaro | tall | bartender's handshake |
| high-noon-vodka-seltzer | High Noon Sun Sips Pineapple | high-noon-spirits | rtd | can | real vodka + juice seltzer |
| otr-old-fashioned | On The Rocks Old Fashioned | on-the-rocks | rtd | square | premixed with Knob Creek |

Producers: maison-hennessy (LVMH), remy-martin, chateau-de-laubade,
christian-drouin, chartreuse-diffusion (Voiron; type producer),
campari-group (Milan), marnier-lapostolle, st-germain (type brand, France),
luxardo-distillery (Veneto), fratelli-branca (Milan), high-noon-spirits
(E. & J. Gallo, California), on-the-rocks (Beam Suntory). (maison-ferrand is
defined in Group C — reference the id only.)

Also author **all 23 cocktails** (ids listed above) into `data/cocktails.json`.
For `suitedBottleIds` pick 2–4 sensible ids from this roster.

### Group E — Wine, champagne, sparkling, beer, sake, soju, cider (files: `wine-beer-sake.json` in both folders)

| id | name | producerId | cat/sub | shape | notes |
|---|---|---|---|---|---|
| chateau-margaux-2015 | Château Margaux 2015 | chateau-margaux | wine/red | wine-bordeaux | F LIM vintage grand vin, glassColor dark green |
| opus-one-2019 | Opus One 2019 | opus-one-winery | wine/red | wine-bordeaux | Napa, vintage 2019 |
| tignanello-2020 | Tignanello 2020 | marchesi-antinori | wine/red | wine-bordeaux | super Tuscan, vintage 2020 |
| caymus-cabernet | Caymus Vineyards Napa Cabernet Sauvignon | caymus-vineyards | wine/red | wine-bordeaux | |
| cloudy-bay-sauvignon-blanc | Cloudy Bay Sauvignon Blanc | cloudy-bay-vineyards | wine/white | wine-burgundy | Marlborough |
| dr-loosen-riesling-kabinett | Dr. Loosen Wehlener Sonnenuhr Riesling Kabinett | dr-loosen | wine/white | tall | Mosel, hock bottle |
| whispering-angel-rose | Whispering Angel Rosé | chateau-desclans | wine/rose | wine-burgundy | Provence |
| taylors-10-tawny | Taylor's 10 Year Old Tawny Port | taylor-fladgate | wine/fortified | wine-bordeaux | Douro |
| tio-pepe-fino | Tío Pepe Fino Sherry | gonzalez-byass | wine/fortified | wine-bordeaux | Jerez, flor |
| dom-perignon-2013 | Dom Pérignon Vintage 2013 | moet-chandon | wine/champagne | champagne | F LIM prestige cuvée, vintage 2013 |
| veuve-clicquot-yellow-label | Veuve Clicquot Yellow Label Brut | veuve-clicquot | wine/champagne | champagne | |
| krug-grande-cuvee | Krug Grande Cuvée | krug | wine/champagne | champagne | multi-vintage blend, allocated |
| freixenet-cordon-negro | Freixenet Cordon Negro Brut Cava | freixenet | wine/sparkling | champagne | glassColor black |
| la-marca-prosecco | La Marca Prosecco | la-marca | wine/sparkling | champagne | |
| westvleteren-12 | Westvleteren 12 | st-sixtus-abbey | beer/belgian-trappist | belgian | F LIM rare, abbey-gate sales |
| guinness-draught | Guinness Draught | guinness-brewery | beer/stout-porter | beer | nitro, glassColor dark |
| sierra-nevada-pale-ale | Sierra Nevada Pale Ale | sierra-nevada-brewing | beer/pale-ale | beer | Cascade hops, craft pioneer |
| chimay-blue | Chimay Grande Réserve (Blue) | chimay-brewery | beer/belgian-trappist | belgian | |
| pliny-the-elder | Pliny the Elder | russian-river-brewing | beer/ipa | beer | LIM double IPA cult |
| orval | Orval | orval-brewery | beer/belgian-trappist | belgian | Brettanomyces |
| dassai-23 | Dassai 23 Junmai Daiginjo | asahi-shuzo | sake | sake | F 23% polish |
| hakkaisan-junmai-ginjo | Hakkaisan Junmai Ginjo | hakkaisan-brewery | sake | sake | Niigata snow country |
| kikusui-junmai-ginjo | Kikusui Junmai Ginjo | kikusui-brewery | sake | sake | widely available |
| jinro-chamisul-fresh | Jinro Chamisul Fresh | hitejinro | soju | sake | world's best-selling spirit brand, green bottle |
| hwayo-41 | Hwayo 41 | hwayo | soju | tall | premium rice soju |
| angry-orchard-crisp | Angry Orchard Crisp Apple | angry-orchard | cider | beer | |
| eric-bordelet-sidre-brut | Eric Bordelet Sidre Brut Tendre | eric-bordelet | cider | champagne | Normandy, orchard-driven |

Producers: chateau-margaux, opus-one-winery, marchesi-antinori,
caymus-vineyards, cloudy-bay-vineyards, dr-loosen, chateau-desclans,
taylor-fladgate, gonzalez-byass, moet-chandon (brand Dom Pérignon),
veuve-clicquot, krug, freixenet, la-marca, st-sixtus-abbey, guinness-brewery,
sierra-nevada-brewing, chimay-brewery, russian-river-brewing, orval-brewery,
asahi-shuzo (Yamaguchi), hakkaisan-brewery, kikusui-brewery, hitejinro, hwayo,
angry-orchard, eric-bordelet.

## Quality bar

- Every prose field written specifically for the bottle — no template filler.
- Flavor profiles must differentiate: an Islay peat monster and a cava should
  share almost nothing.
- `relatedIds` should tell a story (rivals, family members, "if you like X try Y").
- Wines/champagnes: include `grapes`, vineyard/appellation detail in
  `production`, `servingTemp` with actual temperatures, food `pairings` that a
  sommelier would recognize.
- Beers: `production` covers style, yeast, hops; `ageYears` null; `proof` null.
- Sake: explain polishing ratio in `production`; `servingTemp` includes both
  chilled and warm guidance where appropriate.
- Prices: MSRP = official/typical retail; estValue = what you'd realistically
  pay today (secondary for allocated bottles). Be honest about bourbon madness
  (e.g. Pappy 23 MSRP ≈ $300 vs street ≈ $3,000+).
