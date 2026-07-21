// DrinkCogs — pages/explore.js: the explore hub.

import { DB, bottlesInCategory } from '../db.js';
import { esc, icon, num, setTitle, plural } from '../ui.js';
import { sectionHead } from '../cards.js';

export async function render(root) {
  setTitle('Explore');
  const topCats = DB.categories.filter(c => !c.parentId);

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> Explore</div>
    <h1>Explore</h1>
    <p class="muted mt-1">Six ways into the encyclopedia.</p>

    <div class="explore-grid mt-2">
      <a class="explore-card" href="#/browse"><span class="x-emoji">🔎</span><h3>Browse & filter</h3><p>The full database with Discogs-style facets.</p><span class="x-count">${num(DB.stats.bottles)} bottles ${icon('arrowR')}</span></a>
      <a class="explore-card" href="#/countries"><span class="x-emoji">🌍</span><h3>Countries & regions</h3><p>Appellations, designations, world map.</p><span class="x-count">${num(DB.stats.countries)} countries ${icon('arrowR')}</span></a>
      <a class="explore-card" href="#/producers"><span class="x-emoji">🏭</span><h3>Distilleries & producers</h3><p>The houses, their histories, their family trees.</p><span class="x-count">${num(DB.stats.producers)} producers ${icon('arrowR')}</span></a>
      <a class="explore-card" href="#/flavors"><span class="x-emoji">🎯</span><h3>Flavors</h3><p>Chase any of 20 flavor dimensions across categories.</p><span class="x-count">${num(DB.stats.flavors)} dimensions ${icon('arrowR')}</span></a>
      <a class="explore-card" href="#/cocktails"><span class="x-emoji">🍸</span><h3>Cocktails</h3><p>Classic recipes matched to bottles in the database.</p><span class="x-count">${num(DB.stats.cocktails)} recipes ${icon('arrowR')}</span></a>
      <a class="explore-card" href="#/compare"><span class="x-emoji">⚖️</span><h3>Compare</h3><p>Put up to four bottles side by side.</p><span class="x-count">Open compare ${icon('arrowR')}</span></a>
    </div>

    <section class="section">
      ${sectionHead('Categories')}
      <div class="explore-grid">
        ${topCats.map(c => {
          const n = bottlesInCategory(c).length;
          return `
          <a class="explore-card" href="#/category/${c.id}">
            <span class="x-emoji">${c.icon}</span>
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.tagline || '')}</p>
            <span class="x-count">${plural(n, 'bottle')} ${icon('arrowR')}</span>
          </a>`;
        }).join('')}
      </div>
    </section>

    <section class="section">
      ${sectionHead('Styles')}
      <p class="muted small" style="margin-top:-8px;margin-bottom:12px">Every style string in the database — tap to filter.</p>
      <div class="chip-row">
        ${DB.styles.map(s => `<a class="chip" href="#/browse?style=${encodeURIComponent(s.name)}">${esc(s.name)} <span class="faint">${s.count}</span></a>`).join('')}
      </div>
    </section>
  `;
}
