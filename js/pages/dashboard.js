// DrinkCogs — pages/dashboard.js: collection statistics dashboard.

import { DB, bottleName, producerOf, countryOf, topCatOf } from '../db.js';
import { esc, icon, money, num, setTitle, plural } from '../ui.js';
import {bottleMedia, pseudoFromSnapshot } from '../cards.js';
import { donutHTML, barsHTML, histogramHTML, radarSVG, radarAxesFor } from '../charts.js';
import { sectionHead } from '../cards.js';
import * as store from '../store.js';

export async function render(root) {
  setTitle('Dashboard');

  const paint = () => {
    const entries = store.allEntries();
    const owned = entries.filter(e => e.statuses.includes('owned'))
      .map(e => ({ e, b: DB.bottleById.get(e.id) || (store.isLiveId(e.id) && store.snapshotOf(e.id) ? pseudoFromSnapshot(e.id, store.snapshotOf(e.id)) : null) }))
      .filter(x => x.b);
    const counts = store.countByStatus();

    if (!entries.length) {
      root.innerHTML = `
        <h1>Collection dashboard</h1>
        <div class="empty mt-3">
          <div class="e-icon">📊</div>
          <h3>Nothing to chart yet</h3>
          <p>Mark a few bottles as owned or wishlisted and this page turns into a beautiful dashboard of your shelf.</p>
          <a class="btn btn-primary" href="#/browse">${icon('search')} Browse bottles</a>
          <a class="btn" href="#/collection">${icon('book')} Open collection</a>
        </div>`;
      return;
    }

    const bottles = owned.map(x => x.b);
    const price = x => x.e.notes.purchasePrice ?? x.b.msrp;
    const abvs = bottles.filter(b => b.abv != null).map(b => b.abv);
    const proofs = bottles.filter(b => b.proof != null).map(b => b.proof);
    const ages = bottles.filter(b => b.ageYears != null).map(b => b.ageYears);
    const prices = owned.map(price).filter(v => v != null);
    const replacement = bottles.reduce((s, b) => s + (b.estValue ?? b.msrp ?? 0), 0);
    const countries = new Set(bottles.map(b => b.countryId));
    const cats = new Set(bottles.map(b => b.category));
    const producers = new Set(bottles.map(b => b.producerId));
    const avg = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

    const oldest = [...bottles].filter(b => b.ageYears).sort((a, b) => b.ageYears - a.ageYears)[0];
    const strongest = [...bottles].filter(b => b.abv != null).sort((a, b) => b.abv - a.abv)[0];
    const priciest = [...bottles].sort((a, b) => (b.estValue ?? b.msrp ?? 0) - (a.estValue ?? a.msrp ?? 0))[0];
    const newest = [...owned].filter(x => x.e.notes.purchaseDate).sort((a, b) => (b.e.notes.purchaseDate).localeCompare(a.e.notes.purchaseDate))[0];

    const catCount = new Map();
    for (const b of bottles) {
      const t = topCatOf(b);
      const k = t ? t.name : b.category;
      catCount.set(k, (catCount.get(k) || 0) + 1);
    }
    const catData = [...catCount.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
    const largestCat = catData[0];

    const countryCount = new Map();
    for (const b of bottles) {
      const c = countryOf(b);
      const k = c ? `${c.flag} ${c.name}` : b.countryId; // live items may have neither
      if (k) countryCount.set(k, (countryCount.get(k) || 0) + 1);
    }

    const prodCount = new Map();
    for (const b of bottles) {
      const p = producerOf(b);
      if (p) prodCount.set(p.name, (prodCount.get(p.name) || 0) + 1);
    }
    const topProd = [...prodCount.entries()].sort((a, b) => b[1] - a[1])[0];

    const valueByCat = new Map();
    for (const b of bottles) {
      const t = topCatOf(b);
      const k = t ? t.name : b.category;
      valueByCat.set(k, (valueByCat.get(k) || 0) + (b.estValue ?? b.msrp ?? 0));
    }

    const purchasesByYear = new Map();
    for (const x of owned) {
      const y = (x.e.notes.purchaseDate || '').slice(0, 4);
      if (y) purchasesByYear.set(y, (purchasesByYear.get(y) || 0) + 1);
    }

    // average flavor profile of owned bottles
    const avgFlavor = {};
    const flavored = bottles.filter(b => b.flavor); // curated only — live items carry no profile
    for (const f of DB.flavors) avgFlavor[f.id] = avg(flavored.map(b => b.flavor[f.id] ?? 0)) ?? 0;
    const axes = radarAxesFor(DB.flavors, [avgFlavor]);

    const stat = (val, label, note) => `
      <div class="stat"><div class="s-val">${val}</div><div class="s-label">${label}</div>${note ? `<div class="s-note">${note}</div>` : ''}</div>`;

    root.innerHTML = `
      <div class="flex spread flex-wrap">
        <div>
          <h1>Collection dashboard</h1>
          <p class="muted mt-1">${plural(bottles.length, 'owned bottle')} · ${plural(counts.wishlist, 'wish')} · everything below is computed locally.</p>
        </div>
        <a class="btn no-print" href="#/collection">${icon('book')} Open collection</a>
      </div>

      <section class="section">
        <div class="stat-grid">
          ${stat(num(bottles.length), 'Total bottles')}
          ${stat(num(counts.opened), 'Opened')}
          ${stat(num(Math.max(0, bottles.length - counts.opened)), 'Unopened')}
          ${stat(num(counts.wishlist), 'Wishlist')}
          ${stat(num(counts.favorite), 'Favorites')}
          ${stat(avg(proofs) != null ? num(avg(proofs), 1) : (avg(abvs) != null ? num(avg(abvs) * 2, 1) : '—'), 'Average proof', avg(proofs) == null && avg(abvs) != null ? 'derived from ABV' : '')}
          ${stat(avg(abvs) != null ? num(avg(abvs), 1) + '%' : '—', 'Average ABV')}
          ${stat(avg(ages) != null ? num(avg(ages), 1) + ' yr' : '—', 'Average age', ages.length ? `${ages.length} age-stated` : 'no age-stated bottles')}
          ${stat(avg(prices) != null ? money(avg(prices)) : '—', 'Avg purchase price', 'MSRP used where no price noted')}
          ${stat(money(replacement), 'Est. replacement value', 'street estimates')}
          ${stat(num(countries.size), 'Countries')}
          ${stat(num(cats.size), 'Categories')}
          ${stat(num(producers.size), 'Producers')}
          ${largestCat ? stat(esc(largestCat.label), 'Largest category', plural(largestCat.value, 'bottle')) : ''}
          ${topProd ? stat(esc(topProd[0]), 'Top producer', plural(topProd[1], 'bottle')) : ''}
        </div>
      </section>

      <section class="section">
        ${sectionHead('Highlights')}
        <div class="dash-highlights">
          ${oldest ? highlight('Oldest bottle', oldest, `${num(oldest.ageYears)} years old`) : ''}
          ${strongest ? highlight('Highest proof', strongest, `${num(strongest.abv, 1)}% ABV${strongest.proof ? ` · ${num(strongest.proof, 1)} proof` : ''}`) : ''}
          ${priciest ? highlight('Most valuable', priciest, money(priciest.estValue ?? priciest.msrp)) : ''}
          ${newest ? highlight('Newest purchase', newest.b, `bought ${esc(newest.e.notes.purchaseDate)}`) : ''}
        </div>
      </section>

      <section class="section">
        ${sectionHead('Charts')}
        <div class="chart-grid">
          <div class="card chart-card">
            <h3>By category</h3>
            ${donutHTML(catData, { center: num(bottles.length), centerLabel: 'BOTTLES', label: 'Owned bottles by category' })}
          </div>
          <div class="card chart-card">
            <h3>By country</h3>
            ${barsHTML([...countryCount.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })))}
          </div>
          <div class="card chart-card">
            <h3>Your average flavor profile</h3>
            <div class="radar-wrap">${radarSVG(axes, [{ name: 'My shelf', color: 'var(--viz-1)', values: avgFlavor }], { size: 300 })}</div>
          </div>
          ${abvs.length ? `
          <div class="card chart-card">
            <h3>ABV distribution</h3>
            ${histogramHTML(abvs, { bucketSize: 10, unit: '%' })}
          </div>` : ''}
          <div class="card chart-card">
            <h3>Est. value by category</h3>
            ${barsHTML([...valueByCat.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { format: money })}
          </div>
          ${purchasesByYear.size ? `
          <div class="card chart-card">
            <h3>Purchases by year</h3>
            ${barsHTML([...purchasesByYear.entries()].sort().map(([label, value]) => ({ label, value })))}
          </div>` : ''}
        </div>
      </section>
    `;
  };

  function highlight(kicker, b, sub) {
    return `
      <a class="card highlight-card" href="#/bottle/${b.id}" style="text-decoration:none;color:var(--text)">
        <div class="h-fig">${bottleMedia(b, { h: 82, label: false })}</div>
        <div>
          <div class="h-kicker">${kicker}</div>
          <div class="h-name">${esc(bottleName(b))}</div>
          <div class="h-sub">${sub}</div>
        </div>
      </a>`;
  }

  paint();
  const onChange = () => paint();
  window.addEventListener('dc:collection', onChange);
  return () => window.removeEventListener('dc:collection', onChange);
}
