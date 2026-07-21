// DrinkCogs — live.js: the open-database layer.
// Queries Open Food Facts (keyless, CORS, ODbL) straight from the browser so
// any drink on earth is searchable — the curated encyclopedia stays the
// editorial layer on top. Wikipedia's REST API adds context when it has an
// article. No servers, no keys, nothing proxied.

// Note: OFF's newer search-a-licious service has no CORS headers, so browsers
// can't use it — the classic v1 search does, and sorts by scan popularity.
const SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const PRODUCT = 'https://world.openfoodfacts.org/api/v2/product/';
const WIKI = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const FIELDS = 'code,product_name,product_name_en,brands,image_front_url,image_front_small_url,image_url,categories_tags,countries_tags,nutriments,quantity,ingredients_text,ingredients_text_en';

/* Map OFF category tags → our category ids (drives colors, icons, links). */
const TAG_MAP = [
  ['whisky', 'whiskey'], ['whiskies', 'whiskey'], ['bourbon', 'whiskey'],
  ['rum', 'rum'], ['gin', 'gin'], ['vodka', 'vodka'],
  ['tequila', 'agave'], ['mezcal', 'agave'],
  ['cognac', 'brandy'], ['armagnac', 'brandy'], ['brand', 'brandy'], ['calvados', 'brandy'],
  ['liqueur', 'liqueur'], ['bitter', 'liqueur'], ['aperitif', 'liqueur'],
  ['champagne', 'wine'], ['sparkling-wine', 'wine'], ['wine', 'wine'], ['port', 'wine'], ['sherr', 'wine'],
  ['beer', 'beer'], ['stout', 'beer'], ['ipa', 'beer'], ['lager', 'beer'],
  ['sake', 'sake'], ['soju', 'soju'], ['cider', 'cider'],
  ['cocktail', 'rtd'], ['hard-seltzer', 'rtd'],
];

function guessCategory(tags = []) {
  const joined = tags.join(' ');
  for (const [needle, cat] of TAG_MAP) if (joined.includes(needle)) return cat;
  return null;
}

function isDrink(hit) {
  const tags = hit.categories_tags || [];
  if (tags.some(t => t.includes('alcoholic-beverages') || t.includes('beverages'))) return true;
  const abv = Number(hit.nutriments?.alcohol);
  return Number.isFinite(abv) && abv > 0;
}

function parseSizeMl(quantity) {
  if (!quantity) return null;
  const m = String(quantity).toLowerCase().match(/([\d.,]+)\s*(ml|cl|l\b)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.round(m[2] === 'l' ? n * 1000 : m[2] === 'cl' ? n * 10 : n);
}

/** Normalize an OFF hit/product into a pseudo-bottle the UI understands. */
export function normalizeLive(p) {
  if (!p?.code) return null;
  const name = p.product_name_en || p.product_name || null;
  if (!name) return null;
  const brands = Array.isArray(p.brands) ? p.brands : (p.brands ? String(p.brands).split(',') : []);
  const abv = Number(p.nutriments?.alcohol);
  const country = (p.countries_tags || [])[0]?.replace(/^en:/, '').replace(/-/g, ' ') || null;
  return {
    live: true,
    id: `off:${p.code}`,
    code: String(p.code),
    name, shortName: name,
    brand: brands[0]?.trim() || null,
    category: guessCategory(p.categories_tags) || 'rtd',
    categoryLabel: (p.categories_tags || []).slice(-1)[0]?.replace(/^en:/, '').replace(/-/g, ' ') || 'drink',
    abv: Number.isFinite(abv) && abv > 0 ? abv : null,
    sizeMl: parseSizeMl(p.quantity),
    countryName: country,
    photo: p.image_front_url || p.image_url || null,
    photoSmall: p.image_front_small_url || p.image_front_url || null,
    ingredients: p.ingredients_text_en || p.ingredients_text || null,
    barcode: String(p.code),
  };
}

/** Live search of the open drinks database. Returns pseudo-bottles. */
export async function searchLive(q, { limit = 24 } = {}) {
  const url = `${SEARCH}?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1`
            + `&page_size=${limit}&sort_by=unique_scans_n&fields=${FIELDS}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`open database returned ${r.status}`);
  const data = await r.json();
  const seen = new Set();
  const out = [];
  for (const hit of data.products || []) {
    if (!isDrink(hit)) continue;
    const b = normalizeLive(hit);
    if (!b || !b.photo || seen.has(b.code)) continue; // discovery without a photo isn't discovery
    seen.add(b.code);
    out.push(b);
  }
  return out;
}

/** Full product record for a live bottle page. */
export async function getLiveProduct(code) {
  const r = await fetch(`${PRODUCT}${encodeURIComponent(code)}.json`);
  if (!r.ok) throw new Error(`open database returned ${r.status}`);
  const data = await r.json();
  if (data.status !== 1 || !data.product) return null;
  return normalizeLive(data.product);
}

/** Wikipedia summary enrichment — returns {title, extract, thumbnail, url} or null. */
export async function wikiSummary(...titles) {
  for (const t of titles.filter(Boolean)) {
    try {
      const r = await fetch(WIKI + encodeURIComponent(t.replace(/ /g, '_')) + '?redirect=true');
      if (!r.ok) continue;
      const d = await r.json();
      if (d.type === 'standard' && d.extract) {
        return {
          title: d.title, extract: d.extract,
          thumbnail: d.thumbnail?.source || null,
          url: d.content_urls?.desktop?.page || null,
        };
      }
    } catch { /* try next candidate */ }
  }
  return null;
}
