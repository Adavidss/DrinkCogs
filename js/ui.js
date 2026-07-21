// DrinkCogs — ui.js: DOM helpers, icons, formatting. No app-state imports (keep this leaf-level).

/* ---------- escaping & DOM ---------- */

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function debounce(fn, ms = 120) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

/* ---------- icons (24×24 stroke set) ---------- */

const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.6 16.6 4.4 4.4"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.2" cy="8.2" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.8" cy="8.2" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.2" cy="15.8" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.8" cy="15.8" r="1.2" fill="currentColor" stroke="none"/>',
  palette: '<path d="M12 3a9 9 0 1 0 .4 18c1.3 0 2.1-.8 2.1-1.9 0-.9-.6-1.4-.6-2.2 0-1.1.9-2 2-2h2.3A2.8 2.8 0 0 0 21 12c0-5-4-9-9-9Z"/><circle cx="7.8" cy="10.2" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="7.6" r="1.15" fill="currentColor" stroke="none"/><circle cx="16.2" cy="10.2" r="1.15" fill="currentColor" stroke="none"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" stroke-linejoin="round"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  heart: '<path d="M12 20.3S3.5 15.4 3.5 9.6C3.5 6.9 5.6 5 8 5c1.7 0 3.2.9 4 2.3C12.8 5.9 14.3 5 16 5c2.4 0 4.5 1.9 4.5 4.6 0 5.8-8.5 10.7-8.5 10.7Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  arrowR: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  star: '<path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8Z"/>',
  trophy: '<path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  sparkle: '<path d="M12 3c.6 3.9 2.1 5.4 6 6-3.9.6-5.4 2.1-6 6-.6-3.9-2.1-5.4-6-6 3.9-.6 5.4-2.1 6-6Z"/><path d="M19 14c.3 1.9 1 2.7 3 3-2 .3-2.7 1.1-3 3-.3-1.9-1-2.7-3-3 2-.3 2.7-1.1 3-3Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>',
  filter: '<path d="M4 5h16l-6.5 7.5V19l-3 2v-8.5Z" stroke-linejoin="round"/>',
  download: '<path d="M12 3v11m-5-4 5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 14V3M7 8l5-5 5 5M4 20h16"/>',
  printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 13h10v8H7z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  compare: '<path d="M15.5 3H21v5.5M8.5 21H3v-5.5M21 3l-7.5 7.5M3 21l7.5-7.5"/>',
  pin: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4Z" stroke-linejoin="round"/>',
  glass: '<path d="M6 3h12l-1.2 8.5a4.8 4.8 0 0 1-9.6 0Z"/><path d="M12 16.5V21m-4 0h8"/>',
  gift: '<rect x="4" y="9" width="16" height="12" rx="1.5"/><path d="M12 9v12M4 13h16M12 9s-4 0-5-2 0-4 2-3.5 3 3 3 5.5c0 0 0-4 2.5-5.3 2-.9 3.4 1.4 2.3 3S12 9 12 9Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  droplet: '<path d="M12 3s6 6.4 6 11a6 6 0 1 1-12 0c0-4.6 6-11 6-11Z"/>',
  flame: '<path d="M12 3c1 3-3 4.5-3 8a3.9 3.9 0 0 0 .8 2.5C10 15 12 14 12 12c2 1.5 3 3 3 4.6A3.5 3.5 0 0 1 11.4 20 6.5 6.5 0 0 1 5.5 13.5C5.5 8 12 3 12 3Z"/>',
  shuffle: '<path d="M16 4h4v4M4 20 20 4M14.5 14.5 20 20m0-4v4h-4M4 4l5.5 5.5"/>',
};

export function icon(name, cls = '') {
  const p = PATHS[name] || PATHS.info;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">${p}</svg>`;
}

/* Brand mark: bottle inside a cog ring */
export function brandSVG(size = 30) {
  let teeth = '';
  for (let i = 0; i < 8; i++) {
    teeth += `<rect x="29" y="1.5" width="6" height="9" rx="2.4" transform="rotate(${i * 45} 32 32)"/>`;
  }
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">
    <g>${teeth}</g>
    <circle cx="32" cy="32" r="24.5" fill="none" stroke="currentColor" stroke-width="5"/>
    <path d="M29.2 17.5h5.6a1 1 0 0 1 1 1v5.1c0 3.1 5.2 3.9 5.2 8v11.9a3.2 3.2 0 0 1-3.2 3.2h-11.6a3.2 3.2 0 0 1-3.2-3.2V31.6c0-4.1 5.2-4.9 5.2-8v-5.1a1 1 0 0 1 1-1z"/>
  </svg>`;
}

/* ---------- formatting ---------- */

export function money(n) {
  if (n == null || isNaN(n)) return '—';
  const opts = n >= 100 ? { maximumFractionDigits: 0 } : { maximumFractionDigits: n % 1 ? 2 : 0 };
  return '$' + Number(n).toLocaleString('en-US', opts);
}

export function num(n, digits = 0) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function sizeText(ml) {
  if (!ml) return '—';
  return ml >= 1000 ? `${num(ml / 1000, 2)} L` : `${ml} ml`;
}

export function abvText(b) {
  if (b.abv == null) return '—';
  return b.proof ? `${num(b.abv, 1)}% · ${num(b.proof, 1)} proof` : `${num(b.abv, 1)}% ABV`;
}

export const AVAILABILITY = {
  'widely-available': { label: 'Widely available', cls: 'badge-ok' },
  'seasonal':         { label: 'Seasonal', cls: 'badge-warn' },
  'allocated':        { label: 'Allocated', cls: 'badge-warn' },
  'limited':          { label: 'Limited release', cls: 'badge-warn' },
  'rare':             { label: 'Rare', cls: 'badge-danger' },
  'discontinued':     { label: 'Discontinued', cls: 'badge-danger' },
};

export function availBadge(b) {
  const a = AVAILABILITY[b.availability];
  if (!a) return '';
  return `<span class="badge ${a.cls}">${a.label}</span>`;
}

/* ---------- toast / modal ---------- */

export function toast(msg, ms = 2300) {
  const root = document.getElementById('toasts');
  if (!root) return;
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 260); }, ms);
}

export function modal(html, { onClose } = {}) {
  const root = document.getElementById('modalRoot');
  const wrap = el(`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal">${html}</div></div>`);
  const close = () => {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', onKey);
  root.appendChild(wrap);
  wrap.querySelector('button, a, input, [tabindex]')?.focus();
  return { close, root: wrap };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch {
    toast('Could not copy — your browser blocked it');
  }
}

/* ---------- misc ---------- */

export function buildQuery(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    p.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = p.toString();
  return s ? '?' + s : '';
}

export function setTitle(...parts) {
  document.title = [...parts.filter(Boolean), 'DrinkCogs'].join(' · ');
}

export function ratingBadge(r) {
  if (r == null || r === '') return '';
  return `<span class="rating-badge">${icon('star')}${esc(r)}</span>`;
}

export function plural(n, one, many = one + 's') {
  return `${num(n)} ${n === 1 ? one : many}`;
}
