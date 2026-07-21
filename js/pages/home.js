// DrinkCogs — pages/home.js

import { DB, bottlesOf, catColor } from '../db.js';
import { esc, icon, num, setTitle } from '../ui.js';
import { bottleGrid, bottleStrip, sectionHead } from '../cards.js';

export async function render(root) {
  setTitle();
  const s = DB.stats;
  const featured = DB.bottles.filter(b => b.featured);
  const recent = [...DB.bottles].slice(-8).reverse();
  const topCats = DB.categories.filter(c => !c.parentId);

  root.innerHTML = `
    <section class="home-hero">
      <h1>The encyclopedia of<br>exceptional drinks</h1>
      <p class="tagline">${num(s.bottles)} bottles · ${num(s.producers)} producers · ${num(s.countries)} countries — plus your own private collection, notes and shelf.</p>
      <form class="home-search" id="homeSearch" role="search">
        <span class="hs-icon">${icon('search')}</span>
        <input type="search" placeholder="Try “Lagavulin”, “wheated bourbon”, “Oaxaca”…" aria-label="Search the encyclopedia" autocomplete="off">
        <button class="hs-go" type="submit" aria-label="Search">${icon('arrowR')}</button>
      </form>
      <div class="home-quick">
        ${['bourbon', 'scotch-whisky', 'gin', 'tequila', 'red-wine', 'beer', 'sake'].map(id => {
          const c = DB.categoryById.get(id);
          return c ? `<a class="chip" href="#/category/${c.id}">${c.icon} ${esc(c.name)}</a>` : '';
        }).join('')}
        <a class="chip" href="#/random">${icon('dice')} Random bottle</a>
      </div>
      <div class="home-stats">
        <span><b>${num(s.bottles)}</b> bottles</span>
        <span><b>${num(s.producers)}</b> producers</span>
        <span><b>${num(s.countries)}</b> countries</span>
        <span><b>${num(s.cocktails)}</b> cocktails</span>
        <span><b>${num(s.avgAbv, 1)}%</b> avg ABV</span>
      </div>
    </section>

    <section class="section">
      ${sectionHead('Featured bottles', '#/browse?featured=1')}
      ${bottleStrip(featured)}
    </section>

    <section class="section">
      ${sectionHead('Explore the encyclopedia')}
      <div class="explore-grid">
        <a class="explore-card" href="#/browse">
          <span class="x-emoji">🔎</span><h3>Browse everything</h3>
          <p>Discogs-style filters: category, country, proof, age, price, cask finish, flavor…</p>
          <span class="x-count">${num(s.bottles)} bottles ${icon('arrowR')}</span>
        </a>
        <a class="explore-card" href="#/countries">
          <span class="x-emoji">🌍</span><h3>By country</h3>
          <p>Travel the world through its drinks — protected regions, appellations and traditions.</p>
          <span class="x-count">${num(s.countries)} countries ${icon('arrowR')}</span>
        </a>
        <a class="explore-card" href="#/producers">
          <span class="x-emoji">🏭</span><h3>By distillery</h3>
          <p>Histories, master distillers, family trees and every bottle each house makes.</p>
          <span class="x-count">${num(s.producers)} producers ${icon('arrowR')}</span>
        </a>
        <a class="explore-card" href="#/flavors">
          <span class="x-emoji">🎯</span><h3>By flavor</h3>
          <p>Twenty curated dimensions — chase smoke, honey, funk or oak across every category.</p>
          <span class="x-count">${num(s.flavors)} dimensions ${icon('arrowR')}</span>
        </a>
        <a class="explore-card" href="#/cocktails">
          <span class="x-emoji">🍸</span><h3>Cocktails</h3>
          <p>Classic recipes with the right bottles from the encyclopedia — and from your shelf.</p>
          <span class="x-count">${num(s.cocktails)} recipes ${icon('arrowR')}</span>
        </a>
        <a class="explore-card" href="#/collection">
          <span class="x-emoji">📚</span><h3>Your collection</h3>
          <p>Track owned, opened and wishlisted bottles with private notes. Stored only in your browser.</p>
          <span class="x-count">Open your shelf ${icon('arrowR')}</span>
        </a>
      </div>
    </section>

    <section class="section">
      ${sectionHead('Every category', '#/explore')}
      <div class="cat-tiles">
        ${topCats.map(c => `
          <a class="cat-tile" href="#/category/${c.id}" style="border-left: 4px solid ${catColor(c.category)}">
            <span class="ct-emoji">${c.icon}</span> ${esc(c.name)}
            <span class="ct-n">${num(DB.bottles.filter(b => b.category === c.category).length)}</span>
          </a>`).join('')}
      </div>
    </section>

    <section class="section">
      ${sectionHead('New in the database', '#/browse')}
      ${bottleGrid(recent)}
    </section>
  `;

  const form = root.querySelector('#homeSearch');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = form.querySelector('input').value.trim();
    location.hash = q ? `#/browse?q=${encodeURIComponent(q)}` : '#/browse';
  });
}
