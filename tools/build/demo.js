/* Demo data: fakes the shop (store type / plan state / days left / products / language) so every page can be checked as a Free, Trial or Paid store.
   Stand-alone on purpose, like code-notice.js: index.html inlines it, every other page loads assets/demo.js. All pages share one localStorage key,
   so a change made on one page is what the next page opens with (and an already open tab follows through the "storage" event).
   - window.FindterDemo.DEMO       the live state object (same reference for ever, mutate it only through the bar)
   - window.FindterDemo.PLANS      store types: limit, how the store shows, whether it has a date row
   - window.FindterDemo.set(key, value)  changes one value from code (e.g. the badge is removed in the chat), saves it and tells everyone
   - window.FindterDemo.reset()  every value back to its start value; the page gets a "findter:demo-reset" event first
   - window.FindterDemo.onChange(fn)  fn() runs after every change (bar click, set(), or another tab) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PLANS = {   // limit, how the store shows, whether it has a date row
    'Trial':             { limit: 50000, label: 'Trial', tone: 'blue', date: 'trial' },
    'Trial not started': { limit: 50000, label: 'Trial', tone: 'blue', date: null },      // app embed never enabled, or uninstalled mid-trial (BR-02)
    'Starter':           { limit: 3000, label: 'Starter', tone: 'green', date: 'paid' },
    'Enterprise':        { limit: Infinity, label: 'Enterprise', tone: 'green', date: 'paid' },
    'Free':              { limit: 300, label: 'Free', tone: 'green', date: null },
    'Paid before':       { limit: 300, label: 'Free', tone: 'green', date: null },        // paid once, the plan has lapsed
    'Service':           { limit: 300, label: 'Free', tone: 'green', date: null },
    'Development':       { limit: 50000, label: 'Development', tone: 'blue', date: null },
    'Legacy':            { limit: 50000, label: 'Legacy', tone: 'gray', date: null },     // soft-launch cohort before its deadline
    'Old install':       { limit: 50000, label: 'Free', tone: 'green', date: null },      // installed before 20/07/2026, no plan limit
  };
  const NO_PRODUCT_STATES = ['Development', 'Enterprise'];                    // no "over" / "90%" case: free under 50,000 / no limit
  const LANGS = { en: 'English', fr: 'Français', de: 'Deutsch', vi: 'Tiếng Việt', ja: '日本語' };
  const DEMO_KEY = 'findter.demoStatus';
  const DEFAULTS = { plan: 'Trial', sub: 'active', days: 14, over: 'normal', lang: 'en', wm: 'shown', cse: 'online' };
  const DEMO = { ...DEFAULTS };
  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(DEMO_KEY)) || {};
      if (PLANS[s.plan]) DEMO.plan = s.plan;
      if (['active', 'cancelled', 'downgraded'].includes(s.sub)) DEMO.sub = s.sub;
      if ([14, 7, 3, 1, 0].includes(s.days)) DEMO.days = s.days;
      DEMO.over = s.over === true ? 'over' : ['normal', 'near', 'over'].includes(s.over) ? s.over : 'normal';   // older saves stored a boolean
      if (LANGS[s.lang]) DEMO.lang = s.lang;
      if (['online', 'offline'].includes(s.cse)) DEMO.cse = s.cse;              // is a CSE online in the chat (a paid shop's badge request is answered at once when nobody is)
      if (['shown', 'removed'].includes(s.wm)) DEMO.wm = s.wm;                // the "Powered by Findter" badge: still on the storefront, or removed
    } catch (e) { /* storage blocked */ }
  };
  load();
  const listeners = [];
  const save = () => { try { localStorage.setItem(DEMO_KEY, JSON.stringify(DEMO)); } catch (err) { /* storage blocked */ } };
  let bar = null, paint = () => {};                                          // the bar is drawn below, only on pages that have the admin header
  const changed = () => { paint(); listeners.forEach(fn => fn()); };
  window.FindterDemo = { DEMO, PLANS, NO_PRODUCT_STATES, LANGS, onChange: fn => { listeners.push(fn); }, set: (key, value) => { DEMO[key] = value; save(); changed(); },
    reset: () => { Object.assign(DEMO, DEFAULTS); save(); window.dispatchEvent(new Event('findter:demo-reset')); changed(); } };   // every demo value back to its start value (the badge is shown again)
  window.addEventListener('storage', e => { if (e.key === DEMO_KEY) { load(); changed(); } });   // another tab changed the demo data (also the storefront tab)

  /* ---------- demo bar in the header ---------- */
  const top = $('.sh-top'); if (!top) return;
  bar = document.createElement('div'); bar.className = 'demo-bar';
  const groups = [
    ['Store', 'plan', Object.keys(PLANS).map(k => [k, k]), 'select'],
    ['Plan', 'sub', [['active', 'Active'], ['cancelled', 'Cancelled'], ['downgraded', 'Downgraded']]],
    ['Date', 'days', [[14, '14d'], [7, '7d'], [3, '3d'], [1, '1d'], [0, 'Today']]],
    ['Products', 'over', [['normal', 'Normal'], ['near', '90%'], ['over', 'Over limit']]],
    ['Language', 'lang', Object.entries(LANGS), 'select'],
    ['Badge', 'wm', [['shown', 'Shown'], ['removed', 'Removed']]],
    ['CSE', 'cse', [['online', 'Online'], ['offline', 'Offline']]],
  ];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  bar.innerHTML = '<button type="button" class="demo-toggle" aria-expanded="false" aria-controls="demo-panel">Demo data</button><div class="demo-panel" id="demo-panel" role="group" aria-label="Demo data for the shop">'
    + groups.map(([label, key, opts, kind]) => '<div class="demo-group" role="group" aria-label="' + label + '"><span class="demo-label">' + label + '</span>'
      + (kind === 'select'
        ? '<select class="demo-select" data-key="' + key + '" aria-label="' + label + '">' + opts.map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + '</option>').join('') + '</select>'
        : opts.map(([v, t]) => '<button type="button" class="demo-btn" data-key="' + key + '" data-val="' + v + '" aria-pressed="false">' + t + '</button>').join(''))
      + '</div>').join('') + '<button type="button" class="demo-reset" data-act="reset" title="Back to the start values: Trial store, badge shown, CSE online">Reset</button></div>';
  top.insertBefore(bar, $('.sh-more', top));
  paint = () => {
    const p = PLANS[DEMO.plan];
    $$('.demo-btn', bar).forEach(b => b.setAttribute('aria-pressed', String(String(DEMO[b.dataset.key]) === b.dataset.val)));
    $$('.demo-select', bar).forEach(s => { s.value = DEMO[s.dataset.key]; });
    $$('.demo-btn[data-key=sub]', bar).forEach(b => { b.disabled = p.date !== 'paid'; });                     // plan state: paid plans only
    $$('.demo-btn[data-key=days]', bar).forEach(b => { b.disabled = !p.date; });                              // days left: stores with a date row
    $$('.demo-btn[data-key=over]', bar).forEach(b => { b.disabled = NO_PRODUCT_STATES.includes(DEMO.plan) && b.dataset.val !== 'normal'; });
  };
  bar.addEventListener('change', e => { const s = e.target.closest('.demo-select'); if (s) { DEMO[s.dataset.key] = s.value; save(); changed(); } });
  bar.addEventListener('click', e => {
    if (e.target.closest('.demo-reset')) { window.FindterDemo.reset(); return; }
    const b = e.target.closest('.demo-btn');
    if (b) { DEMO[b.dataset.key] = b.dataset.key === 'days' ? +b.dataset.val : b.dataset.val; save(); changed(); return; }
    const t = e.target.closest('.demo-toggle');
    if (t) { const open = !bar.classList.contains('is-open'); bar.classList.toggle('is-open', open); t.setAttribute('aria-expanded', String(open)); }
  });
  document.addEventListener('click', e => { if (!bar.contains(e.target) && bar.classList.contains('is-open')) { bar.classList.remove('is-open'); $('.demo-toggle', bar).setAttribute('aria-expanded', 'false'); } });
  paint();
})();
