// DrinkCogs — pages/producers.js: producer directory + producer detail pages.

import { DB, bottlesOf, countryOf, regionOf, brandsOf, bottleName } from '../db.js';
import { esc, icon, num, setTitle, plural, debounce } from '../ui.js';
import { bottleSVG } from '../bottle-svg.js';
import { bottleGrid, sectionHead } from '../cards.js';
import { worldMapSVG, bindMapNav } from '../map.js';

const TYPE_LABEL = { distillery: 'Distillery', brewery: 'Brewery', winery: 'Winery', producer: 'Producer', blender: 'Blender', brand: 'Brand' };

export async function renderIndex(root) {
  setTitle('Distilleries & producers');
  const sorted = [...DB.producers].sort((a, b) => a.name.localeCompare(b.name));

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/explore">Explore</a> <span class="sep">/</span> Producers</div>
    <h1>Distilleries & producers</h1>
    <p class="muted mt-1">${plural(DB.producers.length, 'house')} behind the bottles — distilleries, breweries, wineries, blenders.</p>
    <div class="col-toolbar">
      <input class="input" id="pq" type="search" placeholder="Filter producers…" style="max-width:320px" aria-label="Filter producers">
      <select class="input" id="ptype" aria-label="Type">
        <option value="">All types</option>
        ${Object.entries(TYPE_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>
    <div id="plist"></div>
  `;

  const paint = () => {
    const q = root.querySelector('#pq').value.trim().toLowerCase();
    const t = root.querySelector('#ptype').value;
    const list = sorted.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q))
      && (!t || p.type === t));
    root.querySelector('#plist').innerHTML = list.length ? `
      <div class="country-grid">
        ${list.map(p => {
          const c = countryOf(p);
          const sig = bottlesOf(p.signatureBottleIds || p.bottleIds).slice(0, 1)[0];
          return `
          <a class="country-card" href="#/producer/${p.id}">
            <span class="cc-flag">${sig ? bottleSVG(sig, { h: 52, label: false }) : '🏭'}</span>
            <span>
              <span class="cc-name">${esc(p.name)}</span><br>
              <span class="cc-sub">${c ? c.flag + ' ' : ''}${esc(TYPE_LABEL[p.type] || p.type)} · ${plural(p.bottleIds.length, 'bottle')}</span>
            </span>
          </a>`;
        }).join('')}
      </div>` : `<div class="empty"><div class="e-icon">🏭</div><h3>No producers match</h3></div>`;
  };
  root.querySelector('#pq').addEventListener('input', debounce(paint, 120));
  root.querySelector('#ptype').addEventListener('change', paint);
  paint();
}

export async function renderOne(root, [id]) {
  const p = DB.producerById.get(id);
  if (!p) {
    root.innerHTML = `<div class="empty"><div class="e-icon">🫥</div><h3>Producer not found</h3><a class="btn btn-primary" href="#/producers">All producers</a></div>`;
    return;
  }
  setTitle(p.name);
  const c = countryOf(p);
  const r = regionOf(p);
  const bottles = bottlesOf(p.bottleIds);
  const sig = bottlesOf(p.signatureBottleIds || []);
  const siblings = p.parentCompany
    ? DB.producers.filter(x => x.parentCompany === p.parentCompany && x.id !== p.id)
    : [];

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/producers">Producers</a> <span class="sep">/</span> <span>${esc(p.name)}</span></div>

    <div class="producer-hero">
      <div>
        <h1>${esc(p.name)}</h1>
        <div class="producer-meta">
          <span class="badge badge-accent">${esc(TYPE_LABEL[p.type] || p.type)}</span>
          ${c ? `<a class="chip" href="#/country/${c.id}">${c.flag} ${esc(c.name)}</a>` : ''}
          ${r ? `<a class="chip" href="#/region/${r.id}">${icon('pin')} ${esc(r.name)}</a>` : ''}
          ${p.founded ? `<span class="chip chip-static">Founded ${p.founded}</span>` : ''}
        </div>
        <div class="mt-2 prose">
          <p>${esc(p.description || '')}</p>
        </div>
        <div class="infobox mt-2" style="max-width:460px">
          <div class="kv">
            ${p.location ? `<div class="k">Location</div><div class="v">${esc(p.location)}</div>` : ''}
            ${p.founded ? `<div class="k">Founded</div><div class="v">${p.founded}</div>` : ''}
            ${p.parentCompany ? `<div class="k">Parent company</div><div class="v">${esc(p.parentCompany)}</div>` : ''}
            ${p.masterDistiller ? `<div class="k">${p.type === 'brewery' ? 'Brewmaster' : p.type === 'winery' ? 'Winemaker' : 'Master distiller'}</div><div class="v">${esc(p.masterDistiller)}</div>` : ''}
            ${p.website ? `<div class="k">Website</div><div class="v"><a href="https://${esc(p.website)}" target="_blank" rel="noopener">${esc(p.website)} ${icon('external')}</a></div>` : ''}
            <div class="k">Bottles here</div><div class="v">${num(bottles.length)}</div>
          </div>
        </div>
      </div>
      <div class="card map-card" id="pmap" aria-label="Map"></div>
    </div>

    ${p.history ? `
    <section class="section">
      ${sectionHead('History')}
      <div class="card prose"><p>${esc(p.history)}</p></div>
    </section>` : ''}

    ${p.timeline?.length ? `
    <section class="section">
      ${sectionHead('Timeline')}
      <div class="card"><div class="tl">
        ${[...p.timeline].sort((a, z) => a.year - z.year).map(t => `
          <div class="tl-item"><div class="tl-year">${t.year}</div><div class="tl-event">${esc(t.event)}</div></div>`).join('')}
      </div></div>
    </section>` : ''}

    ${p.facts?.length ? `
    <section class="section">
      ${sectionHead('Facts')}
      <div class="facts">${p.facts.map(f => `<div class="fact">${icon('sparkle')}<span>${esc(f)}</span></div>`).join('')}</div>
    </section>` : ''}

    <section class="section">
      ${sectionHead('Family tree')}
      <div class="card">
        <div class="tree">
          <div class="tree-root">🏭 ${esc(p.name)} ${p.parentCompany ? `<span class="faint small">(${esc(p.parentCompany)})</span>` : ''}</div>
          ${[...brandsOf(p).entries()].map(([brand, bs]) => `
            <div class="tree-brand">
              <div class="tree-brand-name">${esc(brand)}</div>
              ${bs.map(b => `<a class="tree-leaf" href="#/bottle/${b.id}">${esc(bottleName(b))} <span class="faint small">${b.abv != null ? num(b.abv, 1) + '%' : ''}</span></a>`).join('')}
            </div>`).join('')}
        </div>
      </div>
    </section>

    ${sig.length ? `
    <section class="section">
      ${sectionHead('Signature bottles')}
      ${bottleGrid(sig)}
    </section>` : ''}

    <section class="section">
      ${sectionHead(`All bottles from ${esc(p.name)}`)}
      ${bottleGrid(bottles)}
    </section>

    ${siblings.length ? `
    <section class="section">
      ${sectionHead(`Also under ${esc(p.parentCompany)}`)}
      <div class="chip-row">
        ${siblings.map(s => `<a class="chip" href="#/producer/${s.id}">🏭 ${esc(s.name)}</a>`).join('')}
      </div>
    </section>` : ''}
  `;

  if (p.lat != null && p.lng != null) {
    const mapEl = root.querySelector('#pmap');
    worldMapSVG({
      focus: c?.iso3,
      label: `Map of ${p.name}`,
      highlight: c ? new Map([[c.iso3, { label: c.name, href: `#/country/${c.id}` }]]) : new Map(),
      pins: [{ lat: p.lat, lng: p.lng, label: `${p.name} — ${p.location || ''}` }],
    }).then(svg => { mapEl.innerHTML = svg + `<p class="small faint" style="padding:6px 8px 2px">${icon('pin')} ${esc(p.location || '')}</p>`; bindMapNav(mapEl); });
  } else {
    root.querySelector('#pmap').remove();
  }
}
