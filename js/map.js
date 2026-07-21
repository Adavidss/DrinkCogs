// DrinkCogs — map.js: lightweight world map rendering.
// Uses data/world-map.json (equirectangular SVG paths generated from public-domain
// Natural Earth data by scripts/build_map.py). Falls back to a plotted-dot map
// if the file is missing.

import { esc } from './ui.js';

const W = 1000, H = 500;
let worldPromise = null;

export function loadWorld() {
  if (!worldPromise) {
    worldPromise = fetch('data/world-map.json')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return worldPromise;
}

export function project(lat, lng) {
  return [((lng + 180) / 360) * W, ((90 - lat) / 180) * H];
}

/**
 * Render a world (or focused) map.
 * @param {object} opts
 *   highlight: Map<iso3, {label, href}> countries to highlight & link
 *   pins: [{lat, lng, label, href}]
 *   focus: iso3 to crop to (with padding), or null for world view
 */
export async function worldMapSVG(opts = {}) {
  const world = await loadWorld();
  const highlight = opts.highlight || new Map();
  const pins = opts.pins || [];

  if (!world) return fallbackMap(opts);

  let vb = `0 20 ${W} ${H - 80}`; // trim polar wastes
  if (opts.focus) {
    const c = world.countries.find(c => c.iso3 === opts.focus);
    if (c && c.bbox) {
      let [x0, y0, x1, y1] = c.bbox;
      for (const p of pins) {
        const [px, py] = project(p.lat, p.lng);
        x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
      }
      const padX = Math.max(18, (x1 - x0) * 0.3), padY = Math.max(18, (y1 - y0) * 0.3);
      x0 = Math.max(0, x0 - padX); y0 = Math.max(0, y0 - padY);
      x1 = Math.min(W, x1 + padX); y1 = Math.min(H, y1 + padY);
      // keep a sane aspect ratio (2:1-ish)
      const w = x1 - x0, h = y1 - y0;
      if (w / h > 2.4) { const nh = w / 2.4, dy = (nh - h) / 2; y0 -= dy; y1 += dy; }
      if (w / h < 1.2) { const nw = h * 1.2, dx = (nw - w) / 2; x0 -= dx; x1 += dx; }
      vb = `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`;
    }
  }

  const paths = world.countries.map(c => {
    const hl = highlight.get(c.iso3);
    const cls = hl ? 'hl' : '';
    const t = hl ? `<title>${esc(hl.label)}</title>` : `<title>${esc(c.name)}</title>`;
    return `<path d="${c.d}" class="${cls}" data-iso="${c.iso3}" ${hl?.href ? `data-href="${esc(hl.href)}" tabindex="0" role="link" aria-label="${esc(hl.label)}"` : ''}>${t}</path>`;
  }).join('');

  const pinMarks = pins.map(p => {
    const [x, y] = project(p.lat, p.lng);
    return `<g class="pin-g" ${p.href ? `data-href="${esc(p.href)}" tabindex="0" role="link"` : ''}>
      <circle class="pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${opts.focus ? 4.5 : 3.4}"><title>${esc(p.label || '')}</title></circle>
    </g>`;
  }).join('');

  return `<svg class="map-svg" viewBox="${vb}" role="img" aria-label="${esc(opts.label || 'World map')}" preserveAspectRatio="xMidYMid meet">
    ${paths}${pinMarks}
  </svg>`;
}

function fallbackMap(opts) {
  const pins = opts.pins || [];
  const dots = pins.map(p => {
    const [x, y] = project(p.lat, p.lng);
    return `<circle class="pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"><title>${esc(p.label || '')}</title></circle>`;
  }).join('');
  const grid = Array.from({ length: 17 }, (_, i) =>
    `<line x1="${(i + 1) * (W / 18)}" y1="30" x2="${(i + 1) * (W / 18)}" y2="${H - 30}" stroke="var(--border)" stroke-width="0.5"/>`).join('')
    + Array.from({ length: 8 }, (_, i) =>
    `<line x1="0" y1="${(i + 1) * (H / 9)}" x2="${W}" y2="${(i + 1) * (H / 9)}" stroke="var(--border)" stroke-width="0.5"/>`).join('');
  return `<svg class="map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Location map">
    <rect x="0" y="0" width="${W}" height="${H}" fill="var(--surface-2)" rx="12"/>${grid}${dots}
  </svg>`;
}

/** Wire click/keyboard navigation for rendered maps. */
export function bindMapNav(rootEl) {
  rootEl.querySelectorAll('[data-href]').forEach(elm => {
    const go = () => { location.hash = elm.dataset.href; };
    elm.addEventListener('click', go);
    elm.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}
