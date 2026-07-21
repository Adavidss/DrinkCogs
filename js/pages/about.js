// DrinkCogs — pages/about.js

import { DB } from '../db.js';
import { esc, icon, num, setTitle, modal, toast } from '../ui.js';
import * as store from '../store.js';

export async function render(root) {
  setTitle('About');
  root.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> About</div>
    <h1>About DrinkCogs</h1>
    <div class="about-cols mt-2">
      <div style="display:grid;gap:16px">
        <div class="card prose">
          <h3>What this is</h3>
          <p class="mt-1">DrinkCogs is an interactive encyclopedia of alcoholic beverages — ${num(DB.stats.bottles)} bottles across whiskey, rum, gin, agave spirits, brandy, liqueurs, wine, beer, sake, soju, cider and ready-to-drink cocktails — crossed with a personal collection manager. Think of it as Discogs for drinks: curated metadata instead of community reviews, flavor fingerprints instead of star ratings.</p>
          <p>It's a fully static site. There is no backend, no account, no analytics. The encyclopedia ships as JSON files; your collection, notes and theme live only in this browser's local storage.</p>
        </div>
        <div class="card prose">
          <h3>Your data & privacy</h3>
          <p class="mt-1">Everything personal — statuses, purchase prices, tasting notes, memories — is stored in <code>localStorage</code> on this device. Nothing is ever uploaded. Use <b>Collection → JSON</b> to back it up or move it to another browser, and <b>Import</b> to restore it.</p>
          <p>Clearing your browser data clears your collection, so export a backup now and then.</p>
        </div>
        <div class="card prose">
          <h3>The data</h3>
          <p class="mt-1">Entries are curated by hand with real-world facts: distillery histories, mash bills where disclosed, protected designations, honest availability, and approximate USD prices (MSRP and realistic street/secondary estimates — bourbon allocation madness included). Corrections and additions are welcome on <a href="https://github.com/Adavidss/DrinkCogs" target="_blank" rel="noopener">GitHub ${icon('external')}</a> — adding a bottle is one JSON entry.</p>
          <p>All bottle imagery is original procedural illustration generated from each bottle's shape, color and category. Trademarks and brand names belong to their owners and are used here for identification in an encyclopedic context.</p>
        </div>
        <div class="card prose">
          <h3>Offline & app install</h3>
          <p class="mt-1">DrinkCogs is a PWA: after your first visit the whole encyclopedia is cached and works offline. On mobile, use “Add to Home Screen” to install it like an app.</p>
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-title">${icon('info')} <h3>Keyboard shortcuts</h3></div>
          <ul class="kbd-list">
            <li><kbd class="key">/</kbd> Focus search</li>
            <li><kbd class="key">r</kbd> Random bottle</li>
            <li><kbd class="key">↑</kbd><kbd class="key">↓</kbd> Move through suggestions</li>
            <li><kbd class="key">Esc</kbd> Close menus</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">${icon('chart')} <h3>Database</h3></div>
          <ul class="kbd-list">
            <li>${num(DB.stats.bottles)} bottles</li>
            <li>${num(DB.stats.producers)} producers</li>
            <li>${num(DB.stats.countries)} countries · ${num(DB.regions.length)} regions</li>
            <li>${num(DB.categories.length)} category pages</li>
            <li>${num(DB.stats.cocktails)} cocktail recipes</li>
            <li>${num(DB.stats.flavors)} flavor dimensions</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">${icon('trash')} <h3>Reset</h3></div>
          <p class="small muted">Wipe all local DrinkCogs data (collection, notes, theme) from this browser.</p>
          <button class="btn btn-danger btn-sm mt-2" id="resetBtn">${icon('trash')} Reset local data</button>
        </div>
        <p class="small faint">Please enjoy responsibly. This site is an encyclopedia, not an endorsement — know your local laws and limits.</p>
      </div>
    </div>
  `;

  root.querySelector('#resetBtn').addEventListener('click', () => {
    const m = modal(`
      <h3>Reset all local data?</h3>
      <p class="muted">Collection, personal notes, compare tray and theme will be wiped from this browser. This cannot be undone.</p>
      <div class="flex mt-2" style="justify-content:flex-end">
        <button class="btn" id="mCancel">Cancel</button>
        <button class="btn btn-danger" id="mWipe">Reset everything</button>
      </div>`);
    m.root.querySelector('#mCancel').addEventListener('click', m.close);
    m.root.querySelector('#mWipe').addEventListener('click', () => {
      store.clearAll();
      store.clearCompare();
      try { localStorage.removeItem(store.THEME_KEY); } catch { /* ignore */ }
      m.close();
      toast('All local data cleared');
      location.hash = '#/';
    });
  });
}
