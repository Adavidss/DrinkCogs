// DrinkCogs — charts.js: dependency-free SVG/HTML charts (radar, donut, bars).

import { esc, num } from './ui.js';

/* ---------- radar ---------- */

/**
 * @param {Array<{id,label}>} axes
 * @param {Array<{name,color,values:Object}>} series values keyed by axis id, 0–10
 */
export function radarSVG(axes, series, opts = {}) {
  const size = opts.size ?? 340;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 46;
  const n = axes.length;
  const ang = i => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, v) => {
    const r = (Math.max(0, Math.min(10, v)) / 10) * R;
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  };

  // Outer disc first, then inner rings on top.
  const outer = axes.map((_, i) => pt(i, 10).map(v => v.toFixed(1)).join(',')).join(' ');
  let grid = `<polygon points="${outer}" fill="var(--surface-2)" stroke="var(--border-2)" stroke-width="1.1" opacity=".7"/>`;
  for (const lvl of [2.5, 5, 7.5]) {
    const pts = axes.map((_, i) => pt(i, lvl).map(v => v.toFixed(1)).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="var(--border-2)" stroke-width="0.7" opacity=".8"/>`;
  }

  let spokes = '', labels = '';
  axes.forEach((a, i) => {
    const [x, y] = pt(i, 10);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border-2)" stroke-width="0.7" opacity=".7"/>`;
    const [lx, ly] = pt(i, 10);
    const dx = Math.cos(ang(i)), dyv = Math.sin(ang(i));
    const tx = cx + (R + 16) * dx, ty = cy + (R + 16) * dyv;
    const anchor = Math.abs(dx) < 0.35 ? 'middle' : dx > 0 ? 'start' : 'end';
    const dyText = dyv > 0.6 ? 8 : dyv < -0.6 ? -2 : 4;
    labels += `<text x="${tx.toFixed(1)}" y="${(ty + dyText).toFixed(1)}" text-anchor="${anchor}" font-size="10.5" font-weight="650" fill="var(--text-soft)">${esc(a.label)}</text>`;
  });

  let polys = '';
  for (const s of series) {
    const pts = axes.map((a, i) => pt(i, s.values?.[a.id] ?? 0));
    const ptStr = pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    polys += `<polygon points="${ptStr}" fill="${s.color}" fill-opacity=".16" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
    polys += pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="${s.color}"/>`).join('');
  }

  const desc = series.map(s => `${s.name}: ` + axes.map(a => `${a.label} ${s.values?.[a.id] ?? 0}/10`).join(', ')).join('; ');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Flavor radar chart. ${esc(desc)}">
    ${grid}${spokes}${labels}${polys}
  </svg>`;
}

/** Pick the most telling axes for a bottle (or overlay set): top values, stable order. */
export function radarAxesFor(flavorDefs, valueSets, count = 8) {
  const score = new Map();
  for (const f of flavorDefs) {
    let max = 0;
    for (const vs of valueSets) max = Math.max(max, vs?.[f.id] ?? 0);
    score.set(f.id, max);
  }
  return flavorDefs
    .filter(f => !['body', 'finish', 'complexity'].includes(f.id))
    .sort((a, b) => score.get(b.id) - score.get(a.id))
    .slice(0, count)
    .sort((a, b) => flavorDefs.indexOf(a) - flavorDefs.indexOf(b))
    .map(f => ({ id: f.id, label: f.label }));
}

/* ---------- donut ---------- */

export function donutHTML(data, opts = {}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = opts.size ?? 168;
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  let offset = 0, segs = '';
  data.forEach((d, i) => {
    const frac = d.value / total;
    const color = d.color || `var(--viz-${(i % 8) + 1})`;
    segs += `<circle r="${r}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="${color}" stroke-width="24"
      stroke-dasharray="${(frac * c).toFixed(2)} ${(c - frac * c).toFixed(2)}" stroke-dashoffset="${(-offset * c).toFixed(2)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    offset += frac;
  });
  const legend = data.map((d, i) => `
    <li><i style="background:${d.color || `var(--viz-${(i % 8) + 1})`}"></i>
      <span>${esc(d.label)}</span><span class="l-val">${num(d.value)}</span></li>`).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(opts.label || 'Breakdown')}: ${esc(data.map(d => `${d.label} ${d.value}`).join(', '))}">
      ${segs}
      <text x="${size / 2}" y="${size / 2 - 2}" text-anchor="middle" font-size="26" font-weight="800" fill="var(--text)">${esc(opts.center ?? num(total))}</text>
      <text x="${size / 2}" y="${size / 2 + 17}" text-anchor="middle" font-size="10" font-weight="650" fill="var(--text-faint)">${esc(opts.centerLabel || '')}</text>
    </svg>
    <ul class="legend">${legend}</ul>
  </div>`;
}

/* ---------- horizontal bars ---------- */

export function barsHTML(data, opts = {}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const fmt = opts.format || (v => num(v));
  return `<div class="bars">` + data.map((d, i) => `
    <div class="bar-row" title="${esc(d.label)}: ${esc(String(fmt(d.value)))}">
      <span class="bar-label">${esc(d.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${((d.value / max) * 100).toFixed(1)}%;${d.color ? `background:${d.color}` : `background:var(--viz-${(i % 8) + 1})`}"></div></div>
      <span class="bar-val">${esc(String(fmt(d.value)))}</span>
    </div>`).join('') + `</div>`;
}

export function histogramHTML(values, opts = {}) {
  if (!values.length) return '';
  const bucketSize = opts.bucketSize ?? 10;
  const lo = Math.floor(Math.min(...values) / bucketSize) * bucketSize;
  const hi = Math.ceil((Math.max(...values) + 0.001) / bucketSize) * bucketSize;
  const buckets = [];
  for (let b = lo; b < hi; b += bucketSize) {
    buckets.push({ label: `${b}–${b + bucketSize}${opts.unit || ''}`, value: values.filter(v => v >= b && v < b + bucketSize).length });
  }
  return barsHTML(buckets, { format: v => num(v) });
}

/* ---------- flavor fingerprint (all 20 dims) ---------- */

export function flavorBarsHTML(flavorDefs, values) {
  const groups = new Map();
  for (const f of flavorDefs) {
    if (!groups.has(f.group)) groups.set(f.group, []);
    groups.get(f.group).push(f);
  }
  let out = '<div class="flavor-grid">';
  for (const f of flavorDefs) {
    const v = values?.[f.id] ?? 0;
    out += `
      <div class="flavor-dim" title="${esc(f.description || f.label)}">
        <div class="fd-head"><span class="fd-name">${esc(f.label)}</span><span class="fd-val">${v}</span></div>
        <div class="fd-track"><div class="fd-fill" style="width:${v * 10}%"></div></div>
      </div>`;
  }
  return out + '</div>';
}
