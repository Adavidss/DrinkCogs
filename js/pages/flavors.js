// DrinkCogs — pages/flavors.js: flavor dimension explorer.

import { DB } from '../db.js';
import { esc, setTitle, plural } from '../ui.js';
import { bottleGrid, sectionHead } from '../cards.js';

export async function renderIndex(root) {
  setTitle('Flavors');
  const groups = new Map();
  for (const f of DB.flavors) {
    if (!groups.has(f.group)) groups.set(f.group, []);
    groups.get(f.group).push(f);
  }

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/explore">Explore</a> <span class="sep">/</span> Flavors</div>
    <h1>Explore by flavor</h1>
    <p class="muted mt-1">Every bottle carries a curated 20-dimension flavor profile. Pick a dimension to see what leads it.</p>
    ${[...groups.entries()].map(([g, fs]) => `
      <section class="section">
        ${sectionHead(g)}
        <div class="flavor-tiles">
          ${fs.map(f => {
            const top = topBottlesFor(f.id, 1)[0];
            return `
            <a class="flavor-tile" href="#/flavor/${f.id}">
              <span class="ft-group">${esc(g)}</span>
              <h3>${esc(f.label)}</h3>
              <p>${esc(f.description)}</p>
              ${top ? `<p class="small mt-1" style="font-weight:700;color:var(--accent-strong)">Leader: ${esc(top.shortName || top.name)} (${top.flavor[f.id]}/10)</p>` : ''}
            </a>`;
          }).join('')}
        </div>
      </section>`).join('')}
  `;
}

function topBottlesFor(dimId, n = 24, min = 1) {
  return [...DB.bottles]
    .filter(b => (b.flavor?.[dimId] ?? 0) >= min)
    .sort((a, b) => (b.flavor?.[dimId] ?? 0) - (a.flavor?.[dimId] ?? 0))
    .slice(0, n);
}

export async function renderOne(root, [id]) {
  const f = DB.flavorById.get(id);
  if (!f) {
    root.innerHTML = `<div class="empty"><div class="e-icon">🎯</div><h3>Flavor not found</h3><a class="btn btn-primary" href="#/flavors">All flavors</a></div>`;
    return;
  }
  setTitle(`${f.label} — flavor`);
  const strong = topBottlesFor(f.id, 200, 6);
  const notable = topBottlesFor(f.id, 200, 4).filter(b => (b.flavor?.[f.id] ?? 0) < 6);

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/flavors">Flavors</a> <span class="sep">/</span> <span>${esc(f.label)}</span></div>
    <h1>🎯 ${esc(f.label)}</h1>
    <p class="muted mt-1" style="max-width:64ch">${esc(f.description)} <span class="faint">(${esc(f.group)})</span></p>

    <section class="section">
      ${sectionHead(`Defined by ${esc(f.label.toLowerCase())} (${plural(strong.length, 'bottle')})`)}
      ${bottleGrid(strong, { emptyText: `No bottle scores ${f.label} at 6+ yet.` })}
    </section>

    ${notable.length ? `
    <section class="section">
      ${sectionHead('Also notable (4–5 of 10)')}
      ${bottleGrid(notable)}
    </section>` : ''}
  `;
}
