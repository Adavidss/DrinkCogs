// DrinkCogs — app.js: boot, hash router, header (search / theme / random / compare tray).

import { loadDB, DB, randomBottle, bottleName, catLabelOf, flagOf } from './db.js';
import * as store from './store.js';
import { icon, brandSVG, el, esc, toast, debounce } from './ui.js';
import { buildIndex, searchAll } from './search.js';
import { bottleSVG } from './bottle-svg.js';

import * as home from './pages/home.js';
import * as browse from './pages/browse.js';
import * as bottle from './pages/bottle.js';
import * as producers from './pages/producers.js';
import * as places from './pages/places.js';
import * as category from './pages/category.js';
import * as explore from './pages/explore.js';
import * as flavors from './pages/flavors.js';
import * as cocktails from './pages/cocktails.js';
import * as collection from './pages/collection.js';
import * as dashboard from './pages/dashboard.js';
import * as compare from './pages/compare.js';
import * as about from './pages/about.js';

const view = document.getElementById('view');

/* ---------- routes ---------- */

const ROUTES = [
  [/^$/, home.render, 'home'],
  [/^browse$/, browse.render, 'browse'],
  [/^bottle\/([\w-]+)$/, bottle.render, 'browse'],
  [/^producers$/, producers.renderIndex, 'explore'],
  [/^producer\/([\w-]+)$/, producers.renderOne, 'explore'],
  [/^countries$/, places.renderIndex, 'explore'],
  [/^country\/([\w-]+)$/, places.renderOne, 'explore'],
  [/^region\/([\w-]+)$/, places.renderRegion, 'explore'],
  [/^category\/([\w-]+)$/, category.render, 'explore'],
  [/^explore$/, explore.render, 'explore'],
  [/^flavors$/, flavors.renderIndex, 'explore'],
  [/^flavor\/([\w-]+)$/, flavors.renderOne, 'explore'],
  [/^cocktails$/, cocktails.renderIndex, 'explore'],
  [/^cocktail\/([\w-]+)$/, cocktails.renderOne, 'explore'],
  [/^collection(?:\/([\w-]+))?$/, collection.render, 'collection'],
  [/^dashboard$/, dashboard.render, 'dashboard'],
  [/^compare$/, compare.render, 'browse'],
  [/^about$/, about.render, null],
];

let cleanup = null;
let lastPath = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const qi = raw.indexOf('?');
  const path = qi >= 0 ? raw.slice(0, qi) : raw;
  const sp = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '');
  return { path: decodeURIComponent(path), sp };
}

async function renderRoute() {
  const { path, sp } = parseHash();

  if (path === 'random') {
    const b = randomBottle();
    if (b) { location.replace('#/bottle/' + b.id); return; }
  }

  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* noop */ } cleanup = null; }

  let matched = false;
  for (const [re, fn, navKey] of ROUTES) {
    const m = path.match(re);
    if (m) {
      matched = true;
      setNav(navKey);
      view.innerHTML = '';
      const pageEl = el('<div class="page"></div>');
      view.appendChild(pageEl);
      try {
        cleanup = await fn(pageEl, m.slice(1), sp) || null;
      } catch (err) {
        console.error('Page render failed:', err);
        pageEl.innerHTML = `<div class="empty"><div class="e-icon">🥴</div><h3>Something spilled</h3>
          <p>This page failed to render. ${esc(err.message || '')}</p>
          <a class="btn btn-primary" href="#/">Back to home</a></div>`;
      }
      break;
    }
  }
  if (!matched) {
    setNav(null);
    document.title = 'Not found · DrinkCogs';
    view.innerHTML = `<div class="page"><div class="empty"><div class="e-icon">🧭</div><h3>Page not found</h3>
      <p>That shelf doesn't exist. Try browsing instead.</p>
      <a class="btn btn-primary" href="#/browse">Browse all bottles</a></div></div>`;
  }

  const seg = path.split('/')[0];
  // 'instant' bypasses the html { scroll-behavior: smooth } rule on route changes.
  if (seg !== lastPath || path.startsWith('bottle/')) window.scrollTo({ top: 0, behavior: 'instant' });
  lastPath = seg;
}

function setNav(key) {
  document.querySelectorAll('.main-nav a').forEach(a => {
    if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ---------- header: search suggest ---------- */

const searchInput = document.getElementById('globalSearch');
const suggestBox = document.getElementById('searchSuggest');
let suggestItems = [];
let suggestActive = -1;

function closeSuggest() {
  suggestBox.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
  suggestActive = -1;
}

function renderSuggest() {
  const q = searchInput.value.trim();
  if (q.length < 1 || !DB.ready) { closeSuggest(); return; }
  const r = searchAll(q);
  const rows = [];
  const add = (group, items, fn) => {
    if (!items.length) return;
    rows.push(`<div class="suggest-group">${group}</div>`);
    for (const it of items) rows.push(fn(it));
  };
  add('Bottles', r.bottles, b => `
    <a class="suggest-item" href="#/bottle/${b.id}">
      <span class="s-fig">${bottleSVG(b, { h: 40, label: false })}</span>
      <span><span class="s-name">${esc(bottleName(b))}</span><br><span class="s-sub">${flagOf(b)} ${esc(catLabelOf(b))}</span></span>
    </a>`);
  add('Producers', r.producers, p => `
    <a class="suggest-item" href="#/producer/${p.id}">
      <span class="s-emoji">🏭</span>
      <span><span class="s-name">${esc(p.name)}</span><br><span class="s-sub">${esc(p.location || '')}</span></span>
    </a>`);
  add('Categories', r.categories, c => `
    <a class="suggest-item" href="#/category/${c.id}">
      <span class="s-emoji">${c.icon || '🥃'}</span>
      <span><span class="s-name">${esc(c.name)}</span><br><span class="s-sub">Category</span></span>
    </a>`);
  add('Countries', r.countries, c => `
    <a class="suggest-item" href="#/country/${c.id}">
      <span class="s-emoji">${c.flag}</span>
      <span><span class="s-name">${esc(c.name)}</span><br><span class="s-sub">Country</span></span>
    </a>`);
  add('Cocktails', r.cocktails, c => `
    <a class="suggest-item" href="#/cocktail/${c.id}">
      <span class="s-emoji">🍸</span>
      <span><span class="s-name">${esc(c.name)}</span><br><span class="s-sub">Cocktail</span></span>
    </a>`);
  rows.push(`<a class="suggest-item suggest-all" href="#/browse?q=${encodeURIComponent(q)}">See all results for “${esc(q)}”</a>`);
  suggestBox.innerHTML = rows.join('');
  suggestBox.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
  suggestItems = [...suggestBox.querySelectorAll('.suggest-item')];
  suggestItems.forEach(item => item.addEventListener('click', () => { closeSuggest(); searchInput.blur(); }));
  suggestActive = -1;
}

searchInput.addEventListener('input', debounce(renderSuggest, 90));
searchInput.addEventListener('focus', renderSuggest);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSuggest(); searchInput.blur(); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (suggestActive >= 0 && suggestItems[suggestActive]) {
      location.hash = suggestItems[suggestActive].getAttribute('href');
    } else if (searchInput.value.trim()) {
      location.hash = '#/browse?q=' + encodeURIComponent(searchInput.value.trim());
    }
    closeSuggest(); searchInput.blur();
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (suggestBox.hidden) { renderSuggest(); return; }
    e.preventDefault();
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    suggestActive = (suggestActive + dir + suggestItems.length) % suggestItems.length;
    suggestItems.forEach((it, i) => it.classList.toggle('active', i === suggestActive));
    suggestItems[suggestActive]?.scrollIntoView({ block: 'nearest' });
  }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.headsearch')) closeSuggest();
});

/* ---------- header: theme menu ---------- */

const themeBtn = document.getElementById('themeBtn');
const themeMenu = document.getElementById('themeMenu');

function renderThemeMenu() {
  const cur = store.currentTheme();
  themeMenu.innerHTML = store.THEMES.map(t => `
    <button role="menuitemradio" aria-checked="${t.id === cur}" data-theme-id="${t.id}">
      <span class="theme-swatch" style="background:${t.sw[0]}"><i style="background:${t.sw[1]}"></i></span>
      ${esc(t.label)} ${t.id === cur ? icon('check') : ''}
    </button>`).join('');
}
themeBtn.addEventListener('click', e => {
  e.stopPropagation();
  renderThemeMenu();
  themeMenu.hidden = !themeMenu.hidden;
});
themeMenu.addEventListener('click', e => {
  const b = e.target.closest('[data-theme-id]');
  if (!b) return;
  store.setTheme(b.dataset.themeId);
  renderThemeMenu();
  toast(`Theme: ${store.THEMES.find(t => t.id === b.dataset.themeId)?.label}`);
});
document.addEventListener('click', e => {
  if (!themeMenu.hidden && !e.target.closest('#themeMenu')) themeMenu.hidden = true;
});

/* ---------- header: random ---------- */

document.getElementById('randomBtn').addEventListener('click', () => {
  if (!DB.ready) return;
  location.hash = '#/bottle/' + randomBottle().id;
});

/* ---------- compare tray ---------- */

const tray = document.getElementById('compareTray');

function renderTray() {
  const ids = store.compareList();
  if (!ids.length) { tray.hidden = true; tray.innerHTML = ''; return; }
  const thumbs = ids.map(id => {
    const b = DB.bottleById.get(id);
    if (!b) return '';
    return `<span class="tray-b" title="${esc(b.name)}">${bottleSVG(b, { h: 42, label: false })}
      <button data-tray-remove="${id}" aria-label="Remove ${esc(bottleName(b))} from compare">✕</button></span>`;
  }).join('');
  tray.innerHTML = `
    <div class="tray-inner">
      <div class="tray-thumbs">${thumbs}</div>
      <span class="tray-label">${ids.length} of 4 selected</span>
      <button class="btn btn-ghost btn-sm" data-tray-clear>Clear</button>
      <a class="btn btn-primary btn-sm" href="#/compare?ids=${ids.join(',')}">${icon('compare')} Compare</a>
    </div>`;
  tray.hidden = false;
}

tray.addEventListener('click', e => {
  const rm = e.target.closest('[data-tray-remove]');
  if (rm) { store.toggleCompare(rm.dataset.trayRemove); return; }
  if (e.target.closest('[data-tray-clear]')) store.clearCompare();
});

window.addEventListener('dc:compare', () => {
  renderTray();
  document.querySelectorAll('[data-act="compare"]').forEach(b => {
    const on = store.inCompare(b.dataset.id);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
});

/* ---------- delegated card actions ---------- */

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;
  if (act === 'wish') {
    const on = store.toggleStatus(id, 'wishlist');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
    toast(on ? 'Added to wishlist' : 'Removed from wishlist');
  } else if (act === 'compare') {
    const r = store.toggleCompare(id);
    if (!r.ok) { toast(r.reason); return; }
    btn.classList.toggle('on', r.added);
    btn.setAttribute('aria-pressed', r.added);
  }
});

window.addEventListener('dc:collection', () => {
  document.querySelectorAll('[data-act="wish"]').forEach(b => {
    const on = store.hasStatus(b.dataset.id, 'wishlist');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
});

/* ---------- keyboard shortcuts ---------- */

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
  else if (e.key === 'r') { if (DB.ready) location.hash = '#/bottle/' + randomBottle().id; }
  else if (e.key === 'Escape') { closeSuggest(); themeMenu.hidden = true; }
});

/* ---------- boot ---------- */

function paintHeaderIcons() {
  document.getElementById('brandMark').innerHTML = brandSVG(30);
  document.getElementById('headSearchIcon').innerHTML = icon('search');
  document.getElementById('randomBtn').innerHTML = icon('dice');
  document.getElementById('themeBtn').innerHTML = icon('palette');
  document.querySelectorAll('.nav-ic[data-ic]').forEach(s => { s.innerHTML = icon(s.dataset.ic); });
}

async function boot() {
  paintHeaderIcons();
  try {
    await loadDB();
    buildIndex();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><div class="e-icon">🚧</div><h3>Couldn't load the database</h3>
      <p>${esc(err.message)}. If you're opening the file directly, serve the folder over HTTP instead.</p>
      <button class="btn btn-primary" onclick="location.reload()">Retry</button></div>`;
    return;
  }
  renderTray();
  await renderRoute();
  window.addEventListener('hashchange', renderRoute);

  // Offline support in production; skipped during local development so edits
  // are never masked by the precache (opt back in with ?sw=1).
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')
      && (!isLocal || new URLSearchParams(location.search).has('sw'))) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is progressive */ });
  }
}

boot();
