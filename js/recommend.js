// DrinkCogs — recommend.js: metadata-only smart discovery.
// No community data: similarity comes from flavor vectors + shared facts.

import { DB } from './db.js';

function cosine(a, b, dims) {
  let dot = 0, na = 0, nb = 0;
  for (const d of dims) {
    const x = a?.[d.id] ?? 0, y = b?.[d.id] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

export function similarity(a, b) {
  let s = cosine(a.flavor, b.flavor, DB.flavors) * 0.72;
  if (a.category === b.category) s += 0.08;
  if (a.subcategory && a.subcategory === b.subcategory) s += 0.07;
  if (a.countryId === b.countryId) s += 0.03;
  if (a.regionId && a.regionId === b.regionId) s += 0.04;
  if (a.producerId === b.producerId) s += 0.04;
  if (a.abv != null && b.abv != null) s += 0.04 * (1 - Math.min(1, Math.abs(a.abv - b.abv) / 30));
  return s;
}

const price = b => b.msrp ?? b.estValue;

function rankedOthers(bottle) {
  return DB.bottles
    .filter(b => b.id !== bottle.id)
    .map(b => ({ b, s: similarity(bottle, b) }))
    .sort((x, y) => y.s - x.s);
}

/** All recommendation shelves for a bottle page. Returns [{title, note, bottles}] */
export function recommendationsFor(bottle, limit = 6) {
  const ranked = rankedOthers(bottle);
  const shelves = [];

  const similar = ranked.slice(0, limit).map(r => r.b);
  if (similar.length) shelves.push({ id: 'similar', title: 'Similar flavor profile', note: 'Closest matches across the whole encyclopedia', bottles: similar });

  const sameCat = ranked.filter(r => r.b.category === bottle.category);

  if (bottle.abv != null) {
    const higher = sameCat.filter(r => r.b.abv != null && r.b.abv >= bottle.abv + 4).slice(0, limit).map(r => r.b);
    if (higher.length) shelves.push({ id: 'higher-proof', title: 'Higher proof alternatives', note: `Stronger takes on the same idea (${bottle.abv}% here)`, bottles: higher });
  }
  if (price(bottle) != null) {
    const budget = sameCat.filter(r => price(r.b) != null && price(r.b) <= price(bottle) * 0.72).slice(0, limit).map(r => r.b);
    if (budget.length) shelves.push({ id: 'budget', title: 'Budget alternatives', note: 'Kindred character for less', bottles: budget });
    const premium = sameCat.filter(r => price(r.b) != null && price(r.b) >= price(bottle) * 1.45).slice(0, limit).map(r => r.b);
    if (premium.length) shelves.push({ id: 'premium', title: 'Premium alternatives', note: 'When you want to trade up', bottles: premium });
  }

  const sameProducer = ranked.filter(r => r.b.producerId === bottle.producerId).map(r => r.b).slice(0, limit);
  if (sameProducer.length) shelves.push({ id: 'same-producer', title: 'From the same house', note: null, bottles: sameProducer });

  if (bottle.regionId) {
    const sameRegion = ranked.filter(r => r.b.regionId === bottle.regionId && r.b.producerId !== bottle.producerId).map(r => r.b).slice(0, limit);
    if (sameRegion.length) shelves.push({ id: 'same-region', title: 'Same region', note: null, bottles: sameRegion });
  }

  if (bottle.finishCask) {
    const kw = bottle.finishCask.toLowerCase().match(/sherry|port|wine|rum|cognac|madeira|sauternes|oloroso|px|toasted|maple|calvados/)?.[0];
    if (kw) {
      const sameFinish = ranked.filter(r => r.b.finishCask?.toLowerCase().includes(kw)).map(r => r.b).slice(0, limit);
      if (sameFinish.length) shelves.push({ id: 'same-finish', title: `More ${kw}-finished bottles`, note: null, bottles: sameFinish });
    }
  }

  return shelves;
}

/** "If you enjoy this" one-liner used on cards/related strips. */
export function topSimilar(bottle, n = 4) {
  return rankedOthers(bottle).slice(0, n).map(r => r.b);
}
