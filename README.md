# 🥃 DrinkCogs

**The interactive encyclopedia and personal collection manager for alcoholic beverages.**

Think *Discogs for drinks*: a curated, metadata-rich catalog of bourbon, scotch, rum, gin, agave spirits, brandy, liqueurs, wine, champagne, beer, sake, soju, cider and RTDs — crossed with a private collection tracker that lives entirely in your browser.

**Live site:** https://kidsdc.org/DrinkCogs/

## What it does

- **Encyclopedia** — 100 bottles at launch, each with full specs (ABV/proof, age, mash bill, botanicals, grapes, barrels, cask finishes, filtration, coloring), original prose (description, history, production), tasting notes, awards, interesting facts, release timelines and serving guidance (glassware, temperature, pairings, cocktails).
- **Flavor system** — every bottle carries a curated 20-dimension flavor fingerprint rendered as radar charts; no community ratings anywhere.
- **Instant search & Discogs-style filters** — category, country, region, ABV, age, price, style, availability, limited/discontinued flags, flavor emphasis.
- **Smart discovery** — metadata-only recommendations: similar profiles, higher-proof / budget / premium alternatives, same house, same region, same cask finish.
- **Producers** — ~90 distilleries, breweries and houses with histories, timelines, maps and brand family trees.
- **World explorer** — countries, regions and protected designations (AOC, DO, GI…) on an offline SVG world map.
- **Personal collection** — mark bottles Owned / Opened / Finished / Wishlist / Favorite / Gifted / Previously owned / Sampled; add private notes (purchase details, dates, your rating, tasting notes, memories). Stored in `localStorage` — no account, no server, nothing leaves your device.
- **Dashboard** — stats and charts for your shelf: value, countries, categories, average proof/age, oldest bottle, ABV histogram, your average flavor profile.
- **Virtual shelf** — your bottles drawn to scale on wooden shelves, sortable by color, height, age, proof, country and more.
- **Compare mode** — up to four bottles side-by-side with difference highlighting and a flavor radar overlay.
- **23 cocktail recipes** matched to bottles in the database (and to bottles you own).
- **Real bottle photos** (Wikimedia Commons / Open Food Facts, attributed) with the illustrated art as automatic fallback — plus per-bottle **buy & review links** into Wine-Searcher, Total Wine, Distiller, Whiskybase, Vivino, Untappd and more.
- **Copyable bottle icons** — every bottle's illustration copies to the clipboard as a PNG for pasting into chats.
- **10 themes** — Clean White (default), Dark, Bourbon Barrel, Speakeasy, Vintage Paper, Midnight Blue, Emerald, Modern Glass, Warm Coffee, High Contrast.
- **PWA** — installable, fully offline after first visit.

## Architecture

Fully static — no backend, no build step, no dependencies. GitHub Pages serves the repo as-is.

```
index.html            app shell (SPA, hash routing)
css/                  base + 10 themes + components + pages
js/                   ES modules
  app.js              router, header, theme, compare tray, shortcuts
  db.js               loads & indexes the JSON database
  search.js           instant search + faceted filtering
  store.js            collection/notes/compare/theme (localStorage)
  bottle-svg.js       procedural bottle/glass/label illustrations
  charts.js           radar, donut, bars (dependency-free SVG)
  map.js              offline SVG world map
  recommend.js        metadata-only recommendations
  pages/              one module per page
data/
  bottles/*.json      bottle shards (edit these)
  producers/*.json    producer shards (edit these)
  bottles.json        GENERATED — merged, what the app loads
  producers.json      GENERATED
  countries.json, regions.json, categories.json, cocktails.json, flavors.json
  world-map.json      GENERATED from Natural Earth (public domain)
scripts/
  build_data.py       merge shards + validate everything
  build_map.py        regenerate world-map.json
  make_icons.py       regenerate PNG icons from the design
sw.js                 service worker (offline precache + SWR)
manifest.webmanifest  PWA manifest
```

All bottle imagery is **procedural SVG** generated at runtime from each bottle's shape, liquid color and category — consistent, tiny, and no copyright worries.

## Adding a bottle

1. Add one JSON object to a shard in `data/bottles/` (see [docs/AUTHORING_SPEC.md](docs/AUTHORING_SPEC.md) for the schema, controlled vocabularies and quality bar). New producer? Add it to `data/producers/`.
2. Run the validator/merger:
   ```bash
   python3 scripts/build_data.py
   ```
   It checks ids, enums, cross-references, flavor keys and prices, then regenerates `data/bottles.json` / `data/producers.json`.
3. Commit. Done — search, browse, categories, maps, recommendations and stats pick it up automatically.

## Development

Any static file server works:

```bash
python3 -m http.server 3080
# open http://localhost:3080
```

(Opening `index.html` via `file://` won't work — ES modules and `fetch` need HTTP.)

## Roadmap hooks

The architecture leaves clean seams for: barcode scanning, OCR label recognition, CSV import, printable reports (print styles already included), tasting-session mode, cellar/inventory tracking, price history and multilingual support. Collection import/export (JSON + CSV) already ships.

## Data & trademarks

Curated facts with approximate USD pricing (MSRP + realistic street estimates; secondary-market reality included for allocated bottles). Corrections welcome via PR. Trademarks belong to their owners and appear here for identification in an encyclopedic context. World map derived from Natural Earth (public domain).

Please enjoy responsibly.
