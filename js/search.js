// DrinkCogs — search.js: instant client-side search, filtering, and sorting.

import { DB, producerOf, countryOf, regionOf, catLabelOf } from './db.js';

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%.]+/g, ' ')
    .trim();
}

let indexed = false;
const HAY = new Map(); // bottleId -> [{text, weight}]

export function buildIndex() {
  if (indexed) return;
  for (const b of DB.bottles) {
    const tiers = [
      [10, [b.name, b.shortName, b.brand]],
      [7,  [producerOf(b)?.name]],
      [5,  [b.style, catLabelOf(b), b.category, b.subcategory]],
      [4,  [countryOf(b)?.name, regionOf(b)?.name]],
      [2,  [b.finishCask, b.colorName, ...(b.tags || []), ...(b.grapes || []), ...(b.botanicals || []).slice(0, 12), b.ageStatement, String(b.releaseYear || ''), String(b.vintage || '')]],
    ];
    HAY.set(b.id, tiers.map(([weight, vals]) => ({ weight, text: ' ' + normalize(vals.filter(Boolean).join(' ')) + ' ' })));
  }
  indexed = true;
}

export function searchBottles(query, limit = Infinity) {
  buildIndex();
  const q = normalize(query);
  if (!q) return DB.bottles.slice(0, limit);
  const tokens = q.split(' ').filter(Boolean);
  const results = [];
  for (const b of DB.bottles) {
    const tiers = HAY.get(b.id);
    let score = 0, ok = true;
    for (const t of tokens) {
      let best = 0;
      for (const tier of tiers) {
        if (tier.text.includes(' ' + t)) { best = Math.max(best, tier.weight * 2); }
        else if (tier.text.includes(t)) { best = Math.max(best, tier.weight); }
        if (best >= tier.weight * 2) break;
      }
      if (!best) { ok = false; break; }
      score += best;
    }
    if (ok) {
      if (normalize(b.shortName || b.name).startsWith(q)) score += 14;
      results.push({ b, score });
    }
  }
  results.sort((x, y) => y.score - x.score || (x.b.name < y.b.name ? -1 : 1));
  return results.slice(0, limit).map(r => r.b);
}

/** Cross-entity search for the suggestion dropdown. */
export function searchAll(query) {
  const q = normalize(query);
  if (!q) return { bottles: [], producers: [], categories: [], countries: [], cocktails: [] };
  const match = s => normalize(s).includes(q);
  return {
    bottles: searchBottles(q, 5),
    producers: DB.producers.filter(p => match(p.name)).slice(0, 3),
    categories: DB.categories.filter(c => match(c.name)).slice(0, 2),
    countries: DB.countries.filter(c => match(c.name)).slice(0, 2),
    cocktails: DB.cocktails.filter(c => match(c.name)).slice(0, 2),
  };
}

/* ---------- filters ---------- */

export const EMPTY_FILTERS = {
  q: '', cats: [], countries: [], regions: [], availability: [], style: '',
  abvMin: null, abvMax: null, ageMin: null, ageMax: null, priceMin: null, priceMax: null,
  limited: false, discontinued: false, featured: false, vintageOnly: false,
  flavorDim: '', flavorMin: 6, producer: '', cocktail: '',
};

export function parseFilters(sp) {
  const f = structuredClone(EMPTY_FILTERS);
  if (!sp) return f;
  const list = k => (sp.get(k) || '').split(',').filter(Boolean);
  f.q = sp.get('q') || '';
  f.cats = list('cat');
  f.countries = list('country');
  f.regions = list('region');
  f.availability = list('avail');
  f.style = sp.get('style') || '';
  f.producer = sp.get('producer') || '';
  f.cocktail = sp.get('cocktail') || '';
  for (const k of ['abvMin', 'abvMax', 'ageMin', 'ageMax', 'priceMin', 'priceMax']) {
    const v = sp.get(k); f[k] = v !== null && v !== '' ? Number(v) : null;
  }
  for (const k of ['limited', 'discontinued', 'featured', 'vintageOnly']) f[k] = sp.get(k) === '1';
  f.flavorDim = sp.get('flavor') || '';
  f.flavorMin = sp.get('flavorMin') ? Number(sp.get('flavorMin')) : 6;
  return f;
}

export function filtersToQuery(f) {
  const o = {};
  if (f.q) o.q = f.q;
  if (f.cats.length) o.cat = f.cats.join(',');
  if (f.countries.length) o.country = f.countries.join(',');
  if (f.regions.length) o.region = f.regions.join(',');
  if (f.availability.length) o.avail = f.availability.join(',');
  if (f.style) o.style = f.style;
  if (f.producer) o.producer = f.producer;
  if (f.cocktail) o.cocktail = f.cocktail;
  for (const k of ['abvMin', 'abvMax', 'ageMin', 'ageMax', 'priceMin', 'priceMax']) if (f[k] != null && f[k] !== '') o[k] = f[k];
  for (const k of ['limited', 'discontinued', 'featured', 'vintageOnly']) if (f[k]) o[k] = '1';
  if (f.flavorDim) { o.flavor = f.flavorDim; o.flavorMin = f.flavorMin; }
  return o;
}

/** cat filter values: "whiskey" (whole category) or "whiskey/bourbon" (subcategory) */
function matchesCat(b, cats) {
  if (!cats.length) return true;
  return cats.some(c => {
    const [cat, sub] = c.split('/');
    return b.category === cat && (!sub || b.subcategory === sub);
  });
}

export function applyFilters(bottles, f) {
  const price = b => b.msrp ?? b.estValue;
  return bottles.filter(b =>
    matchesCat(b, f.cats)
    && (!f.countries.length || f.countries.includes(b.countryId))
    && (!f.regions.length || f.regions.includes(b.regionId))
    && (!f.availability.length || f.availability.includes(b.availability))
    && (!f.style || b.style === f.style)
    && (!f.producer || b.producerId === f.producer)
    && (!f.cocktail || (b.cocktailIds || []).includes(f.cocktail))
    && (f.abvMin == null || (b.abv != null && b.abv >= f.abvMin))
    && (f.abvMax == null || (b.abv != null && b.abv <= f.abvMax))
    && (f.ageMin == null || (b.ageYears != null && b.ageYears >= f.ageMin))
    && (f.ageMax == null || (b.ageYears != null && b.ageYears <= f.ageMax))
    && (f.priceMin == null || (price(b) != null && price(b) >= f.priceMin))
    && (f.priceMax == null || (price(b) != null && price(b) <= f.priceMax))
    && (!f.limited || b.limited)
    && (!f.discontinued || b.discontinued)
    && (!f.featured || b.featured)
    && (!f.vintageOnly || b.vintage != null)
    && (!f.flavorDim || (b.flavor?.[f.flavorDim] ?? 0) >= f.flavorMin)
  );
}

export const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'abv-desc', label: 'ABV: high → low' },
  { id: 'abv-asc', label: 'ABV: low → high' },
  { id: 'age-desc', label: 'Age: old → young' },
  { id: 'price-asc', label: 'Price: low → high' },
  { id: 'price-desc', label: 'Price: high → low' },
  { id: 'year', label: 'Release year' },
];

export function sortBottles(list, sortId) {
  const by = (fn, dir = 1, nullsLast = true) => (a, b) => {
    const x = fn(a), y = fn(b);
    if (x == null && y == null) return 0;
    if (x == null) return nullsLast ? 1 : -1;
    if (y == null) return nullsLast ? -1 : 1;
    return x < y ? -dir : x > y ? dir : 0;
  };
  const l = [...list];
  switch (sortId) {
    case 'name': return l.sort(by(b => (b.shortName || b.name).toLowerCase()));
    case 'abv-desc': return l.sort(by(b => b.abv, -1));
    case 'abv-asc': return l.sort(by(b => b.abv, 1));
    case 'age-desc': return l.sort(by(b => b.ageYears ?? (b.vintage ? new Date().getFullYear() - b.vintage : null), -1));
    case 'price-asc': return l.sort(by(b => b.msrp ?? b.estValue, 1));
    case 'price-desc': return l.sort(by(b => b.msrp ?? b.estValue, -1));
    case 'year': return l.sort(by(b => b.vintage ?? b.releaseYear, -1));
    default: return l;
  }
}
