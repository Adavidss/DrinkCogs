// DrinkCogs — pages/category.js: category encyclopedia pages.

import { DB, childrenOf, bottlesInCategory, catColor } from '../db.js';
import { esc, icon, num, setTitle, plural } from '../ui.js';
import { bottleGrid, sectionHead } from '../cards.js';

export async function render(root, [id]) {
  const c = DB.categoryById.get(id);
  if (!c) {
    root.innerHTML = `<div class="empty"><div class="e-icon">🧭</div><h3>Category not found</h3><a class="btn btn-primary" href="#/explore">Explore</a></div>`;
    return;
  }
  setTitle(c.name);
  const parent = c.parentId ? DB.categoryById.get(c.parentId) : null;
  const kids = childrenOf(c);
  const bottles = bottlesInCategory(c);
  const featured = bottles.filter(b => b.featured);
  const browseHref = `#/browse?cat=${c.subcategory ? `${c.category}/${c.subcategory}` : c.category}`;

  root.innerHTML = `
    <div class="breadcrumb">
      <a href="#/">Home</a> <span class="sep">/</span> <a href="#/explore">Explore</a> <span class="sep">/</span>
      ${parent ? `<a href="#/category/${parent.id}">${esc(parent.name)}</a> <span class="sep">/</span>` : ''}
      <span>${esc(c.name)}</span>
    </div>

    <div style="border-left: 5px solid ${catColor(c.category)}; padding-left: 18px">
      <h1>${c.icon} ${esc(c.name)}</h1>
      <p class="muted mt-1" style="font-size:1.04rem">${esc(c.tagline || '')}</p>
    </div>

    ${kids.length ? `
      <div class="chip-row mt-2">
        ${kids.map(k => `<a class="chip" href="#/category/${k.id}">${k.icon} ${esc(k.name)} <span class="faint">${num(bottlesInCategory(k).length)}</span></a>`).join('')}
      </div>` : ''}

    <div class="bottle-cols mt-2">
      <div>
        <section class="section" style="margin-top:12px">
          ${sectionHead('Overview')}
          <div class="card prose"><p>${esc(c.overview || '')}</p></div>
        </section>
        ${c.history ? `
        <section class="section">
          ${sectionHead('History')}
          <div class="card prose"><p>${esc(c.history)}</p></div>
        </section>` : ''}
        ${c.production ? `
        <section class="section">
          ${sectionHead('How it’s made')}
          <div class="card prose"><p>${esc(c.production)}</p></div>
        </section>` : ''}
      </div>
      <aside class="bottle-aside">
        ${c.styles?.length ? `
        <div class="card">
          <div class="card-title">${icon('sparkle')} <h3>Popular styles</h3></div>
          <div style="display:grid;gap:10px">
            ${c.styles.map(s => `<div><b class="small">${esc(s.name)}</b><p class="small muted">${esc(s.description)}</p></div>`).join('')}
          </div>
        </div>` : ''}
        ${c.funFacts?.length ? `
        <div class="card">
          <div class="card-title">${icon('info')} <h3>Did you know?</h3></div>
          <div class="facts">${c.funFacts.map(f => `<div class="fact">${icon('sparkle')}<span class="small">${esc(f)}</span></div>`).join('')}</div>
        </div>` : ''}
      </aside>
    </div>

    ${featured.length ? `
    <section class="section">
      ${sectionHead('Featured')}
      ${bottleGrid(featured)}
    </section>` : ''}

    <section class="section">
      ${sectionHead(`All ${esc(c.name.toLowerCase())} bottles (${num(bottles.length)})`, browseHref, 'Filter in Browse')}
      ${bottleGrid(bottles, { emptyText: 'No bottles in this category yet.' })}
    </section>
  `;
}
