/* Search page (search.html): two more containers under "Search field": "No results suggestions" (up to 5 products shown when a search finds nothing)
   and "Zero character suggestions" (up to 10 products shown when a shopper opens search without typing). Drawn with the app's Polaris markup (tools/build/pl.js).
   Edits are a draft: they enable the page's own Save (the black "Unsaved changes" bar, like the search fields above) and are stored in localStorage on Save. */
(() => {
  'use strict';
  if (!window.FindterUI || !window.FindterCatalog || !window.FindterPL) return;
  const anchor = document.querySelector('.ss-table');
  if (!anchor) return;
  const { $, $$, store } = window.FindterUI;
  const P = window.FindterPL, esc = P.esc;
  const { PRODUCTS, money } = window.FindterCatalog;
  const pageSave = () => $$('button.Polaris-Button--variantPrimary').find(x => /^Save$/.test(x.textContent.trim()));
  const markDirty = () => { const b = pageSave(); if (b) { b.classList.remove('Polaris-Button--disabled'); b.removeAttribute('aria-disabled'); b.removeAttribute('tabindex'); } };

  const CARDS = [
    { key: 'findter.noResultSuggest.v2', id: 'nr', title: 'No results suggestions', sub: 'Show helpful content when a search returns no results.', list: 'Product suggestions', limit: 5, hint: 'Up to 5 products shown when no results are found.', seed: [1, 2, 6] },
    { key: 'findter.zeroCharSuggest.v2', id: 'zc', title: 'Zero character suggestions', sub: 'Products shown when a shopper opens search without typing anything.', list: 'Products', limit: 10, hint: 'Up to 10 products shown before the shopper types.', seed: [1, 2, 6, 9, 10, 5, 8, 3] },
  ];
  const layout = anchor.closest('.Polaris-Layout');
  const lastSection = anchor.closest('.Polaris-Layout__Section');
  if (!layout || !lastSection) return;
  const sections = CARDS.map(c => { const s = document.createElement('div'); s.className = 'Polaris-Layout__Section'; s.setAttribute('data-mfp', ''); s.setAttribute('data-sg', c.id); return s; });
  let ref = lastSection; sections.forEach(s => { ref.after(s); ref = s; });

  const state = CARDS.map((c, i) => {
    let saved = store.json(c.key, null); if (!Array.isArray(saved)) saved = [...c.seed];
    saved = saved.filter(id => PRODUCTS.some(p => p.id === id)).slice(0, c.limit);
    return { c, el: sections[i], saved, draft: [...saved], query: '', open: false, active: 0, refocus: false };
  });
  const matches = s => PRODUCTS.filter(p => !s.draft.includes(p.id) && p.name.toLowerCase().includes(s.query.trim().toLowerCase())).slice(0, 8);

  function render(s, focus) {
    const { c } = s, full = s.draft.length >= c.limit, list = matches(s), open = s.open && !full;
    const items = s.draft.length ? `<ul class="pl-list" aria-label="${c.list}">${s.draft.map(id => { const p = PRODUCTS.find(x => x.id === id); return `<li class="pl-item"><span class="pl-thumb" style="background:${p.color}" aria-hidden="true"></span><span class="pl-pname Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium">${esc(p.name)}</span><span class="pl-pprice Polaris-Text--root Polaris-Text--bodySm">${money(p.price)}</span>${P.iconButton('delete', 'Remove ' + p.name, 'rm', `data-rm="${p.id}"`)}</li>`; }).join('')}</ul>` : P.sub('No products added yet.');
    const opts = open ? `<ul class="Polaris-Listbox" id="sg-${c.id}-l" role="listbox" aria-label="Products">${list.length ? list.map((p, i) => `<li role="option" class="Polaris-Listbox-Option${i === s.active ? ' Polaris-Listbox-Option--active' : ''}" aria-selected="false" data-add="${p.id}"><span class="pl-thumb" style="background:${p.color};width:24px;height:24px" aria-hidden="true"></span><span class="pl-pname">${esc(p.name)}</span><span class="pl-pprice Polaris-Text--root Polaris-Text--bodySm">${money(p.price)}</span></li>`).join('') : '<li class="Polaris-Listbox-Option Polaris-Listbox-Option--empty" role="presentation">No products match.</li>'}</ul>` : '';
    const field = `<div class="pl-combo">${P.textField({ id: 'sg-' + c.id, value: s.query, prefix: P.icon('search'), placeholder: full ? 'Remove a product to add another' : 'Search products to add', label: 'Search products to add', attrs: `role="combobox" aria-expanded="${open}" aria-controls="sg-${c.id}-l" aria-autocomplete="list"${full ? ' disabled' : ''}` })}${opts}</div>`;
    s.el.innerHTML = P.card(P.head(c.title, null, c.sub) + P.divider()
      + `<div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-100)"><div class="pl-actions"><h3 class="Polaris-Text--root Polaris-Text--headingSm">${c.list}</h3><span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" aria-live="polite">${s.draft.length}/${c.limit}</span></div>${P.sub(c.hint)}</div>`
      + items + field + (full ? P.sub(`You added ${c.limit} products. Remove one to add another.`) : ''), { visible: true });
    const el = focus && $(focus, s.el); if (el) { s.refocus = true; el.focus({ preventScroll: true }); s.refocus = false; if (el.value) el.setSelectionRange(el.value.length, el.value.length); }
  }
  state.forEach(s => {
    const add = id => { if (s.draft.length < s.c.limit && !s.draft.includes(id)) { s.draft.push(id); s.query = ''; s.active = 0; markDirty(); } };
    s.el.addEventListener('click', e => {
      if (e.target.id === 'sg-' + s.c.id && !s.open && !e.target.disabled) { s.open = true; render(s, '#sg-' + s.c.id); return; }
      const a = e.target.closest('[data-add]'); if (a) { add(Number(a.dataset.add)); render(s, '#sg-' + s.c.id); return; }
      const r = e.target.closest('[data-rm]'); if (r) { s.draft = s.draft.filter(id => id !== Number(r.dataset.rm)); markDirty(); render(s, '#sg-' + s.c.id); }
    });
    s.el.addEventListener('mousedown', e => { if (e.target.closest('.Polaris-Listbox')) e.preventDefault(); });
    s.el.addEventListener('input', e => { if (e.target.id === 'sg-' + s.c.id) { s.query = e.target.value; s.open = true; s.active = 0; render(s, '#sg-' + s.c.id); } });
    s.el.addEventListener('focusin', e => { if (e.target.id === 'sg-' + s.c.id && !s.open && !s.refocus && !e.target.disabled) { s.open = true; render(s, '#sg-' + s.c.id); } });
    s.el.addEventListener('keydown', e => {
      if (e.target.id !== 'sg-' + s.c.id) return;
      const list = matches(s);
      if (e.key === 'ArrowDown') { e.preventDefault(); s.open = true; s.active = Math.min(s.active + 1, list.length - 1); render(s, '#sg-' + s.c.id); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); s.active = Math.max(s.active - 1, 0); render(s, '#sg-' + s.c.id); }
      else if (e.key === 'Enter' && s.open && list[s.active]) { e.preventDefault(); add(list[s.active].id); render(s, '#sg-' + s.c.id); }
      else if (e.key === 'Escape' && s.open) { e.preventDefault(); e.stopPropagation(); s.open = false; render(s, '#sg-' + s.c.id); }
    });
    render(s);
  });
  document.addEventListener('mousedown', e => { state.forEach(s => { if (s.open && !s.el.contains(e.target)) { s.open = false; s.query = ''; render(s); } }); });
  if (window.__pages) window.__pages.savers.push(() => { state.forEach(s => { s.saved = [...s.draft]; store.set(s.c.key, JSON.stringify(s.saved)); }); return true; });
})();
