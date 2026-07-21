// DrinkCogs — cards.js: bottle card / row / strip components shared across pages.

import { bottleName, producerOf, catLabelOf, flagOf, photoOf, catColor } from './db.js';
import { bottleSVG } from './bottle-svg.js';
import * as store from './store.js';
import { esc, icon, money, num, AVAILABILITY } from './ui.js';

/**
 * Bottle media: real photo when the manifest has one, procedural SVG art
 * otherwise. `h` is the box height in px. Pass {art: true} to force the art
 * (shelf, tray and suggest keep the illustrated look on purpose).
 */
export function bottleMedia(b, opts = {}) {
  const h = opts.h ?? 124;
  const p = opts.art ? null : (photoOf(b) || (b.photoExt ? { file: b.photoExt } : null));
  if (p) {
    return `<img class="bphoto" src="${esc(p.file)}" alt="${esc(bottleName(b))} bottle"
      loading="lazy" decoding="async" style="max-height:${h}px"
      onerror="this.remove()">`;
  }
  return bottleSVG(b, { h, label: opts.label });
}

/**
 * Pseudo-bottle for a saved open-database item, built from its snapshot —
 * enough for cards, shelf, dashboard and CSV export to work offline.
 */
export function pseudoFromSnapshot(id, snap) {
  return {
    live: true, id, code: snap.code,
    name: snap.name || 'Open-database bottle', shortName: snap.name || id,
    brand: snap.brand || null,
    category: snap.category || 'rtd', subcategory: null,
    abv: snap.abv ?? null, ageYears: null, vintage: null,
    msrp: null, estValue: null, sizeMl: snap.sizeMl ?? null,
    availability: null, countryId: null, producerId: null,
    color: catColor(snap.category || 'rtd'),
    photoExt: snap.photo || null,
    flavor: null,
  };
}

/** Card for a live open-database search result. */
export function liveCard(b) {
  return `
  <div class="bcard" data-live="${esc(b.code)}">
    <a class="bcard-cover" href="#/live/${esc(b.code)}" aria-label="${esc(b.name)}"></a>
    ${store.hasStatus(b.id, 'owned') ? `<span class="badge badge-accent bcard-own">${icon('check')} Owned</span>` : ''}
    <div class="bcard-fig"><img class="bphoto" src="${esc(b.photoSmall || b.photo)}" alt="" loading="lazy" decoding="async" style="max-height:124px" onerror="this.closest('.bcard').remove()"></div>
    <div class="bcard-name">${esc(b.name)}</div>
    <div class="bcard-sub">${esc(b.brand || b.categoryLabel || '')}</div>
    <div class="bcard-meta">
      ${b.abv != null ? `<span class="badge">${num(b.abv, 1)}%</span>` : ''}
      <span class="badge badge-accent">open db</span>
    </div>
  </div>`;
}

export function bottleCard(b, opts = {}) {
  const owned = store.hasStatus(b.id, 'owned');
  const wished = store.hasStatus(b.id, 'wishlist');
  const inCmp = store.inCompare(b.id);
  const rating = store.notesOf(b.id).rating;
  const meta = [];
  if (b.abv != null) meta.push(`<span class="badge">${num(b.abv, 1)}%</span>`);
  if (b.ageYears) meta.push(`<span class="badge">${num(b.ageYears)} yr</span>`);
  else if (b.vintage) meta.push(`<span class="badge">${b.vintage}</span>`);
  if (b.msrp != null) meta.push(`<span class="badge">${money(b.msrp)}</span>`);
  const avail = AVAILABILITY[b.availability];
  if (avail && b.availability !== 'widely-available') meta.push(`<span class="badge ${avail.cls}">${avail.label}</span>`);

  return `
  <div class="bcard" data-bottle="${b.id}">
    <a class="bcard-cover" href="#/bottle/${b.id}" aria-label="${esc(b.name)}"></a>
    ${owned ? `<span class="badge badge-accent bcard-own">${icon('check')} Owned</span>` : ''}
    <div class="bcard-fig">${bottleMedia(b, { h: opts.figH ?? 124 })}</div>
    <div class="bcard-name">${esc(bottleName(b))}</div>
    <div class="bcard-sub">${flagOf(b)} ${esc(catLabelOf(b))}${rating != null ? ` · <b>★ ${esc(rating)}</b>` : ''}</div>
    <div class="bcard-meta">${meta.join('')}</div>
    <div class="bcard-acts">
      <button data-act="wish" data-id="${b.id}" class="${wished ? 'on' : ''}" title="Wishlist" aria-label="Toggle wishlist" aria-pressed="${wished}">${icon('bookmark')}</button>
      <button data-act="compare" data-id="${b.id}" class="${inCmp ? 'on' : ''}" title="Compare" aria-label="Toggle compare" aria-pressed="${inCmp}">${icon('compare')}</button>
    </div>
  </div>`;
}

export function bottleGrid(list, opts = {}) {
  if (!list.length) return `<div class="empty"><div class="e-icon">🫙</div><h3>Nothing here</h3><p>${esc(opts.emptyText || 'No bottles match.')}</p></div>`;
  return `<div class="grid-bottles">${list.map(b => bottleCard(b, opts)).join('')}</div>`;
}

export function bottleRow(b) {
  const p = producerOf(b);
  return `
  <a class="brow" href="#/bottle/${b.id}">
    <div class="brow-fig">${bottleMedia(b, { h: 56, label: false })}</div>
    <div>
      <div class="brow-name">${esc(bottleName(b))} ${store.hasStatus(b.id, 'owned') ? `<span class="badge badge-accent">Owned</span>` : ''}</div>
      <div class="brow-sub">${flagOf(b)} ${esc(catLabelOf(b))}${p ? ` · ${esc(p.name)}` : ''}${b.style ? ` · ${esc(b.style)}` : ''}</div>
    </div>
    <div class="brow-stats">
      <span><b>${b.abv != null ? num(b.abv, 1) + '%' : '—'}</b> ABV</span>
      <span><b>${b.ageYears ? num(b.ageYears) + ' yr' : (b.vintage || '—')}</b> ${b.vintage && !b.ageYears ? 'vintage' : 'age'}</span>
      <span><b>${money(b.msrp)}</b> MSRP</span>
    </div>
  </a>`;
}

export function bottleList(list) {
  if (!list.length) return `<div class="empty"><div class="e-icon">🫙</div><h3>Nothing here</h3><p>No bottles match.</p></div>`;
  return `<div class="bottle-list">${list.map(bottleRow).join('')}</div>`;
}

/** Horizontal scroll strip of cards (featured shelves, related bottles). */
export function bottleStrip(list, opts = {}) {
  return `<div class="hscroll">${list.map(b => bottleCard(b, { figH: 110, ...opts })).join('')}</div>`;
}

export function sectionHead(title, moreHref, moreLabel = 'See all') {
  return `<div class="section-head"><h2>${esc(title)}</h2>${moreHref ? `<a class="more" href="${moreHref}">${esc(moreLabel)} ${icon('arrowR')}</a>` : ''}</div>`;
}
