// DrinkCogs — pages/browse.js: search + Discogs-style faceted filtering.

import { DB, childrenOf } from '../db.js';
import { esc, icon, num, setTitle, debounce, buildQuery, plural } from '../ui.js';
import { searchBottles, applyFilters, parseFilters, filtersToQuery, sortBottles, SORTS, EMPTY_FILTERS } from '../search.js';
import { bottleGrid, bottleList, liveCard } from '../cards.js';
import { searchLive } from '../live.js';

export async function render(root, _params, sp) {
  setTitle('Browse');
  let f = parseFilters(sp);
  let sort = sp.get('sort') || 'relevance';
  let viewMode = sp.get('view') || 'grid';

  const topCats = DB.categories.filter(c => !c.parentId);
  const countryCounts = new Map(DB.countries.map(c => [c.id, c.bottleIds.length]));

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> Browse</div>
    <div class="browse-layout">
      <aside class="facets no-print" id="facets" aria-label="Filters">
        <div class="facet">
          <h4>Search</h4>
          <input class="input" id="fq" type="search" placeholder="Name, brand, region…" value="${esc(f.q)}">
        </div>
        <div class="facet">
          <h4>Category</h4>
          <div class="facet-body" id="fcats">
            ${topCats.map(c => {
              const subs = childrenOf(c);
              const catVal = c.category;
              return `
                <label class="check"><input type="checkbox" data-cat="${catVal}" ${f.cats.includes(catVal) ? 'checked' : ''}>
                  ${c.icon} ${esc(c.name)} <span class="n">${num(DB.bottles.filter(b => b.category === c.category).length)}</span></label>
                ${subs.map(s => `
                  <label class="check facet-sub"><input type="checkbox" data-cat="${s.category}/${s.subcategory}" ${f.cats.includes(`${s.category}/${s.subcategory}`) ? 'checked' : ''}>
                    ${esc(s.name)} <span class="n">${num(DB.bottles.filter(b => b.category === s.category && b.subcategory === s.subcategory).length)}</span></label>`).join('')}
              `;
            }).join('')}
          </div>
        </div>
        <div class="facet">
          <h4>Country</h4>
          <div class="facet-body">
            ${[...DB.countries].sort((a, b) => countryCounts.get(b.id) - countryCounts.get(a.id)).map(c => `
              <label class="check"><input type="checkbox" data-country="${c.id}" ${f.countries.includes(c.id) ? 'checked' : ''}>
                ${c.flag} ${esc(c.name)} <span class="n">${num(countryCounts.get(c.id))}</span></label>`).join('')}
          </div>
        </div>
        <div class="facet">
          <h4>ABV %</h4>
          <div class="range-pair">
            <input class="input" id="fabvMin" type="number" min="0" max="80" step="0.5" placeholder="Min" value="${f.abvMin ?? ''}">
            <span class="sep">–</span>
            <input class="input" id="fabvMax" type="number" min="0" max="80" step="0.5" placeholder="Max" value="${f.abvMax ?? ''}">
          </div>
        </div>
        <div class="facet">
          <h4>Age (years)</h4>
          <div class="range-pair">
            <input class="input" id="fageMin" type="number" min="0" max="50" placeholder="Min" value="${f.ageMin ?? ''}">
            <span class="sep">–</span>
            <input class="input" id="fageMax" type="number" min="0" max="50" placeholder="Max" value="${f.ageMax ?? ''}">
          </div>
        </div>
        <div class="facet">
          <h4>Price (MSRP $)</h4>
          <div class="range-pair">
            <input class="input" id="fpriceMin" type="number" min="0" placeholder="Min" value="${f.priceMin ?? ''}">
            <span class="sep">–</span>
            <input class="input" id="fpriceMax" type="number" min="0" placeholder="Max" value="${f.priceMax ?? ''}">
          </div>
        </div>
        <div class="facet">
          <h4>Flavor emphasis</h4>
          <select class="input" id="fflavor">
            <option value="">Any flavor</option>
            ${DB.flavors.map(fl => `<option value="${fl.id}" ${f.flavorDim === fl.id ? 'selected' : ''}>${esc(fl.label)} ≥ 6</option>`).join('')}
          </select>
        </div>
        <div class="facet">
          <h4>Style</h4>
          <select class="input" id="fstyle">
            <option value="">Any style</option>
            ${DB.styles.map(s => `<option value="${esc(s.name)}" ${f.style === s.name ? 'selected' : ''}>${esc(s.name)} (${s.count})</option>`).join('')}
          </select>
        </div>
        <div class="facet">
          <h4>Availability</h4>
          <div class="facet-body">
            ${['widely-available', 'seasonal', 'allocated', 'limited', 'rare', 'discontinued'].map(a => `
              <label class="check"><input type="checkbox" data-avail="${a}" ${f.availability.includes(a) ? 'checked' : ''}>
                ${esc(a.replace(/-/g, ' '))}</label>`).join('')}
          </div>
        </div>
        <div class="facet">
          <h4>Flags</h4>
          <label class="check"><input type="checkbox" id="flimited" ${f.limited ? 'checked' : ''}> Limited releases</label>
          <label class="check"><input type="checkbox" id="fdiscontinued" ${f.discontinued ? 'checked' : ''}> Discontinued</label>
          <label class="check"><input type="checkbox" id="fvintage" ${f.vintageOnly ? 'checked' : ''}> Vintage-dated</label>
          <label class="check"><input type="checkbox" id="ffeatured" ${f.featured ? 'checked' : ''}> Featured</label>
        </div>
        <button class="btn btn-ghost btn-sm" id="fclear">${icon('x')} Clear all filters</button>
      </aside>

      <div>
        <div class="browse-head">
          <span class="browse-count" id="resultCount" role="status"></span>
          <div class="browse-controls">
            <select class="input" id="sortSel" aria-label="Sort results">
              ${SORTS.map(s => `<option value="${s.id}" ${s.id === sort ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
            </select>
            <div class="tabbar" role="group" aria-label="View">
              <button id="viewGrid" class="${viewMode === 'grid' ? 'on' : ''}" aria-label="Grid view">${icon('grid')}</button>
              <button id="viewList" class="${viewMode === 'list' ? 'on' : ''}" aria-label="List view">${icon('list')}</button>
            </div>
          </div>
        </div>
        <div class="active-filters chip-row" id="activeChips"></div>
        <div id="results" aria-live="polite"></div>

        <div id="liveBlock" class="section" hidden>
          <div class="section-head">
            <h2>From the open drinks database</h2>
            <span class="small faint nowrap">live · <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a></span>
          </div>
          <div id="liveResults" aria-live="polite"></div>
        </div>
      </div>
    </div>
  `;

  const $ = sel => root.querySelector(sel);

  function currentResults() {
    let list = f.q ? searchBottles(f.q) : [...DB.bottles];
    list = applyFilters(list, f);
    return sortBottles(list, sort === 'relevance' && !f.q ? 'name' : sort);
  }

  function activeChipsHTML() {
    const chips = [];
    const chip = (label, key, val) => chips.push(`<button class="chip chip-on" data-clear-key="${key}" data-clear-val="${esc(val ?? '')}">${esc(label)} <span class="x">✕</span></button>`);
    if (f.q) chip(`“${f.q}”`, 'q');
    for (const c of f.cats) chip(DB.categoryByPair.get(c.includes('/') ? c.replace('/', '/') : `${c}/`)?.name || c, 'cat', c);
    for (const c of f.countries) chip(DB.countryById.get(c)?.name || c, 'country', c);
    for (const a of f.availability) chip(a.replace(/-/g, ' '), 'avail', a);
    if (f.style) chip(f.style, 'style');
    if (f.flavorDim) chip(`${DB.flavorById.get(f.flavorDim)?.label || f.flavorDim} ≥ ${f.flavorMin}`, 'flavor');
    if (f.abvMin != null || f.abvMax != null) chip(`ABV ${f.abvMin ?? 0}–${f.abvMax ?? '∞'}%`, 'abv');
    if (f.ageMin != null || f.ageMax != null) chip(`Age ${f.ageMin ?? 0}–${f.ageMax ?? '∞'} yr`, 'age');
    if (f.priceMin != null || f.priceMax != null) chip(`$${f.priceMin ?? 0}–${f.priceMax ?? '∞'}`, 'price');
    if (f.limited) chip('Limited', 'limited');
    if (f.discontinued) chip('Discontinued', 'discontinued');
    if (f.vintageOnly) chip('Vintage', 'vintage');
    if (f.featured) chip('Featured', 'featured');
    if (f.producer) chip(DB.producerById.get(f.producer)?.name || f.producer, 'producer');
    if (f.cocktail) chip(`Cocktail: ${DB.cocktailById.get(f.cocktail)?.name || f.cocktail}`, 'cocktailF');
    return chips.join('');
  }

  function syncURL() {
    const q = buildQuery({ ...filtersToQuery(f), sort: sort !== 'relevance' ? sort : '', view: viewMode !== 'grid' ? viewMode : '' });
    history.replaceState(null, '', '#/browse' + q);
  }

  /* Live open-database search: fires alongside local results for any query. */
  let liveSeq = 0;
  const paintLive = debounce(async () => {
    const block = $('#liveBlock'), out = $('#liveResults');
    if (!block) return;
    const q = f.q;
    if (!q || q.length < 3) { block.hidden = true; return; }
    const seq = ++liveSeq;
    block.hidden = false;
    out.innerHTML = `<p class="muted small">Searching the whole drinks internet for “${esc(q)}”…</p>`;
    try {
      const hits = await searchLive(q, { limit: 18 });
      if (seq !== liveSeq || f.q !== q) return; // stale response
      out.innerHTML = hits.length
        ? `<div class="grid-bottles">${hits.map(liveCard).join('')}</div>
           <p class="small faint mt-1">Community-submitted products — open any result for details, links and saving. Photos and data quality vary.</p>`
        : `<p class="muted small">Nothing in the open database for “${esc(q)}” — try fewer words or the brand name alone.</p>`;
    } catch {
      if (seq !== liveSeq) return;
      out.innerHTML = `<p class="muted small">The open database didn't answer (offline or busy). Your curated results above still work.</p>`;
    }
  }, 450);

  function paint() {
    const list = currentResults();
    $('#resultCount').textContent = plural(list.length, 'bottle');
    $('#activeChips').innerHTML = activeChipsHTML();
    $('#results').innerHTML = viewMode === 'grid'
      ? bottleGrid(list, { emptyText: 'Try loosening a filter or two.' })
      : bottleList(list);
    paintLive();
    syncURL();
  }

  /* facet wiring */
  $('#fq').addEventListener('input', debounce(e => { f.q = e.target.value.trim(); paint(); }, 140));
  root.querySelectorAll('[data-cat]').forEach(cb => cb.addEventListener('change', () => {
    f.cats = [...root.querySelectorAll('[data-cat]:checked')].map(x => x.dataset.cat);
    paint();
  }));
  root.querySelectorAll('[data-country]').forEach(cb => cb.addEventListener('change', () => {
    f.countries = [...root.querySelectorAll('[data-country]:checked')].map(x => x.dataset.country);
    paint();
  }));
  root.querySelectorAll('[data-avail]').forEach(cb => cb.addEventListener('change', () => {
    f.availability = [...root.querySelectorAll('[data-avail]:checked')].map(x => x.dataset.avail);
    paint();
  }));
  const numField = (id, key) => $(id).addEventListener('input', debounce(e => {
    f[key] = e.target.value === '' ? null : Number(e.target.value); paint();
  }, 250));
  numField('#fabvMin', 'abvMin'); numField('#fabvMax', 'abvMax');
  numField('#fageMin', 'ageMin'); numField('#fageMax', 'ageMax');
  numField('#fpriceMin', 'priceMin'); numField('#fpriceMax', 'priceMax');
  $('#fflavor').addEventListener('change', e => { f.flavorDim = e.target.value; f.flavorMin = 6; paint(); });
  $('#fstyle').addEventListener('change', e => { f.style = e.target.value; paint(); });
  $('#flimited').addEventListener('change', e => { f.limited = e.target.checked; paint(); });
  $('#fdiscontinued').addEventListener('change', e => { f.discontinued = e.target.checked; paint(); });
  $('#fvintage').addEventListener('change', e => { f.vintageOnly = e.target.checked; paint(); });
  $('#ffeatured').addEventListener('change', e => { f.featured = e.target.checked; paint(); });
  $('#sortSel').addEventListener('change', e => { sort = e.target.value; paint(); });
  $('#viewGrid').addEventListener('click', () => { viewMode = 'grid'; $('#viewGrid').classList.add('on'); $('#viewList').classList.remove('on'); paint(); });
  $('#viewList').addEventListener('click', () => { viewMode = 'list'; $('#viewList').classList.add('on'); $('#viewGrid').classList.remove('on'); paint(); });
  $('#fclear').addEventListener('click', () => {
    f = structuredClone(EMPTY_FILTERS);
    sort = 'relevance';
    render(root, _params, new URLSearchParams());
  });

  $('#activeChips').addEventListener('click', e => {
    const c = e.target.closest('[data-clear-key]');
    if (!c) return;
    const { clearKey, clearVal } = c.dataset;
    const drop = (arr, v) => arr.filter(x => x !== v);
    if (clearKey === 'q') { f.q = ''; $('#fq').value = ''; }
    else if (clearKey === 'cat') { f.cats = drop(f.cats, clearVal); root.querySelector(`[data-cat="${CSS.escape(clearVal)}"]`).checked = false; }
    else if (clearKey === 'country') { f.countries = drop(f.countries, clearVal); root.querySelector(`[data-country="${CSS.escape(clearVal)}"]`).checked = false; }
    else if (clearKey === 'avail') { f.availability = drop(f.availability, clearVal); root.querySelector(`[data-avail="${CSS.escape(clearVal)}"]`).checked = false; }
    else if (clearKey === 'style') { f.style = ''; $('#fstyle').value = ''; }
    else if (clearKey === 'flavor') { f.flavorDim = ''; $('#fflavor').value = ''; }
    else if (clearKey === 'abv') { f.abvMin = f.abvMax = null; $('#fabvMin').value = ''; $('#fabvMax').value = ''; }
    else if (clearKey === 'age') { f.ageMin = f.ageMax = null; $('#fageMin').value = ''; $('#fageMax').value = ''; }
    else if (clearKey === 'price') { f.priceMin = f.priceMax = null; $('#fpriceMin').value = ''; $('#fpriceMax').value = ''; }
    else if (clearKey === 'limited') { f.limited = false; $('#flimited').checked = false; }
    else if (clearKey === 'discontinued') { f.discontinued = false; $('#fdiscontinued').checked = false; }
    else if (clearKey === 'vintage') { f.vintageOnly = false; $('#fvintage').checked = false; }
    else if (clearKey === 'featured') { f.featured = false; $('#ffeatured').checked = false; }
    else if (clearKey === 'producer') { f.producer = ''; }
    else if (clearKey === 'cocktailF') { f.cocktail = ''; }
    paint();
  });

  paint();
}
