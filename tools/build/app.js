(() => {
  'use strict';
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
  // a visitor message (typed, or sent by a page action such as "Contact us"); the panel opens so the merchant sees it go out
  const sendChat = text => { const m = document.createElement('div'); m.className = 'chat-msg'; m.style.cssText = 'margin:8px 0 0 auto;background:#9b2423;color:#fff'; m.textContent = text; const b = $('.chat-panel__body'); b.appendChild(m); b.scrollTop = b.scrollHeight; };
  // the support team's answer (left bubble, like the greeting)
  const replyChat = text => { const m = document.createElement('div'); m.className = 'chat-msg'; m.textContent = text; const b = $('.chat-panel__body'); b.appendChild(m); b.scrollTop = b.scrollHeight; };
  $('.chat-panel__foot input').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { sendChat(e.target.value); e.target.value = ''; } });

  /* ---------- app: collapsibles ---------- */
  function setCollapsible(el, open) {
    clearTimeout(el._t);
    if (open) {
      el.classList.remove('Polaris-Collapsible--isFullyClosed'); el.setAttribute('aria-hidden', 'false');
      el.style.overflow = 'hidden'; el.style.maxHeight = el.scrollHeight + 'px';
      el._t = setTimeout(() => { el.style.maxHeight = 'none'; el.style.overflow = 'visible'; }, 500);
    } else {
      el.style.overflow = 'hidden'; el.style.maxHeight = el.scrollHeight + 'px'; void el.offsetHeight;
      requestAnimationFrame(() => { el.style.maxHeight = '0px'; });
      el._t = setTimeout(() => { el.classList.add('Polaris-Collapsible--isFullyClosed'); el.setAttribute('aria-hidden', 'true'); }, 500);
    }
  }
  // outer onboarding guide (collapsed by default)
  const guideCard = $('[data-card=guide]');
  const guideBody = $('#Onboarding\\ guide');
  const guideChev = $('.title-collapsible [data-s=s-icon]', guideCard);
  guideChev.classList.add('chev', 'chev-r');
  $('.title-collapsible', guideCard).addEventListener('click', e => {
    if (e.target.closest('button')) return;
    const open = guideBody.getAttribute('aria-hidden') === 'true';
    setCollapsible(guideBody, open); guideChev.classList.toggle('is-open', open);
    guideCard.querySelector('[aria-expanded]').setAttribute('aria-expanded', String(open));
  });
  // inner steps (expanded by default)
  $$('.bss-setup-guide', guideCard).forEach(step => {
    const head = $('.grid-guide', step), panel = $('.Polaris-Collapsible', step), chev = $('.title-collapsible [data-s=s-icon]', step);
    chev.classList.add('chev', 'chev-d');
    head.addEventListener('click', e => {
      if (e.target.closest('[data-s=s-link]')) return;
      const open = panel.getAttribute('aria-hidden') === 'true';
      setCollapsible(panel, open); chev.classList.toggle('is-collapsed', !open);
      head.setAttribute('aria-expanded', String(open));
    });
  });
  /* ---------- Findter app status card ----------
     In the real app these values come from the Pricing page (plan, trial end / renewal date) and the indexer. Here the demo bar in the header
     (Plan / Date / Indexed) fakes them, so every colour rule can be checked:
       Plan                  Trial / Development = blue #d5ebff, Starter / Free = green #affebf
       Free, Development     no "Expires on / Renew on" row, not affected by the days-left buttons; limit 300 (Free) / 50,000 (Development)
       Expires on / Renew on Trial = blue, Starter = green, 7 days or less left = orange #ffd6a4 (same orange as the "In progress" badge)
       Products indexed      limit = 50,000 (Trial) / 3,000 (Starter); indexed <= limit = green #affebf, over the limit (or while indexing runs) = orange */
  const PLAN_LIMIT = { Trial: 50000, Starter: 3000, Free: 300, Development: 50000, 'Paid before': 300, Service: 300 };
  const PLAN_VIEW = { 'Paid before': 'Free', Service: 'Free' };               // shown as a Free shop in the status box (they differ only for promotion targeting)
  const NO_DATE = ['Free', 'Development', 'Paid before', 'Service'];          // plans without an expiry / renewal date
  const DEMO_KEY = 'findter.demoStatus';
  const DEMO = { plan: 'Trial', days: 14, over: false };
  try { const s = JSON.parse(localStorage.getItem(DEMO_KEY)); if (s && PLAN_LIMIT[s.plan] && [14, 7, 3, 1].includes(s.days)) Object.assign(DEMO, { plan: s.plan, days: s.days, over: !!s.over }); } catch (e) { /* storage blocked */ }
  let syncRunning = false;                                                    // set by the Manual sync flow below
  const TONES = ['st-tone--blue', 'st-tone--green', 'st-tone--orange'];
  const toneOf = (el, tone) => { el.classList.remove(...TONES); el.classList.add('st-tone--' + tone); };
  function renderStatus() {
    const card = $('[data-card=status]'), n = v => v.toLocaleString('en-US'), trial = DEMO.plan === 'Trial', limit = PLAN_LIMIT[DEMO.plan];
    const planTone = trial || DEMO.plan === 'Development' ? 'blue' : 'green', soon = DEMO.days <= 7;
    const planBadge = $('[data-st=plan] [data-s=s-badge] > div', card);
    $('span:last-child', planBadge).textContent = PLAN_VIEW[DEMO.plan] || DEMO.plan; toneOf(planBadge, planTone);
    const date = $('[data-st=date]', card), dateBadge = $('.st-badge', date), end = new Date(Date.now() + DEMO.days * 864e5);
    date.hidden = NO_DATE.includes(DEMO.plan);                                 // Free / Development: no expiry / renewal date
    $('p', date).textContent = trial ? 'Expires on' : 'Renew on';
    dateBadge.textContent = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    toneOf(dateBadge, soon ? 'orange' : planTone);
    const indexed = DEMO.over ? limit + (limit < 1000 ? 60 : 1240) : Math.min(1595, Math.round(limit * 0.8)), idxBadge = $('[data-st=indexed] .st-badge', card);
    idxBadge.textContent = n(indexed) + ' / ' + n(limit);
    toneOf(idxBadge, syncRunning || indexed > limit ? 'orange' : 'green');
  }
  renderStatus();
  [['embed', true], ['suggest', true]].forEach(([k, on]) => {                  // App embed / Search suggestion: Active (green) or Inactive (neutral)
    const badge = $('[data-card=status] [data-st=' + k + '] [data-s=s-badge]');
    if (!on) badge.outerHTML = '<span class="st-badge">Inactive</span>';
  });

  /* ---------- demo bar in the header: fakes plan / days left / products indexed ---------- */
  (function demoBar() {
    const top = $('.sh-top'), bar = document.createElement('div'); bar.className = 'demo-bar';
    const groups = [
      ['Plan', 'plan', [['Trial', 'Trial'], ['Starter', 'Starter'], ['Free', 'Free'], ['Development', 'Development'], ['Paid before', 'Paid before'], ['Service', 'Service']]],
      ['Date', 'days', [[14, '14d'], [7, '7d'], [3, '3d'], [1, '1d']]],
      ['Indexed', 'over', [[false, 'Normal'], [true, 'Over limit']]],
    ];
    bar.innerHTML = '<button type="button" class="demo-toggle" aria-expanded="false" aria-controls="demo-panel">Demo data</button><div class="demo-panel" id="demo-panel" role="group" aria-label="Demo data for the Findter app status box">'
      + groups.map(([label, key, opts]) => '<div class="demo-group" role="group" aria-label="' + label + '"><span class="demo-label">' + label + '</span>' + opts.map(([v, t]) => '<button type="button" class="demo-btn" data-key="' + key + '" data-val="' + v + '" aria-pressed="false">' + t + '</button>').join('') + '</div>').join('') + '</div>';
    top.insertBefore(bar, $('.sh-more', top));
    const paint = () => {
      $$('.demo-btn', bar).forEach(b => b.setAttribute('aria-pressed', String(String(DEMO[b.dataset.key]) === b.dataset.val)));
      $$('.demo-btn[data-key=days]', bar).forEach(b => { b.disabled = NO_DATE.includes(DEMO.plan); });   // days left does not apply to Free / Development
    };
    bar.addEventListener('click', e => {
      const b = e.target.closest('.demo-btn');
      if (b) {
        DEMO[b.dataset.key] = b.dataset.key === 'days' ? +b.dataset.val : b.dataset.key === 'over' ? b.dataset.val === 'true' : b.dataset.val;
        try { localStorage.setItem(DEMO_KEY, JSON.stringify(DEMO)); } catch (err) { /* storage blocked */ }
        paint(); renderStatus(); renderPromotion(); return;
      }
      const t = e.target.closest('.demo-toggle');
      if (t) { const open = !bar.classList.contains('is-open'); bar.classList.toggle('is-open', open); t.setAttribute('aria-expanded', String(open)); }
    });
    document.addEventListener('click', e => { if (!bar.contains(e.target) && bar.classList.contains('is-open')) { bar.classList.remove('is-open'); $('.demo-toggle', bar).setAttribute('aria-expanded', 'false'); } });
    paint();
  })();
  // dismiss (X) buttons — they come back on reload
  const dismiss = card => { card.hidden = true; };
  $('button[aria-label="Close"]', guideCard).addEventListener('click', e => { e.stopPropagation(); dismiss(guideCard); });
  const recCard = $('[data-card=rec]');
  $('button[aria-label="Dismiss recommended apps"]', recCard).addEventListener('click', () => dismiss(recCard));

  $$('.fs-select select').forEach(sel => sel.addEventListener('change', () => { sel.parentElement.querySelector('.fs-select__value').textContent = sel.selectedOptions[0].textContent; }));

  /* ---------- app: links & buttons ---------- */
  const ext = (url) => window.open(url, '_blank', 'noopener');
  $$('[data-s=s-link][href], a.Polaris-Link[href]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); ext(a.getAttribute('href')); }));
  $$('[data-s=s-link]:not([href])').forEach(a => a.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toast('Advanced features page is not part of this copy'); }));
  const btnByText = (re, root = document) => $$('button, [data-s=s-button]', root).filter(b => re.test(b.textContent.trim()));
  btnByText(/^Enable search suggestion/).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); ext('https://admin.shopify.com/store/brgmnnlukas/themes/165579620595/editor?context=apps&activateAppId=393b6ef120968ea1931a5ec86b58d041/search-suggestion&target=newAppsSection'); }));
  btnByText(/^Go to filter$/).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toast('Opens the Filter page (not part of this copy)'); }));
  btnByText(/^Search settings page$/).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toast('Opens the Search settings page (not part of this copy)'); }));
  btnByText(/^View app$/).forEach(b => b.addEventListener('click', () => ext('https://apps.shopify.com/')));
  btnByText(/^Live chat$/).forEach(b => b.addEventListener('click', () => toggleChat(true)));
  btnByText(/^Book a call with us$/).forEach(b => b.addEventListener('click', () => toast('Opens the booking page')));
  const chartBtn = $('[data-card=data] button[aria-describedby]:not(.date-picker-activator button)');

  /* ---------- carousel ---------- */
  const track = $('.recommend-app-carousel'), slides = $$('.recommend-app-carousel-slide', track);
  let idx = 0, carT;
  const perView = () => (scroller.clientWidth < 490 ? 1 : 2);
  function updateCarousel(resize) {
    const pv = perView(), max = slides.length - pv;
    if (idx > max) idx = max;
    track.style.setProperty('--fdt-recommend-slides', pv);
    if (resize) track.style.transition = 'none';
    track.style.transform = `translateX(${-idx * 100 / pv}%)`;
    if (resize) requestAnimationFrame(() => { track.style.transition = ''; });
  }
  const go = d => { const max = slides.length - perView(); idx = idx + d; if (idx > max) idx = 0; if (idx < 0) idx = max; updateCarousel(); restartCar(); };
  const restartCar = () => { clearInterval(carT); carT = setInterval(() => go(1), 5000); };
  $('button[aria-label="Previous app"]', recCard).addEventListener('click', () => go(-1));
  $('button[aria-label="Next app"]', recCard).addEventListener('click', () => go(1));
  restartCar();

  /* ---------- tooltips ---------- */
  const tipRoot = document.createElement('div'); document.body.appendChild(tipRoot);
  function showTip(target, text) {
    const r = target.getBoundingClientRect();
    tipRoot.innerHTML = `<div class="Polaris-PositionedOverlay" style="position:fixed;z-index:70;top:${r.bottom + 4}px;left:0"><div class="Polaris-Tooltip-TooltipOverlay Polaris-Tooltip-TooltipOverlay--measured" data-polaris-layer="true" style="--pc-tooltip-chevron-x-pos:0px;--pc-tooltip-border-radius:var(--p-border-radius-200);--pc-tooltip-padding:var(--p-space-100) var(--p-space-200)">${T.tipChevron}<div role="tooltip" class="Polaris-Tooltip-TooltipOverlay__Content Polaris-Tooltip-TooltipOverlay--default" style="--pc-tooltip-chevron-x-pos:0px;--pc-tooltip-border-radius:var(--p-border-radius-200);--pc-tooltip-padding:var(--p-space-100) var(--p-space-200)"><span class="Polaris-Text--root Polaris-Text--bodyMd">${text}</span></div></div></div>`;
    const ov = tipRoot.firstElementChild, box = ov.firstElementChild, w = box.getBoundingClientRect().width;
    let left = r.left + r.width / 2 - w / 2; left = Math.max(8, Math.min(left, innerWidth - w - 8));
    ov.style.left = left + 'px';
    const cx = r.left + r.width / 2 - left; box.style.setProperty('--pc-tooltip-chevron-x-pos', cx + 'px'); box.firstElementChild.nextElementSibling.style.setProperty('--pc-tooltip-chevron-x-pos', cx + 'px');
  }
  const hideTip = () => { tipRoot.innerHTML = ''; };
  const tips = [
    [$('[data-card=data] .ft-card-header-underline', document), 'Total number of session included searches, filter clicks, and boost product clicks.'],
    [$$('[data-card=data] .ft-card-header-underline')[1], 'The percentage of user session using app and have result in sale'],
  ];
  tips.forEach(([el, txt]) => { if (!el) return; const t = el.querySelector('h3'); el.addEventListener('mouseenter', () => showTip(t, txt)); el.addEventListener('mouseleave', hideTip); });
  const chartLink = $$('[data-card=data] button').find(b => !b.closest('.date-picker-activator') && !b.textContent.trim());
  if (chartLink) { chartLink.addEventListener('mouseenter', () => showTip(chartLink, 'View report')); chartLink.addEventListener('mouseleave', hideTip); chartLink.addEventListener('click', () => { hideTip(); toast('Opens the Analytics page (not part of this copy)'); }); }

  /* ---------- date picker ---------- */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const add = (d, n) => { const x = sod(d); x.setDate(x.getDate() + n); return x; };
  const same = (a, b) => a && b && a.getTime() === b.getTime();
  const today = sod(new Date());
  const PRESETS = [
    ['Today', () => [today, today]], ['Yesterday', () => [add(today, -1), add(today, -1)]], ['Last 7 days', () => [add(today, -6), today]],
    ['Last 30 days', () => [add(today, -29), today]], ['Last month', () => [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)]],
    ['Last 90 days', () => [add(today, -89), today]], ['Custom', () => [today, today]],
  ];
  const dpHost = document.createElement('div'); document.body.appendChild(dpHost);
  let dp = null; // {preset, start, end, view, applied:{preset,start,end}, picking}
  const activator = $('.date-picker-activator button');
  const fmt = d => MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate();
  function dpHTML() {
    const pad = 'style="--pc-inline-stack-block-align:start;--pc-inline-stack-wrap:nowrap;--pc-inline-stack-flex-direction-xs:row"';
    const presets = PRESETS.map(([n], i) => `<li class="Polaris-OptionList-Option" tabindex="-1"><button type="button" data-preset="${i}" class="Polaris-OptionList-Option__SingleSelectOption${dp.preset === i ? ' Polaris-OptionList-Option--focused Polaris-OptionList-Option--select' : ''}" aria-pressed="${dp.preset === i}"><div class="Polaris-InlineStack" ${pad}>${n}</div>${dp.preset === i ? `<span class="Polaris-OptionList-Option__Icon"><span class="Polaris-Icon">${T.check}</span></span>` : ''}</button></li>`).join('');
    const months = [0, 1].map(k => { const m = new Date(dp.view.getFullYear(), dp.view.getMonth() + k, 1); return monthHTML(m); }).join('');
    const pm = new Date(dp.view.getFullYear(), dp.view.getMonth() - 1, 1), nm = new Date(dp.view.getFullYear(), dp.view.getMonth() + 2, 1);
    const changed = dp.preset !== dp.applied.preset || !same(dp.start, dp.applied.start) || !same(dp.end, dp.applied.end);
    return `<div class="Polaris-PositionedOverlay Polaris-Popover__PopoverOverlay Polaris-Popover__PopoverOverlay--open" id="dp-pop" style="position:fixed;z-index:70"><div class="Polaris-Popover" data-polaris-overlay="true"><div class="Polaris-Popover__ContentContainer"><div class="Polaris-Popover__Content Polaris-Popover__Content--fullHeight Polaris-Popover__Content--fluidContent" style="height:376px"><div class="Polaris-Popover__Pane Polaris-Popover__Pane--fixed"><div class="Polaris-InlineGrid" style="--pc-inline-grid-grid-template-columns-xs:1fr;--pc-inline-grid-grid-template-columns-mdDown:1fr;--pc-inline-grid-grid-template-columns-md:max-content max-content"><div class="Polaris-Box" style="--pc-box-max-width:212px;--pc-box-padding-block-start-xs:var(--p-space-500);--pc-box-padding-block-start-md:var(--p-space-0);--pc-box-padding-block-end-xs:var(--p-space-100);--pc-box-padding-block-end-md:var(--p-space-0);--pc-box-padding-inline-start-xs:var(--p-space-500);--pc-box-padding-inline-start-md:var(--p-space-0);--pc-box-padding-inline-end-xs:var(--p-space-500);--pc-box-padding-inline-end-md:var(--p-space-0);--pc-box-width:212px"><div class="Polaris-Scrollable Polaris-Scrollable--vertical Polaris-Scrollable--horizontal Polaris-Scrollable--scrollbarWidthThin" data-polaris-scrollable="true" style="height:334px"><ul class="Polaris-Box Polaris-Box--listReset" style="--pc-box-padding-block-start-xs:var(--p-space-150);--pc-box-padding-block-end-xs:var(--p-space-150);--pc-box-padding-inline-start-xs:var(--p-space-150);--pc-box-padding-inline-end-xs:var(--p-space-150)"><li class="Polaris-Box" style="--pc-box-padding-block-start-xs:var(--p-space-0)"><div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-0)"><ul class="Polaris-Box Polaris-Box--listReset">${presets}</ul></div></li></ul></div></div><div class="Polaris-Box" style="--pc-box-max-width:516px;--pc-box-padding-block-start-xs:var(--p-space-500);--pc-box-padding-block-end-xs:var(--p-space-500);--pc-box-padding-inline-start-xs:var(--p-space-500);--pc-box-padding-inline-end-xs:var(--p-space-500)"><div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-400)"><div><div class="Polaris-DatePicker"><div class="Polaris-DatePicker__Header"><button class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantTertiary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter Polaris-Button--iconOnly" aria-label="Show previous month, ${MONTHS[pm.getMonth()]} ${pm.getFullYear()}" data-nav="-1" type="button"><span class="Polaris-Button__Icon"><span class="Polaris-Icon">${T.prev}</span></span></button><button class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantTertiary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter Polaris-Button--iconOnly" aria-label="Show next month, ${MONTHS[nm.getMonth()]} ${nm.getFullYear()}" data-nav="1" type="button"><span class="Polaris-Button__Icon"><span class="Polaris-Icon">${T.next}</span></span></button></div><div class="Polaris-DatePicker__MonthLayout">${months}</div></div></div></div></div></div></div><div class="Polaris-Popover__Pane Polaris-Popover__Pane--fixed"><div class="Polaris-Popover__Section"><div class="Polaris-Box" style="--pc-box-padding-block-start-xs:var(--p-space-200);--pc-box-padding-block-end-xs:var(--p-space-150);--pc-box-padding-inline-start-xs:var(--p-space-300);--pc-box-padding-inline-end-xs:var(--p-space-300)"><div class="Polaris-InlineStack" style="--pc-inline-stack-align:end;--pc-inline-stack-wrap:wrap;--pc-inline-stack-gap-xs:var(--p-space-200);--pc-inline-stack-flex-direction-xs:row"><button class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" type="button" data-dp="cancel"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Cancel</span></button><button class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter${changed ? '' : ' Polaris-Button--disabled'}" type="button" data-dp="apply" ${changed ? '' : 'aria-disabled="true"'}><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Apply</span></button></div></div></div></div></div></div></div></div>`;
  }
  function monthHTML(m) {
    const y = m.getFullYear(), mo = m.getMonth(), first = new Date(y, mo, 1).getDay(), n = new Date(y, mo + 1, 0).getDate();
    const hasRange = dp.start && dp.end;
    let rows = '', cells = '';
    const flush = () => { rows += `<tr class="Polaris-DatePicker__Week">${cells}</tr>`; cells = ''; };
    for (let i = 0; i < first; i++) cells += '<td class="Polaris-DatePicker__EmptyDayCell"></td>';
    for (let d = 1; d <= n; d++) {
      const dt = new Date(y, mo, d), isStart = same(dt, dp.start), isEnd = same(dt, dp.end), inR = hasRange && dt >= dp.start && dt <= dp.end;
      const dis = dt > today;
      let cls = 'Polaris-DatePicker__Day';
      if (isStart || isEnd) cls += ' Polaris-DatePicker__Day--selected';
      if (isStart) cls += ' Polaris-DatePicker__Day--firstInRange';
      if (inR) cls += ' Polaris-DatePicker__Day--inRange';
      if (isEnd) cls += ' Polaris-DatePicker__Day--lastInRange';
      if (dis) cls += ' Polaris-DatePicker__Day--disabled';
      if (hasRange) cls += ' Polaris-DatePicker__Day--hasRange';
      const lbl = (isStart ? 'Start of range ' : isEnd ? 'End of range ' : '') + (same(dt, today) ? 'Today ' : '') + `${DAYS[dt.getDay()]} ${MONTHS[mo]} ${d} ${y}`;
      cells += `<td class="Polaris-DatePicker__DayCell${inR ? ' Polaris-DatePicker__DayCell--inRange' : ''}"><button type="button" tabindex="${d === 1 ? 0 : -1}" class="${cls}" aria-label="${lbl}" aria-pressed="${isStart || isEnd}" ${dis ? 'disabled' : ''} data-day="${y}-${mo}-${d}"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--regular Polaris-Text--block Polaris-Text--center">${d}</span></button></td>`;
      if ((first + d) % 7 === 0) flush();
    }
    if (cells) flush();
    const wk = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, i) => `<th aria-label="${DAYS[i]}" scope="col" class="Polaris-DatePicker__Weekday"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--regular Polaris-Text--block Polaris-Text--center Polaris-Text--subdued">${w}</span></th>`).join('');
    return `<div class="Polaris-DatePicker__MonthContainer"><table role="grid" class="Polaris-DatePicker__Month"><caption class="Polaris-DatePicker__Title"><span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium Polaris-Text--block Polaris-Text--center">${MONTHS[mo]} ${y}</span></caption><thead><tr>${wk}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function placeDP() {
    const pop = $('#dp-pop'); if (!pop) return;
    if (mq.xs.matches || innerWidth < 600) { pop.style.left = '8px'; pop.style.right = '8px'; pop.style.top = Math.min(activator.getBoundingClientRect().bottom + 8, innerHeight - 440) + 'px'; pop.style.maxWidth = 'calc(100vw - 16px)'; pop.style.overflow = 'auto'; return; }
    const r = activator.getBoundingClientRect(); const w = pop.getBoundingClientRect().width;
    pop.style.top = r.bottom + 'px'; pop.style.left = Math.max(0, Math.min(r.left - 8, innerWidth - w)) + 'px';
  }
  function renderDP() { dpHost.innerHTML = dpHTML(); placeDP(); }
  function openDatePicker() {
    if (dp) return closeDatePicker();
    closePops();
    const cur = dpApplied;
    dp = { preset: cur.preset, start: cur.start, end: cur.end, applied: cur, view: new Date(cur.end.getFullYear(), cur.end.getMonth() - 1, 1) };
    renderDP(); activator.setAttribute('aria-expanded', 'true');
  }
  function closeDatePicker() { if (!dp) return; dp = null; dpHost.innerHTML = ''; activator.setAttribute('aria-expanded', 'false'); }
  let dpApplied = { preset: 3, start: PRESETS[3][1]()[0], end: today };
  activator.addEventListener('click', e => { e.stopPropagation(); openDatePicker(); });
  dpHost.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('button'); if (!b || !dp) return;
    if (b.dataset.preset !== undefined) {
      const i = +b.dataset.preset, [s, en] = PRESETS[i][1](); dp.preset = i; dp.start = s; dp.end = en;
      dp.view = new Date(en.getFullYear(), en.getMonth() - 1, 1); dp.picking = false;
    } else if (b.dataset.nav) { dp.view = new Date(dp.view.getFullYear(), dp.view.getMonth() + +b.dataset.nav, 1); }
    else if (b.dataset.day) {
      const [y, m, d] = b.dataset.day.split('-').map(Number), dt = new Date(y, m, d); dp.preset = 6;
      if (!dp.picking || dt < dp.start) { dp.start = dt; dp.end = dt; dp.picking = true; } else { dp.end = dt; dp.picking = false; }
    } else if (b.dataset.dp === 'cancel') return closeDatePicker();
    else if (b.dataset.dp === 'apply') {
      if (b.getAttribute('aria-disabled') === 'true') return;
      dpApplied = { preset: dp.preset, start: dp.start, end: dp.end };
      const label = dp.preset !== 6 ? PRESETS[dp.preset][0] : (same(dp.start, dp.end) ? fmt(dp.start) : fmt(dp.start) + ' - ' + fmt(dp.end));
      activator.querySelector('.Polaris-Text--root').textContent = label;
      return closeDatePicker();
    }
    renderDP();
  });
  addEventListener('resize', () => { placeDP(); applyNav(); hideTip(); });

  /* ---------- theme modal (kept in the page; open with #select-theme) ---------- */
  const modal = $('#modal-select-theme'), mscrim = $('#scrim-modal');
  const themeSel = $('select', modal), nextBtn = $('[data-act=next]', modal);
  function openThemeModal() { mscrim.classList.add('open'); modal.classList.add('open'); }
  function closeThemeModal() { mscrim.classList.remove('open'); modal.classList.remove('open'); }
  $$('[data-act=close-modal]', modal).forEach(b => b.addEventListener('click', closeThemeModal));
  mscrim.addEventListener('mousedown', closeThemeModal);
  themeSel.addEventListener('change', () => { nextBtn.disabled = !themeSel.value; });
  nextBtn.addEventListener('click', () => { ext('https://admin.shopify.com/store/brgmnnlukas/themes/' + themeSel.value.split('/').pop() + '/editor?context=apps'); closeThemeModal(); });
  $('.mbanner .x', modal).addEventListener('click', e => e.currentTarget.closest('.mbanner').remove());
  $$('[data-s=s-link][commandfor]').forEach(a => a.addEventListener('click', closeThemeModal));
  if (location.hash === '#select-theme') openThemeModal();
  addEventListener('hashchange', () => { if (location.hash === '#select-theme') openThemeModal(); });

  /* ---------- layout: card placement (desktop columns / mobile order) ---------- */
  const layout = $('#app .Polaris-Layout');
  const cardEls = {}; $$('[data-card]').forEach(c => { cardEls[c.dataset.card] = c; });
  const leftHost = cardEls.guide.closest('.Polaris-Layout__Section').parentElement;   // inner Layout: one Section per card
  const rightHost = cardEls.status.parentElement;                                       // BlockStack: cards directly
  const BASE_NAMES = { guide: 'Onboarding guide', rec: 'Recommended apps', data: 'Data insight', master: 'Master', status: 'Findter app status', help: 'Help & Support', sync: 'Sync recent updates', promotion: 'Promotion' };
  const BASE_IDS = Object.keys(BASE_NAMES);
  const DEFAULT_LAYOUT = {
    left: ['guide', 'data', 'promotion', 'rec', 'master'],                                               // Onboarding, Data insight, Promotion, Recommended apps
    right: ['status', 'help', 'sync'],
    mobile: ['status', 'sync', 'guide', 'help', 'data', 'promotion', 'rec', 'master'],                   // ... Data insight, Promotion, Recommended apps
  };
  const LS_LAYOUT = 'findter.homeLayout.v2';
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: applies for this visit only */ } };
  const cloneLayout = l => ({ left: [...l.left], right: [...l.right], mobile: [...l.mobile] });
  const sameLayout = (a, b) => ['left', 'right', 'mobile'].every(s => a[s].join() === b[s].join());
  const isHttp = s => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; } };

  /*PROMOTION_DATA*/

  const nameOf = id => BASE_NAMES[id] || id;
  // drop unknown blocks, de-duplicate, and put anything missing back right after the block that precedes it in the default order.
  // The Promotion block exists only once a promotion has been created in the Promotion tab, and only in the left column and the phone order
  // (the banner is 633 px wide, which does not fit the right column).
  function reconcile(l) {
    const valid = new Set(BASE_IDS.filter(id => id !== 'promotion' || promotions.length > 0));
    const pick = (arr, valid2, seen) => (Array.isArray(arr) ? arr : []).filter(id => valid2.has(id) && !seen.has(id) && seen.add(id));
    const sd = new Set(), sm = new Set();
    const noPromo = new Set([...valid].filter(id => id !== 'promotion'));
    const out = { left: pick(l && l.left, valid, sd), right: pick(l && l.right, noPromo, sd), mobile: pick(l && l.mobile, valid, sm) };
    valid.forEach(id => {
      if (sd.has(id)) return;
      const side = DEFAULT_LAYOUT.right.includes(id) ? 'right' : 'left';
      const def = DEFAULT_LAYOUT[side], at = def.indexOf(id), prev = at > 0 ? def.slice(0, at).reverse().find(k => out[side].includes(k)) : null;
      out[side].splice(prev ? out[side].indexOf(prev) + 1 : out[side].length, 0, id);
    });
    DEFAULT_LAYOUT.mobile.forEach((id, i) => {
      if (!valid.has(id) || sm.has(id)) return;
      const prev = DEFAULT_LAYOUT.mobile.slice(0, i).reverse().find(k => out.mobile.includes(k));
      out.mobile.splice(prev ? out.mobile.indexOf(prev) + 1 : out.mobile.length, 0, id); sm.add(id);
    });
    return out;
  }
  let savedLayout = reconcile(lsGet(LS_LAYOUT) || DEFAULT_LAYOUT);

  const mobileLayout = document.createElement('div'); mobileLayout.className = layout.className + ' mobile-layout'; mobileLayout.hidden = true;
  layout.after(mobileLayout);
  function placeDesktop() {
    savedLayout.left.forEach(id => {
      const card = cardEls[id], p = card.parentElement;
      let sec = p && p.classList.contains('Polaris-Layout__Section') && p.parentElement === leftHost ? p : null;
      if (!sec) { sec = document.createElement('div'); sec.className = 'Polaris-Layout__Section'; sec.appendChild(card); }
      leftHost.appendChild(sec);
    });
    savedLayout.right.forEach(id => rightHost.appendChild(cardEls[id]));
    $$(':scope > .Polaris-Layout__Section', leftHost).forEach(s => { if (!s.firstElementChild) s.remove(); });
  }
  function applyOrder() {
    if (mq.mobile.matches) {
      mobileLayout.innerHTML = '';
      savedLayout.mobile.forEach(k => { const s = document.createElement('div'); s.className = 'Polaris-Layout__Section'; s.appendChild(cardEls[k]); mobileLayout.appendChild(s); });
      layout.hidden = true; mobileLayout.hidden = false;
    } else {
      placeDesktop();
      mobileLayout.hidden = true; mobileLayout.innerHTML = ''; layout.hidden = false;
    }
    placeSyncBanner(); renderPromotion(); updateCarousel(true);
  }
  mq.mobile.addEventListener('change', applyOrder);

  /* ---------- Manual sync (Sync recent updates card) ----------
     Click -> button disabled, yellow "Collecting data" banner on top of the left column (top of the list on phones), the Sync badge and the
     Products indexed badge turn to "In progress" (#ffd6a4). When indexing finishes (simulated, SYNC_MS) the green "Data indexing is completed."
     banner replaces the yellow one, both badges go back to #b4fed2, the button is enabled again and the last-synced time is updated. */
  const SYNC_MS = 8000;
  const syncCard = cardEls.sync, syncBtn = $('button.Polaris-Button', syncCard), syncBadge = $('.Polaris-Badge', syncCard), syncBadgeText = $('.Polaris-Text--bodySm', syncBadge), syncBadgeHidden = $('.Polaris-Text--visuallyHidden', syncBadge);
  const syncTime = $('p.Polaris-Text--semibold', syncCard);
  const syncHost = document.createElement('div'); syncHost.className = 'Polaris-Layout__Section sy-host';
  const SVG = d => '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">' + d + '</svg>';
  const SY_ICON = {
    warn: SVG('<path d="M10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Z"/><path d="M11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/><path fill-rule="evenodd" d="M9.116 3.994c.376-.65 1.33-.65 1.708 0l5.797 10.04c.377.65-.1 1.463-.854 1.463h-11.59c-.754 0-1.23-.813-.854-1.463l5.793-10.04Zm.636 1.164-5.15 8.917c-.12.208.034.465.272.465h10.3c.24 0 .393-.257.273-.465l-5.15-8.917a.314.314 0 0 0-.545 0Z"/>'),
    ok: SVG('<path d="M13.28 8.78a.75.75 0 0 0-1.06-1.06l-3.47 3.47-1.22-1.22a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l4-4Z"/><path fill-rule="evenodd" d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-5.5 7a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z"/>'),
    x: SVG('<path d="M12.72 13.78a.75.75 0 1 0 1.06-1.06l-2.72-2.72 2.72-2.72a.75.75 0 0 0-1.06-1.06l-2.72 2.72-2.72-2.72a.75.75 0 0 0-1.06 1.06l2.72 2.72-2.72 2.72a.75.75 0 1 0 1.06 1.06l2.72-2.72 2.72 2.72Z"/>'),
  };
  function placeSyncBanner() { if (syncHost.firstElementChild) (mq.mobile.matches ? mobileLayout : leftHost).prepend(syncHost); else syncHost.remove(); }
  function showSyncBanner(kind) {
    const warn = kind === 'warn';
    syncHost.innerHTML = '<div class="sy-banner sy-banner--' + kind + '" role="status"><div class="sy-banner__head"><span class="sy-banner__icon">' + SY_ICON[kind] + '</span><span class="sy-banner__title">' + (warn ? 'Collecting data' : 'Data indexing is completed.') + '</span><button type="button" class="sy-banner__x" aria-label="Dismiss">' + SY_ICON.x + '</button></div>'
      + (warn ? '<div class="sy-banner__body">Up-to-date data are being collected. Please wait until this process is complete before continuing with the app.</div>' : '') + '</div>';
    $('.sy-banner__x', syncHost).addEventListener('click', () => { syncHost.textContent = ''; placeSyncBanner(); });
    placeSyncBanner();
  }
  const setSyncState = running => {
    syncBadge.classList.toggle('sy-badge--progress', running); syncBadge.classList.toggle('sy-badge--done', !running);
    syncRunning = running; renderStatus();                                   // Products indexed turns orange while indexing, then back to its rule colour
    syncBadgeText.textContent = running ? 'In progress' : 'Completed'; syncBadgeHidden.textContent = running ? 'Warning' : 'Success';
    syncBtn.disabled = running; syncBtn.classList.toggle('Polaris-Button--disabled', running); syncBtn.setAttribute('aria-disabled', String(running));
  };
  setSyncState(false);
  syncBtn.addEventListener('click', () => {
    if (syncBtn.disabled) return;
    setSyncState(true); showSyncBanner('warn');
    setTimeout(() => {
      syncTime.textContent = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setSyncState(false); showSyncBanner('ok');
    }, SYNC_MS);
  });

  /* ---------- Master card on the homepage ---------- */
  $('button[aria-label="Dismiss master"]', cardEls.master).addEventListener('click', () => dismiss(cardEls.master));
  $('[data-act=open-master]', cardEls.master).addEventListener('click', () => { location.hash = '#/master'; });

  /* ---------- Master UI page: routing + tabs ---------- */
  const appEl = $('#app'), masterPage = $('#master-page');
  const TABS = [['master', 'Master'], ['home', 'Home'], ['ai-agent', 'AI Agent'], ['features', 'Features'], ['plan-management', 'Plan management'], ['tracking', 'Tracking'], ['payment', 'Payment'], ['testing', 'Testing'], ['devops', 'DevOps'], ['promotion', 'Promotion']];
  const tabsEl = $('.mt-tabs'), panelLoad = $('[data-panel=load]'), panelHome = $('[data-panel=home]'), panelPromo = $('[data-panel=promotion]');
  tabsEl.setAttribute('role', 'tablist');
  TABS.forEach(([id, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mt-tab'; b.setAttribute('role', 'tab'); b.dataset.tab = id; b.textContent = label; tabsEl.appendChild(b); });
  tabsEl.addEventListener('click', e => { const b = e.target.closest('.mt-tab'); if (b) location.hash = '#/master/' + b.dataset.tab; });
  tabsEl.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(t => t[0] === currentTab), n = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    location.hash = '#/master/' + TABS[n][0]; setTimeout(() => $('.mt-tab[aria-selected=true]').focus(), 0);
  });
  $('[data-act=load]').addEventListener('click', () => toast('No data source is connected in this copy'));
  let currentTab = 'master';
  function showTab(id, sub) {
    if (!TABS.some(t => t[0] === id)) id = 'master';
    currentTab = id;
    masterPage.classList.toggle('mp-editing', id === 'promotion' && !!sub);
    $$('.mt-tab').forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    panelHome.hidden = id !== 'home'; panelLoad.hidden = id === 'home' || id === 'promotion'; panelPromo.hidden = id !== 'promotion';
    if (id === 'home') renderHL();
    if (id === 'promotion') renderPromotionTab(sub);
  }
  function route() {
    const m = location.hash.match(/^#\/master(?:\/([\w-]+))?(?:\/(new|edit\/[\w-]+))?\/?$/);
    appEl.hidden = !!m; masterPage.hidden = !m;
    // sidebar: on Master the "Master" sub item gets the pill and the Findter item only shows highlighted text (same as the other sub pages)
    const masterLink = $('.sh-item--master'), appLink = $('.sh-item--app'), rail = $('.sh-appsrail');
    masterLink.toggleAttribute('aria-current', !!m); if (m) masterLink.setAttribute('aria-current', 'page');
    [appLink, rail].forEach(a => { a.toggleAttribute('aria-current', !m); if (!m) a.setAttribute('aria-current', 'page'); });
    appLink.classList.toggle('sh-item--parent', !!m);
    if (m) showTab(m[1] || 'master', m[2]); else renderPromotion();
    scroller.scrollTop = 0; hideTip(); closeDatePicker();
  }
  addEventListener('hashchange', route);
  // clicking the (already active) Findter item in the sidebar returns to the app home
  $$('.sh-nav a[aria-current=page]').forEach(a => a.addEventListener('click', () => { if (/^#\/master/.test(location.hash)) location.hash = '#/'; }));
  body.addEventListener('click', e => { if (e.target.closest('.sh-top__title, .sh-top > img') && /^#\/master/.test(location.hash)) location.hash = '#/'; });

  /* ---------- Home tab: drag & drop layout editor (desktop left / right + mobile order) ---------- */
  const hlRoot = $('#hl');
  const SIDES = ['left', 'right', 'mobile'];
  let draft = cloneLayout(savedLayout);
  const DRAG = '<svg viewBox="0 0 20 20"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></svg>';
  const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const itemHTML = (id, i) => `<div class="hl-item" role="listitem" tabindex="0" data-id="${escHtml(id)}" aria-label="${escHtml(nameOf(id))}, position ${i + 1}"><span class="hl-handle" aria-hidden="true">${DRAG}</span><span class="hl-name">${escHtml(nameOf(id))}</span>${id === 'promotion' ? `<span class="hl-tag">Created in the Promotion tab</span><span class="hl-acts"><button type="button" class="hl-act" data-act="hl-manage" aria-label="Manage promotions">Manage</button></span>` : ''}<span class="hl-pos">${i + 1}</span></div>`;
  const isDirty = () => !sameLayout(draft, savedLayout);
  const setBtn = (b, disabled) => { b.disabled = disabled; b.classList.toggle('Polaris-Button--disabled', disabled); };
  const listOf = side => $(`.hl-list[data-side=${side}]`, hlRoot);
  const findItem = (side, id) => $$('.hl-item', listOf(side)).find(i => i.dataset.id === id);
  function renderHL() {
    SIDES.forEach(side => {
      const list = listOf(side), n = draft[side].length;
      list.innerHTML = draft[side].map(itemHTML).join(''); list.classList.toggle('is-empty', !n);
      $(`.hl-count[data-side=${side}]`, hlRoot).textContent = n + (n === 1 ? ' block' : ' blocks');
    });
    const dirty = isDirty();
    setBtn($('[data-act=hl-save]'), !dirty); setBtn($('[data-act=hl-discard]'), !dirty); setBtn($('[data-act=hl-reset]'), sameLayout(draft, reconcile(DEFAULT_LAYOUT)));
    $('.hl-status').hidden = !dirty;
    const homeTab = $('.mt-tab[data-tab=home]'); if (homeTab) homeTab.classList.toggle('has-changes', dirty);
  }
  const readDraft = () => { draft = {}; SIDES.forEach(side => { draft[side] = $$('.hl-item:not([hidden])', listOf(side)).map(i => i.dataset.id); }); };
  $('[data-act=hl-save]').addEventListener('click', () => {
    savedLayout = reconcile(cloneLayout(draft)); lsSet(LS_LAYOUT, savedLayout);
    applyOrder();                                       // re-places everything on the homepage
    draft = cloneLayout(savedLayout);
    renderHL(); toast('Saved. The homepage now uses this layout');
  });
  $('[data-act=hl-discard]').addEventListener('click', () => { draft = cloneLayout(savedLayout); renderHL(); });
  $('[data-act=hl-reset]').addEventListener('click', () => { draft = reconcile(DEFAULT_LAYOUT); renderHL(); });

  let drag = null;
  function moveTarget(x, y) {
    const el = document.elementFromPoint(x, y), col = el && el.closest('.hl-col');
    const ok = col && col.dataset.group === drag.group && !(drag.item.dataset.id === 'promotion' && col.classList.contains('hl-col--right'));   // desktop blocks stay on desktop, mobile blocks on mobile; the Promotion block never goes to the right column
    $$('.hl-col', hlRoot).forEach(c => c.classList.toggle('drop-hover', ok && c === col));
    if (!ok) return;
    const list = $('.hl-list', col), over = el.closest('.hl-item');
    if (over && over !== drag.item && list.contains(over)) {
      const b = over.getBoundingClientRect();
      if (y < b.top + b.height / 2) over.before(drag.ph); else over.after(drag.ph);
    } else if (!over) {
      const items = $$('.hl-item:not([hidden])', list);
      if (!items.length || y > items[items.length - 1].getBoundingClientRect().bottom) list.appendChild(drag.ph);
      else if (y < items[0].getBoundingClientRect().top) items[0].before(drag.ph);
    }
  }
  hlRoot.addEventListener('pointerdown', e => {
    const item = e.target.closest('.hl-item'); if (!item || e.button > 0 || e.target.closest('.hl-act')) return;
    if (e.pointerType === 'touch' && !e.target.closest('.hl-handle')) return;
    e.preventDefault(); item.focus({ preventScroll: true });
    const r = item.getBoundingClientRect();
    const ghost = item.cloneNode(true); ghost.classList.add('hl-ghost'); ghost.removeAttribute('tabindex'); ghost.style.cssText = `width:${r.width}px;left:${r.left}px;top:${r.top}px`;
    const ph = document.createElement('div'); ph.className = 'hl-placeholder'; ph.style.height = r.height + 'px';
    item.before(ph); item.hidden = true; document.body.appendChild(ghost); body.classList.add('is-dragging');
    drag = { item, ghost, ph, group: item.closest('.hl-col').dataset.group, dx: e.clientX - r.left, dy: e.clientY - r.top };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    drag.ghost.style.left = e.clientX - drag.dx + 'px'; drag.ghost.style.top = e.clientY - drag.dy + 'px';
    if (e.clientY < 90) scroller.scrollTop -= 14; else if (e.clientY > innerHeight - 90) scroller.scrollTop += 14;
    moveTarget(e.clientX, e.clientY);
  });
  function endDrag(cancel) {
    if (!drag) return;
    const { item, ghost, ph } = drag, id = item.dataset.id; drag = null;
    if (cancel) ph.remove(); else ph.replaceWith(item);
    const side = item.closest('.hl-list').dataset.side;
    item.hidden = false; ghost.remove(); body.classList.remove('is-dragging');
    $$('.hl-col', hlRoot).forEach(c => c.classList.remove('drop-hover'));
    if (!cancel) readDraft();
    renderHL(); const again = findItem(side, id); if (again) again.focus({ preventScroll: true });
  }
  hlRoot.addEventListener('click', e => { if (e.target.closest('[data-act=hl-manage]')) location.hash = '#/master/promotion'; });
  addEventListener('pointerup', () => endDrag(false));
  addEventListener('pointercancel', () => endDrag(true));
  // keyboard: Shift+Arrow moves the focused block (up/down = reorder, left/right = other desktop column)
  hlRoot.addEventListener('keydown', e => {
    const item = e.target.closest('.hl-item'); if (!item || !e.shiftKey || !/^Arrow/.test(e.key)) return;
    e.preventDefault();
    const id = item.dataset.id, side = item.closest('.hl-list').dataset.side, arr = draft[side], i = arr.indexOf(id);
    let to = side;
    if (e.key === 'ArrowUp' && i > 0) { arr.splice(i, 1); arr.splice(i - 1, 0, id); }
    else if (e.key === 'ArrowDown' && i < arr.length - 1) { arr.splice(i, 1); arr.splice(i + 1, 0, id); }
    else if (id !== 'promotion' && ((e.key === 'ArrowRight' && side === 'left') || (e.key === 'ArrowLeft' && side === 'right'))) { arr.splice(i, 1); to = side === 'left' ? 'right' : 'left'; draft[to].splice(Math.min(i, draft[to].length), 0, id); }
    renderHL(); const again = findItem(to, id); if (again) again.focus({ preventScroll: true });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && drag) endDrag(true); });

  let lastFocus = null;

  /* delete confirmation (also closable with X / Esc / backdrop) */
  const dm = $('#confirm-modal'), dmScrim = $('#scrim-confirm');
  let delPromotionSku = null;
  function askDeletePromotion(sku, name) { delPromotionSku = sku; $('#dm-title').textContent = 'Delete promotion?'; $('#dm-text').textContent = `“${name}” will be removed for every shop and disappears from the homepage right away. This cannot be undone.`; lastFocus = document.activeElement; dmScrim.classList.add('open'); dm.hidden = false; $('[data-act=dm-cancel]', dm).focus(); }
  function closeConfirm() { if (dm.hidden) return; dm.hidden = true; dmScrim.classList.remove('open'); delPromotionSku = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  dmScrim.addEventListener('mousedown', closeConfirm);
  dm.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'dm-close' || b.dataset.act === 'dm-cancel') closeConfirm();
    else if (b.dataset.act === 'dm-delete' && delPromotionSku) { const sku = delPromotionSku; closeConfirm(); deletePromotion(sku); }
  });
  // Esc closes the modal; Tab stays inside it
  document.addEventListener('keydown', e => {
    if (dm.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeConfirm(); }
    else if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input, [href]', dm).filter(x => x.offsetParent !== null); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  /*PROMOTION_MODULE*/
  addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  applyNav(); applyOrder(); updateCarousel(true); route();
})();
