// DrinkCogs — links.js: outbound buy & review links.
// No backend, no APIs: these are stable search-URL templates on the big drink
// databases, prefilled per bottle. Curated per-bottle links (bottle.links,
// [{label, url, type: "buy"|"review"}]) are merged in first when present.

import { bottleName } from './db.js';

const enc = encodeURIComponent;
const SPIRITS = ['whiskey', 'rum', 'gin', 'vodka', 'agave', 'brandy', 'liqueur'];

function slugPlus(name) {
  return name.toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '+').replace(/^\+|\+$/g, '');
}

export function buyLinks(b) {
  const n = b.name;
  const out = (b.links || []).filter(l => l.type === 'buy').map(l => ({ ...l, curated: true }));
  out.push({ label: 'Wine-Searcher', note: 'compare prices worldwide', url: `https://www.wine-searcher.com/find/${slugPlus(n)}` });
  out.push({ label: 'Total Wine', note: 'US retail', url: `https://www.totalwine.com/search/all?text=${enc(n)}` });
  if (SPIRITS.includes(b.category) || b.category === 'sake') {
    out.push({ label: 'The Whisky Exchange', note: 'UK/EU shipping', url: `https://www.thewhiskyexchange.com/search?q=${enc(n)}` });
  }
  if (b.category === 'sake') {
    out.push({ label: 'Tippsy Sake', note: 'US sake specialist', url: `https://www.tippsysake.com/search?q=${enc(n)}` });
  }
  out.push({ label: 'Google Shopping', note: 'all merchants', url: `https://www.google.com/search?tbm=shop&q=${enc(n)}` });
  return out;
}

export function reviewLinks(b) {
  const n = b.name;
  const short = bottleName(b);
  const out = (b.links || []).filter(l => l.type === 'review').map(l => ({ ...l, curated: true }));
  if (SPIRITS.includes(b.category)) {
    out.push({ label: 'Distiller', note: 'expert + community', url: `https://distiller.com/search?term=${enc(n)}` });
  }
  if (b.category === 'whiskey') {
    out.push({ label: 'Whiskybase', note: 'collector database', url: `https://www.whiskybase.com/search?q=${enc(n)}` });
  }
  if (b.category === 'wine') {
    out.push({ label: 'Vivino', note: 'community ratings', url: `https://www.vivino.com/search/wines?q=${enc(n)}` });
    out.push({ label: 'CellarTracker', note: 'cellar notes', url: `https://www.cellartracker.com/list.asp?Table=List&szSearch=${enc(n)}` });
  }
  if (b.category === 'beer' || b.category === 'cider') {
    out.push({ label: 'Untappd', note: 'community check-ins', url: `https://untappd.com/search?q=${enc(n)}` });
    out.push({ label: 'BeerAdvocate', note: 'long-form reviews', url: `https://www.beeradvocate.com/search/?q=${enc(n)}&qt=beer` });
  }
  out.push({ label: 'Reddit', note: 'via Google', url: `https://www.google.com/search?q=${enc(`"${short}" review site:reddit.com`)}` });
  out.push({ label: 'YouTube', note: 'video reviews', url: `https://www.youtube.com/results?search_query=${enc(short + ' review')}` });
  return out;
}
