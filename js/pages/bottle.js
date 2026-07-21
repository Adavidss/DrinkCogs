// DrinkCogs — pages/bottle.js: the drink detail page.

import { DB, bottleName, producerOf, countryOf, regionOf, catEntryOf, topCatOf, catLabelOf, bottlesOf, brandsOf, photoOf } from '../db.js';
import { esc, icon, money, num, sizeText, setTitle, availBadge, copyText, debounce, toast } from '../ui.js';
import { bottleSVG, glassSVG, labelSVG, copyBottleIcon } from '../bottle-svg.js';
import { buyLinks, reviewLinks } from '../links.js';
import { radarSVG, radarAxesFor, flavorBarsHTML } from '../charts.js';
import { recommendationsFor } from '../recommend.js';
import { bottleStrip, sectionHead } from '../cards.js';
import * as store from '../store.js';

export async function render(root, [id]) {
  const b = DB.bottleById.get(id);
  if (!b) {
    root.innerHTML = `<div class="empty"><div class="e-icon">🫥</div><h3>Bottle not found</h3><a class="btn btn-primary" href="#/browse">Browse all bottles</a></div>`;
    return;
  }
  setTitle(bottleName(b));

  const p = producerOf(b);
  const country = countryOf(b);
  const region = regionOf(b);
  const cat = catEntryOf(b);
  const top = topCatOf(b);

  const infoboxRows = [
    ['Category', cat ? `<a href="#/category/${cat.id}">${esc(cat.name)}</a>` : esc(b.category)],
    top && cat && top.id !== cat.id ? ['Family', `<a href="#/category/${top.id}">${esc(top.name)}</a>`] : null,
    b.style ? ['Style', esc(b.style)] : null,
    ['Country', country ? `<a href="#/country/${country.id}">${country.flag} ${esc(country.name)}</a>` : '—'],
    region ? ['Region', `<a href="#/region/${region.id}">${esc(region.name)}</a>${region.protected ? ' <span class="badge badge-accent" title="' + esc(region.designation || 'Protected designation') + '">Protected</span>' : ''}`] : null,
    p ? [p.type === 'brewery' ? 'Brewery' : p.type === 'winery' ? 'Winery' : p.type === 'blender' ? 'Blender' : p.type === 'brand' ? 'Producer' : 'Distillery', `<a href="#/producer/${p.id}">${esc(p.name)}</a>`] : null,
    p?.parentCompany ? ['Parent company', esc(p.parentCompany)] : null,
    b.brand ? ['Brand', esc(b.brand)] : null,
    ['Age statement', esc(b.ageStatement || '—')],
    b.vintage ? ['Vintage', String(b.vintage)] : null,
    b.releaseYear ? ['First released', String(b.releaseYear)] : null,
    ['Bottle size', sizeText(b.sizeMl)],
    ['ABV', b.abv != null ? `${num(b.abv, 1)}%` : '—'],
    b.proof != null ? ['Proof', num(b.proof, 1)] : null,
    ['MSRP', money(b.msrp)],
    b.estValue != null ? ['Est. replacement cost', money(b.estValue)] : null,
    ['Availability', availBadge(b) || esc(b.availability || '—')],
    b.limited ? ['Limited edition', 'Yes'] : null,
    b.discontinued ? ['Discontinued', 'Yes'] : null,
    b.color ? ['Color', `<span class="flex" style="gap:7px"><i style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${esc(b.color)};border:1px solid var(--border-2)"></i>${esc(b.colorName || b.color)}</span>`] : null,
    b.barrel ? ['Barrel', esc(b.barrel)] : null,
    b.finishCask ? ['Cask finish', esc(b.finishCask)] : null,
    b.filtration ? ['Filtration', esc(b.filtration)] : null,
    b.coloring ? ['Coloring', esc(b.coloring)] : null,
  ].filter(Boolean);

  const keystats = [
    b.abv != null ? [num(b.abv, 1) + '%', 'ABV'] : null,
    b.proof != null ? [num(b.proof, 1), 'Proof'] : null,
    b.ageYears ? [num(b.ageYears) + ' yr', 'Age'] : (b.ageStatement === 'NAS' ? ['NAS', 'Age'] : null),
    b.vintage ? [String(b.vintage), 'Vintage'] : null,
    [money(b.msrp), 'MSRP'],
    b.estValue != null && b.estValue !== b.msrp ? [money(b.estValue), 'Street est.'] : null,
    [sizeText(b.sizeMl), 'Size'],
  ].filter(Boolean);

  const mashRows = b.mashBill ? Object.entries(b.mashBill) : null;
  const recs = recommendationsFor(b);
  const axes = radarAxesFor(DB.flavors, [b.flavor]);
  const family = p ? bottlesOf(p.bottleIds) : [];

  const photo = photoOf(b);
  const galleryViews = [
    ...(photo ? [{
      id: 'photo', label: 'Photo',
      main: () => `<img class="stage-photo" src="${esc(photo.file)}" alt="${esc(b.name)} bottle photo" decoding="async">`,
    }] : []),
    { id: 'bottle', label: 'Illustration', main: () => bottleSVG(b, { h: 300 }) },
    { id: 'glass', label: 'In the glass', main: () => glassSVG(b, { h: 220 }) },
    { id: 'label', label: 'Label', main: () => labelSVG(b, { h: 220 }) },
  ];

  root.innerHTML = `
    <div class="breadcrumb">
      <a href="#/">Home</a> <span class="sep">/</span>
      ${top ? `<a href="#/category/${top.id}">${esc(top.name)}</a> <span class="sep">/</span>` : ''}
      ${cat && cat !== top ? `<a href="#/category/${cat.id}">${esc(cat.name)}</a> <span class="sep">/</span>` : ''}
      <span>${esc(bottleName(b))}</span>
    </div>

    <div class="bottle-hero">
      <div>
        <div class="bottle-stage" id="bottleStage">${galleryViews[0].main()}</div>
        <div class="gallery-thumbs" role="tablist" aria-label="Views">
          ${galleryViews.map((v, i) => `<button role="tab" aria-selected="${i === 0}" class="${i === 0 ? 'on' : ''}" data-view="${v.id}" title="${v.label}">
            ${v.id === 'photo' ? `<img class="thumb-photo" src="${esc(photo.file)}" alt="">`
              : v.id === 'bottle' ? bottleSVG(b, { h: 42, label: false })
              : v.id === 'glass' ? glassSVG(b, { h: 34 }) : labelSVG(b, { h: 34 })}
          </button>`).join('')}
        </div>
        ${photo ? `<p class="photo-credit">Photo: ${esc(photo.credit || 'see source')} · <a href="${esc(photo.url)}" target="_blank" rel="noopener">source</a></p>` : ''}
      </div>
      <div class="bottle-title">
        <div class="bottle-kicker">
          ${availBadge(b)}
          ${b.limited ? '<span class="badge badge-warn">Limited</span>' : ''}
          ${b.discontinued ? '<span class="badge badge-danger">Discontinued</span>' : ''}
          ${b.featured ? '<span class="badge badge-accent">Featured</span>' : ''}
        </div>
        <div class="title-row">
          <h1>${esc(b.name)}</h1>
          <button class="icon-glyph no-print" id="copyIconBtn"
                  title="Copy this bottle's icon — paste it in any chat"
                  aria-label="Copy bottle icon to clipboard">
            ${bottleSVG(b, { h: 46, label: false })}
          </button>
        </div>
        <p class="bottle-byline">
          ${p ? `by <a href="#/producer/${p.id}">${esc(p.name)}</a>` : ''}
          ${country ? ` · <a href="#/country/${country.id}">${country.flag} ${esc(country.name)}</a>` : ''}
          ${region ? ` · <a href="#/region/${region.id}">${esc(region.name)}</a>` : ''}
        </p>
        <div class="keystats">
          ${keystats.map(([v, l]) => `<div class="keystat"><div class="ks-v">${v}</div><div class="ks-l">${l}</div></div>`).join('')}
        </div>
        <div class="chip-row mt-2 no-print">
          <button class="chip" data-act="compare" data-id="${b.id}">${icon('compare')} Compare</button>
          <button class="chip" id="shareBtn">${icon('copy')} Copy link</button>
          <button class="chip" id="copyIconBtn2" title="Paste it in any chat: “Just got a new 🥃”">${icon('sparkle')} Copy icon</button>
          <a class="chip" href="#/random">${icon('dice')} Random</a>
        </div>
        <div class="prose mt-2"><p>${esc(b.description || '')}</p></div>
      </div>
    </div>

    <div class="bottle-cols">
      <div class="bottle-main">

        <section class="section" id="flavor">
          ${sectionHead('Flavor profile')}
          <div class="card">
            <div class="radar-wrap">${radarSVG(axes, [{ name: bottleName(b), color: 'var(--viz-1)', values: b.flavor }])}</div>
            ${b.tastingNotes ? `
              <div class="tasting-cols mt-2">
                ${b.tastingNotes.nose ? `<div class="card"><h4>Nose</h4><p>${esc(b.tastingNotes.nose)}</p></div>` : ''}
                ${b.tastingNotes.palate ? `<div class="card"><h4>Palate</h4><p>${esc(b.tastingNotes.palate)}</p></div>` : ''}
                ${b.tastingNotes.finish ? `<div class="card"><h4>Finish</h4><p>${esc(b.tastingNotes.finish)}</p></div>` : ''}
              </div>` : ''}
            <details class="mt-2">
              <summary class="small" style="cursor:pointer;font-weight:650;color:var(--text-soft)">Full flavor fingerprint (20 dimensions)</summary>
              <div class="mt-1">${flavorBarsHTML(DB.flavors, b.flavor)}</div>
            </details>
          </div>
        </section>

        <section class="section" id="serving">
          ${sectionHead('Serving')}
          <div class="serving-grid">
            ${b.glassware?.length ? `<div class="card"><span class="sv-emoji">🥃</span><div><h4>Glassware</h4><p>${esc(b.glassware.join(', '))}</p></div></div>` : ''}
            ${b.servingTemp ? `<div class="card"><span class="sv-emoji">🌡️</span><div><h4>Temperature</h4><p>${esc(b.servingTemp)}</p></div></div>` : ''}
            ${b.pairings?.length ? `<div class="card"><span class="sv-emoji">🍽️</span><div><h4>Food pairings</h4><p>${esc(b.pairings.join(' · '))}</p></div></div>` : ''}
          </div>
          ${(b.cocktailIds || []).length ? `
            <div class="chip-row mt-2">
              <span class="small muted" style="align-self:center">Suggested cocktails:</span>
              ${b.cocktailIds.map(cid => {
                const c = DB.cocktailById.get(cid);
                return c ? `<a class="chip" href="#/cocktail/${c.id}">🍸 ${esc(c.name)}</a>` : '';
              }).join('')}
            </div>` : ''}
        </section>

        <section class="section no-print" id="get">
          ${sectionHead('Where to buy & what people think')}
          <div class="get-grid">
            <div class="card">
              <div class="card-title">${icon('external')}<h3>Find a bottle</h3></div>
              <div class="linkout-list">
                ${buyLinks(b).map(l => `
                  <a class="linkout" href="${esc(l.url)}" target="_blank" rel="noopener nofollow">
                    <span class="lo-label">${esc(l.label)}${l.curated ? ' <span class="badge badge-accent">picked</span>' : ''}</span>
                    <span class="lo-note">${esc(l.note || '')}</span>
                    ${icon('external', 'lo-ic')}
                  </a>`).join('')}
              </div>
            </div>
            <div class="card">
              <div class="card-title">${icon('star')}<h3>Reviews & ratings</h3></div>
              <div class="linkout-list">
                ${reviewLinks(b).map(l => `
                  <a class="linkout" href="${esc(l.url)}" target="_blank" rel="noopener nofollow">
                    <span class="lo-label">${esc(l.label)}${l.curated ? ' <span class="badge badge-accent">picked</span>' : ''}</span>
                    <span class="lo-note">${esc(l.note || '')}</span>
                    ${icon('external', 'lo-ic')}
                  </a>`).join('')}
              </div>
            </div>
          </div>
          <p class="small faint mt-1">Links open third-party sites prefilled for this bottle. DrinkCogs has no affiliation and earns nothing — availability and prices vary by region; know your local laws.</p>
        </section>

        <section class="section" id="production">
          ${sectionHead('Production')}
          <div class="card prose">
            ${b.production ? `<p>${esc(b.production)}</p>` : ''}
            ${mashRows ? `
              <h3 class="mt-2 mb-1">Mash bill</h3>
              <div class="bars">
                ${mashRows.map(([g, pc], i) => `
                  <div class="bar-row"><span class="bar-label">${esc(g)}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:${pc}%;background:var(--viz-${(i % 8) + 1})"></div></div>
                    <span class="bar-val">${pc}%</span></div>`).join('')}
              </div>` : ''}
            ${b.grapes?.length ? `<h3 class="mt-2 mb-1">Grape varieties</h3><div class="chip-row">${b.grapes.map(g => `<span class="chip chip-static">🍇 ${esc(g)}</span>`).join('')}</div>` : ''}
            ${b.botanicals?.length ? `<h3 class="mt-2 mb-1">Botanicals</h3><div class="chip-row">${b.botanicals.map(g => `<span class="chip chip-static">🌿 ${esc(g)}</span>`).join('')}</div>` : ''}
          </div>
        </section>

        ${b.history ? `
        <section class="section" id="history">
          ${sectionHead('History')}
          <div class="card prose"><p>${esc(b.history)}</p></div>
        </section>` : ''}

        ${b.awards?.length ? `
        <section class="section" id="awards">
          ${sectionHead('Awards')}
          <div class="award-list">
            ${b.awards.map(a => `<div class="award">${icon('trophy')} <span>${esc(a.award)}</span><span class="a-year">${a.year || ''}</span></div>`).join('')}
          </div>
        </section>` : ''}

        ${b.facts?.length ? `
        <section class="section" id="facts">
          ${sectionHead('Interesting facts')}
          <div class="facts">${b.facts.map(f => `<div class="fact">${icon('sparkle')}<span>${esc(f)}</span></div>`).join('')}</div>
        </section>` : ''}

        ${b.timeline?.length ? `
        <section class="section" id="timeline">
          ${sectionHead('Release timeline')}
          <div class="card"><div class="tl">
            ${[...b.timeline].sort((a, z) => a.year - z.year).map(t => `
              <div class="tl-item ${t.type === 'discontinued' ? 'tl-discontinued' : ''} ${t.type === 'award' ? 'tl-award' : ''}">
                <div class="tl-year">${t.year}</div>
                <div class="tl-event">${esc(t.event)}</div>
              </div>`).join('')}
          </div></div>
        </section>` : ''}

        ${family.length > 1 && p ? `
        <section class="section" id="family">
          ${sectionHead('Bottle family')}
          <div class="card">
            <div class="tree">
              <div class="tree-root">🏭 <a href="#/producer/${p.id}">${esc(p.name)}</a></div>
              ${[...brandsOf(p).entries()].map(([brand, bottles]) => `
                <div class="tree-brand">
                  ${bottles.length > 1 || bottles[0].brand !== bottleName(bottles[0]) ? `<div class="tree-brand-name">${esc(brand)}</div>` : ''}
                  ${bottles.map(fb => `
                    <a class="tree-leaf ${fb.id === b.id ? 'current' : ''}" href="#/bottle/${fb.id}">
                      ${esc(bottleName(fb))} <span class="faint small">${fb.abv != null ? num(fb.abv, 1) + '%' : ''}</span>
                    </a>`).join('')}
                </div>`).join('')}
            </div>
          </div>
        </section>` : ''}

      </div>

      <aside class="bottle-aside">
        <div class="infobox">
          <div class="infobox-head">${esc(bottleName(b))}</div>
          <div class="kv">
            ${infoboxRows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}
          </div>
          <div class="kv-span">Prices are approximate estimates in USD.</div>
        </div>

        <div class="card colpanel no-print" id="colPanel"></div>
      </aside>
    </div>

    <section class="section" id="related">
      ${(b.relatedIds || []).length ? `
        <div class="mt-3">
          ${sectionHead('Related bottles')}
          <p class="small muted" style="margin-top:-8px;margin-bottom:12px">Curated connections — rivals, siblings and natural next steps.</p>
          ${bottleStrip(bottlesOf(b.relatedIds))}
        </div>` : ''}
      ${recs.map(shelf => `
        <div class="mt-3">
          ${sectionHead(shelf.title)}
          ${shelf.note ? `<p class="small muted" style="margin-top:-8px;margin-bottom:12px">${esc(shelf.note)}</p>` : ''}
          ${bottleStrip(shelf.bottles)}
        </div>`).join('')}
    </section>
  `;

  /* gallery switching */
  root.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    root.querySelectorAll('[data-view]').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
    btn.classList.add('on'); btn.setAttribute('aria-selected', 'true');
    const v = galleryViews.find(v => v.id === btn.dataset.view);
    root.querySelector('#bottleStage').innerHTML = v.main();
  }));

  root.querySelector('#shareBtn')?.addEventListener('click', () => copyText(location.href));

  /* copy the bottle icon as a pasteable PNG */
  const doCopyIcon = async () => {
    try {
      const how = await copyBottleIcon(b);
      toast(how === 'copied'
        ? 'Icon copied — paste it in any chat 🥂'
        : 'Clipboard blocked — icon downloaded instead');
    } catch {
      toast('Could not create the icon image');
    }
  };
  root.querySelector('#copyIconBtn')?.addEventListener('click', doCopyIcon);
  root.querySelector('#copyIconBtn2')?.addEventListener('click', doCopyIcon);

  /* collection panel */
  renderColPanel(root.querySelector('#colPanel'), b);
}

function renderColPanel(panel, b) {
  const notes = store.notesOf(b.id);
  panel.innerHTML = `
    <div class="card-title">${icon('book')} <h3>In my collection</h3> <span class="save-flash" id="saveFlash">Saved ✓</span></div>
    <div class="status-chips">
      ${store.STATUSES.map(s => `
        <button class="chip ${store.hasStatus(b.id, s.id) ? 'chip-on' : ''}" data-status="${s.id}" aria-pressed="${store.hasStatus(b.id, s.id)}">
          ${icon(s.icon)} ${s.label}
        </button>`).join('')}
    </div>
    <details class="mt-2" ${Object.keys(notes).length ? 'open' : ''}>
      <summary style="cursor:pointer;font-weight:700">Personal notes <span class="faint small">(private, stays in this browser)</span></summary>
      <div class="notes-form" id="notesForm">
        <div class="two">
          ${noteInput(b, 'purchasePlace')} ${noteInput(b, 'purchasePrice')}
        </div>
        <div class="two">
          ${noteInput(b, 'purchaseDate')} ${noteInput(b, 'openedDate')}
        </div>
        <div class="two">
          ${noteInput(b, 'finishedDate')} ${noteInput(b, 'rating')}
        </div>
        ${noteInput(b, 'wouldBuyAgain')}
        ${noteInput(b, 'tastingNotes')}
        ${noteInput(b, 'memories')}
      </div>
    </details>
  `;

  panel.querySelectorAll('[data-status]').forEach(btn => btn.addEventListener('click', () => {
    store.toggleStatus(b.id, btn.dataset.status);
    // repaint chips only (keep note inputs untouched / focused)
    panel.querySelectorAll('[data-status]').forEach(x => {
      const on = store.hasStatus(b.id, x.dataset.status);
      x.classList.toggle('chip-on', on);
      x.setAttribute('aria-pressed', on);
    });
    flash(panel);
  }));

  const save = debounce((field, value) => {
    store.setNote(b.id, field, value);
    flash(panel);
  }, 350);

  panel.querySelectorAll('[data-note]').forEach(inp => {
    const ev = inp.type === 'checkbox' || inp.type === 'date' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      let v = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (inp.type === 'number' && v !== '') v = Number(v);
      save(inp.dataset.note, v);
    });
  });
}

function noteInput(b, fieldId) {
  const f = store.NOTE_FIELDS.find(x => x.id === fieldId);
  const v = store.notesOf(b.id)[f.id];
  if (f.type === 'textarea') {
    return `<div class="field"><label for="nf-${f.id}">${f.label}</label>
      <textarea class="input" id="nf-${f.id}" data-note="${f.id}" placeholder="${esc(f.placeholder || '')}">${esc(v || '')}</textarea></div>`;
  }
  if (f.type === 'checkbox') {
    return `<label class="check"><input type="checkbox" data-note="${f.id}" ${v ? 'checked' : ''}> ${f.label}</label>`;
  }
  return `<div class="field"><label for="nf-${f.id}">${f.label}</label>
    <input class="input" id="nf-${f.id}" type="${f.type}" data-note="${f.id}" value="${esc(v ?? '')}" placeholder="${esc(f.placeholder || '')}" ${f.id === 'rating' ? 'min="0" max="100"' : ''}></div>`;
}

let flashTimer;
function flash(panel) {
  const elx = panel.querySelector('#saveFlash');
  if (!elx) return;
  elx.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => elx.classList.remove('show'), 1400);
}
