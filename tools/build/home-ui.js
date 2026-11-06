  /* ---------- Homepage UI options A / B / C (prototype: pick one from the "Home UI" group in the Demo data bar) ----------
     "Current" = the layout above (Master → Home order, left / right columns). A, B and C use their own frame (#hx-root) built from the same cards.
     Rules every option follows:
       1. The Onboarding guide is the first block, full width, never beside another card: opening / closing it only pushes the rest down.
       2. Our own Promotion banner is always above Recommended apps (partner apps), and a content card sits between it and the top banners (BFS 4.3.4).
       3. The layout follows the width of the page itself (container query), so the sidebar collapsing to the rail or the phone drawer re-flows
          it the same way a narrower window does. Columns are independent stacks (no equal-height rows): one card growing, shrinking or being
          dismissed never stretches or shifts its neighbours, and a row or column with no visible card disappears without a gap.
     Nothing here is saved to the real Home layout: the choice lives in the demo data (findter.demoStatus) and "Current UI" puts everything back. */
  var hxReady = false;
  const HOME_UIS = ['a', 'b', 'c'];
  const homeUI = () => (HOME_UIS.includes(DEMO.home) ? DEMO.home : null);
  const useMobile = () => mq.mobile.matches && !homeUI();                     // the separate phone order only belongs to the current UI
  // rows: [columns, width of the columns]. mo = reading order on a narrow page (it is also what a phone gets).
  const UIS = {
    a: { rows: [[[['guide', 'status', 'sync', 'data', 'promotion', 'rec', 'help', 'master']]]],                                                   // A: one column
         mo: ['guide', 'status', 'sync', 'data', 'promotion', 'rec', 'help', 'master'] },
    b: { rows: [[[['guide']]], [[['data', 'promotion', 'rec'], ['status', 'sync', 'help']], 'minmax(0,2fr) minmax(0,1fr)'], [[['master']]]],        // B: main column + status rail
         mo: ['guide', 'status', 'sync', 'data', 'promotion', 'rec', 'help', 'master'] },
    c: { rows: [[[['guide']]], [[['data']]], [[['promotion']]], [[['status', 'sync'], ['help']], 'minmax(0,1fr) minmax(0,1fr)'], [[['rec']]], [[['master']]]],   // C: metrics, then bands
         mo: ['guide', 'data', 'promotion', 'status', 'sync', 'help', 'rec', 'master'] },
  };
  const hxRoot = document.createElement('div'); hxRoot.className = 'hx-root'; hxRoot.hidden = true;
  layout.after(hxRoot);
  function hxRefresh() {                                                      // hide rows / columns that have no visible card, so nothing leaves a gap
    $$(':scope > .hx-row', hxRoot).forEach(r => {
      let n = 0;
      $$(':scope > .hx-col', r).forEach(c => { const vis = $$(':scope > [data-card]', c).some(k => !k.hidden); if (c.hidden === vis) c.hidden = !vis; if (vis) n++; });
      if (r.dataset.n !== String(n)) r.dataset.n = n;
      if (r.hidden === (n > 0)) r.hidden = n === 0;
    });
  }
  new MutationObserver(hxRefresh).observe(hxRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  function placeHx() {
    const ui = UIS[homeUI()];
    hxRoot.dataset.ui = homeUI();
    $$(':scope > .hx-row', hxRoot).forEach(r => r.remove());
    ui.rows.forEach(([cols, w]) => {
      const row = document.createElement('div'); row.className = 'hx-row'; if (w) row.style.setProperty('--w', w);
      cols.forEach(ids => { const col = document.createElement('div'); col.className = 'hx-col'; ids.forEach(id => col.appendChild(cardEls[id])); row.appendChild(col); });
      hxRoot.appendChild(row);
    });
    ui.mo.forEach((id, i) => cardEls[id].style.setProperty('--mo', i));
    hxRefresh();
  }
  // C: two extra tiles in Data insight (same bevel + box as the two existing tiles)
  const hxGrid = $('.Polaris-InlineGrid', cardEls.data);
  const t0 = hxGrid.firstElementChild, t0Bevel = t0.getAttribute('style').replace(/"/g, '&quot;'), t0Box = t0.firstElementChild.getAttribute('style').replace(/"/g, '&quot;');
  const hxTile = (key, title) => '<div class="Polaris-ShadowBevel hx-tile hx-tile--' + key + '" style="' + t0Bevel + '"><div class="Polaris-Box" style="' + t0Box + '"><div class="ft-card-header-underline"><span><span style="display:inline-block"><h3 class="Polaris-Text--root Polaris-Text--headingSm">' + title + '</h3></span></span></div><div class="hx-tile__v"></div><div class="hx-tile__s"></div><div class="hx-bar" aria-hidden="true"><span></span></div></div></div>';
  const hxExtra = document.createElement('div'); hxExtra.className = 'hx-extra'; hxExtra.innerHTML = hxTile('indexed', 'Products indexed') + hxTile('plan', 'Plan');
  hxGrid.appendChild(hxExtra);
  function renderHx(m) {
    if (!hxReady) return;
    const n = v => v.toLocaleString('en-US'), date = fmtDate(m.date, DEMO.lang), unl = m.limit === Infinity;
    const pct = unl ? 0 : Math.min(100, Math.round(m.x / m.limit * 100));
    const ti = $('.hx-tile--indexed', hxExtra), tp = $('.hx-tile--plan', hxExtra);
    $('.hx-tile__v', ti).textContent = n(m.x); $('.hx-tile__s', ti).textContent = unl ? 'No product limit' : 'of ' + n(m.limit) + ' (' + pct + '%)';
    $('.hx-bar span', ti).style.width = pct + '%'; ti.dataset.tone = m.xTone; ti.querySelector('.hx-bar').hidden = unl;
    $('.hx-tile__v', tp).textContent = m.label; $('.hx-tile__s', tp).textContent = m.dateLabel ? m.dateLabel + ' ' + date : (unl ? 'No product limit' : 'Up to ' + n(m.limit) + ' products');
    tp.dataset.tone = m.tone; tp.querySelector('.hx-bar').hidden = true;
  }
  hxReady = true;
  const appRoot = $('#app');
  function applyHome() {
    const ui = homeUI();
    if (ui) appRoot.dataset.home = ui; else delete appRoot.dataset.home;
    hxRoot.hidden = !ui;
    if (ui) { layout.hidden = true; mobileLayout.hidden = true; }
    applyOrder();
    renderStatus();                                                             // refreshes the extra tiles
  }
