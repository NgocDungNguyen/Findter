(() => {
  'use strict';
  const updateCarousel = () => {}, closeDatePicker = () => {}, hideTip = () => {}, closeThemeModal = () => {};   // home-page features that do not exist on these pages
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const T = window.__TPL; // build-time templates (svg snippets)
  const body = document.body;

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let toastT;
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); };

  /* ---------- responsive shell ---------- */
  let userCollapsed = null;
  const mq = { mobile: matchMedia('(max-width:767px)'), xs: matchMedia('(max-width:489px)') };
  function applyNav() {
    const w = innerWidth;
    const collapsed = w > 767 && (userCollapsed !== null ? userCollapsed : w < 800);
    body.classList.toggle('nav-collapsed', collapsed);
    if (w > 767) body.classList.remove('nav-open');
  }
  $('.sh-collapse').addEventListener('click', () => { userCollapsed = true; applyNav(); });
  $('.sh-expand').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); userCollapsed = false; applyNav(); });
  $('.m-fab--menu').addEventListener('click', () => body.classList.toggle('nav-open'));
  $('.sh-main').addEventListener('click', e => { if (body.classList.contains('nav-open')) { e.preventDefault(); e.stopPropagation(); body.classList.remove('nav-open'); } }, true);

  const scroller = $('.sh-scroll');
  new ResizeObserver(() => { document.documentElement.style.setProperty('--app-w', scroller.clientWidth + 'px'); updateCarousel(true); }).observe(scroller);

  /* ---------- popups ---------- */
  const pops = $$('.pop');
  const closePops = except => pops.forEach(p => { if (p !== except) p.classList.remove('open'); });
  function openPop(pop, place) {
    const was = pop.classList.contains('open');
    closePops(); closeDatePicker();
    if (was) return;
    pop.classList.add('open');
    pop.classList.toggle('mobile-sheet', mq.mobile.matches);
    if (!mq.mobile.matches) place(pop);
  }
  const rectOf = el => el.getBoundingClientRect();
  $('.sh-more').addEventListener('click', e => { e.stopPropagation(); openPop($('#menu-more'), p => { const r = rectOf(e.currentTarget); p.style.top = r.bottom + 6 + 'px'; p.style.right = innerWidth - r.right + 'px'; p.style.left = 'auto'; p.style.bottom = 'auto'; }); });
  $$('.js-account').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openPop($('#menu-account'), p => { const r = rectOf(b); p.style.left = '12px'; p.style.bottom = innerHeight - r.top + 4 + 'px'; p.style.top = 'auto'; p.style.right = 'auto'; }); }));
  $$('.js-bell').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openPop($('#menu-alerts'), p => { p.style.left = '14px'; p.style.bottom = '84px'; p.style.top = 'auto'; p.style.right = 'auto'; p.style.maxHeight = 'calc(100vh - 140px)'; }); }));
  $('.js-skplus').addEventListener('click', e => { e.stopPropagation(); openPop($('#menu-sk'), p => { const r = rectOf(e.currentTarget); p.style.left = Math.max(8, r.right - 240) + 'px'; p.style.bottom = innerHeight - rectOf($('.sk')).top + 'px'; p.style.top = 'auto'; p.style.right = 'auto'; }); });
  document.addEventListener('click', e => { if (!e.target.closest('.pop')) closePops(); if (!e.target.closest('#dp-pop') && !e.target.closest('.date-picker-activator')) closeDatePicker(); });
  $$('.pop').forEach(p => p.addEventListener('click', e => e.stopPropagation()));
  $$('[data-toast]').forEach(b => b.addEventListener('click', () => { closePops(); toast(b.dataset.toast); }));
  $('#menu-account [data-act=logout]').addEventListener('click', () => { closePops(); toast('Log out is disabled in this copy'); });

  /* ---------- search overlay ---------- */
  const scrim = $('#scrim-search');
  const openSearch = () => { closePops(); scrim.classList.add('open'); body.classList.remove('nav-open'); setTimeout(() => $('#cmd-input').focus(), 30); };
  const closeSearch = () => scrim.classList.remove('open');
  $$('.js-search').forEach(b => b.addEventListener('click', openSearch));
  scrim.addEventListener('mousedown', e => { if (e.target === scrim) closeSearch(); });
  $$('.cmd__chip').forEach(c => c.addEventListener('click', () => { $('#cmd-input').value = ''; $('#cmd-input').placeholder = 'Search ' + c.textContent.toLowerCase(); $('#cmd-input').focus(); }));
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { closeSearch(); closePops(); closeDatePicker(); closeThemeModal(); hideTip(); body.classList.remove('nav-open'); }
  });

  /* ---------- sidebar: "View more" reveals Analytics / Pricing, "View less" folds them away again ---------- */
  const navGroup = $('.sh-appgroup'), moreBtn = $('.sh-item--more');
  function setNavExpanded(on, save = true) {
    navGroup.classList.toggle('is-expanded', on);
    moreBtn.querySelector('.sh-item__label').textContent = on ? 'View less' : 'View more'; moreBtn.setAttribute('aria-expanded', String(on));
    if (save) { try { localStorage.setItem('findter.navExpanded', on ? '1' : ''); } catch (e) { /* storage blocked */ } }
  }
  try { if (localStorage.getItem('findter.navExpanded')) setNavExpanded(true, false); } catch (e) { /* storage blocked */ }

  /* ---------- nav links ---------- */
  $$('.sh-nav a, .sh-nav .sh-item--more, .sh-nav .sh-section').forEach(a => a.addEventListener('click', e => {
    if (a.dataset.nav === 'page') return;                    // real page (filter.html, search.html, ...)
    e.preventDefault();
    if (a.classList.contains('sh-item--more')) { setNavExpanded(!navGroup.classList.contains('is-expanded')); return; }
    const label = (a.querySelector('.sh-item__label') || a).textContent.trim();
    if (a.getAttribute('aria-current') === 'page') return;
    toast('“' + label + '” is not part of this copy');
  }));
  $$('.sh-item__actions .sh-iconbtn, .sh-pin').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toast(b.getAttribute('aria-label')); }));
  $('.sk__input').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { toast('Sidekick is not available in this copy'); e.target.value = ''; } });
  $$('.sk .sh-iconbtn:not(.js-skplus), .m-fab--sk').forEach(b => b.addEventListener('click', () => toast('Sidekick is not available in this copy')));

  /* ---------- chat ---------- */
  const chatPanel = $('.chat-panel');
  const toggleChat = open => chatPanel.classList.toggle('open', open);
  $('.chat-bubble').addEventListener('click', () => toggleChat());
  $('.chat-panel__foot input').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { const m = document.createElement('div'); m.className = 'chat-msg'; m.style.cssText = 'margin:8px 0 0 auto;background:#9b2423;color:#fff'; m.textContent = e.target.value; $('.chat-panel__body').appendChild(m); e.target.value = ''; } });


  window.__shell = { toast, closePops };
  applyNav();
})();
