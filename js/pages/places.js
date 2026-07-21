// DrinkCogs — pages/places.js: country explorer, country pages, region pages.

import { DB, bottlesOf, countryOf } from '../db.js';
import { esc, icon, num, setTitle, plural } from '../ui.js';
import { bottleGrid, sectionHead } from '../cards.js';
import { worldMapSVG, bindMapNav } from '../map.js';

export async function renderIndex(root) {
  setTitle('Countries');
  const countries = [...DB.countries].sort((a, b) => b.bottleIds.length - a.bottleIds.length);

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/explore">Explore</a> <span class="sep">/</span> Countries</div>
    <h1>Explore the world through drinks</h1>
    <p class="muted mt-1">${plural(DB.countries.length, 'country', 'countries')}, ${plural(DB.regions.length, 'region')} — including protected appellations and designations of origin.</p>
    <div class="card map-card mt-2" id="worldMap"></div>
    <section class="section">
      ${sectionHead('All countries')}
      <div class="country-grid">
        ${countries.map(c => `
          <a class="country-card" href="#/country/${c.id}">
            <span class="cc-flag">${c.flag}</span>
            <span>
              <span class="cc-name">${esc(c.name)}</span><br>
              <span class="cc-sub">${plural(c.bottleIds.length, 'bottle')} · ${plural(c.producerIds.length, 'producer')}</span>
            </span>
          </a>`).join('')}
      </div>
    </section>
    <section class="section">
      ${sectionHead('Protected designations')}
      <p class="muted small" style="margin-top:-8px;margin-bottom:12px">Appellations and geographical indications with legal force behind the name.</p>
      <div class="region-grid">
        ${DB.regions.filter(r => r.protected).map(r => regionCard(r)).join('')}
      </div>
    </section>
  `;

  const mapEl = root.querySelector('#worldMap');
  const highlight = new Map();
  for (const c of DB.countries) {
    const prev = highlight.get(c.iso3);
    highlight.set(c.iso3, {
      label: prev ? `${prev.label} · ${c.name}` : c.name,
      href: prev ? '#/countries' : `#/country/${c.id}`, // GBR holds Scotland & England — send to list
    });
  }
  worldMapSVG({ highlight, label: 'World map of countries in the encyclopedia' })
    .then(svg => { mapEl.innerHTML = svg; bindMapNav(mapEl); });
}

function regionCard(r) {
  const c = countryOf(r);
  return `
    <a class="card" href="#/region/${r.id}" style="text-decoration:none;color:var(--text)">
      <div class="flex spread">
        <b>${c ? c.flag + ' ' : ''}${esc(r.name)}</b>
        ${r.protected ? `<span class="badge badge-accent">${esc(r.designation || 'Protected')}</span>` : ''}
      </div>
      <p class="small muted mt-1">${esc(r.description || '')}</p>
      <p class="small mt-1" style="font-weight:700;color:var(--accent-strong)">${plural(r.bottleIds.length, 'bottle')} · ${plural(r.producerIds.length, 'producer')}</p>
    </a>`;
}

export async function renderOne(root, [id]) {
  const c = DB.countryById.get(id);
  if (!c) {
    root.innerHTML = `<div class="empty"><div class="e-icon">🧭</div><h3>Country not found</h3><a class="btn btn-primary" href="#/countries">All countries</a></div>`;
    return;
  }
  setTitle(c.name);
  const regions = DB.regions.filter(r => r.countryId === c.id);
  const producers = c.producerIds.map(pid => DB.producerById.get(pid)).filter(Boolean);
  const bottles = bottlesOf(c.bottleIds);
  const catCounts = new Map();
  for (const b of bottles) {
    const top = DB.categoryByPair.get(`${b.category}/`);
    if (top) catCounts.set(top, (catCounts.get(top) || 0) + 1);
  }

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/countries">Countries</a> <span class="sep">/</span> <span>${esc(c.name)}</span></div>

    <div class="producer-hero">
      <div>
        <h1>${c.flag} ${esc(c.name)}</h1>
        <div class="mt-2 prose"><p>${esc(c.description || '')}</p></div>
        <div class="chip-row mt-2">
          ${[...catCounts.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) =>
            `<a class="chip" href="#/browse?cat=${cat.category}&country=${c.id}">${cat.icon} ${esc(cat.name)} · ${n}</a>`).join('')}
        </div>
      </div>
      <div class="card map-card" id="cmap"></div>
    </div>

    ${regions.length ? `
    <section class="section">
      ${sectionHead('Regions & designations')}
      <div class="region-grid">${regions.map(regionCard).join('')}</div>
    </section>` : ''}

    ${producers.length ? `
    <section class="section">
      ${sectionHead(`Producers in ${esc(c.name)}`)}
      <div class="chip-row">
        ${producers.map(p => `<a class="chip" href="#/producer/${p.id}">🏭 ${esc(p.name)}</a>`).join('')}
      </div>
    </section>` : ''}

    <section class="section">
      ${sectionHead(`Bottles from ${esc(c.name)}`, `#/browse?country=${c.id}`, 'Filter in Browse')}
      ${bottleGrid(bottles)}
    </section>
  `;

  const mapEl = root.querySelector('#cmap');
  worldMapSVG({
    focus: c.iso3,
    label: `Map of ${c.name}`,
    highlight: new Map([[c.iso3, { label: c.name }]]),
    pins: producers.filter(p => p.lat != null).map(p => ({ lat: p.lat, lng: p.lng, label: p.name, href: `#/producer/${p.id}` })),
  }).then(svg => { mapEl.innerHTML = svg; bindMapNav(mapEl); });
}

export async function renderRegion(root, [id]) {
  const r = DB.regionById.get(id);
  if (!r) {
    root.innerHTML = `<div class="empty"><div class="e-icon">🧭</div><h3>Region not found</h3><a class="btn btn-primary" href="#/countries">All countries</a></div>`;
    return;
  }
  setTitle(r.name);
  const c = countryOf(r);
  const producers = r.producerIds.map(pid => DB.producerById.get(pid)).filter(Boolean);
  const bottles = bottlesOf(r.bottleIds);

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/countries">Countries</a> <span class="sep">/</span>
      ${c ? `<a href="#/country/${c.id}">${esc(c.name)}</a> <span class="sep">/</span>` : ''} <span>${esc(r.name)}</span></div>

    <h1>${c ? c.flag + ' ' : ''}${esc(r.name)}</h1>
    <div class="chip-row mt-1">
      ${r.protected ? `<span class="badge badge-accent">${esc(r.designation || 'Protected designation')}</span>` : ''}
    </div>
    <div class="prose mt-2"><p>${esc(r.description || '')}</p></div>

    ${producers.length ? `
    <section class="section">
      ${sectionHead('Producers here')}
      <div class="chip-row">${producers.map(p => `<a class="chip" href="#/producer/${p.id}">🏭 ${esc(p.name)}</a>`).join('')}</div>
    </section>` : ''}

    <section class="section">
      ${sectionHead(`Bottles from ${esc(r.name)}`)}
      ${bottleGrid(bottles, { emptyText: 'No bottles from this region yet.' })}
    </section>
  `;
}
