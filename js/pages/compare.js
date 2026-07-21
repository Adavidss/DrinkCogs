// DrinkCogs — pages/compare.js: side-by-side bottle comparison.

import { DB, bottleName, producerOf, countryOf, regionOf, catLabelOf } from '../db.js';
import { esc, icon, money, num, sizeText, setTitle, debounce, AVAILABILITY } from '../ui.js';
import { bottleSVG } from '../bottle-svg.js';
import { radarSVG, radarAxesFor } from '../charts.js';
import { searchBottles } from '../search.js';
import * as store from '../store.js';

const yn = v => (v ? 'Yes' : 'No');

const ROWS = [
  { group: 'Overview' },
  { label: 'Category', get: b => esc(catLabelOf(b)) },
  { label: 'Style', get: b => esc(b.style || '—') },
  { label: 'Country', get: b => { const c = countryOf(b); return c ? `${c.flag} ${esc(c.name)}` : '—'; } },
  { label: 'Region', get: b => esc(regionOf(b)?.name || '—') },
  { label: 'Producer', get: b => { const p = producerOf(b); return p ? `<a href="#/producer/${p.id}">${esc(p.name)}</a>` : '—'; }, val: b => producerOf(b)?.name },
  { group: 'Numbers' },
  { label: 'ABV', get: b => (b.abv != null ? num(b.abv, 1) + '%' : '—'), val: b => b.abv, best: 'max' },
  { label: 'Proof', get: b => (b.proof != null ? num(b.proof, 1) : '—'), val: b => b.proof },
  { label: 'Age', get: b => (b.ageYears != null ? num(b.ageYears) + ' yr' : esc(b.ageStatement || '—')), val: b => b.ageYears, best: 'max' },
  { label: 'Vintage', get: b => (b.vintage ?? '—'), val: b => b.vintage },
  { label: 'Bottle size', get: b => sizeText(b.sizeMl), val: b => b.sizeMl },
  { label: 'MSRP', get: b => money(b.msrp), val: b => b.msrp, best: 'min' },
  { label: 'Est. replacement', get: b => money(b.estValue), val: b => b.estValue },
  { label: '$ per liter (MSRP)', get: b => (b.msrp != null && b.sizeMl ? money(b.msrp / (b.sizeMl / 1000)) : '—'), val: b => (b.msrp != null && b.sizeMl ? b.msrp / b.sizeMl : null), best: 'min' },
  { group: 'Status' },
  { label: 'Availability', get: b => esc(AVAILABILITY[b.availability]?.label || b.availability || '—') },
  { label: 'Limited edition', get: b => yn(b.limited) },
  { label: 'Discontinued', get: b => yn(b.discontinued) },
  { label: 'First released', get: b => (b.releaseYear ?? '—'), val: b => b.releaseYear },
  { group: 'Cask & making' },
  { label: 'Barrel', get: b => esc(b.barrel || '—') },
  { label: 'Cask finish', get: b => esc(b.finishCask || 'None') },
  { label: 'Filtration', get: b => esc(b.filtration || '—') },
  { label: 'Coloring', get: b => esc(b.coloring || '—') },
  { group: 'Serving' },
  { label: 'Glassware', get: b => esc((b.glassware || []).join(', ') || '—') },
  { label: 'Temperature', get: b => esc(b.servingTemp || '—') },
  { label: 'Awards listed', get: b => num((b.awards || []).length), val: b => (b.awards || []).length },
];

export async function render(root, _params, sp) {
  setTitle('Compare');
  let ids = (sp.get('ids') || '').split(',').filter(id => DB.bottleById.has(id));
  if (!ids.length) ids = store.compareList().filter(id => DB.bottleById.has(id));
  ids = ids.slice(0, 4);
  let diffOnly = false;

  const paint = () => {
    const bottles = ids.map(id => DB.bottleById.get(id));
    history.replaceState(null, '', ids.length ? `#/compare?ids=${ids.join(',')}` : '#/compare');

    if (!bottles.length) {
      root.innerHTML = `
        <h1>Compare bottles</h1>
        <div class="empty mt-3">
          <div class="e-icon">⚖️</div>
          <h3>Nothing to compare yet</h3>
          <p>Add up to four bottles with the ${icon('compare')} button on any bottle card or page — or search below.</p>
          <div style="max-width:380px;margin:0 auto">${searchBox()}</div>
        </div>`;
      wireSearch();
      return;
    }

    const flavorValues = bottles.map(b => b.flavor);
    const axes = radarAxesFor(DB.flavors, flavorValues);
    const colors = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)'];

    const rowsHTML = ROWS.map(r => {
      if (r.group) return `<tr class="rowgroup"><th colspan="${bottles.length + 1}">${r.group}</th></tr>`;
      const displays = bottles.map(b => r.get(b));
      const vals = bottles.map(b => (r.val ? r.val(b) : displays[bottles.indexOf(b)]));
      const differs = new Set(displays.map(String)).size > 1;
      if (diffOnly && !differs && bottles.length > 1) return '';
      let bestIdx = -1;
      if (r.best && bottles.length > 1) {
        const numeric = vals.map(v => (typeof v === 'number' ? v : null));
        const candidates = numeric.filter(v => v != null);
        if (candidates.length > 1) {
          const target = r.best === 'max' ? Math.max(...candidates) : Math.min(...candidates);
          bestIdx = numeric.indexOf(target);
        }
      }
      return `<tr class="${differs ? 'differs' : ''}">
        <th scope="row">${r.label}</th>
        ${displays.map((d, i) => `<td class="${i === bestIdx ? 'best' : ''}">${d}</td>`).join('')}
      </tr>`;
    }).join('');

    root.innerHTML = `
      <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> Compare</div>
      <div class="flex spread flex-wrap">
        <h1>Compare bottles</h1>
        <label class="check no-print"><input type="checkbox" id="diffOnly" ${diffOnly ? 'checked' : ''}> Differences only</label>
      </div>

      <div class="card mt-2" style="overflow:visible">
        <div class="flex flex-wrap" style="gap:16px">
          <div style="flex:1;min-width:260px" class="radar-wrap">
            ${radarSVG(axes, bottles.map((b, i) => ({ name: bottleName(b), color: colors[i], values: b.flavor })), { size: 320 })}
          </div>
          <div style="flex:1;min-width:220px">
            <ul class="legend">
              ${bottles.map((b, i) => `<li><i style="background:${colors[i]}"></i> <a href="#/bottle/${b.id}">${esc(bottleName(b))}</a></li>`).join('')}
            </ul>
            <p class="small faint mt-2">Radar shows the ${axes.length} most differentiating flavor dimensions across the selection.</p>
            ${ids.length < 4 ? `<div class="mt-2 no-print">${searchBox()}</div>` : ''}
          </div>
        </div>
      </div>

      <div class="compare-scroll mt-3">
        <table class="compare-table">
          <thead>
            <tr>
              <th></th>
              ${bottles.map(b => `
                <th>
                  <div class="compare-col-head">
                    <div class="c-fig">${bottleSVG(b, { h: 90, label: false })}</div>
                    <a href="#/bottle/${b.id}">${esc(bottleName(b))}</a>
                    <button class="btn btn-ghost btn-sm no-print" data-remove="${b.id}">${icon('x')} Remove</button>
                  </div>
                </th>`).join('')}
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
      <p class="small faint mt-1">Rows with an accent edge differ between bottles. Green marks the best value where “best” makes sense (lowest price, highest age…).</p>
    `;

    root.querySelector('#diffOnly')?.addEventListener('change', e => { diffOnly = e.target.checked; paint(); });
    root.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      ids = ids.filter(id => id !== b.dataset.remove);
      if (store.inCompare(b.dataset.remove)) store.toggleCompare(b.dataset.remove);
      paint();
    }));
    wireSearch();
  };

  function searchBox() {
    return `
      <div class="headsearch" style="max-width:100%">
        <span class="headsearch-icon">${icon('search')}</span>
        <input id="cmpSearch" type="search" placeholder="Add a bottle to compare…" aria-label="Add a bottle to compare" autocomplete="off">
        <div id="cmpSuggest" class="suggest" hidden></div>
      </div>`;
  }

  function wireSearch() {
    const inp = root.querySelector('#cmpSearch');
    const sug = root.querySelector('#cmpSuggest');
    if (!inp) return;
    const go = debounce(() => {
      const q = inp.value.trim();
      if (!q) { sug.hidden = true; return; }
      const found = searchBottles(q, 6).filter(b => !ids.includes(b.id));
      sug.innerHTML = found.map(b => `
        <button class="suggest-item" data-add="${b.id}">
          <span class="s-fig">${bottleSVG(b, { h: 38, label: false })}</span>
          <span><span class="s-name">${esc(bottleName(b))}</span><br><span class="s-sub">${esc(catLabelOf(b))}</span></span>
        </button>`).join('') || `<div class="suggest-group">No matches</div>`;
      sug.hidden = false;
      sug.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => {
        if (ids.length < 4) {
          ids.push(btn.dataset.add);
          if (!store.inCompare(btn.dataset.add)) store.toggleCompare(btn.dataset.add);
        }
        paint();
      }));
    }, 120);
    inp.addEventListener('input', go);
  }

  paint();
}
