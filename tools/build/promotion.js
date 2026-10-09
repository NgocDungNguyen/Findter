  /* ======================================================================================================
     Promotions
       - Master -> Promotion tab: list (drag to set priority), add / edit form, delete
       - Homepage: one "Promotion" block (left column + phone order, movable in Master -> Home) that shows the live promotions targeting the shop
         (arrows switch between them). A promotion is created ONLY here, and it is on the homepage as soon as it is saved.
     In the real app the list lives on the server (and a merchant's dismissal is stored per shop + SKU); here it is kept in localStorage.
     This file is spliced into app.js at build time (tools/build.js), so it shares that file's scope. The part before the UI marker line below
     (the data) goes in front of the layout code, the rest (the screens) goes after the layout code.
     ====================================================================================================== */
  const LS_PROMOTIONS = 'findter.promotions.v1', LS_PROMO_DISMISSED = 'findter.promotionsDismissed.v1';
  const SHOP_TYPES = [
    ['Subscription', 'A paid plan is in effect now (including a cancelled plan until its paid period ends)'],
    ['Development store', 'Shopify partner development store without a paid plan'],
    ['Trial', 'Pre-purchase trial is running'],
    ['Paid before', 'Had a paid plan before, none now (cancelled and lapsed). Untick to reach never-paid shops only'],
    ['Service', 'Bought a one-time service charge, never had a paid plan'],
    ['Free', 'Never paid anything: trial ended, or an old install that never subscribed'],
  ];
  const SHOP_TYPE_OF_PLAN = { Trial: 'Trial', Starter: 'Subscription', Free: 'Free', Development: 'Development store', 'Paid before': 'Paid before', Service: 'Service' };   // what the demo bar's Plan means for promotion targeting
  const shopType = () => SHOP_TYPE_OF_PLAN[DEMO.plan] || 'Free';

  // the official BFCM banners (Desktop 1266x320, Mobile 740x370)
  const BFCM_IMG = 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/BFCM_Promotion_Banner_Homepage_-_';
  const DEFAULT_PROMOTIONS = [
    { sku: 'promo-bfcm', name: 'BFCM', deadline: '2026-12-03T23:59', enabled: true, desktop: BFCM_IMG + 'Desktop.png?v=1791510617', mobile: BFCM_IMG + 'Mobile.png?v=1791510710',
      types: ['Development store', 'Trial', 'Free'], action: 'code', code: 'BFCM2025', link: '/pricing' },                  // "Copy and apply": copies the code, then goes to /pricing
  ];
  const isPath = s => /^\/(?!\/)/.test(s);
  const isLink = s => isPath(s) || /^https?:\/\/\S+$/i.test(s);
  const cleanPromotion = p => {
    if (!p || typeof p.sku !== 'string' || !p.sku) return null;
    return {
      sku: p.sku, name: String(p.name || p.sku).slice(0, 100), deadline: String(p.deadline || ''), enabled: p.enabled !== false,
      desktop: String(p.desktop || ''), mobile: String(p.mobile || ''),
      types: Array.isArray(p.types) ? p.types.filter(t => SHOP_TYPES.some(([n]) => n === t)) : [],
      action: p.action === 'code' ? 'code' : 'link', link: String(p.link || ''), code: String(p.code || '').slice(0, 60),
    };
  };
  const loadPromotions = () => { const s = lsGet(LS_PROMOTIONS); return (Array.isArray(s) ? s : DEFAULT_PROMOTIONS).map(cleanPromotion).filter(Boolean); };
  let promotions = loadPromotions();
  const savePromotions = () => lsSet(LS_PROMOTIONS, promotions);
  const dismissedSet = () => new Set((lsGet(LS_PROMO_DISMISSED) || []).filter(x => typeof x === 'string'));
  const saveDismissed = set => lsSet(LS_PROMO_DISMISSED, [...set]);
  const deadlineMs = p => { const t = new Date(p.deadline).getTime(); return Number.isNaN(t) ? 0 : t; };
  const promoStatus = p => (!p.enabled ? 'Disabled' : deadlineMs(p) <= Date.now() ? 'Expired' : 'Live');
  const fmtDeadline = p => { const d = new Date(p.deadline); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); };

/*--UI--*/
  /* ---------- homepage: the Promotion block ---------- */
  const PROMO_SHOW_ALL = true;           // true: every live promotion that targets the shop is a slide (arrows); false: only the topmost one
  const promoCard = cardEls.promotion, promoSlot = $('.pr-slot', promoCard);
  let prIdx = 0;
  const promotionsForShop = () => {
    const gone = dismissedSet(), list = promotions.filter(p => promoStatus(p) === 'Live' && p.types.includes(shopType()) && !gone.has(p.sku) && (mq.mobile.matches ? (p.mobile || p.desktop) : p.desktop));
    return PROMO_SHOW_ALL ? list : list.slice(0, 1);
  };
  const BTN2 = 'Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter';
  const PR_ICON = { prev: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 5-5 5 5 5"/></svg>', next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5 5 5-5 5"/></svg>', x: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>' };
  function showCodeNotice(code) {                 // "Code: … copied successfully" on top of the page the merchant lands on
    $('.pr-notice') && $('.pr-notice').remove();
    const n = document.createElement('div'); n.className = 'sy-banner sy-banner--ok pr-notice'; n.setAttribute('role', 'status');
    n.innerHTML = `<div class="sy-banner__head"><span class="sy-banner__icon">${SY_ICON.ok}</span><span class="sy-banner__title">Code: ${escHtml(code)} copied successfully</span><button type="button" class="sy-banner__x" aria-label="Dismiss">${SY_ICON.x}</button></div>`;
    $('.sy-banner__x', n).addEventListener('click', () => n.remove());
    scroller.prepend(n); scroller.scrollTop = 0;
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* not allowed here: fall back */ }
    const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); return ok;
  }
  function goTo(link) {                            // external -> new tab, "/path" -> inside the app (the copy has no such pages)
    if (isPath(link)) toast('Opens ' + link + ' inside the app (not part of this copy)'); else window.open(link, '_blank', 'noopener,noreferrer');
  }
  function renderPromotion() {
    const list = promotionsForShop(), mobile = mq.mobile.matches;
    promoCard.hidden = list.length === 0;                  // nothing live for this shop: the block is simply not on the page
    if (!list.length) { promoSlot.textContent = ''; return; }
    prIdx = Math.min(prIdx, list.length - 1);
    const many = list.length > 1;
    promoSlot.innerHTML = '<div class="pr-viewport"><div class="pr-track" style="transform:translateX(' + (-prIdx * 100) + '%)">' + list.map((p, i) => {
      const img = escHtml(mobile && p.mobile ? p.mobile : p.desktop);
      const hit = p.action === 'link' ? `<a class="pr-hit" data-pr="open" data-i="${i}" href="${escHtml(p.link)}"${isPath(p.link) ? '' : ' target="_blank" rel="noopener noreferrer"'} aria-label="${escHtml(p.name)}"></a>` : '';
      const foot = p.action === 'code' ? `<div class="pr-foot"><span class="pr-code">Promo code: <strong>${escHtml(p.code)}</strong></span><button type="button" class="${BTN2}" data-pr="copy" data-i="${i}"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">${p.link ? 'Copy and apply' : 'Copy code'}</span></button></div>` : '';
      return `<div class="pr-slide" data-sku="${escHtml(p.sku)}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}"${i === prIdx ? '' : ' aria-hidden="true" inert'}><div class="pr-media"><img class="pr-bg" src="${img}" alt="" aria-hidden="true" referrerpolicy="no-referrer"><img class="pr-img" src="${img}" alt="${escHtml(p.name)}" referrerpolicy="no-referrer" draggable="false"></div>${hit}${foot}</div>`;
    }).join('') + '</div><div class="pr-ctl">'
      + (many ? `<button type="button" class="pb-nav pb-nav--prev" data-pr="prev" aria-label="Previous promotion">${PR_ICON.prev}</button><button type="button" class="pb-nav pb-nav--next" data-pr="next" aria-label="Next promotion">${PR_ICON.next}</button><div class="pb-dots">${list.map((p, i) => `<button type="button" class="pb-dot${i === prIdx ? ' is-on' : ''}" data-pr="dot" data-i="${i}" aria-label="Show promotion ${i + 1}"></button>`).join('')}</div>` : '')
      + `<button type="button" class="pb-x" data-pr="close" aria-label="Dismiss promotion">${PR_ICON.x}</button></div></div>`;
  }
  function moveTo(i) {
    const slides = $$('.pr-slide', promoSlot); if (!slides.length) return;
    prIdx = (i + slides.length) % slides.length;
    $('.pr-track', promoSlot).style.transform = `translateX(${-prIdx * 100}%)`;
    slides.forEach((s, k) => { const on = k === prIdx; s.toggleAttribute('inert', !on); on ? s.removeAttribute('aria-hidden') : s.setAttribute('aria-hidden', 'true'); });
    $$('.pb-dot', promoSlot).forEach((d, k) => d.classList.toggle('is-on', k === prIdx));
  }
  promoSlot.addEventListener('click', async e => {
    const el = e.target.closest('[data-pr]'); if (!el) return;
    const list = promotionsForShop(), p = list[+el.dataset.i], act = el.dataset.pr;
    if (act === 'prev') return moveTo(prIdx - 1);
    if (act === 'next') return moveTo(prIdx + 1);
    if (act === 'dot') return moveTo(+el.dataset.i);
    if (act === 'close') {                                   // permanent: this promotion never comes back for this shop (real app: stored on the server by SKU)
      const cur = list[prIdx]; if (!cur) return;
      const gone = dismissedSet(); gone.add(cur.sku); saveDismissed(gone); renderPromotion(); return;
    }
    if (!p) return;
    if (act === 'open') {                                    // the banner itself is the link; a promo code (optional) is copied first
      if (!p.code && !isPath(p.link)) return;                // plain external link: the anchor opens its own tab
      e.preventDefault();
      const ok = p.code ? await copyText(p.code) : false;    // copy while this page still has focus, then go
      goTo(p.link); if (ok) showCodeNotice(p.code);
      return;
    }
    if (act === 'copy') {
      const ok = await copyText(p.code);
      if (p.link) { goTo(p.link); if (ok) showCodeNotice(p.code); return; }             // "Copy and apply"
      const label = $('.Polaris-Text--root', el), old = label.textContent; label.textContent = ok ? 'Copied' : 'Copy failed'; toast(ok ? `Code: ${p.code} copied successfully` : 'Could not copy the code. Select it and copy it by hand.');
      setTimeout(() => { label.textContent = old; }, 1800);                              // "Copy code": only copies
    }
  });

  /* ---------- Master -> Promotion ---------- */
  const DRAG_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></svg>';
  const PEN_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 16 1-4 8.5-8.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8 15l-4 1Z"/></svg>';
  const BIN_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 6h10M8 6V4h4v2M6 6l.7 10h6.6L14 6M9 9v4M11 9v4"/></svg>';
  const BTN1 = 'Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter';
  const BTN3 = 'Polaris-Button Polaris-Button--pressable Polaris-Button--variantTertiary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter';
  const btnText = t => `<span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">${t}</span>`;
  let prOrder = [];

  function renderPromotionTab(sub) {
    if (!sub) return renderPromoList();
    if (sub === 'new') return renderPromoForm(null);
    const sku = sub.replace(/^edit\//, ''), p = promotions.find(x => x.sku === sku);
    if (!p) { location.hash = '#/master/promotion'; return; }
    renderPromoForm(p);
  }
  function renderPromoList() {
    prOrder = promotions.map(p => p.sku);
    const rows = promotions.map(p => {
      const st = promoStatus(p);
      return `<div class="prm-row" role="listitem" draggable="true" tabindex="0" data-sku="${escHtml(p.sku)}" aria-label="${escHtml(p.name)}, ${st}"><span class="prm-handle" aria-hidden="true">${DRAG_ICON}</span><span class="prm-thumb"><img src="${escHtml(p.desktop)}" alt="" referrerpolicy="no-referrer" draggable="false"></span><span class="prm-name"><span>${escHtml(p.name)}</span><small>${escHtml(p.sku)}</small></span><span class="prm-types">${p.types.map(t => `<span class="prm-chip">${escHtml(t)}</span>`).join('') || '<span class="prm-none">No shop type</span>'}</span><span class="prm-deadline">${escHtml(fmtDeadline(p))}</span><span><span class="prm-badge prm-badge--${st.toLowerCase()}">${st}</span></span><span class="prm-acts"><button type="button" class="prm-ico" data-prm="edit" data-sku="${escHtml(p.sku)}" aria-label="Edit ${escHtml(p.name)}">${PEN_ICON}</button><button type="button" class="prm-ico" data-prm="delete" data-sku="${escHtml(p.sku)}" aria-label="Delete ${escHtml(p.name)}">${BIN_ICON}</button></span></div>`;
    }).join('');
    panelPromo.innerHTML = `<div class="prm-card"><div class="prm-head"><h2>Homepage promotions</h2><p>Promotions are created here and are on the homepage as soon as you save them, in one “Promotion” block (move that block in Master → Home). The block shows every live promotion that targets the shop, and arrows switch between them. Drag to set the order: the topmost is shown first.</p><button type="button" class="${BTN1} prm-add" data-prm="add">${btnText('Add promotion')}</button></div>`
      + `<div class="prm-scroll"><div class="prm-table"><div class="prm-thead" aria-hidden="true"><span></span><span>Desktop image</span><span>Name</span><span>Shop types</span><span>Deadline</span><span>Status</span><span>Action</span></div><div class="prm-body" role="list" id="prm-body">${rows || '<div class="prm-empty">No promotions yet. Add one and it appears on the homepage right away.</div>'}</div></div></div>`
      + `<div class="prm-foot"><button type="button" class="${BTN3}" data-prm="reset-dismissed" title="Testing helper: shops that closed a promotion see it again">${btnText('Reset closed banners')}</button><button type="button" class="${BTN1} Polaris-Button--disabled" data-prm="save-order" disabled>${btnText('Save priority')}</button></div></div>`;
  }
  const orderDirty = () => prOrder.join() !== promotions.map(p => p.sku).join();
  const syncOrderBtn = () => { const b = $('[data-prm=save-order]', panelPromo); if (!b) return; const off = !orderDirty(); b.disabled = off; b.classList.toggle('Polaris-Button--disabled', off); };
  const readOrderFromDom = () => { prOrder = $$('#prm-body .prm-row', panelPromo).map(r => r.dataset.sku); syncOrderBtn(); };
  function movePromoRow(row, dir) {
    const sib = dir < 0 ? row.previousElementSibling : row.nextElementSibling; if (!sib || !sib.classList.contains('prm-row')) return;
    dir < 0 ? row.parentElement.insertBefore(row, sib) : row.parentElement.insertBefore(sib, row); readOrderFromDom(); row.focus();
  }
  let dragRow = null;
  panelPromo.addEventListener('dragstart', e => { const r = e.target.closest && e.target.closest('.prm-row'); if (!r) return; dragRow = r; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', r.dataset.sku); } catch (err) { /* ignore */ } setTimeout(() => r.classList.add('is-drag'), 0); });
  panelPromo.addEventListener('dragover', e => {
    if (!dragRow) return; e.preventDefault();
    const row = e.target.closest('.prm-row'); if (!row || row === dragRow) return;
    const r = row.getBoundingClientRect(); row.parentElement.insertBefore(dragRow, e.clientY > r.top + r.height / 2 ? row.nextSibling : row);
  });
  panelPromo.addEventListener('drop', e => { if (dragRow) e.preventDefault(); });
  panelPromo.addEventListener('dragend', () => { if (dragRow) dragRow.classList.remove('is-drag'); dragRow = null; readOrderFromDom(); });
  panelPromo.addEventListener('keydown', e => {
    const row = e.target.closest && e.target.closest('.prm-row'); if (!row || e.target !== row) return;
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); movePromoRow(row, e.key === 'ArrowUp' ? -1 : 1); }
  });
  // every change here is live on the homepage straight away: the Promotion block is (re)placed in the layout (it exists once there is a promotion),
  // and the Master -> Home lists follow (an unsaved draft there is kept)
  function afterPromotionsChanged() {
    savedLayout = reconcile(savedLayout); if (lsGet(LS_LAYOUT)) lsSet(LS_LAYOUT, savedLayout);
    draft = reconcile(draft); applyOrder(); renderHL();
  }
  function deletePromotion(sku) {
    promotions = promotions.filter(p => p.sku !== sku); savePromotions(); afterPromotionsChanged(); renderPromoList(); toast('Promotion deleted. It is gone from the homepage');
  }

  /* ----- add / edit form ----- */
  let prForm = null, prFormSnap = '', prEditing = null, prTouched = new Set();
  const prFormKey = f => JSON.stringify([f.name, f.sku, f.deadline, f.enabled, f.desktop, f.mobile, [...f.types].sort(), f.action, f.link, f.code]);
  const pad = n => String(n).padStart(2, '0');
  const defaultDeadline = () => { const d = new Date(Date.now() + 14 * 864e5); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`; };
  function renderPromoForm(p) {
    prEditing = p ? p.sku : null; prTouched = new Set();
    prForm = p ? { ...p, types: [...p.types] } : { name: '', sku: '', deadline: defaultDeadline(), enabled: true, desktop: '', mobile: '', types: [], action: 'link', link: '', code: '' };
    prFormSnap = prFormKey(prForm);
    const field = (id, label, inner, hint, extra = '') => `<label class="prm-field" data-field="${id}"${extra}><span class="prm-label">${label}</span>${inner}<span class="prm-hint">${hint || ''}</span><span class="pm-err prm-err"></span></label>`;
    const text = (id, val, max, ph = '') => `<span class="prm-input"><input id="pr-${id}" data-f="${id}" value="${escHtml(val)}" maxlength="${max}" autocomplete="off" placeholder="${escHtml(ph)}"><span class="pm-count" data-count="${id}"></span></span>`;
    const imageField = (id, label, val, hint) => `<div class="prm-field" data-field="${id}"><label class="prm-label" for="pr-${id}">${label}</label><div class="prm-row2"><span class="prm-input prm-grow"><input id="pr-${id}" data-f="${id}" value="${escHtml(val)}" autocomplete="off" placeholder="https://"></span><button type="button" class="${BTN2}" data-prm="upload">${btnText('Upload')}</button></div><span class="prm-hint">${hint}</span><span class="pm-err prm-err"></span><div class="prm-prev" data-prev="${id}" hidden></div></div>`;
    panelPromo.innerHTML = `<div class="prm-edit"><div class="prm-titlebar"><button type="button" class="prm-back" data-prm="back" aria-label="Back to promotions"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 10H5m5-5-5 5 5 5"/></svg></button><h1>${p ? 'Edit promotion' : 'Add promotion'}</h1></div>`
      + `<div class="prm-card"><h2>Promotion</h2>`
      + field('name', 'Name', text('name', prForm.name, 100), 'Used as the banner’s alt text.')
      + field('sku', 'SKU', text('sku', prForm.sku, 80, 'promo-black-friday'), p ? 'Fixed once created — its tracking history and every shop’s dismissal are keyed by it.' : 'Lowercase letters, numbers and dashes. It cannot be changed later: tracking history and every shop’s dismissal are keyed by it.')
      + field('deadline', 'Deadline', `<span class="prm-input"><input id="pr-deadline" data-f="deadline" type="datetime-local" value="${escHtml(prForm.deadline)}"></span>`, 'Your local time. The banner stops showing at this moment.')
      + `<div class="prm-check"><label><input type="checkbox" data-f="enabled"${prForm.enabled ? ' checked' : ''}> <span>Enabled</span></label><span class="prm-hint">Turn off to hide the promotion without deleting it.</span></div></div>`
      + `<div class="prm-card"><h2>Banner images</h2>`
      + imageField('desktop', 'Desktop image', prForm.desktop, '1266 × 320 px (shown at 633 × 160). Other ratios are shown whole, with blurred edges filling the gap.')
      + imageField('mobile', 'Mobile image', prForm.mobile, '740 × 370 px (shown at 370 × 185). Other ratios are shown whole, with blurred edges filling the gap.') + `</div>`
      + `<div class="prm-card"><h2>Who sees it</h2><div class="prm-label">Shop types</div>`
      + SHOP_TYPES.map(([n, d]) => `<div class="prm-check"><label><input type="checkbox" data-type="${escHtml(n)}"${prForm.types.includes(n) ? ' checked' : ''}> <span>${n}</span></label><span class="prm-hint">${d}</span></div>`).join('')
      + `<span class="pm-err prm-err" data-err="types"></span><p class="prm-note">Each shop counts as exactly one type, checked in the order above. A shop with a paid plan is always “Subscription”, even if it is also a development store or bought a service.</p></div>`
      + `<div class="prm-card"><h2>Action</h2><div class="prm-label">When the merchant uses the banner</div>`
      + `<div class="prm-radio"><label><input type="radio" name="pr-action" data-f="action" value="link"${prForm.action === 'link' ? ' checked' : ''}> <span>Open a link</span></label><span class="prm-hint">Clicking the banner opens the link. Paths starting with / open inside the app. Add a promo code if the merchant should get it copied on the way.</span></div>`
      + `<div class="prm-radio"><label><input type="radio" name="pr-action" data-f="action" value="code"${prForm.action === 'code' ? ' checked' : ''}> <span>Copy a promo code</span></label><span class="prm-hint">A “Copy code” button is shown under the banner. Add a link and it becomes “Copy and apply”: it copies the code, then opens the link.</span></div>`
      + field('link', '<span data-label="link"></span>', text('link', prForm.link, 500, '/pricing or https://…'), '<span data-hint="link"></span>')
      + field('code', '<span data-label="code"></span>', text('code', prForm.code, 60, 'BFCM2025'), '<span data-hint="code"></span>') + `</div>`
      + `<div class="prm-actions"><button type="button" class="${BTN2}" data-prm="cancel">${btnText('Cancel')}</button><button type="button" class="${BTN1} Polaris-Button--disabled" data-prm="save" disabled>${btnText('Save')}</button></div></div>`;
    if (p) $('#pr-sku', panelPromo).disabled = true;
    ['desktop', 'mobile'].forEach(updatePrev); syncPromoForm(); scroller.scrollTop = 0;
  }
  function updatePrev(id) {
    const box = $(`[data-prev=${id}]`, panelPromo), url = (prForm[id] || '').trim(); if (!box) return;
    if (!isHttp(url)) { box.hidden = true; box.textContent = ''; return; }
    box.hidden = false; box.textContent = '';
    const img = document.createElement('img'); img.src = url; img.alt = id + ' image preview'; img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => { box.classList.add('is-broken'); box.textContent = 'Can’t load this image. Make sure the link points directly to an image file.'; });
    img.addEventListener('load', () => box.classList.remove('is-broken')); box.classList.remove('is-broken'); box.appendChild(img);
  }
  function promoErrors(f) {
    const e = {}, sku = f.sku.trim(), name = f.name.trim();
    if (!name) e.name = 'Enter a name'; else if (name.length > 100) e.name = 'Use 100 characters or fewer';
    if (!prEditing) { if (!sku) e.sku = 'Enter a SKU'; else if (!/^[a-z0-9][a-z0-9-]*$/.test(sku)) e.sku = 'Use lowercase letters, numbers and dashes only'; else if (promotions.some(x => x.sku === sku)) e.sku = 'This SKU is already used'; }
    if (!f.deadline || Number.isNaN(new Date(f.deadline).getTime())) e.deadline = 'Pick a deadline';
    if (!isHttp(f.desktop.trim())) e.desktop = 'Enter a link that starts with https://';
    if (!isHttp(f.mobile.trim())) e.mobile = 'Enter a link that starts with https://';
    if (!f.types.length) e.types = 'Pick at least one shop type';
    const link = f.link.trim(), code = f.code.trim();
    if (f.action === 'link') { if (!link) e.link = 'Enter a link'; else if (!isLink(link)) e.link = 'Use a path that starts with / or a link that starts with https://'; }
    else { if (!code) e.code = 'Enter a promo code'; if (link && !isLink(link)) e.link = 'Use a path that starts with / or a link that starts with https://'; }
    return e;
  }
  function syncPromoForm() {
    const f = prForm, link = f.action === 'link';
    $('[data-label=link]', panelPromo).textContent = link ? 'Link' : 'Link (optional)';
    $('[data-label=code]', panelPromo).textContent = link ? 'Promo code (optional)' : 'Promo code';
    $('[data-hint=link]', panelPromo).textContent = link ? 'Where the banner goes. Use / for a page inside the app (for example /pricing) or https:// for another site, which opens in a new tab.' : 'Optional. With a link the button reads “Copy and apply”; without one it only copies the code.';
    $('[data-hint=code]', panelPromo).textContent = link ? 'Optional. Copied when the merchant clicks the banner, and a “Code: … copied successfully” note appears on the page they land on.' : 'Shown under the banner and copied by the button.';
    $('[data-count=name]', panelPromo).textContent = `${f.name.length}/100`; $('[data-count=sku]', panelPromo).textContent = `${f.sku.length}/80`;
    const errs = promoErrors(f);
    $$('[data-field]', panelPromo).forEach(el => { const id = el.dataset.field, msg = prTouched.has(id) ? errs[id] : ''; el.classList.toggle('is-error', !!msg); $('.prm-err', el).textContent = msg || ''; });
    const te = $('[data-err=types]', panelPromo); te.textContent = prTouched.has('types') && errs.types ? errs.types : ''; te.classList.toggle('is-shown', !!te.textContent);
    const valid = !Object.keys(errs).length, changed = prFormKey(f) !== prFormSnap, save = $('[data-prm=save]', panelPromo), off = !(valid && (changed || !prEditing));
    save.disabled = off; save.classList.toggle('Polaris-Button--disabled', off);
  }
  panelPromo.addEventListener('input', e => {
    const t = e.target; if (!prForm) return;
    if (t.matches('input[data-f]:not([type=radio]):not([type=checkbox])')) { prForm[t.dataset.f] = t.value; if (t.dataset.f === 'desktop' || t.dataset.f === 'mobile') { clearTimeout(t._pv); t._pv = setTimeout(() => updatePrev(t.dataset.f), 350); } syncPromoForm(); }
  });
  panelPromo.addEventListener('change', e => {
    const t = e.target; if (!prForm) return;
    if (t.matches('[data-f=enabled]')) prForm.enabled = t.checked;
    else if (t.matches('[data-type]')) { const n = t.dataset.type; prForm.types = t.checked ? [...new Set([...prForm.types, n])] : prForm.types.filter(x => x !== n); prTouched.add('types'); }
    else if (t.matches('[data-f=action]')) prForm.action = t.value;
    syncPromoForm();
  });
  panelPromo.addEventListener('focusout', e => { const f = e.target.closest && e.target.closest('[data-field]'); if (f && prForm) { prTouched.add(f.dataset.field); syncPromoForm(); } });
  panelPromo.addEventListener('click', e => {
    const b = e.target.closest('[data-prm]'); if (!b) return; const act = b.dataset.prm;
    if (act === 'add') location.hash = '#/master/promotion/new';
    else if (act === 'edit') location.hash = '#/master/promotion/edit/' + b.dataset.sku;
    else if (act === 'delete') { const p = promotions.find(x => x.sku === b.dataset.sku); if (p) askDeletePromotion(p.sku, p.name); }
    else if (act === 'save-order') { if (b.disabled) return; promotions = prOrder.map(s => promotions.find(p => p.sku === s)).filter(Boolean); savePromotions(); syncOrderBtn(); renderPromotion(); toast('Priority saved. The homepage uses it now'); }
    else if (act === 'reset-dismissed') { saveDismissed(new Set()); renderPromotion(); toast('Closed banners are showing again'); }
    else if (act === 'upload') toast('Upload is not part of this copy. Paste the image link instead.');
    else if (act === 'back' || act === 'cancel') location.hash = '#/master/promotion';
    else if (act === 'save') {
      if (b.disabled || !prForm) return;
      ['name', 'sku', 'deadline', 'desktop', 'mobile', 'types', 'link', 'code'].forEach(k => prTouched.add(k));
      if (Object.keys(promoErrors(prForm)).length) { syncPromoForm(); return; }
      const f = prForm, next = cleanPromotion({ ...f, sku: prEditing || f.sku.trim(), name: f.name.trim(), desktop: f.desktop.trim(), mobile: f.mobile.trim(), link: f.link.trim(), code: f.code.trim() });
      if (prEditing) promotions = promotions.map(p => (p.sku === prEditing ? next : p)); else promotions = [...promotions, next];
      savePromotions(); afterPromotionsChanged(); toast(prEditing ? 'Promotion saved. The homepage is updated' : 'Promotion added. It is on the homepage now (move its block in Master → Home)'); location.hash = '#/master/promotion';
    }
  });
