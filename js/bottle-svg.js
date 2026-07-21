// DrinkCogs — bottle-svg.js: procedural bottle illustrations.
// Every bottle is drawn from metadata (shape, liquid color, glass color, category)
// on a 100×260 grid with the base resting at y=250. No image files needed.

import { catColor } from './db.js';
import { esc } from './ui.js';

let uid = 0;

const SHAPES = {
  whiskey: {
    body: 'M36 16 H64 V58 C64 72 84 70 84 88 V236 Q84 248 72 248 H28 Q16 248 16 236 V88 C16 70 36 72 36 58 Z',
    cap: { x: 32, y: 5, w: 36, h: 14, rx: 3 }, liquidTop: 78, bottom: 248, label: [26, 146, 48, 58],
  },
  square: {
    body: 'M38 16 H62 V56 C62 68 80 66 80 82 V240 Q80 248 72 248 H28 Q20 248 20 240 V82 C20 66 38 68 38 56 Z',
    cap: { x: 34, y: 5, w: 32, h: 14, rx: 3 }, liquidTop: 74, bottom: 248, label: [26, 144, 48, 60],
  },
  decanter: {
    body: 'M44 22 H56 V58 C56 68 83 72 84 112 V198 Q84 214 68 214 H32 Q16 214 16 198 V112 C17 72 44 68 44 58 Z',
    cap: { type: 'stopper' }, liquidTop: 80, bottom: 214, label: [30, 132, 40, 50],
  },
  'wine-bordeaux': {
    body: 'M42 8 H58 V70 C58 82 74 85 74 98 V238 Q74 248 64 248 H36 Q26 248 26 238 V98 C26 85 42 82 42 70 Z',
    cap: { x: 40, y: 2, w: 20, h: 28, rx: 4, foil: true }, liquidTop: 92, bottom: 248, label: [30, 150, 40, 56],
  },
  'wine-burgundy': {
    body: 'M42 8 H58 V58 C58 82 76 95 76 120 V238 Q76 248 66 248 H34 Q24 248 24 238 V120 C24 95 42 82 42 58 Z',
    cap: { x: 40, y: 2, w: 20, h: 26, rx: 4, foil: true }, liquidTop: 100, bottom: 248, label: [30, 152, 40, 54],
  },
  champagne: {
    body: 'M41 10 H59 V52 C59 78 80 92 80 122 V234 Q80 248 66 248 H34 Q20 248 20 234 V122 C20 92 41 78 41 52 Z',
    cap: { type: 'dome' }, liquidTop: 100, bottom: 248, label: [28, 150, 44, 52],
  },
  apothecary: {
    body: 'M40 28 H60 V58 C60 70 88 76 88 116 V202 Q88 230 50 230 Q12 230 12 202 V116 C12 76 40 70 40 58 Z',
    cap: { x: 35, y: 16, w: 30, h: 14, rx: 3 }, liquidTop: 84, bottom: 230, label: [24, 128, 52, 58],
  },
  tall: {
    body: 'M40 12 H60 V48 C60 58 68 60 68 74 V238 Q68 248 60 248 H40 Q32 248 32 238 V74 C32 60 40 58 40 48 Z',
    cap: { x: 36, y: 2, w: 28, h: 13, rx: 3 }, liquidTop: 66, bottom: 248, label: [34, 136, 32, 64],
  },
  cognac: {
    body: 'M42 14 H58 V60 C58 74 86 82 86 136 Q86 208 50 208 Q14 208 14 136 C14 82 42 74 42 60 Z',
    cap: { x: 38, y: 4, w: 24, h: 13, rx: 3 }, liquidTop: 84, bottom: 208, label: [28, 126, 44, 46],
  },
  beer: {
    body: 'M42 42 H58 V86 C58 98 70 102 70 118 V232 Q70 244 60 244 H40 Q30 244 30 232 V118 C30 102 42 98 42 86 Z',
    cap: { x: 38, y: 34, w: 24, h: 10, rx: 2, crown: true }, liquidTop: 104, bottom: 244, label: [32, 146, 36, 54],
  },
  belgian: {
    body: 'M40 58 H60 V90 C60 104 76 108 76 130 V228 Q76 244 60 244 H40 Q24 244 24 228 V130 C24 108 40 104 40 90 Z',
    cap: { x: 37, y: 44, w: 26, h: 16, rx: 5 }, liquidTop: 112, bottom: 244, label: [30, 148, 40, 52],
  },
  sake: {
    body: 'M41 26 H59 V62 C59 76 70 80 70 98 V234 Q70 246 60 246 H40 Q30 246 30 234 V98 C30 80 41 76 41 62 Z',
    cap: { x: 37, y: 15, w: 26, h: 12, rx: 3 }, liquidTop: 82, bottom: 246, label: [32, 138, 36, 58],
  },
  can: {
    body: 'M31 62 Q31 54 39 54 H61 Q69 54 69 62 V234 Q69 242 61 242 H39 Q31 242 31 234 Z',
    cap: { type: 'lid' }, liquidTop: 56, bottom: 242, label: [31, 96, 38, 104], solid: true,
  },
};

const FALLBACK_BY_CAT = {
  whiskey: 'whiskey', rum: 'whiskey', gin: 'apothecary', vodka: 'tall', agave: 'apothecary',
  brandy: 'cognac', liqueur: 'tall', wine: 'wine-bordeaux', beer: 'beer', sake: 'sake',
  soju: 'sake', cider: 'beer', rtd: 'can',
};

const CAP_COLORS = { default: '#4a3421', foil: '#6b1f2e', dome: '#c2a45f', crown: '#b89b4a', lid: '#b9c2c9', stopper: '#3a2a1c' };

function shapeOf(b) {
  return SHAPES[b.shape] || SHAPES[FALLBACK_BY_CAT[b.category]] || SHAPES.whiskey;
}

export function initialsOf(b) {
  const name = b.shortName || b.name || '?';
  const words = name.split(/\s+/).filter(w => !/^(the|of|de|la|old)$/i.test(w));
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  let out = '';
  for (const w of words) {
    if (/^\d{1,3}$/.test(w) && out.length <= 1) { out += w; }
    else if (/^\d/.test(w)) { if (out.length < 3) out += w.match(/^\d{1,2}/)[0]; }
    else out += w[0].toUpperCase();
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

function capMarkup(s, accent) {
  const c = s.cap;
  if (!c) return '';
  if (c.type === 'stopper') {
    return `<circle cx="50" cy="13" r="8.5" fill="${CAP_COLORS.stopper}"/><rect x="44.5" y="19" width="11" height="7" rx="2" fill="#8a6a3f"/>`;
  }
  if (c.type === 'dome') {
    return `<path d="M37 26 C37 9 63 9 63 26 V36 H37 Z" fill="${CAP_COLORS.dome}"/><rect x="37" y="30" width="26" height="3" fill="rgba(0,0,0,.18)"/>`;
  }
  if (c.type === 'lid') {
    return `<rect x="29" y="47" width="42" height="9" rx="4" fill="${CAP_COLORS.lid}"/><rect x="45" y="49" width="10" height="4" rx="2" fill="#8b949c"/>`;
  }
  const fill = c.foil ? CAP_COLORS.foil : (c.crown ? CAP_COLORS.crown : CAP_COLORS.default);
  return `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.rx}" fill="${fill}"/>`
       + (c.foil ? `<rect x="${c.x}" y="${c.y + c.h - 4}" width="${c.w}" height="2.4" fill="rgba(255,255,255,.28)"/>` : '');
}

function labelMarkup(s, b, withText) {
  const [x, y, w, h] = s.label;
  const accent = catColor(b.category);
  const ini = esc(initialsOf(b));
  let inner = `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3.5" fill="#f7f2e2" stroke="rgba(90,70,40,.25)" stroke-width="0.8"/>
    <rect x="${x}" y="${y}" width="${w}" height="6" rx="3" fill="${accent}"/>`;
  if (withText) {
    const cx = x + w / 2;
    inner += `
    <text x="${cx}" y="${y + h * 0.46}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${Math.min(13, w * 0.3)}" fill="#332e24">${ini}</text>
    <rect x="${cx - w * 0.32}" y="${y + h * 0.58}" width="${w * 0.64}" height="2.4" rx="1.2" fill="#cbc3ac"/>
    <rect x="${cx - w * 0.24}" y="${y + h * 0.71}" width="${w * 0.48}" height="2.4" rx="1.2" fill="#d6cfba"/>
    <rect x="${cx - w * 0.28}" y="${y + h * 0.84}" width="${w * 0.56}" height="2.4" rx="1.2" fill="#d6cfba"/>`;
  }
  return inner;
}

/**
 * Render a bottle illustration.
 * @param {object} b bottle record
 * @param {object} opts {h: px height, fill: 0–1 liquid level, label: bool}
 */
export function bottleSVG(b, opts = {}) {
  const s = shapeOf(b);
  const h = opts.h ?? 150;
  const w = Math.round(h * (100 / 260));
  const fillLevel = opts.fill ?? 0.88;
  const withLabel = opts.label !== false;
  const withText = withLabel && h >= 56;
  const id = `bshape${++uid}`;
  const dy = 250 - s.bottom;
  const liquid = b.color || '#c08a3e';
  const glassTint = b.glassColor || null;
  const liquidY = s.liquidTop + (1 - Math.max(0, Math.min(1, fillLevel))) * (s.bottom - s.liquidTop);

  const bodyFill = s.solid ? liquid : (glassTint || 'rgba(165,190,210,.16)');
  const liquidRect = s.solid ? '' : `<rect x="0" y="${liquidY}" width="100" height="${s.bottom - liquidY}" fill="${liquid}" opacity="${glassTint ? 0.35 : 0.93}" clip-path="url(#${id})"/>`;

  return `<svg viewBox="0 0 100 260" width="${w}" height="${h}" role="img" aria-label="${esc(b.shortName || b.name)} bottle illustration">
    <defs><clipPath id="${id}"><path d="${s.body}"/></clipPath></defs>
    <g transform="translate(0 ${dy})">
      <ellipse cx="50" cy="250" rx="${Math.min(40, 30 + h * 0.04)}" ry="4" fill="rgba(0,0,0,.14)"/>
      <path d="${s.body}" fill="${bodyFill}"/>
      ${liquidRect}
      <rect x="20" y="20" width="8" height="222" rx="4" fill="rgba(255,255,255,.17)" clip-path="url(#${id})"/>
      <path d="${s.body}" fill="none" stroke="rgba(110,100,90,.55)" stroke-width="1.6"/>
      ${withLabel ? labelMarkup(s, b, withText) : ''}
      ${capMarkup(s)}
    </g>
  </svg>`;
}

/** Height scaling for the shelf view: bigger formats read taller. */
export function shelfHeight(b, base = 150) {
  const ml = b.sizeMl || 750;
  const scale = Math.max(0.62, Math.min(1.3, Math.cbrt(ml / 750)));
  return Math.round(base * scale);
}

/* ---------- glassware rendering (gallery view) ---------- */

const GLASSES = {
  tulip: { d: 'M30 20 C30 52 36 62 44 68 L44 88 H36 v6 h28 v-6 h-8 L56 68 C64 62 70 52 70 20 Z', top: 24, bot: 66 },
  rocks: { d: 'M28 34 L32 92 H68 L72 34 Z', top: 40, bot: 90 },
  highball: { d: 'M34 14 L37 96 H63 L66 14 Z', top: 20, bot: 94 },
  coupe: { d: 'M24 22 C24 40 38 48 47 50 L47 84 H37 v6 h26 v-6 H53 L53 50 C62 48 76 40 76 22 Z', top: 26, bot: 46 },
  flute: { d: 'M41 12 C41 44 43 54 47 58 L47 88 H38 v6 h24 v-6 h-9 L53 58 C57 54 59 44 59 12 Z', top: 16, bot: 56 },
  wine: { d: 'M28 16 C28 44 38 54 46 57 L46 86 H36 v6 h28 v-6 H54 L54 57 C62 54 72 44 72 16 Z', top: 22, bot: 54 },
  cup: { d: 'M32 46 C32 74 40 82 50 82 C60 82 68 74 68 46 Z', top: 50, bot: 80 },
  pint: { d: 'M32 14 L34 50 C28 56 28 66 34 72 L36 96 H64 L66 72 C72 66 72 56 66 50 L68 14 Z', top: 20, bot: 94 },
};

function glassKind(b) {
  const g = (b.glassware?.[0] || '').toLowerCase();
  if (/glencairn|copita|snifter|tulip/.test(g)) return 'tulip';
  if (/rocks|tumbler|shot/.test(g)) return 'rocks';
  if (/highball|copper|mule/.test(g)) return 'highball';
  if (/coupe|martini|nick/.test(g)) return 'coupe';
  if (/flute/.test(g)) return 'flute';
  if (/wine|bordeaux/.test(g)) return 'wine';
  if (/ochoko|sake cup/.test(g)) return 'cup';
  if (/pint|chalice/.test(g)) return 'pint';
  return b.category === 'beer' ? 'pint' : 'tulip';
}

export function glassSVG(b, opts = {}) {
  const kind = glassKind(b);
  const g = GLASSES[kind];
  const h = opts.h ?? 120;
  const id = `gshape${++uid}`;
  const fillY = g.top + (g.bot - g.top) * 0.34;
  return `<svg viewBox="0 0 100 104" width="${h}" height="${Math.round(h * 1.04)}" role="img" aria-label="${esc(b.shortName || b.name)} served in a ${kind} glass">
    <defs><clipPath id="${id}"><path d="${g.d}"/></clipPath></defs>
    <ellipse cx="50" cy="98" rx="26" ry="3" fill="rgba(0,0,0,.14)"/>
    <rect x="0" y="${fillY}" width="100" height="${g.bot - fillY}" fill="${b.color || '#c08a3e'}" opacity=".9" clip-path="url(#${id})"/>
    <path d="${g.d}" fill="rgba(165,190,210,.14)" stroke="rgba(110,100,90,.6)" stroke-width="1.8"/>
  </svg>`;
}

/* ---------- label close-up (gallery view) ---------- */

export function labelSVG(b, opts = {}) {
  const h = opts.h ?? 120;
  const accent = catColor(b.category);
  const name = b.shortName || b.name;
  const words = name.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 14 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
    if (lines.length === 2) break;
  }
  if (cur && lines.length < 3) lines.push(cur);
  const text = lines.map((l, i) =>
    `<text x="50" y="${52 + i * 12}" text-anchor="middle" font-family="Georgia, serif" font-size="9.5" font-weight="${i === 0 ? 'bold' : 'normal'}" fill="#332e24">${esc(l)}</text>`).join('');
  return `<svg viewBox="0 0 100 104" width="${h}" height="${Math.round(h * 1.04)}" role="img" aria-label="${esc(name)} label artwork">
    <rect x="8" y="10" width="84" height="84" rx="6" fill="#f7f2e2" stroke="rgba(90,70,40,.3)"/>
    <rect x="8" y="10" width="84" height="10" rx="5" fill="${accent}"/>
    <text x="50" y="36" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="13" fill="${accent}">${esc(initialsOf(b))}</text>
    ${text}
    <rect x="26" y="${58 + lines.length * 12}" width="48" height="2.4" rx="1.2" fill="#cbc3ac"/>
    <rect x="32" y="${64 + lines.length * 12}" width="36" height="2.4" rx="1.2" fill="#d6cfba"/>
  </svg>`;
}
