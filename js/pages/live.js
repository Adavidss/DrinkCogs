// DrinkCogs — pages/live.js: a bottle page for ANY drink in the open database.
// Rendered live from Open Food Facts by barcode; saveable to the local
// collection via a snapshot, shareable by URL, enriched from Wikipedia.

import { catColor } from '../db.js';
import { esc, icon, num, setTitle, sizeText, toast, copyText } from '../ui.js';
import { bottleSVG, copyBottleIcon } from '../bottle-svg.js';
import { buyLinks, reviewLinks } from '../links.js';
import { getLiveProduct, wikiSummary } from '../live.js';
import { sectionHead } from '../cards.js';
import * as store from '../store.js';

const LIVE_STATUSES = ['owned', 'opened', 'wishlist', 'favorite', 'sampled'];

/** Minimal pseudo-bottle for the SVG glyph + link generators. */
function pseudo(b) {
  return { ...b, color: catColor(b.category), shape: undefined };
}

export async function render(root, [code]) {
  setTitle('Open database');
  root.innerHTML = `<div class="boot-splash"><div class="boot-mark"></div><p>Asking the open drinks database…</p></div>`;

  let b = null;
  try { b = await getLiveProduct(code); } catch (e) { /* offline or API down */ }
  if (!b) {
    root.innerHTML = `<div class="empty"><div class="e-icon">📡</div><h3>Couldn't reach that bottle</h3>
      <p>The open database didn't answer for barcode <b class="mono">${esc(code)}</b> — it may not exist, or you're offline.</p>
      <a class="btn btn-primary" href="#/browse">Back to browse</a></div>`;
    return;
  }
  setTitle(b.name);

  const key = b.id;
  const wikiPromise = wikiSummary(b.name, b.brand);

  const statusChips = () => LIVE_STATUSES.map(s => {
    const on = store.hasStatus(key, s);
    const meta = store.STATUSES.find(x => x.id === s);
    return `<button class="chip ${on ? 'chip-on' : ''}" data-status="${s}" aria-pressed="${on}">${esc(meta?.label || s)}</button>`;
  }).join('');

  root.innerHTML = `
    <div class="breadcrumb">
      <a href="#/">Home</a> <span class="sep">/</span>
      <a href="#/browse">Browse</a> <span class="sep">/</span>
      <span>Open database</span> <span class="sep">/</span>
      <span>${esc(b.name)}</span>
    </div>

    <div class="bottle-hero">
      <div>
        <div class="bottle-stage">
          ${b.photo ? `<img class="stage-photo" src="${esc(b.photo)}" alt="${esc(b.name)} product photo" decoding="async">`
                    : bottleSVG(pseudo(b), { h: 300 })}
        </div>
        <p class="photo-credit">Data & photo: <a href="https://world.openfoodfacts.org/product/${esc(b.code)}" target="_blank" rel="noopener">Open Food Facts</a> contributors (ODbL) — community-submitted, quality varies.</p>
      </div>
      <div class="bottle-title">
        <div class="bottle-kicker"><span class="badge badge-accent">Open database</span>${b.categoryLabel ? `<span class="badge">${esc(b.categoryLabel)}</span>` : ''}</div>
        <div class="title-row">
          <h1>${esc(b.name)}</h1>
          <button class="icon-glyph no-print" id="copyIconBtn" title="Copy a bottle icon — paste it in any chat" aria-label="Copy bottle icon">
            ${bottleSVG(pseudo(b), { h: 46, label: false })}
          </button>
        </div>
        <p class="bottle-byline">
          ${b.brand ? `by <b>${esc(b.brand)}</b>` : ''}
          ${b.countryName ? ` · ${esc(b.countryName)}` : ''}
        </p>
        <div class="keystats">
          ${b.abv != null ? `<div class="keystat"><div class="ks-v">${num(b.abv, 1)}%</div><div class="ks-l">ABV</div></div>` : ''}
          ${b.sizeMl ? `<div class="keystat"><div class="ks-v">${sizeText(b.sizeMl)}</div><div class="ks-l">Size</div></div>` : ''}
          <div class="keystat"><div class="ks-v mono" style="font-size:.95rem">${esc(b.barcode)}</div><div class="ks-l">Barcode</div></div>
        </div>
        <div class="chip-row mt-2 no-print">
          <button class="chip" id="shareBtn">${icon('copy')} Share</button>
          <button class="chip" id="copyIconBtn2">${icon('sparkle')} Copy icon</button>
        </div>
        <div class="card mt-2 colpanel">
          <div class="card-title">${icon('book')}<h3>In my collection</h3></div>
          <div class="status-chips" id="liveStatuses">${statusChips()}</div>
          <p class="small faint mt-1">Saved with a snapshot, so it works offline and shows on your shelf & dashboard.</p>
        </div>
      </div>
    </div>

    <section class="section" id="wiki" hidden>
      ${sectionHead('From Wikipedia')}
      <div class="card prose" id="wikiBody"></div>
    </section>

    ${b.ingredients ? `
    <section class="section">
      ${sectionHead('Listed ingredients')}
      <div class="card prose"><p>${esc(b.ingredients)}</p></div>
    </section>` : ''}

    <section class="section no-print">
      ${sectionHead('Where to buy & what people think')}
      <div class="get-grid">
        <div class="card">
          <div class="card-title">${icon('external')}<h3>Find a bottle</h3></div>
          <div class="linkout-list">
            ${buyLinks(b).map(l => `<a class="linkout" href="${esc(l.url)}" target="_blank" rel="noopener nofollow">
              <span class="lo-label">${esc(l.label)}</span><span class="lo-note">${esc(l.note || '')}</span>${icon('external', 'lo-ic')}</a>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-title">${icon('star')}<h3>Reviews & ratings</h3></div>
          <div class="linkout-list">
            ${reviewLinks(b).map(l => `<a class="linkout" href="${esc(l.url)}" target="_blank" rel="noopener nofollow">
              <span class="lo-label">${esc(l.label)}</span><span class="lo-note">${esc(l.note || '')}</span>${icon('external', 'lo-ic')}</a>`).join('')}
          </div>
        </div>
      </div>
      <p class="small faint mt-1">Links open third-party sites prefilled for this product. DrinkCogs has no affiliation and earns nothing.</p>
    </section>

    <section class="section">
      <div class="card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <b>Is this bottle encyclopedia-worthy?</b>
          <p class="small muted">The curated layer gets full flavor profiles, history and family trees. Adding an entry is one JSON file — contributions welcome.</p>
        </div>
        <a class="btn" href="https://github.com/Adavidss/DrinkCogs/blob/main/docs/AUTHORING_SPEC.md" target="_blank" rel="noopener">${icon('external')} How to add it</a>
      </div>
    </section>`;

  /* Wikipedia enrichment arrives async */
  wikiPromise.then(w => {
    if (!w) return;
    const sec = root.querySelector('#wiki');
    if (!sec) return;
    sec.hidden = false;
    root.querySelector('#wikiBody').innerHTML = `
      <p>${esc(w.extract)}</p>
      ${w.url ? `<p class="small mt-1"><a href="${esc(w.url)}" target="_blank" rel="noopener">Read the full article ${icon('external')}</a></p>` : ''}`;
  }).catch(() => {});

  /* Collection: toggle status + persist a snapshot so it renders offline */
  root.querySelector('#liveStatuses').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    store.saveSnapshot(key, {
      name: b.name, brand: b.brand, category: b.category,
      abv: b.abv, sizeMl: b.sizeMl, photo: b.photoSmall || b.photo, code: b.code,
    });
    store.toggleStatus(key, btn.dataset.status);
    root.querySelector('#liveStatuses').innerHTML = statusChips();
  });

  const share = async () => {
    const url = location.href;
    if (navigator.share) {
      try { await navigator.share({ title: b.name, url }); return; } catch { /* cancelled */ }
    }
    copyText(url);
  };
  root.querySelector('#shareBtn').addEventListener('click', share);
  const copyIcon = async () => {
    const res = await copyBottleIcon(pseudo(b)).catch(() => null);
    toast(res === 'copied' ? 'Bottle icon copied — paste it in any chat'
        : res === 'downloaded' ? 'Icon downloaded (clipboard unavailable)' : 'Could not create the icon');
  };
  root.querySelector('#copyIconBtn').addEventListener('click', copyIcon);
  root.querySelector('#copyIconBtn2').addEventListener('click', copyIcon);
}
