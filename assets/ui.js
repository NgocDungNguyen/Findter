/* Shared helpers for the prototype pages written by hand (Merchandising, Search redirect, Separated variant products, Search suggestions).
   window.FindterUI = { $, $$, esc, store, ICON, toast, openModal, confirmDiscard, saveBar }
   - openModal: the demo's Polaris modal look (.mf-modal): title, close X, Esc, focus trap, actions in the footer only (BFS 4.1.6)
   - saveBar: the contextual save bar (Save / Discard, BFS 4.1.5). It joins the page's leave guard (window.__pages in pages.js), so the sidebar and links cannot be used until the merchant picks Save or Discard */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: keep going */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* storage blocked: keep going */ } },
    json: (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } },
  };
  const svg = d => '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    edit: svg('<path fill-rule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-2.75 1.06a1.195 1.195 0 0 1 1.689 1.69l-.346.346-1.69-1.69.347-.346Zm-1.407 1.407 1.69 1.69-6.52 6.52a1.25 1.25 0 0 1-.884.366h-1.17v-1.17c0-.331.132-.65.366-.884l6.518-6.522Z"/>'),
    drag: svg('<circle cx="7.5" cy="5.5" r="1.4"/><circle cx="12.5" cy="5.5" r="1.4"/><circle cx="7.5" cy="10" r="1.4"/><circle cx="12.5" cy="10" r="1.4"/><circle cx="7.5" cy="14.5" r="1.4"/><circle cx="12.5" cy="14.5" r="1.4"/>'),
    close: svg('<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z"/>'),
    bar: svg('<path d="M10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Z"/><path d="M11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"/>'),
    delete: svg('<path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z"/><path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z"/><path fill-rule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z"/>'),
    search: svg('<path fill-rule="evenodd" d="M12.323 13.383a5.5 5.5 0 1 1 1.06-1.06l2.897 2.897a.75.75 0 1 1-1.06 1.06l-2.897-2.897Zm.677-4.383a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/>'),
    plus: svg('<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>'),
    up: svg('<path d="M10 4.5a.75.75 0 0 1 .53.22l4.5 4.5a.75.75 0 1 1-1.06 1.06l-3.22-3.22v8.19a.75.75 0 0 1-1.5 0V7.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06l4.5-4.5A.75.75 0 0 1 10 4.5Z"/>'),
    down: svg('<path d="M10 15.5a.75.75 0 0 1-.53-.22l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V4.75a.75.75 0 0 1 1.5 0v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-.53.22Z"/>'),
    back: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M17 10a.75.75 0 0 1-.75.75H6.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L6.56 9.25h9.69A.75.75 0 0 1 17 10Z"/></svg>',
    chevron: svg('<path fill-rule="evenodd" d="M5.72 8.47a.75.75 0 0 1 1.06 0l3.47 3.47 3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z"/>'),
    boost: svg('<path d="M10 4.5a.75.75 0 0 1 .53.22l4.5 4.5a.75.75 0 1 1-1.06 1.06l-3.22-3.22v8.19a.75.75 0 0 1-1.5 0V7.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06l4.5-4.5A.75.75 0 0 1 10 4.5Z"/>'),
    demote: svg('<path d="M10 15.5a.75.75 0 0 1-.53-.22l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V4.75a.75.75 0 0 1 1.5 0v8.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-.53.22Z"/>'),
    hide: svg('<path d="M3.72 3.72a.75.75 0 0 1 1.06 0l11.5 11.5a.75.75 0 1 1-1.06 1.06l-1.9-1.9A8.2 8.2 0 0 1 10 14.5c-3.1 0-5.7-1.8-7.4-4.1a.75.75 0 0 1 0-.8 12.6 12.6 0 0 1 2.6-2.7l-1.48-1.48a.75.75 0 0 1 0-1.06ZM6.3 8.36A11 11 0 0 0 4.2 10c1.4 1.7 3.4 3 5.8 3 .8 0 1.55-.15 2.25-.4l-1.1-1.1A2.5 2.5 0 0 1 7.5 9.85l-1.2-1.49Z"/><path d="M10 5.5c-.45 0-.88.05-1.3.15L7.5 4.45A8.5 8.5 0 0 1 10 4c3.1 0 5.7 1.8 7.4 4.1.2.27.2.63 0 .9a12.7 12.7 0 0 1-2 2.1l-1.07-1.07c.6-.5 1.15-1.1 1.55-1.63C14.4 6.8 12.4 5.5 10 5.5Z"/>'),
  };
  const toast = msg => { if (window.__shell) window.__shell.toast(msg); };

  /* Polaris modal look (the demo's .mf-modal). ok = null gives a single close button; onOk returns false to keep the window open. */
  function openModal({ title, content, ok, okClass, cancel, onOk, onOpen, wide }) {
    const opener = document.activeElement;
    const scrim = document.createElement('div'); scrim.className = 'mf-scrim'; scrim.setAttribute('data-mfp', '');
    scrim.innerHTML = `<div class="mf-modal${wide ? ' mc-modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="ui-m-title"><div class="mf-modal__head"><h2 class="mf-modal__title" id="ui-m-title">${esc(title)}</h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON.close}</button></div><div class="mf-modal__body">${content}</div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-m="cancel">${esc(cancel || 'Cancel')}</button>${ok ? `<button type="button" class="mf-btn ${okClass || 'mf-btn--primary'}" data-m="ok">${esc(ok)}</button>` : ''}</div></div>`;
    document.body.appendChild(scrim);
    const okBtn = $('[data-m=ok]', scrim);
    const close = () => { document.removeEventListener('keydown', onKey, true); scrim.remove(); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') {
        const f = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]', scrim), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'Enter' && okBtn && e.target.matches('input:not([type=checkbox]):not([type=radio])') && !okBtn.disabled) { e.preventDefault(); if (onOk(scrim) !== false) close(); }
    }
    scrim.addEventListener('mousedown', e => { if (e.target === scrim) close(); });
    scrim.addEventListener('click', e => {
      if (e.target.closest('.mf-modal__x') || e.target.closest('[data-m=cancel]')) close();
      else if (e.target.closest('[data-m=ok]') && !okBtn.disabled) { if (onOk(scrim) !== false) close(); }
    });
    document.addEventListener('keydown', onKey, true);
    if (onOpen) onOpen(scrim, okBtn);
    else { const first = $('input, select, textarea', scrim) || okBtn; if (first) first.focus({ preventScroll: true }); }
    return close;
  }
  const confirmDiscard = onDiscard => openModal({ title: 'Discard all unsaved changes?', content: '<p class="mf-modal__text">If you discard changes, you’ll delete any edits you made since you last saved.</p>', ok: 'Discard changes', okClass: 'mf-btn--critical', cancel: 'Keep editing', onOk: () => { onDiscard(); } });

  /* contextual save bar: covers the admin top bar while there are unsaved changes (same look as the Custom sort page) */
  function saveBar({ isEdited, onSave, onDiscard }) {
    const bar = document.createElement('div');
    bar.className = 'so-savebar'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Unsaved changes');
    bar.innerHTML = `<div class="so-savebar__t">${ICON.bar}<span>Unsaved changes</span></div><div class="so-savebar__a"><button type="button" class="so-sbtn so-sbtn--discard" data-b="discard">Discard</button><button type="button" class="so-sbtn so-sbtn--save" data-b="save">Save</button></div>`;
    ($('.sh-main') || document.body).appendChild(bar);
    const sync = () => { bar.hidden = !isEdited(); };
    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      if (b.dataset.b === 'save') { if (onSave() !== false) sync(); } else confirmDiscard(() => { onDiscard(); sync(); });
    });
    if (window.__pages) { window.__pages.dirty.push(isEdited); window.__pages.savers.push(() => { const r = onSave(); sync(); return r; }); }
    return { sync, bar };
  }

  window.FindterUI = { $, $$, esc, store, ICON, toast, openModal, confirmDiscard, saveBar };
})();
