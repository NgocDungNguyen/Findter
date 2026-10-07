/* Behaviour shared by the stand-alone pages (filter, search, metafield, boosters, ymm, features, design...).
   First-view replica: nothing here talks to a server. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = m => window.__shell && window.__shell.toast(m);
  const soon = what => toast(`“${what}” is not part of this copy`);
  const text = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();

  /* ---------- Save button (Search / Metafield / Design pages): disabled until something changes ---------- */
  const saveBtn = () => $$('button.Polaris-Button--variantPrimary').find(x => /^Save$/.test(x.textContent.trim()));
  function setSave(on) {
    const b = saveBtn(); if (!b) return;
    b.classList.toggle('Polaris-Button--disabled', !on);
    if (on) { b.removeAttribute('aria-disabled'); b.removeAttribute('tabindex'); } else { b.setAttribute('aria-disabled', 'true'); b.setAttribute('tabindex', '-1'); }
  }

  /* ---------- "Contact us" in info banners -> Crisp-style chat ---------- */
  const SURE = 'Sure! Please describe your idea and include any examples, images, or reference links.';
  const CHAT = {
    filter:    { msg: 'Hi, I want to make a custom filter request', reply: SURE },                // Manage filter set + Collection booster
    search:    { msg: 'Hi, I want to make a custom search request', reply: SURE },                // Search settings + Search booster
    metafield: { msg: 'Hi, I would like to have additional metafields', reply: "Sure! How many more metafields would you like to add? We'll review your request and get back to you shortly." },
    feature:   { msg: 'Hi, I want to make a feature request', reply: SURE },                      // Advanced features, "Contact us now"
    design:    { msg: 'Hi, I want to make a custom design request', reply: SURE },                // Filter design + Product grid design, "Let us know"
  };

  /* ---------- clicks (one delegated handler so the markup stays plain) ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const chat = t.closest('[data-chat]');                                    // "Contact us" in an info banner: the chat opens with the request already sent + the auto reply
    if (chat) { e.preventDefault(); const m = CHAT[chat.dataset.chat]; if (m && window.__shell) window.__shell.openChatWith(m.msg, m.reply); return; }
    const tab = t.closest('.Polaris-Tabs__Tab');
    if (tab) {
      if (tab.getAttribute('aria-selected') === 'true') return;
      if (tab.dataset.href) location.href = tab.dataset.href; else soon(text(tab));
      return;
    }
    const sw = t.closest('.ft-switch-btn');                                   // status toggle in the filter table
    if (sw) { if (!sw.classList.contains('disabled')) { const s = $('.slider-toggle', sw); s.classList.remove('no-transition'); s.classList.toggle('active'); } return; }

    const prev = t.closest('.display-features-card-preview');                 // features: click on a preview opens the big viewer in the original
    if (prev) { soon('Feature preview'); return; }

    const act = t.closest('button[aria-label="Edit"], button[aria-label="Duplicate"], button[aria-label="Delete"]');
    if (act) { soon(act.getAttribute('aria-label') + ' filter set'); return; }

    const btn = t.closest('#app button.Polaris-Button, #app [data-s=s-button] button');
    if (btn) {
      const label = text(btn);
      if (/^Save$/.test(label)) { if (!btn.classList.contains('Polaris-Button--disabled')) { toast('Saved'); setSave(false); } return; }
      if (btn.closest('.Polaris-DataTable__Navigation')) { if (!btn.classList.contains('Polaris-Button--disabled')) scrollTable(btn); return; }
      if (!btn.classList.contains('Polaris-Button--disabled') && !btn.disabled) soon(label);
      return;
    }
    const link = t.closest('#app button.Polaris-Link, #app a.fdt-header__link:not([href])');
    if (link) { toast('Opens the contact form'); return; }

    const row = t.closest('#app [role=button][aria-controls^="adv-search"]');  // chevron on a search field row
    if (row) { soon('Advanced options for ' + row.closest('.Polaris-Box').querySelector('.Polaris-Text--root').textContent.trim()); return; }
    const rowBtn = t.closest('#app [role=button]');                            // accordion rows (product grid design)
    if (rowBtn && !t.closest('input, .pg-switch')) { soon(text(rowBtn)); return; }
  });

  /* ---------- inputs ---------- */
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('.ft-checkbox')) setSave(true);                           // search page: untick / tick a field
    if (el.matches('.pg-switch') && saveBtn()) setSave(true);                // design pages: toggling a setting
    if (el.matches('.pg-check')) {                                            // design page: layouts are picked one at a time
      const boxes = $$('.pg-check'), i = boxes.indexOf(el), group = i < 3 ? boxes.slice(0, 3) : boxes.slice(3);
      if (el.checked) group.forEach(b => { if (b !== el) b.checked = false; }); else el.checked = true;
      setSave(true);
    }
  });

  /* ---------- features page: hovering a card previews its video ---------- */
  $$('.display-features-card-preview').forEach(card => {
    const v = $('video', card);
    card.addEventListener('mouseenter', () => { card.classList.add('is-hovered'); if (v) { v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); } });
    card.addEventListener('mouseleave', () => { card.classList.remove('is-hovered'); if (v) { v.pause(); v.currentTime = 0; } });
  });

  /* ---------- DataTable: on narrow screens it "condenses" into a sideways scroller with arrows + dots ---------- */
  function tables() { return $$('.Polaris-DataTable').map(dt => ({ dt, wrap: dt.parentElement, nav: $('.Polaris-DataTable__Navigation', dt.parentElement), sc: $('.Polaris-DataTable__ScrollContainer', dt), table: $('table', dt) })).filter(x => x.nav && x.sc); }
  const colsOf = x => $$('thead th', x.table);
  function layoutTable(x) {
    x.wrap.classList.remove('Polaris-DataTable--condensed'); x.dt.classList.remove('Polaris-DataTable--condensed');
    const needs = x.table.scrollWidth > x.sc.clientWidth + 1;
    x.wrap.classList.toggle('Polaris-DataTable--condensed', needs); x.dt.classList.toggle('Polaris-DataTable--condensed', needs);
    if (needs && !$('.Polaris-DataTable__Pip', x.nav)) {                       // dots between the two arrows
      const [, right] = $$('button', x.nav);
      colsOf(x).forEach(() => { const p = document.createElement('div'); p.className = 'Polaris-DataTable__Pip'; x.nav.insertBefore(p, right); });
    }
    updateTable(x);
  }
  function updateTable(x) {
    const [left, right] = $$('button', x.nav), view = x.sc.scrollLeft + x.sc.clientWidth;
    const set = (b, off) => { b.classList.toggle('Polaris-Button--disabled', off); off ? (b.setAttribute('aria-disabled', 'true'), b.tabIndex = -1) : (b.removeAttribute('aria-disabled'), b.removeAttribute('tabindex')); };
    set(left, x.sc.scrollLeft <= 1); set(right, view >= x.sc.scrollWidth - 1);
    $$('.Polaris-DataTable__Pip', x.nav).forEach((p, i) => { const th = colsOf(x)[i]; p.classList.toggle('Polaris-DataTable__Pip--visible', !!th && th.offsetLeft < view - 2); });
  }
  function scrollTable(btn) {
    const x = tables().find(t => t.nav.contains(btn)); if (!x) return;
    const dir = btn === $$('button', x.nav)[0] ? -1 : 1, step = Math.max(120, x.sc.clientWidth * 0.5);
    x.sc.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
  const initTables = () => tables().forEach(x => { layoutTable(x); x.sc.addEventListener('scroll', () => updateTable(x), { passive: true }); });
  initTables();
  if (tables().length) new ResizeObserver(() => tables().forEach(layoutTable)).observe($('.sh-scroll'));
})();
