// DrinkCogs — store.js: personal collection, notes, compare tray, theme.
// Everything persists in localStorage only. No accounts, no sync, fully private.

const COLLECTION_KEY = 'drinkcogs:collection:v1';
const COMPARE_KEY = 'drinkcogs:compare:v1';
export const THEME_KEY = 'drinkcogs:theme';

export const STATUSES = [
  { id: 'owned',            label: 'Owned',            icon: 'check' },
  { id: 'opened',           label: 'Opened',           icon: 'glass' },
  { id: 'finished',         label: 'Finished',         icon: 'droplet' },
  { id: 'wishlist',         label: 'Wishlist',         icon: 'bookmark' },
  { id: 'favorite',         label: 'Favorite',         icon: 'heart' },
  { id: 'gifted',           label: 'Gifted',           icon: 'gift' },
  { id: 'previously-owned', label: 'Previously owned', icon: 'clock' },
  { id: 'sampled',          label: 'Sampled',          icon: 'sparkle' },
];

export const NOTE_FIELDS = [
  { id: 'purchasePlace', label: 'Where purchased', type: 'text', placeholder: 'e.g. Total Wine, duty free, a friend' },
  { id: 'purchasePrice', label: 'Purchase price ($)', type: 'number', placeholder: '0' },
  { id: 'purchaseDate',  label: 'Purchase date', type: 'date' },
  { id: 'openedDate',    label: 'Opened date', type: 'date' },
  { id: 'finishedDate',  label: 'Finished date', type: 'date' },
  { id: 'rating',        label: 'My rating (0–100)', type: 'number', placeholder: 'e.g. 88' },
  { id: 'wouldBuyAgain', label: 'Would buy again', type: 'checkbox' },
  { id: 'tastingNotes',  label: 'My tasting notes', type: 'textarea', placeholder: 'Nose, palate, finish — in your own words' },
  { id: 'memories',      label: 'Special memories', type: 'textarea', placeholder: 'Who you shared it with, the occasion…' },
];

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full / private mode */ }
}
function emit(name) { window.dispatchEvent(new CustomEvent(name)); }

let col = loadJSON(COLLECTION_KEY, { items: {} });
if (!col.items) col = { items: {} };
if (!col.snapshots) col.snapshots = {}; // live (open-database) bottles saved for offline rendering
let compareIds = loadJSON(COMPARE_KEY, []);

function persist() { saveJSON(COLLECTION_KEY, col); emit('dc:collection'); }

/* ---------- collection ---------- */

export function entryOf(id) { return col.items[id] || null; }
export function hasStatus(id, status) { return !!col.items[id]?.statuses?.includes(status); }
export function statusesOf(id) { return col.items[id]?.statuses || []; }
export function notesOf(id) { return col.items[id]?.notes || {}; }

function ensure(id) {
  if (!col.items[id]) col.items[id] = { statuses: [], notes: {}, addedAt: new Date().toISOString() };
  return col.items[id];
}

function prune(id) {
  const e = col.items[id];
  if (e && !e.statuses.length && !Object.values(e.notes).some(v => v !== '' && v != null && v !== false)) {
    delete col.items[id];
    delete col.snapshots[id];
  }
}

export function toggleStatus(id, status) {
  const e = ensure(id);
  const i = e.statuses.indexOf(status);
  if (i >= 0) {
    e.statuses.splice(i, 1);
  } else {
    e.statuses.push(status);
    // sensible implications
    if ((status === 'opened' || status === 'finished') && !e.statuses.includes('owned')) e.statuses.push('owned');
    if (status === 'finished' && !e.statuses.includes('opened')) e.statuses.push('opened');
  }
  e.updatedAt = new Date().toISOString();
  prune(id);
  persist();
  return hasStatus(id, status);
}

export function setNote(id, field, value) {
  const e = ensure(id);
  if (value === '' || value == null || value === false) delete e.notes[field];
  else e.notes[field] = value;
  e.updatedAt = new Date().toISOString();
  prune(id);
  persist();
}

export function removeEntry(id) { delete col.items[id]; delete col.snapshots[id]; persist(); }

/* ---------- live-bottle snapshots (open-database items) ---------- */

export const isLiveId = id => id.startsWith('off:');

export function saveSnapshot(id, snap) {
  col.snapshots[id] = { ...(col.snapshots[id] || {}), ...snap };
  // persist() is called by the toggle/note that follows; avoid double events
  saveJSON(COLLECTION_KEY, col);
}

export function snapshotOf(id) { return col.snapshots[id] || null; }

export function allEntries() {
  return Object.entries(col.items).map(([id, e]) => ({ id, ...e }));
}

export function countByStatus() {
  const counts = Object.fromEntries(STATUSES.map(s => [s.id, 0]));
  for (const e of Object.values(col.items)) for (const s of e.statuses) if (s in counts) counts[s]++;
  return counts;
}

export function collectionSize() { return Object.keys(col.items).length; }

/* ---------- import / export ---------- */

export function exportJSON() {
  return JSON.stringify({ app: 'DrinkCogs', version: 1, exportedAt: new Date().toISOString(), collection: col }, null, 2);
}

export function importJSON(text, { merge = true } = {}) {
  const data = JSON.parse(text);
  const items = data?.collection?.items ?? data?.items;
  if (!items || typeof items !== 'object') throw new Error('Not a DrinkCogs export file');
  let n = 0;
  if (!merge) col = { items: {}, snapshots: {} };
  if (!col.snapshots) col.snapshots = {};
  for (const [id, e] of Object.entries(items)) {
    if (!e || !Array.isArray(e.statuses)) continue;
    col.items[id] = { statuses: e.statuses.filter(s => STATUSES.some(x => x.id === s)), notes: e.notes || {}, addedAt: e.addedAt, updatedAt: e.updatedAt };
    n++;
  }
  const snaps = data?.collection?.snapshots;
  if (snaps && typeof snaps === 'object') Object.assign(col.snapshots, snaps);
  persist();
  return n;
}

export function exportCSV(resolveBottle) {
  const cols = ['id', 'name', 'category', 'statuses', ...NOTE_FIELDS.map(f => f.id)];
  const rows = [cols.join(',')];
  for (const e of allEntries()) {
    const b = resolveBottle(e.id);
    const cells = [
      e.id,
      b ? b.name : '',
      b ? b.category : '',
      e.statuses.join('; '),
      ...NOTE_FIELDS.map(f => e.notes[f.id] ?? ''),
    ].map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    });
    rows.push(cells.join(','));
  }
  return rows.join('\n');
}

export function clearAll() { col = { items: {}, snapshots: {} }; persist(); }

export function loadSample(sample) {
  for (const [id, e] of Object.entries(sample)) col.items[id] = e;
  persist();
}

/* ---------- compare tray ---------- */

export function compareList() { return [...compareIds]; }

export function toggleCompare(id) {
  const i = compareIds.indexOf(id);
  if (i >= 0) compareIds.splice(i, 1);
  else {
    if (compareIds.length >= 4) return { ok: false, reason: 'Compare holds up to 4 bottles' };
    compareIds.push(id);
  }
  saveJSON(COMPARE_KEY, compareIds);
  emit('dc:compare');
  return { ok: true, added: compareIds.includes(id) };
}

export function inCompare(id) { return compareIds.includes(id); }

export function clearCompare() { compareIds = []; saveJSON(COMPARE_KEY, compareIds); emit('dc:compare'); }

/* ---------- theme ---------- */

export const THEMES = [
  { id: 'clean-white',   label: 'Clean White',   sw: ['#f7f5f1', '#ad5f14'] },
  { id: 'dark',          label: 'Dark',          sw: ['#131210', '#e0983f'] },
  { id: 'bourbon-barrel',label: 'Bourbon Barrel',sw: ['#24130a', '#ec9f4a'] },
  { id: 'speakeasy',     label: 'Speakeasy',     sw: ['#110d0a', '#d0a63f'] },
  { id: 'vintage-paper', label: 'Vintage Paper', sw: ['#f0e6cd', '#8a5a24'] },
  { id: 'midnight-blue', label: 'Midnight Blue', sw: ['#0a1220', '#5f8fe8'] },
  { id: 'emerald',       label: 'Emerald',       sw: ['#0a1a13', '#2fbd85'] },
  { id: 'modern-glass',  label: 'Modern Glass',  sw: ['#e9ecf4', '#5b5bd6'] },
  { id: 'warm-coffee',   label: 'Warm Coffee',   sw: ['#211913', '#c98a4b'] },
  { id: 'high-contrast', label: 'High Contrast', sw: ['#000000', '#ffd400'] },
];

export function currentTheme() {
  return document.documentElement.dataset.theme || 'clean-white';
}

export function setTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem(THEME_KEY, id); } catch { /* ignore */ }
  const t = THEMES.find(t => t.id === id);
  if (t) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.sw[0]);
  emit('dc:theme');
}
