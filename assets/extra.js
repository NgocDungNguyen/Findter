/* Search > Translations, Search > Synonyms Search and Filter set > Translate pages (search-translation.html, search-synonym.html, filter-translate.html).
   Ports of the real app's pages/search/locales.jsx, components/Synonym/SynonymSet.jsx + SynonymEditForm.jsx and
   components/ManageFilter/FilterSet/Translation/TranslationEditor.jsx (same texts, rules and states). Sample data only; state lives in localStorage. */
(() => {
  'use strict';
  const body = document.getElementById('ex-body');
  if (!body) return;
  const page = body.dataset.page;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = x => JSON.parse(JSON.stringify(x));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: keep going */ } },
  };
  const load = (k, fallback) => { try { const v = JSON.parse(store.get(k) || 'null'); return v == null ? clone(fallback) : v; } catch (e) { return clone(fallback); } };
  const showToast = (msg, isError) => { const t = $('#toast'); if (t) t.classList.toggle('is-error', !!isError); if (window.__shell) window.__shell.toast(msg); };

  const ICON = {
    edit: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z"></path></svg>',
    del: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z"></path><path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z"></path><path fill-rule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z"></path></svg>',
    info: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10 14a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Z"></path><path d="M9 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"></path><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"></path></svg>',
    close: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z"></path></svg>',
    down: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M5.72 8.47a.75.75 0 0 1 1.06 0l3.47 3.47 3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z"></path></svg>',
    search: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M12.323 13.383a5.5 5.5 0 1 1 1.06-1.06l2.897 2.897a.75.75 0 1 1-1.06 1.06zm1.677-4.883a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"></path></svg>',
    back: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M17 10a.75.75 0 0 1-.75.75H6.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L6.56 9.25h9.69A.75.75 0 0 1 17 10Z"></path></svg>',
    reset: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10 4.5a5.5 5.5 0 1 0 5.2 7.3.75.75 0 1 1 1.42.48A7 7 0 1 1 10 3v-1.1a.4.4 0 0 1 .64-.32l2.4 1.8a.4.4 0 0 1 0 .64l-2.4 1.8a.4.4 0 0 1-.64-.32z"></path></svg>',
  };
  const icon = (n, cls = '') => `<span class="Polaris-Icon ex-ic ${cls}">${ICON[n]}</span>`;

  /* ---------- modal (the demo's .mf-modal) ---------- */
  function openModal({ title, content, ok, okClass, cancel, onOk, onOpen }) {
    const opener = document.activeElement;
    const scrim = document.createElement('div'); scrim.className = 'mf-scrim'; scrim.setAttribute('data-mfp', '');
    scrim.innerHTML = `<div class="mf-modal" role="dialog" aria-modal="true" aria-labelledby="ex-m-title"><div class="mf-modal__head"><h2 class="mf-modal__title" id="ex-m-title">${esc(title)}</h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON.close}</button></div><div class="mf-modal__body">${content}</div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-m="cancel">${esc(cancel)}</button><button type="button" class="mf-btn ${okClass || 'mf-btn--primary'}" data-m="ok">${esc(ok)}</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => { document.removeEventListener('keydown', onKey, true); scrim.remove(); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); };
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    scrim.addEventListener('mousedown', e => { if (e.target === scrim) close(); });
    $('.mf-modal__x', scrim).addEventListener('click', close);
    $('[data-m=cancel]', scrim).addEventListener('click', close);
    $('[data-m=ok]', scrim).addEventListener('click', () => { if (onOk() !== false) close(); });
    if (onOpen) onOpen(scrim);
    return scrim;
  }

  /* ---------- contextual save bar (useFindterSaveBar), same look as the Sort page ---------- */
  const bar = document.createElement('div');
  bar.className = 'so-savebar'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Unsaved changes');
  bar.innerHTML = '<div class="so-savebar__t"><span>Unsaved changes</span></div><div class="so-savebar__a"><button type="button" class="so-sbtn so-sbtn--discard" data-b="discard">Discard</button><button type="button" class="so-sbtn so-sbtn--save" data-b="save">Save</button></div>';
  ($('.sh-main') || document.body).appendChild(bar);

  /* ===================== Search > Translations (pages/search/locales.jsx) ===================== */
  function translationsPage() {
    const KEY = 'findter.searchLocales.v1';
    const LOCALES = [['fr', 'French'], ['de', 'German'], ['es', 'Spanish'], ['it', 'Italian'], ['nl', 'Dutch'], ['pt-PT', 'Portuguese (Portugal)'], ['ja', 'Japanese'], ['vi', 'Vietnamese']];
    const name = c => (LOCALES.find(l => l[0] === c) || [c, c])[1];
    let saved = load(KEY, ['fr', 'de']), selected = [...saved], query = '', open = false, saving = false;
    const dirty = () => selected.length !== saved.length || selected.some(c => !saved.includes(c));
    const options = () => { const q = query.trim().toLowerCase(); return LOCALES.filter(([c, n]) => !q || n.toLowerCase().includes(q) || c.toLowerCase().includes(q)); };
    function render(blur) {
      const keepFocus = !blur && document.activeElement && document.activeElement.id === 'ex-loc-input';
      body.innerHTML = `<section class="ex-card"><div class="ex-col">
        <div class="ex-col ex-col--tight"><h2 class="ex-h">Translations</h2><p class="ex-sub">Select the languages to translate your product titles, descriptions, and metafields into. Translations are sourced from Shopify Translate &amp; Adapt.</p></div>
        ${saved.length === 0 ? `<div class="ex-note" role="status">${icon('info')}<p>Select the languages you want to translate indexed product content into, then click Save.</p></div>` : ''}
        <div class="ex-field ex-combo"><label for="ex-loc-input" class="ex-label">Languages</label>
          <div class="ex-input-wrap">${icon('search', 'ex-prefix')}<input id="ex-loc-input" class="mf-input ex-input--prefix" type="text" autocomplete="off" role="combobox" aria-expanded="${open}" placeholder="Search and select languages" value="${esc(query)}"></div>
          <div class="mf-pop" id="ex-loc-pop" role="listbox" aria-multiselectable="true"${open ? '' : ' hidden'}>${options().length ? options().map(([c, n]) => `<div class="mf-opt" role="option" data-code="${c}" aria-selected="${selected.includes(c)}"><input type="checkbox" class="pg-check" tabindex="-1"${selected.includes(c) ? ' checked' : ''}><span class="mf-opt__name">${esc(n)} (${c})</span></div>`).join('') : '<div class="mf-opt mf-opt--empty">No languages found</div>'}</div></div>
        ${selected.length ? `<div class="ex-col ex-col--tight"><h3 class="ex-h3">Selected languages</h3><div class="ex-tags">${selected.map(c => `<span class="ex-tag"><span>${esc(name(c))} (${c})</span><button type="button" class="ex-tag__x" data-rm="${c}" aria-label="Remove ${esc(name(c))}">${ICON.close}</button></span>`).join('')}</div></div>` : ''}
      </div></section>
      <div class="ex-actions"><button type="button" class="ex-btn ex-btn--primary${saving ? ' is-loading' : ''}" data-act="save"${!dirty() || saving ? ' disabled' : ''}>Save</button></div>`;
      if (keepFocus) { const i = $('#ex-loc-input'); i.focus({ preventScroll: true }); const l = i.value.length; i.setSelectionRange(l, l); }
    }
    const toggle = c => { selected = selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c]; };
    body.addEventListener('focusin', e => { if (e.target.id === 'ex-loc-input' && !open) { open = true; render(); } });
    body.addEventListener('input', e => { if (e.target.id === 'ex-loc-input') { query = e.target.value; open = true; render(); } });
    body.addEventListener('mousedown', e => { if (e.target.closest('.mf-opt[data-code]')) e.preventDefault(); });   // keep the field focused while picking
    body.addEventListener('click', e => {
      const opt = e.target.closest('.mf-opt[data-code]'); if (opt) { toggle(opt.dataset.code); render(); return; }
      const rm = e.target.closest('[data-rm]'); if (rm) { toggle(rm.dataset.rm); render(); return; }
      const sv = e.target.closest('[data-act=save]');
      if (sv && !sv.disabled) {
        saving = true; render();
        setTimeout(() => { saving = false; saved = [...selected]; store.set(KEY, JSON.stringify(saved)); render(); showToast('Languages updated. Translated content will refresh shortly.'); }, 450);
      }
    });
    document.addEventListener('mousedown', e => { if (open && !e.target.closest('.ex-combo')) { open = false; query = ''; render(true); } });
    render();
  }

  /* ===================== Search > Synonyms Search (SynonymSet.jsx + SynonymEditForm.jsx) ===================== */
  function synonymsPage() {
    const KEY = 'findter.synonyms.v1', MAX = 10;
    const SEED = [
      { id: 1, status: true, name: 'tv', relation: 'one_way', synonym_term: ['television', 'telly'] },
      { id: 2, status: true, name: 'sneakers', relation: 'two_ways', synonym_term: ['trainers', 'kicks'] },
      { id: 3, status: false, name: 'tshirt', relation: 'one_way', synonym_term: ['t-shirt', 'tee', 'tea shirt'] },
    ];
    let rows = load(KEY, SEED);
    const persist = () => store.set(KEY, JSON.stringify(rows));
    const REL = { one_way: 'One-way', two_ways: 'Two-ways' };
    const tip = `<div class="ex-tip" role="tooltip"><p><b>One-way</b></p><p>Searching the Search Term also returns results for its synonyms, but not the reverse.</p><p>e.g. Typing "tv" also shows television results. Typing "television" won't show "tv" results.</p><p class="ex-tip__gap"><b>Two-ways</b></p><p>All terms are equal. Searching any one returns results for all of them.</p><p>e.g. "sneakers" &lt;=&gt; "trainers": searching either one finds both.</p></div>`;
    function render() {
      body.innerHTML = `<section class="ex-card">${rows.length ? `
        <div class="ex-row-between"><h2 class="ex-h">Synonyms Search</h2><button type="button" class="ex-btn ex-btn--primary" data-act="add">Add new synonym</button></div>
        <div class="ex-tablewrap"><table class="ex-table"><thead><tr><th class="ex-w10">Status</th><th class="ex-w20">Search term</th><th class="ex-w20"><span class="ex-th-rel">Relation<span class="ex-info" tabindex="0" aria-label="Relation help">${icon('info')}${tip}</span></span></th><th>Synonyms</th><th>Action</th></tr></thead><tbody>
        ${rows.map(r => `<tr data-id="${r.id}"><td><input type="checkbox" class="pg-switch" role="switch" data-act="toggle" aria-label="Status"${r.status ? ' checked' : ''}></td><td><b>${esc(r.name)}</b></td><td>${REL[r.relation]}</td><td><div class="ex-tags">${r.synonym_term.map(t => `<span class="ex-tag ex-tag--static">${esc(t)}</span>`).join('')}</div></td><td><div class="ex-actions-cell"><button type="button" class="ex-iconbtn" data-act="edit" aria-label="Edit">${icon('edit')}</button><button type="button" class="ex-iconbtn" data-act="delete" aria-label="Delete">${icon('del')}</button></div></td></tr>`).join('')}
        </tbody></table></div>` : `
        <div class="ex-empty"><img src="assets/img/emptystate-files-10e84ca8.png" alt=""><h2>No synonyms yet</h2><p>Add synonyms to help shoppers find products even when they search with different words, typos, or abbreviations.</p><button type="button" class="ex-btn ex-btn--primary" data-act="add">Add new synonym</button></div>`}
      </section>`;
    }
    function openEdit(row) {
      const isNew = !row;
      let terms = row ? [...row.synonym_term] : [], status = row ? row.status : true, relation = row ? row.relation : 'one_way';
      openModal({
        title: isNew ? 'Add new synonym' : 'Edit synonym', ok: 'Save', cancel: 'Cancel',
        content: `<div class="ex-form">
          <label class="ex-switchrow"><input type="checkbox" class="pg-switch" role="switch" id="ex-s-status"${status ? ' checked' : ''}><span>Toggle on to enable the synonym. Toggle off to disable it.</span></label>
          <div class="mf-field"><label class="ex-label" for="ex-s-name">Search term</label><input id="ex-s-name" class="mf-input" autocomplete="off" value="${esc(row ? row.name : '')}"><p class="mf-help mf-help--error" id="ex-s-name-err"></p></div>
          <div class="mf-field"><span class="ex-label">Relation</span><div class="ex-radios"><label class="ex-radio"><input type="radio" name="ex-rel" value="one_way"${relation === 'one_way' ? ' checked' : ''}><span>One-way</span></label><label class="ex-radio"><input type="radio" name="ex-rel" value="two_ways"${relation === 'two_ways' ? ' checked' : ''}><span>Two-ways</span></label></div></div>
          <div class="mf-field"><div class="ex-row-between"><label class="ex-label" for="ex-s-terms">Synonyms &amp; Common Misspellings</label><span class="ex-sub" id="ex-s-count"></span></div>
            <div class="ex-taginput" id="ex-s-box"><span id="ex-s-tags" class="ex-tags"></span><input id="ex-s-terms" autocomplete="off"></div>
            <p class="mf-help mf-help--error" id="ex-s-terms-err"></p>
            <p class="ex-sub">Up to ${MAX} synonyms per search term. Each one adds work to every search that matches this term.</p></div></div>`,
        onOpen: scrim => {
          const input = $('#ex-s-terms', scrim), tags = $('#ex-s-tags', scrim);
          const draw = () => { tags.innerHTML = terms.map((t, i) => `<span class="ex-tag"><span>${esc(t)}</span><button type="button" class="ex-tag__x" data-i="${i}" aria-label="Remove ${esc(t)}">${ICON.close}</button></span>`).join(''); $('#ex-s-count', scrim).textContent = terms.length + '/' + MAX; };
          const commit = () => {
            const parts = input.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            if (!parts.length) return; const err = $('#ex-s-terms-err', scrim);
            parts.forEach(p => { if (!terms.includes(p) && terms.length < MAX) terms.push(p); else if (terms.length >= MAX) err.textContent = `A search term can have at most ${MAX} synonyms`; });
            input.value = ''; if (terms.length) err.textContent = terms.length >= MAX && parts.length > 1 ? err.textContent : ''; draw();
          };
          input.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !input.value && terms.length) { terms.pop(); draw(); } });
          input.addEventListener('blur', commit);
          $('#ex-s-box', scrim).addEventListener('click', e => { const x = e.target.closest('[data-i]'); if (x) { terms.splice(+x.dataset.i, 1); $('#ex-s-terms-err', scrim).textContent = ''; draw(); } input.focus(); });
          $('#ex-s-status', scrim).addEventListener('change', e => { status = e.target.checked; });
          $$('[name=ex-rel]', scrim).forEach(r => r.addEventListener('change', () => { relation = r.value; }));
          $('#ex-s-name', scrim).addEventListener('input', e => { $('#ex-s-name-err', scrim).textContent = ''; e.target.classList.remove('mf-input--error'); });
          input.addEventListener('input', () => { $('#ex-s-terms-err', scrim).textContent = ''; });
          draw(); $('#ex-s-name', scrim).focus();
        },
        onOk: () => {
          const nameEl = $('#ex-s-name'); const nm = nameEl.value.trim();
          const nErr = $('#ex-s-name-err'), tErr = $('#ex-s-terms-err'); nErr.textContent = ''; tErr.textContent = ''; nameEl.classList.remove('mf-input--error');
          const pending = $('#ex-s-terms').value.trim(); if (pending) { $('#ex-s-terms').dispatchEvent(new Event('blur')); }
          let bad = false;
          if (!nm) { nErr.textContent = 'This field is required'; nameEl.classList.add('mf-input--error'); bad = true; }
          else if (nm.includes(',')) { nErr.textContent = 'Commas are not allowed'; nameEl.classList.add('mf-input--error'); bad = true; }
          if (!terms.length) { tErr.textContent = 'Synonym cannot be empty'; bad = true; }
          else if (terms.includes(nm.toLowerCase())) { tErr.textContent = 'Synonym cannot match the search term'; bad = true; }
          if (bad) return false;
          const next = { id: row ? row.id : Date.now(), status, name: nm, relation, synonym_term: [...terms] };
          rows = row ? rows.map(r => r.id === row.id ? next : r) : [...rows, next];
          persist(); render(); showToast('Save successfully'); return true;
        },
      });
    }
    function openDelete(row) {
      openModal({ title: 'Delete confirmation', content: '<p class="mf-modal__text">This synonym set will be permanently deleted. Are you sure you want to proceed?</p>', ok: 'Delete', okClass: 'mf-btn--critical', cancel: 'Cancel',
        onOk: () => { rows = rows.filter(r => r.id !== row.id); persist(); render(); showToast('Deleted successfully'); } });
    }
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const tr = b.closest('tr'); const row = tr && rows.find(r => r.id === +tr.dataset.id);
      if (b.dataset.act === 'add') openEdit(null);
      else if (b.dataset.act === 'edit') openEdit(row);
      else if (b.dataset.act === 'delete') openDelete(row);
    });
    body.addEventListener('change', e => {
      const t = e.target.closest('[data-act=toggle]'); if (!t) return;
      const row = rows.find(r => r.id === +t.closest('tr').dataset.id); row.status = t.checked; persist(); showToast('Change status success');
    });
    render();
  }

  /* ===================== Filter set > Translate (pages/filter/set/[name]/translations.jsx + TranslationEditor.jsx) ===================== */
  function filterTranslatePage() {
    const KEY = 'findter.filterTranslations.v1';
    const LANGS = [['fr', 'French'], ['de', 'German']];
    const OPTIONS = [
      { id: 'o1', label: 'Availability', groups: [], values: ['In stock', 'Out of stock'] },
      { id: 'o2', label: 'Color', groups: [{ id: 'g1', label: 'Warm colors', values: ['Red', 'Orange'] }], values: ['Blue', 'Black'] },
      { id: 'o3', label: 'Product type', groups: [], values: ['T-shirts', 'Hoodies', 'Jackets'] },
    ];
    const SUGGEST = { fr: { 'In stock': 'En stock', 'Out of stock': 'Rupture de stock', Red: 'Rouge', Blue: 'Bleu', Black: 'Noir', Availability: 'Disponibilité', Color: 'Couleur' }, de: { 'In stock': 'Auf Lager', 'Out of stock': 'Nicht vorrätig', Red: 'Rot', Blue: 'Blau', Black: 'Schwarz', Availability: 'Verfügbarkeit', Color: 'Farbe' } };
    let locale = LANGS[0][0], all = load(KEY, {}), fields = clone(all[locale] || {}), initial = clone(fields), expanded = new Set(['o1']), resyncing = false;
    const edited = () => JSON.stringify(fields) !== JSON.stringify(initial);
    const field = (key, label, ph) => `<input class="mf-input" autocomplete="off" aria-label="${esc(label)}" data-k="${esc(key)}" placeholder="${esc((SUGGEST[locale] || {})[ph] || ph)}" value="${esc(fields[key] || '')}">`;
    const valueRow = (oid, v) => `<div class="ex-trow"><span class="ex-tlabel">${esc(v)}</span>${field(oid + ':v:' + v, 'Value label translation', v)}</div>`;
    function render() {
      body.innerHTML = `<section class="ex-card"><div class="ex-resync"><div class="mf-field ex-lang"><label class="ex-label" for="ex-lang">Language</label><div class="Polaris-Select"><select id="ex-lang" class="Polaris-Select__Input">${LANGS.map(([c, n]) => `<option value="${c}"${c === locale ? ' selected' : ''}>${n}</option>`).join('')}</select><div class="Polaris-Select__Content" aria-hidden="true"><span class="Polaris-Select__SelectedOption">${esc(LANGS.find(l => l[0] === locale)[1])}</span><span class="Polaris-Select__Icon"><span class="Polaris-Icon">${ICON.down}</span></span></div><div class="Polaris-Select__Backdrop"></div></div></div>
        <button type="button" class="ex-btn${resyncing ? ' is-loading' : ''}" data-act="resync"${resyncing ? ' disabled' : ''}>${icon('reset', 'ex-btn__ic')}Resync native translations</button></div></section>
        ${OPTIONS.map(o => { const open = expanded.has(o.id); return `<section class="ex-card"><div class="ex-col ex-col--tight">
          <div class="ex-row-between ex-toggle" role="button" tabindex="0" aria-expanded="${open}" aria-controls="ex-o-${o.id}" aria-label="${open ? 'Collapse option' : 'Expand option'}" data-o="${o.id}"><h3 class="ex-h3">${esc(o.label)}</h3><span class="ex-chev${open ? ' is-open' : ''}">${icon('down')}</span></div>
          <div id="ex-o-${o.id}" class="ex-collapse"${open ? '' : ' hidden'}><div class="ex-col">
            ${field(o.id + ':o', 'Option label translation', o.label)}
            ${o.groups.map(g => `<div class="ex-col ex-col--tight"><div class="ex-trow"><span class="ex-tlabel"><span>${esc(g.label)}</span><span class="Polaris-Badge Polaris-Badge--toneInfo"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Group</span></span></span>${field(o.id + ':g:' + g.id, 'Group label translation', g.label)}</div><div class="ex-indent ex-col ex-col--tight">${g.values.map(v => valueRow(o.id, v)).join('')}</div></div>`).join('')}
            ${o.values.map(v => valueRow(o.id, v)).join('')}
          </div></div></div></section>`; }).join('')}`;
    }
    const syncBar = () => { bar.hidden = !edited(); };
    function save() { all[locale] = clone(fields); store.set(KEY, JSON.stringify(all)); initial = clone(fields); syncBar(); showToast('Save successfully'); }
    $('[data-b=save]', bar).addEventListener('click', save);
    $('[data-b=discard]', bar).addEventListener('click', () => { fields = clone(initial); render(); syncBar(); });
    body.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; if (e.target.value) fields[k] = e.target.value; else delete fields[k]; syncBar(); });
    const toggleOpt = id => { expanded.has(id) ? expanded.delete(id) : expanded.add(id); render(); const el = $(`[data-o="${id}"]`); if (el) el.focus({ preventScroll: true }); };
    body.addEventListener('click', e => {
      const t = e.target.closest('[data-o]'); if (t) { toggleOpt(t.dataset.o); return; }
      const r = e.target.closest('[data-act=resync]');
      if (r && !resyncing) { resyncing = true; render(); setTimeout(() => { resyncing = false; render(); showToast('Translation resync started. Translated content will refresh shortly.'); }, 600); }
    });
    body.addEventListener('keydown', e => { const t = e.target.closest && e.target.closest('[data-o]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleOpt(t.dataset.o); } });
    body.addEventListener('change', e => {
      if (e.target.id !== 'ex-lang') return;
      const next = e.target.value;
      if (edited()) {
        e.target.value = locale;
        openModal({ title: 'Discard unsaved translations?', content: '<p class="mf-modal__text">Switching language will discard your unsaved translation changes.</p>', ok: 'Discard changes', okClass: 'mf-btn--critical', cancel: 'Cancel',
          onOk: () => { locale = next; fields = clone(all[locale] || {}); initial = clone(fields); render(); syncBar(); } });
      } else { locale = next; fields = clone(all[locale] || {}); initial = clone(fields); render(); }
    });
    render();
  }

  ({ translations: translationsPage, synonyms: synonymsPage, 'filter-translate': filterTranslatePage }[page] || (() => {}))();
})();

// phone: bring the current Search tab into view in the sideways-scrolling tab row (after fonts and layout settle)
window.addEventListener('load', () => {
  const t = document.querySelector('.fdt-menu-tabs .Polaris-Tabs__Tab--active'), w = t && t.closest('.Polaris-Tabs__ButtonWrapper');
  if (w) w.scrollLeft = Math.max(0, t.closest('li').offsetLeft + t.closest('li').offsetWidth - w.clientWidth);
});
