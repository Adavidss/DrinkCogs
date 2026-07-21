// DrinkCogs — db.js: loads the JSON database, builds indexes and derived views.

export const DB = {
  ready: false,
  bottles: [], producers: [], countries: [], regions: [], categories: [], cocktails: [], flavors: [],
  bottleById: new Map(), producerById: new Map(), countryById: new Map(), regionById: new Map(),
  categoryById: new Map(), categoryByPair: new Map(), cocktailById: new Map(), flavorById: new Map(),
  styles: [], // [{name, count}]
  stats: {},
};

const FILES = ['bottles', 'producers', 'countries', 'regions', 'categories', 'cocktails', 'flavors'];

export async function loadDB() {
  if (DB.ready) return DB;
  const results = await Promise.all(FILES.map(async f => {
    const r = await fetch(`data/${f}.json`);
    if (!r.ok) throw new Error(`Failed to load data/${f}.json (${r.status})`);
    return r.json();
  }));
  [DB.bottles, DB.producers, DB.countries, DB.regions, DB.categories, DB.cocktails, DB.flavors] = results;
  index();
  DB.ready = true;
  return DB;
}

function index() {
  for (const b of DB.bottles) DB.bottleById.set(b.id, b);
  for (const p of DB.producers) { p.bottleIds = []; DB.producerById.set(p.id, p); }
  for (const c of DB.countries) { c.bottleIds = []; c.producerIds = []; DB.countryById.set(c.id, c); }
  for (const r of DB.regions) { r.bottleIds = []; r.producerIds = []; DB.regionById.set(r.id, r); }
  for (const c of DB.categories) {
    DB.categoryById.set(c.id, c);
    DB.categoryByPair.set(`${c.category}/${c.subcategory ?? ''}`, c);
  }
  for (const c of DB.cocktails) { c.bottleIds = []; DB.cocktailById.set(c.id, c); }
  for (const f of DB.flavors) DB.flavorById.set(f.id, f);

  const styleCounts = new Map();
  for (const b of DB.bottles) {
    DB.producerById.get(b.producerId)?.bottleIds.push(b.id);
    DB.countryById.get(b.countryId)?.bottleIds.push(b.id);
    if (b.regionId) DB.regionById.get(b.regionId)?.bottleIds.push(b.id);
    for (const cid of b.cocktailIds || []) DB.cocktailById.get(cid)?.bottleIds.push(b.id);
    if (b.style) styleCounts.set(b.style, (styleCounts.get(b.style) || 0) + 1);
  }
  for (const p of DB.producers) {
    DB.countryById.get(p.countryId)?.producerIds.push(p.id);
    if (p.regionId) DB.regionById.get(p.regionId)?.producerIds.push(p.id);
  }
  DB.styles = [...styleCounts.entries()].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const abvs = DB.bottles.filter(b => b.abv != null);
  DB.stats = {
    bottles: DB.bottles.length,
    producers: DB.producers.length,
    countries: DB.countries.length,
    categories: DB.categories.filter(c => !c.parentId).length,
    cocktails: DB.cocktails.length,
    flavors: DB.flavors.length,
    avgAbv: abvs.reduce((s, b) => s + b.abv, 0) / (abvs.length || 1),
  };
}

/* ---------- accessors ---------- */

export const bottleName = b => b.shortName || b.name;
export const producerOf = b => DB.producerById.get(b.producerId) || null;
export const countryOf = x => DB.countryById.get(x.countryId) || null;
export const regionOf = x => (x.regionId && DB.regionById.get(x.regionId)) || null;
export const flagOf = x => countryOf(x)?.flag || '';

export function catEntryOf(b) {
  return DB.categoryByPair.get(`${b.category}/${b.subcategory ?? ''}`)
      || DB.categoryByPair.get(`${b.category}/`)
      || null;
}
export function topCatOf(b) { return DB.categoryByPair.get(`${b.category}/`) || null; }
export function catLabelOf(b) { return catEntryOf(b)?.name || b.category; }

export function bottlesOf(idList) {
  return (idList || []).map(id => DB.bottleById.get(id)).filter(Boolean);
}

export function childrenOf(catEntry) {
  return DB.categories.filter(c => c.parentId === catEntry.id);
}

export function bottlesInCategory(catEntry) {
  if (!catEntry.subcategory) return DB.bottles.filter(b => b.category === catEntry.category);
  return DB.bottles.filter(b => b.category === catEntry.category && b.subcategory === catEntry.subcategory);
}

export function randomBottle() {
  return DB.bottles[Math.floor(Math.random() * DB.bottles.length)];
}

export function brandsOf(producer) {
  const m = new Map();
  for (const b of bottlesOf(producer.bottleIds)) {
    const brand = b.brand || bottleName(b);
    if (!m.has(brand)) m.set(brand, []);
    m.get(brand).push(b);
  }
  return m; // Map<brandName, bottles[]>
}

export function familyOf(bottle) {
  const p = producerOf(bottle);
  if (!p) return [];
  return bottlesOf(p.bottleIds).filter(b => b.id !== bottle.id);
}

/* ---------- category colors (labels, chips, charts) ---------- */

const CAT_COLORS = {
  whiskey: '#b06e1f', rum: '#8a5a30', gin: '#2e7d5b', vodka: '#7b8fa3',
  agave: '#4c8b4a', brandy: '#8c3b2e', liqueur: '#a64d79', wine: '#7b2d43',
  beer: '#c9932b', sake: '#8fa3b5', soju: '#5c8d89', cider: '#98b44a', rtd: '#4fa3c4',
};
export function catColor(category) { return CAT_COLORS[category] || '#888888'; }
