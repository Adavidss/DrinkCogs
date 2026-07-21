// DrinkCogs — pages/collection.js: personal collection (grid / list / virtual shelf).

import { DB, bottleName, producerOf, countryOf } from '../db.js';
import { esc, icon, num, setTitle, plural, toast, modal, debounce } from '../ui.js';
import { bottleSVG, shelfHeight } from '../bottle-svg.js';
import {bottleGrid, bottleList, pseudoFromSnapshot } from '../cards.js';
import * as store from '../store.js';

const SHELF_SORTS = [
  { id: 'name', label: 'Alphabetical' },
  { id: 'country', label: 'Country' },
  { id: 'age', label: 'Age' },
  { id: 'proof', label: 'Proof / ABV' },
  { id: 'price', label: 'Price' },
  { id: 'color', label: 'Color' },
  { id: 'height', label: 'Bottle height' },
  { id: 'category', label: 'Category' },
  { id: 'producer', label: 'Distillery' },
  { id: 'year', label: 'Year' },
  { id: 'recent', label: 'Recently added' },
];

function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}

function sortForShelf(bottles, sortId, entries) {
  const by = (fn, dir = 1) => (a, b) => {
    const x = fn(a), y = fn(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return x < y ? -dir : x > y ? dir : 0;
  };
  const l = [...bottles];
  switch (sortId) {
    case 'country': return l.sort(by(b => countryOf(b)?.name || ''));
    case 'age': return l.sort(by(b => b.ageYears ?? -1, -1));
    case 'proof': return l.sort(by(b => b.abv ?? -1, -1));
    case 'price': return l.sort(by(b => b.msrp ?? b.estValue ?? -1, -1));
    case 'color': return l.sort((a, b) => {
      const [ha, sa, la] = hexToHsl(a.color), [hb, sb, lb] = hexToHsl(b.color);
      return ha - hb || la - lb || sa - sb;
    });
    case 'height': return l.sort(by(b => shelfHeight(b), -1));
    case 'category': return l.sort(by(b => `${b.category}/${b.subcategory || ''}/${bottleName(b)}`));
    case 'producer': return l.sort(by(b => producerOf(b)?.name || ''));
    case 'year': return l.sort(by(b => b.vintage ?? b.releaseYear ?? -1, -1));
    case 'recent': return l.sort(by(b => entries.get(b.id)?.addedAt || '', -1));
    default: return l.sort(by(b => bottleName(b).toLowerCase()));
  }
}

let shelfResizeCleanup = null;

export async function render(root, [view], sp) {
  setTitle('My collection');
  let mode = view || 'grid';
  if (!['grid', 'list', 'shelf'].includes(mode)) mode = 'grid';
  let statusFilter = sp.get('status') || 'all';
  let q = '';
  let sort = sp.get('sort') || 'name';

  const paint = () => {
    const entries = new Map(store.allEntries().map(e => [e.id, e]));
    const counts = store.countByStatus();
    const all = [...entries.keys()].map(id =>
      DB.bottleById.get(id) || (store.isLiveId(id) && store.snapshotOf(id) ? pseudoFromSnapshot(id, store.snapshotOf(id)) : null)
    ).filter(Boolean);
    let bottles = statusFilter === 'all' ? all : all.filter(b => store.hasStatus(b.id, statusFilter));
    if (q) {
      const qq = q.toLowerCase();
      bottles = bottles.filter(b => b.name.toLowerCase().includes(qq) || (b.brand || '').toLowerCase().includes(qq));
    }
    bottles = sortForShelf(bottles, sort, entries);

    root.innerHTML = `
      <div class="breadcrumb no-print"><a href="#/">Home</a> <span class="sep">/</span> Collection</div>
      <div class="flex spread flex-wrap">
        <div>
          <h1>My collection</h1>
          <p class="muted mt-1">${plural(entries.size, 'bottle')} tracked · stored only in this browser.
            <a href="#/dashboard">View dashboard ${icon('arrowR')}</a></p>
        </div>
        <div class="tabbar no-print" role="group" aria-label="View">
          <a href="#/collection" class="${mode === 'grid' ? 'on' : ''}">${icon('grid')} Grid</a>
          <a href="#/collection/list" class="${mode === 'list' ? 'on' : ''}">${icon('list')} List</a>
          <a href="#/collection/shelf" class="${mode === 'shelf' ? 'on' : ''}">🥃 Shelf</a>
        </div>
      </div>

      <div class="chip-row mt-2 no-print" id="statusChips">
        <button class="chip ${statusFilter === 'all' ? 'chip-on' : ''}" data-status="all">All <span class="faint">${entries.size}</span></button>
        ${store.STATUSES.map(s => `
          <button class="chip ${statusFilter === s.id ? 'chip-on' : ''}" data-status="${s.id}">${icon(s.icon)} ${s.label} <span class="faint">${counts[s.id]}</span></button>`).join('')}
      </div>

      <div class="col-toolbar no-print">
        <input class="input" id="cq" type="search" placeholder="Search my bottles…" value="${esc(q)}" style="max-width:260px" aria-label="Search collection">
        <select class="input" id="csort" aria-label="Sort">
          ${SHELF_SORTS.map(s => `<option value="${s.id}" ${s.id === sort ? 'selected' : ''}>Sort: ${s.label}</option>`).join('')}
        </select>
        <span class="spacer"></span>
        <button class="btn btn-sm" id="exportJson">${icon('download')} JSON</button>
        <button class="btn btn-sm" id="exportCsv">${icon('download')} CSV</button>
        <button class="btn btn-sm" id="importBtn">${icon('upload')} Import</button>
        <button class="btn btn-sm" id="printBtn">${icon('printer')} Print</button>
        ${entries.size ? `<button class="btn btn-sm btn-danger" id="clearBtn">${icon('trash')} Clear</button>` : ''}
      </div>

      <div id="colBody" class="mt-2"></div>
    `;

    const body = root.querySelector('#colBody');
    if (!entries.size) {
      body.innerHTML = `
        <div class="empty">
          <div class="e-icon">🥃📚</div>
          <h3>Your shelf is empty</h3>
          <p>Browse the encyclopedia and mark bottles as owned, opened or wishlisted — or load a sample collection to see what DrinkCogs can do.</p>
          <div class="flex" style="justify-content:center;gap:10px">
            <a class="btn btn-primary" href="#/browse">${icon('search')} Browse bottles</a>
            <button class="btn" id="loadSample">${icon('sparkle')} Load sample collection</button>
          </div>
        </div>`;
      root.querySelector('#loadSample')?.addEventListener('click', () => { loadSampleCollection(); });
    } else if (!bottles.length) {
      body.innerHTML = `<div class="empty"><div class="e-icon">🫙</div><h3>No bottles match</h3><p>Try a different status or search.</p></div>`;
    } else if (mode === 'grid') {
      body.innerHTML = bottleGrid(bottles);
    } else if (mode === 'list') {
      body.innerHTML = bottleList(bottles);
    } else {
      renderShelf(body, bottles);
    }

    /* wiring */
    root.querySelectorAll('#statusChips [data-status]').forEach(b =>
      b.addEventListener('click', () => { statusFilter = b.dataset.status; paint(); }));
    root.querySelector('#cq').addEventListener('input', debounce(e => { q = e.target.value.trim(); paint(); }, 150));
    root.querySelector('#csort').addEventListener('change', e => { sort = e.target.value; paint(); });
    root.querySelector('#exportJson').addEventListener('click', () => downloadFile('drinkcogs-collection.json', store.exportJSON(), 'application/json'));
    root.querySelector('#exportCsv').addEventListener('click', () => downloadFile('drinkcogs-collection.csv', store.exportCSV(id => DB.bottleById.get(id) || (store.snapshotOf(id) ? pseudoFromSnapshot(id, store.snapshotOf(id)) : null)), 'text/csv'));
    root.querySelector('#importBtn').addEventListener('click', importFlow);
    root.querySelector('#printBtn').addEventListener('click', () => window.print());
    root.querySelector('#clearBtn')?.addEventListener('click', clearFlow);
  };

  function renderShelf(body, bottles) {
    body.innerHTML = `<div class="card" style="padding:10px 4px 4px"><div class="shelf" id="shelfEl"></div></div>
      <p class="small faint mt-1">Opened bottles show a lower fill. Heights reflect bottle size. Hover a bottle for details.</p>`;
    const shelfEl = body.querySelector('#shelfEl');
    const pack = () => {
      shelfEl.innerHTML = '';
      const maxW = shelfEl.clientWidth - 36 || 800;
      let row = [], rowW = 0;
      const rows = [];
      for (const b of bottles) {
        const h = shelfHeight(b, 155);
        const w = Math.round(h * (100 / 260)) + 4;
        if (rowW + w > maxW && row.length) { rows.push(row); row = []; rowW = 0; }
        row.push(b); rowW += w;
      }
      if (row.length) rows.push(row);
      for (const r of rows) {
        const rowEl = document.createElement('div');
        rowEl.className = 'shelf-row';
        rowEl.innerHTML = r.map(b => {
          const opened = store.hasStatus(b.id, 'opened');
          const finished = store.hasStatus(b.id, 'finished');
          const fill = finished ? 0.06 : opened ? 0.55 : 0.88;
          return `<a class="shelf-bottle" href="#/bottle/${b.id}" title="${esc(b.name)}${b.abv != null ? ` · ${num(b.abv, 1)}%` : ''}">
            ${bottleSVG(b, { h: shelfHeight(b, 155), fill })}
          </a>`;
        }).join('');
        shelfEl.appendChild(rowEl);
        const board = document.createElement('div');
        board.className = 'shelf-board';
        shelfEl.appendChild(board);
      }
    };
    pack();
    shelfResizeCleanup?.();
    const onResize = debounce(pack, 180);
    window.addEventListener('resize', onResize);
    shelfResizeCleanup = () => window.removeEventListener('resize', onResize);
    cleanupFns.push(() => { shelfResizeCleanup?.(); shelfResizeCleanup = null; });
  }

  function importFlow() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const n = store.importJSON(String(reader.result));
          toast(`Imported ${n} bottles`);
          paint();
        } catch (e) { toast('Import failed: ' + e.message); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function clearFlow() {
    const m = modal(`
      <h3>Clear collection?</h3>
      <p class="muted">This deletes all statuses and personal notes stored in this browser. Consider exporting a JSON backup first.</p>
      <div class="flex mt-2" style="justify-content:flex-end">
        <button class="btn" id="mCancel">Cancel</button>
        <button class="btn btn-danger" id="mClear">${icon('trash')} Clear everything</button>
      </div>`);
    m.root.querySelector('#mCancel').addEventListener('click', m.close);
    m.root.querySelector('#mClear').addEventListener('click', () => { store.clearAll(); m.close(); toast('Collection cleared'); paint(); });
  }

  function loadSampleCollection() {
    const wanted = {
      'buffalo-trace': { statuses: ['owned', 'opened'], notes: { purchasePlace: 'Local liquor store', purchasePrice: 29, purchaseDate: '2026-03-14', openedDate: '2026-03-20', rating: 84, wouldBuyAgain: true, tastingNotes: 'Easy caramel-vanilla sipper; great in an Old Fashioned.' } },
      'lagavulin-16': { statuses: ['owned', 'favorite'], notes: { purchasePlace: 'Duty free, Keflavík', purchasePrice: 89, purchaseDate: '2026-01-05', rating: 93, memories: 'Birthday bottle — first proper Islay.' } },
      'redbreast-12': { statuses: ['owned', 'opened'], notes: { purchasePrice: 65, purchaseDate: '2026-02-11', openedDate: '2026-03-17', rating: 90, wouldBuyAgain: true } },
      'hendricks': { statuses: ['owned'], notes: { purchasePrice: 35, purchaseDate: '2026-05-02' } },
      'del-maguey-vida': { statuses: ['owned', 'opened'], notes: { purchasePrice: 42, rating: 86, tastingNotes: 'Smoky but friendly; house Oaxaca old fashioneds.' } },
      'veuve-clicquot-yellow-label': { statuses: ['finished', 'previously-owned'], notes: { purchasePrice: 60, finishedDate: '2026-01-01', memories: 'New Year’s Eve.' } },
      'guinness-draught': { statuses: ['sampled'], notes: { rating: 80 } },
      'dassai-23': { statuses: ['owned'], notes: { purchasePlace: 'Gift', memories: 'Gift from Tokyo trip.' } },
      'campari': { statuses: ['owned', 'opened'], notes: { purchasePrice: 28 } },
      'eagle-rare-10': { statuses: ['wishlist'], notes: {} },
      'yamazaki-12': { statuses: ['wishlist'], notes: {} },
      'george-t-stagg': { statuses: ['wishlist'], notes: {} },
      'fortaleza-blanco': { statuses: ['owned', 'favorite'], notes: { purchasePrice: 58, rating: 92, wouldBuyAgain: true } },
      'chateau-margaux-2015': { statuses: ['sampled'], notes: { memories: 'One glass at a wedding. Unforgettable.' } },
    };
    const sample = {};
    const now = new Date().toISOString();
    for (const [id, e] of Object.entries(wanted)) {
      if (DB.bottleById.has(id)) sample[id] = { ...e, addedAt: now, updatedAt: now };
    }
    store.loadSample(sample);
    toast(`Sample collection loaded (${Object.keys(sample).length} bottles) — clear it anytime`);
    paint();
  }

  const cleanupFns = [];
  paint();

  const onChange = () => paint();
  window.addEventListener('dc:collection', onChange);
  cleanupFns.push(() => window.removeEventListener('dc:collection', onChange));
  return () => cleanupFns.forEach(fn => fn());
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Exported ${name}`);
}
