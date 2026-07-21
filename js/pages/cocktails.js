// DrinkCogs — pages/cocktails.js: cocktail directory + recipe pages.

import { DB, bottlesOf } from '../db.js';
import { esc, icon, setTitle, plural } from '../ui.js';
import { bottleGrid, sectionHead } from '../cards.js';
import * as store from '../store.js';

export async function renderIndex(root) {
  setTitle('Cocktails');
  const list = [...DB.cocktails].sort((a, b) => a.name.localeCompare(b.name));
  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/explore">Explore</a> <span class="sep">/</span> Cocktails</div>
    <h1>Cocktails</h1>
    <p class="muted mt-1">${plural(list.length, 'classic recipe')}, each matched to bottles from the encyclopedia.</p>
    <div class="cocktail-grid mt-2">
      ${list.map(c => `
        <a class="cocktail-card" href="#/cocktail/${c.id}">
          <span class="ck-era">${esc(c.era || '')}</span>
          <h3>🍸 ${esc(c.name)}</h3>
          <p>${esc((c.description || '').slice(0, 110))}${(c.description || '').length > 110 ? '…' : ''}</p>
          <p class="small mt-1" style="font-weight:700;color:var(--accent-strong)">${esc(c.glass || '')}</p>
        </a>`).join('')}
    </div>
  `;
}

export async function renderOne(root, [id]) {
  const c = DB.cocktailById.get(id);
  if (!c) {
    root.innerHTML = `<div class="empty"><div class="e-icon">🍸</div><h3>Cocktail not found</h3><a class="btn btn-primary" href="#/cocktails">All cocktails</a></div>`;
    return;
  }
  setTitle(c.name);
  const suited = bottlesOf(c.suitedBottleIds || []);
  const mentioned = bottlesOf(c.bottleIds || []).filter(b => !suited.includes(b));
  const inMyBar = [...suited, ...mentioned].filter(b => store.hasStatus(b.id, 'owned'));

  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> <a href="#/cocktails">Cocktails</a> <span class="sep">/</span> <span>${esc(c.name)}</span></div>
    <h1>🍸 ${esc(c.name)}</h1>
    <div class="chip-row mt-1">
      ${c.era ? `<span class="chip chip-static">${icon('clock')} ${esc(c.era)}</span>` : ''}
      ${c.origin ? `<span class="chip chip-static">${icon('pin')} ${esc(c.origin)}</span>` : ''}
      ${c.glass ? `<span class="chip chip-static">${icon('glass')} ${esc(c.glass)}</span>` : ''}
    </div>
    <div class="prose mt-2"><p>${esc(c.description || '')}</p></div>

    <div class="recipe mt-3">
      <div class="card">
        <div class="card-title">${icon('list')} <h3>Ingredients</h3></div>
        <ul class="ingredients">
          ${(c.ingredients || []).map(i => `<li><span>${esc(i.item)}</span><span class="amt">${esc(i.amount)}</span></li>`).join('')}
        </ul>
        ${c.garnish ? `<p class="small muted mt-2"><b>Garnish:</b> ${esc(c.garnish)}</p>` : ''}
      </div>
      <div class="card">
        <div class="card-title">${icon('check')} <h3>Method</h3></div>
        <ol class="method">
          ${(c.method || []).map(m => `<li>${esc(m)}</li>`).join('')}
        </ol>
      </div>
    </div>

    ${inMyBar.length ? `
    <section class="section">
      ${sectionHead('From your shelf')}
      <p class="muted small" style="margin-top:-8px;margin-bottom:12px">Bottles you own that work in this drink.</p>
      ${bottleGrid(inMyBar)}
    </section>` : ''}

    ${suited.length ? `
    <section class="section">
      ${sectionHead('Bottles that shine here')}
      ${bottleGrid(suited)}
    </section>` : ''}

    ${mentioned.length ? `
    <section class="section">
      ${sectionHead('Also suggested for this drink')}
      ${bottleGrid(mentioned)}
    </section>` : ''}
  `;
}
