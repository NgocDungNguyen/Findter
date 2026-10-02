  /* ---------- layout: card placement (desktop columns / mobile order) ---------- */
  const layout = $('#app .Polaris-Layout');
  const cardEls = {}; $$('[data-card]').forEach(c => { cardEls[c.dataset.card] = c; });
  const leftHost = cardEls.guide.closest('.Polaris-Layout__Section').parentElement;   // inner Layout: one Section per card
  const rightHost = cardEls.status.parentElement;                                       // BlockStack: cards directly
  const BASE_NAMES = { guide: 'Onboarding guide', rec: 'Recommended apps', data: 'Data insight', master: 'Master', status: 'Findter app status', help: 'Help & Support', sync: 'Sync recent updates' };
  const BASE_IDS = Object.keys(BASE_NAMES);
  const DEFAULT_LAYOUT = {
    left: ['guide', 'rec', 'data', 'master'],
    right: ['status', 'help', 'sync'],
    mobile: ['status', 'sync', 'guide', 'help', 'rec', 'data', 'master'],
  };
  const SECTION_LABEL = { left: 'Desktop · Left column', right: 'Desktop · Right column', mobile: 'Mobile phone' };
  const LS_LAYOUT = 'findter.homeLayout.v2', LS_PROMOS = 'findter.promos.v2';
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: applies for this visit only */ } };
  const cloneLayout = l => ({ left: [...l.left], right: [...l.right], mobile: [...l.mobile] });
  const sameLayout = (a, b) => ['left', 'right', 'mobile'].every(s => a[s].join() === b[s].join());

  /* promotion banner blocks: [{ id, name, target: 'left'|'right'|'mobile', interval (s), banners: [{ url, link }] }]
     A banner belongs to the section it was added in: left/right = desktop only, mobile = phones only. */
  const isHttp = s => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; } };
  const cleanPromo = p => {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.banners)) return null;
    const banners = p.banners.filter(b => b && isHttp(b.url)).map(b => ({ url: b.url, link: isHttp(b.link) ? b.link : '' }));
    if (!banners.length) return null;
    return { id: p.id, name: p.name.slice(0, 40), target: ['left', 'right', 'mobile'].includes(p.target) ? p.target : 'left', interval: Math.min(60, Math.max(1, Math.round(+p.interval) || 5)), banners };
  };
  let promos = (lsGet(LS_PROMOS) || []).map(cleanPromo).filter(Boolean);
  const promoKey = p => 'promo:' + p.id;
  const clonePromos = l => l.map(p => ({ ...p, banners: p.banners.map(b => ({ ...b })) }));
  let draftPromos = clonePromos(promos);
  const promoOf = id => draftPromos.find(p => promoKey(p) === id);
  const nameOf = id => BASE_NAMES[id] || (promoOf(id) || {}).name || id;
  // drop unknown blocks, de-duplicate, and put anything missing (e.g. a new promotion banner) at the end of ITS section
  function reconcile(l, pl = promos) {
    const desktopValid = new Set([...BASE_IDS, ...pl.filter(p => p.target !== 'mobile').map(promoKey)]);
    const mobileValid = new Set([...BASE_IDS, ...pl.filter(p => p.target === 'mobile').map(promoKey)]);
    const pick = (arr, valid, seen) => (Array.isArray(arr) ? arr : []).filter(id => valid.has(id) && !seen.has(id) && seen.add(id));
    const sd = new Set(), sm = new Set();
    const out = { left: pick(l && l.left, desktopValid, sd), right: pick(l && l.right, desktopValid, sd), mobile: pick(l && l.mobile, mobileValid, sm) };
    desktopValid.forEach(id => {
      if (sd.has(id)) return;
      const side = BASE_IDS.includes(id) ? (DEFAULT_LAYOUT.right.includes(id) ? 'right' : 'left') : (pl.find(p => promoKey(p) === id).target === 'right' ? 'right' : 'left');
      out[side].push(id);
    });
    [...DEFAULT_LAYOUT.mobile, ...pl.filter(p => p.target === 'mobile').map(promoKey)].forEach(id => { if (mobileValid.has(id) && !sm.has(id)) out.mobile.push(id); });
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
    updateCarousel(true); updatePromos(true);
  }
  mq.mobile.addEventListener('change', applyOrder);

  /* ---------- promotion banner blocks on the homepage ---------- */
  const BEVEL_STYLE = cardEls.rec.getAttribute('style'), BOX_STYLE = cardEls.rec.firstElementChild.getAttribute('style');
  const runtimes = {};
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mk = (tag, cls, attrs) => { const e = document.createElement(tag); if (cls) e.className = cls; Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  function fillPromoCard(card, p) {
    if (runtimes[card.dataset.card]) clearInterval(runtimes[card.dataset.card].timer);
    card.textContent = '';
    const box = mk('div', 'Polaris-Box pb-box', { style: BOX_STYLE + ';--pc-box-padding-block-start-xs:0;--pc-box-padding-block-end-xs:0;--pc-box-padding-inline-start-xs:0;--pc-box-padding-inline-end-xs:0' });
    const viewport = mk('div', 'pb-viewport', { role: 'group', 'aria-roledescription': 'carousel', 'aria-label': p.name });
    const track = mk('div', 'pb-track');
    p.banners.forEach((b, i) => {
      const slide = mk('div', 'pb-slide', { role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${p.banners.length}` });
      const img = mk('img', '', { src: b.url, alt: p.name, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', draggable: 'false' });
      img.addEventListener('error', () => { slide.classList.add('is-broken'); slide.textContent = 'Image unavailable'; });
      if (b.link) { const a = mk('a', 'pb-link', { href: b.link, target: '_blank', rel: 'noopener noreferrer' }); a.appendChild(img); slide.appendChild(a); } else slide.appendChild(img);
      track.appendChild(slide);
    });
    viewport.appendChild(track); box.appendChild(viewport);
    const dots = mk('div', 'pb-dots'); box.appendChild(dots);
    card.appendChild(box);
    const rt = { p, track, dots, idx: 0, timer: null };
    runtimes[card.dataset.card] = rt;
    const stop = () => { clearInterval(rt.timer); rt.timer = null; };
    const start = () => { stop(); if (!reduceMotion.matches && p.banners.length > 1) rt.timer = setInterval(() => step(rt, 1), p.interval * 1000); };
    rt.start = start; rt.stop = stop;
    box.addEventListener('pointerenter', stop); box.addEventListener('pointerleave', start);
    box.addEventListener('focusin', stop); box.addEventListener('focusout', start);
    dots.addEventListener('click', e => { const d = e.target.closest('button'); if (d) { rt.idx = +d.dataset.i; renderPromo(rt); start(); } });
    const x = mk('button', 'pb-x', { type: 'button', 'aria-label': 'Close promotion banner' });
    x.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); stop(); card.hidden = true; });   // comes back on reload, like the other blocks
    box.appendChild(x);
    if (p.banners.length > 1) {
      const nav = (dir, label, d) => { const b = mk('button', 'pb-nav pb-nav--' + dir, { type: 'button', 'aria-label': label }); b.innerHTML = d; b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); step(rt, dir === 'next' ? 1 : -1); start(); }); box.appendChild(b); };
      nav('prev', 'Previous banner', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>');
      nav('next', 'Next banner', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>');
    }
    renderPromo(rt); start();
  }
  function renderPromo(rt, instant) {
    const max = rt.p.banners.length - 1;
    rt.idx = Math.min(Math.max(rt.idx, 0), max);
    if (instant) rt.track.style.transition = 'none';
    rt.track.style.transform = `translateX(${-rt.idx * 100}%)`;
    if (instant) requestAnimationFrame(() => { rt.track.style.transition = ''; });
    rt.dots.textContent = '';
    if (max > 0) for (let i = 0; i <= max; i++) rt.dots.appendChild(mk('button', 'pb-dot' + (i === rt.idx ? ' is-on' : ''), { type: 'button', 'aria-label': `Show banner ${i + 1}`, 'data-i': i }));
  }
  function step(rt, d) { const max = rt.p.banners.length - 1; rt.idx += d; if (rt.idx > max) rt.idx = 0; if (rt.idx < 0) rt.idx = max; renderPromo(rt); }
  function updatePromos(resize) { Object.values(runtimes).forEach(rt => { renderPromo(rt, resize); rt.start(); }); }
  function syncPromoCards() {
    const want = new Set(promos.map(promoKey));
    Object.keys(cardEls).filter(id => id.startsWith('promo:') && !want.has(id)).forEach(id => { if (runtimes[id]) clearInterval(runtimes[id].timer); delete runtimes[id]; cardEls[id].remove(); delete cardEls[id]; });
    promos.forEach(p => {
      const id = promoKey(p);
      if (!cardEls[id]) cardEls[id] = mk('div', 'Polaris-ShadowBevel pb-card', { style: BEVEL_STYLE, 'data-card': id });
      fillPromoCard(cardEls[id], p);
    });
    savedLayout = reconcile(savedLayout); lsSet(LS_LAYOUT, savedLayout);
    applyOrder();
  }
  new ResizeObserver(() => updatePromos(true)).observe(scroller);

  /* ---------- Master card on the homepage ---------- */
  $('button[aria-label="Dismiss master"]', cardEls.master).addEventListener('click', () => dismiss(cardEls.master));
  $('[data-act=open-master]', cardEls.master).addEventListener('click', () => { location.hash = '#/master'; });

  /* ---------- Master UI page: routing + tabs ---------- */
  const appEl = $('#app'), masterPage = $('#master-page');
  const TABS = [['master', 'Master'], ['home', 'Home'], ['ai-agent', 'AI Agent'], ['features', 'Features'], ['plan-management', 'Plan management'], ['tracking', 'Tracking'], ['payment', 'Payment'], ['testing', 'Testing'], ['devops', 'DevOps']];
  const tabsEl = $('.mt-tabs'), panelLoad = $('[data-panel=load]'), panelHome = $('[data-panel=home]');
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
  function showTab(id) {
    if (!TABS.some(t => t[0] === id)) id = 'master';
    currentTab = id;
    $$('.mt-tab').forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    panelHome.hidden = id !== 'home'; panelLoad.hidden = id === 'home';
    if (id === 'home') renderHL();
  }
  function route() {
    const m = location.hash.match(/^#\/master(?:\/([\w-]+))?\/?$/);
    appEl.hidden = !!m; masterPage.hidden = !m;
    if (m) showTab(m[1] || 'master'); else updatePromos(true);
    scroller.scrollTop = 0; hideTip(); closeDatePicker();
  }
  addEventListener('hashchange', route);
  // clicking the (already active) Findter item in the sidebar returns to the app home
  $$('.sh-nav a[aria-current=page]').forEach(a => a.addEventListener('click', () => { if (/^#\/master/.test(location.hash)) location.hash = '#/'; }));
  body.addEventListener('click', e => { if (e.target.closest('.sh-top__title, .sh-top > img') && /^#\/master/.test(location.hash)) location.hash = '#/'; });

  /* ---------- Home tab: drag & drop layout editor (desktop left / right + mobile order) ---------- */
  const hlRoot = $('#hl');
  const SIDES = ['left', 'right', 'mobile'];
  let draft = cloneLayout(savedLayout), lastAdded = null;
  const DRAG = '<svg viewBox="0 0 20 20"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></svg>';
  const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const itemHTML = (id, i) => `<div class="hl-item" role="listitem" tabindex="0" data-id="${escHtml(id)}" aria-label="${escHtml(nameOf(id))}, position ${i + 1}"><span class="hl-handle" aria-hidden="true">${DRAG}</span><span class="hl-name">${escHtml(nameOf(id))}</span>${id.startsWith('promo:') ? `<span class="hl-tag">Promotion</span><span class="hl-acts"><button type="button" class="hl-act" data-act="hl-edit" data-id="${escHtml(id)}" aria-label="Edit ${escHtml(nameOf(id))}">Edit</button><button type="button" class="hl-act hl-act--del" data-act="hl-delete" data-id="${escHtml(id)}" aria-label="Delete ${escHtml(nameOf(id))}">Delete</button></span>` : ''}<span class="hl-pos">${i + 1}</span></div>`;
  const isDirty = () => !sameLayout(draft, savedLayout) || JSON.stringify(draftPromos) !== JSON.stringify(promos);
  const setBtn = (b, disabled) => { b.disabled = disabled; b.classList.toggle('Polaris-Button--disabled', disabled); };
  const listOf = side => $(`.hl-list[data-side=${side}]`, hlRoot);
  const findItem = (side, id) => $$('.hl-item', listOf(side)).find(i => i.dataset.id === id);
  function renderHL() {
    SIDES.forEach(side => {
      const list = listOf(side), n = draft[side].length;
      list.innerHTML = draft[side].map(itemHTML).join(''); list.classList.toggle('is-empty', !n);
      $(`.hl-count[data-side=${side}]`, hlRoot).textContent = n + (n === 1 ? ' block' : ' blocks');
    });
    if (lastAdded) { const it = findItem(lastAdded.side, lastAdded.id); if (it) { it.classList.add('hl-flash'); it.scrollIntoView({ block: 'nearest' }); } lastAdded = null; }
    const dirty = isDirty();
    setBtn($('[data-act=hl-save]'), !dirty); setBtn($('[data-act=hl-discard]'), !dirty); setBtn($('[data-act=hl-reset]'), sameLayout(draft, reconcile(DEFAULT_LAYOUT, draftPromos)));
    $('.hl-status').hidden = !dirty;
    const homeTab = $('.mt-tab[data-tab=home]'); if (homeTab) homeTab.classList.toggle('has-changes', dirty);
  }
  const readDraft = () => { draft = {}; SIDES.forEach(side => { draft[side] = $$('.hl-item:not([hidden])', listOf(side)).map(i => i.dataset.id); }); };
  $('[data-act=hl-save]').addEventListener('click', () => {
    promos = clonePromos(draftPromos); lsSet(LS_PROMOS, promos);
    savedLayout = reconcile(cloneLayout(draft), promos); lsSet(LS_LAYOUT, savedLayout);
    syncPromoCards();                                   // rebuilds the banner blocks and re-places everything on the homepage
    draft = cloneLayout(savedLayout); draftPromos = clonePromos(promos);
    renderHL(); toast('Saved. The homepage now uses this layout');
  });
  $('[data-act=hl-discard]').addEventListener('click', () => { draft = cloneLayout(savedLayout); draftPromos = clonePromos(promos); renderHL(); });
  $('[data-act=hl-reset]').addEventListener('click', () => { draft = reconcile(DEFAULT_LAYOUT, draftPromos); renderHL(); });

  let drag = null;
  function moveTarget(x, y) {
    const el = document.elementFromPoint(x, y), col = el && el.closest('.hl-col');
    const ok = col && col.dataset.group === drag.group;      // desktop blocks stay on desktop, mobile blocks stay on mobile
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
  hlRoot.addEventListener('click', e => {
    const b = e.target.closest('.hl-act'); if (b) {
      const pid = b.dataset.id.replace(/^promo:/, '');
      if (b.dataset.act === 'hl-edit') openPromoModal(pid); else askDelete(pid);
      return;
    }
    // "Add promotion banner" lives under each section; the banner belongs to that section
    const a = e.target.closest('.hl-add'); if (a) openPromoModal(null, a.dataset.target);
  });
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
    else if ((e.key === 'ArrowRight' && side === 'left') || (e.key === 'ArrowLeft' && side === 'right')) { arr.splice(i, 1); to = side === 'left' ? 'right' : 'left'; draft[to].splice(Math.min(i, draft[to].length), 0, id); }
    renderHL(); const again = findItem(to, id); if (again) again.focus({ preventScroll: true });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && drag) endDrag(true); });

  /* ---------- add / edit promotion banner modal ---------- */
  const pm = $('#promo-modal'), pmScrim = $('#scrim-promo'), pmName = $('#pm-name'), pmBanners = $('#pm-banners'), pmInterval = $('#pm-interval'), pmSave = $('[data-act=pm-save]', pm);
  let pmEditing = null, form = null, formSnap = '', lastFocus = null;
  const blankForm = target => ({ name: '', target, interval: 5, banners: [{ url: '', link: '' }] });
  const snap = f => JSON.stringify(f);
  function openPromoModal(id, target) {
    const p = id && promoOf('promo:' + id);
    pmEditing = p ? p.id : null;
    form = p ? { name: p.name, target: p.target, interval: p.interval, banners: p.banners.map(b => ({ ...b })) } : blankForm(target || 'left');
    formSnap = snap(form);
    $('#pm-title').textContent = p ? 'Edit promotion banner' : 'Add promotion banner';
    $('#pm-target').textContent = SECTION_LABEL[form.target];
    $('#pm-target-note').textContent = form.target === 'mobile' ? ' Used on phones only. Desktop uses its own banners.' : ' Used on desktop only. Phones use their own banners.';
    pmName.value = form.name; pmInterval.value = form.interval;
    renderBanners(); syncForm();
    lastFocus = document.activeElement; closePops(); closeDatePicker();
    pmScrim.classList.add('open'); pm.hidden = false; $('.pm__body', pm).scrollTop = 0; setTimeout(() => pmName.focus(), 30);
  }
  function closePromoModal() { if (pm.hidden) return; pm.hidden = true; pmScrim.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  const field = (labelTxt, key, ph, i) => `<label class="pm-field" data-field="${key}"><span class="pm-label">${labelTxt}</span><span class="pm-input"><input data-f="${key}" data-i="${i}" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${ph}"></span><span class="pm-err">Enter a full link starting with http:// or https://</span></label>`;
  function renderBanners() {
    pmBanners.innerHTML = form.banners.map((b, i) => `<div class="pm-banner" data-i="${i}"><div class="pm-banner__head"><strong>Banner ${i + 1}</strong>${form.banners.length > 1 ? `<button type="button" class="pm-remove" data-act="pm-remove" data-i="${i}" aria-label="Remove banner ${i + 1}">Remove</button>` : ''}</div>${field('Media (direct image link)', 'url', 'https://...', i)}<div class="pm-preview" data-prev="${i}" hidden></div>${field('Link when clicked (optional)', 'link', 'https://...', i)}</div>`).join('');
    form.banners.forEach((b, i) => { $(`input[data-f=url][data-i="${i}"]`, pmBanners).value = b.url; $(`input[data-f=link][data-i="${i}"]`, pmBanners).value = b.link; updatePreview(i); });
  }
  function updatePreview(i) {
    const box = $(`.pm-preview[data-prev="${i}"]`, pmBanners), url = form.banners[i].url.trim();
    if (!box) return;
    if (!isHttp(url)) { box.hidden = true; box.textContent = ''; return; }
    box.hidden = false; box.textContent = '';
    const img = mk('img', '', { src: url, alt: `Banner ${i + 1} preview`, referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => { box.classList.add('is-broken'); box.textContent = 'Can’t load this image. Make sure the link points directly to an image file.'; });
    img.addEventListener('load', () => box.classList.remove('is-broken'));
    box.classList.remove('is-broken'); box.appendChild(img);
  }
  function syncForm() {
    const nameOk = form.name.trim().length > 0;
    $('.pm-count', pm).textContent = `${form.name.length}/40`;
    let anyUrl = false, bad = false;
    form.banners.forEach((b, i) => {
      const u = b.url.trim(), l = b.link.trim(), uBad = !!u && !isHttp(u), lBad = !!l && !isHttp(l);
      if (u && !uBad) anyUrl = true; if (uBad || lBad) bad = true;
      const fu = $(`input[data-f=url][data-i="${i}"]`, pmBanners), fl = $(`input[data-f=link][data-i="${i}"]`, pmBanners);
      if (fu) fu.closest('.pm-field').classList.toggle('is-error', uBad); if (fl) fl.closest('.pm-field').classList.toggle('is-error', lBad);
    });
    const iv = Number(pmInterval.value), ivBad = !(Number.isInteger(iv) && iv >= 1 && iv <= 60);
    pmInterval.closest('.pm-field').classList.toggle('is-error', ivBad);
    const several = form.banners.filter(b => isHttp(b.url.trim())).length > 1;
    $('.pm-hint-slide', pm).textContent = several ? 'The banners will slide automatically, one at a time.' : 'Add more banners to turn on the slideshow.';
    const valid = nameOk && anyUrl && !bad && !ivBad, changed = snap({ ...form, interval: iv }) !== formSnap;
    setBtn(pmSave, !(valid && (changed || !pmEditing)));
    return valid;
  }
  pm.addEventListener('input', e => {
    const t = e.target;
    if (t === pmName) form.name = t.value;
    else if (t === pmInterval) form.interval = Number(t.value);
    else if (t.dataset.f) { const i = +t.dataset.i; form.banners[i][t.dataset.f] = t.value; if (t.dataset.f === 'url') { clearTimeout(t._pv); t._pv = setTimeout(() => updatePreview(i), 350); } }
    syncForm();
  });
  // keep the Home editor's unsaved draft in step when blocks are added / deleted while it is open
  function afterPromosChanged() { draft = reconcile(draft, draftPromos); if (currentTab === 'home') renderHL(); }
  pm.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'pm-close' || b.dataset.act === 'pm-cancel') closePromoModal();
    else if (b.dataset.act === 'pm-add') { form.banners.push({ url: '', link: '' }); renderBanners(); syncForm(); const last = $$('input[data-f=url]', pmBanners).pop(); if (last) { last.focus(); last.scrollIntoView({ block: 'nearest' }); } }
    else if (b.dataset.act === 'pm-remove') { form.banners.splice(+b.dataset.i, 1); renderBanners(); syncForm(); }
    else if (b.dataset.act === 'pm-save') {
      if (b.disabled || !syncForm()) return;
      const next = cleanPromo({ id: pmEditing || ('p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), name: form.name.trim(), target: form.target, interval: Number(pmInterval.value), banners: form.banners.map(x => ({ url: x.url.trim(), link: x.link.trim() })) });
      if (!next) return;
      const i = draftPromos.findIndex(x => x.id === next.id); if (i >= 0) draftPromos[i] = next; else draftPromos.push(next);
      if (i < 0) lastAdded = { id: promoKey(next), side: next.target };
      afterPromosChanged(); closePromoModal();
      toast(i >= 0 ? 'Banner updated in your draft. Click Save to apply it.' : `Banner added to ${SECTION_LABEL[next.target]} in your draft. Click Save to apply it.`);
    }
  });
  pmScrim.addEventListener('mousedown', closePromoModal);

  /* delete confirmation (also closable with X / Esc / backdrop) */
  const dm = $('#confirm-modal'), dmScrim = $('#scrim-confirm'); let delId = null;
  function askDelete(id) { const p = promoOf('promo:' + id); if (!p) return; delId = id; $('#dm-text').textContent = `“${p.name}” will be removed from ${SECTION_LABEL[p.target]}. It disappears from the homepage when you click Save.`; lastFocus = document.activeElement; dmScrim.classList.add('open'); dm.hidden = false; $('[data-act=dm-cancel]', dm).focus(); }
  function closeConfirm() { if (dm.hidden) return; dm.hidden = true; dmScrim.classList.remove('open'); delId = null; }
  dmScrim.addEventListener('mousedown', closeConfirm);
  dm.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'dm-close' || b.dataset.act === 'dm-cancel') closeConfirm();
    else if (b.dataset.act === 'dm-delete' && delId) { draftPromos = draftPromos.filter(x => x.id !== delId); closeConfirm(); afterPromosChanged(); toast('Banner removed in your draft. Click Save to apply it.'); }
  });
  // Esc closes the top-most modal; Tab stays inside it
  document.addEventListener('keydown', e => {
    const top = !dm.hidden ? dm : (!pm.hidden ? pm : null); if (!top) return;
    if (e.key === 'Escape') { e.stopPropagation(); top === dm ? closeConfirm() : closePromoModal(); }
    else if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input, [href]', top).filter(x => x.offsetParent !== null); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  Object.keys(cardEls).forEach(k => { if (k.startsWith('promo:')) delete cardEls[k]; });
  syncPromoCards();
  applyNav(); applyOrder(); updateCarousel(true); route();
})();
