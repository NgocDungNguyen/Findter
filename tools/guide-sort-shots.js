// Captures the screenshots of the "CSE Guide: Sort by options" from the demo (sort.html) and draws the red marks on them
// (rounded boxes, circles, numbered dots). Run:  node guide-sort-shots.js [outDir]
// Default outDir: ../docs/cse-guides/sort-by-options/img   (the guide builder, guide-sort-docx.ps1, reads the same folder)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'docs', 'cse-guides', 'sort-by-options', 'img'));
fs.mkdirSync(out, { recursive: true });
const URL_ = pathToFileURL(path.join(root, 'sort.html')).href + '?reset=1';
const RED = '#E5251C';

// marks: { sel, kind: 'rect' | 'circle', pad, n }   focus: selectors whose union (plus margin) is the picture
async function box(p, m) {
  const el = p.locator(m.sel).first();
  if (m.text) return el.evaluate(e => { const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
  return el.boundingBox();
}
async function mark(p, marks) {
  const items = [];
  for (const m of marks) {
    const b = await box(p, m);
    if (!b) throw new Error('mark target not visible: ' + m.sel);
    const pad = m.pad ?? 6;
    items.push({ x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2, kind: m.kind || 'rect', n: m.n, nPos: m.nPos || 'tl' });
  }
  await p.evaluate(({ items, RED }) => {
    document.getElementById('ann-layer')?.remove();
    const layer = document.createElement('div'); layer.id = 'ann-layer'; layer.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';
    for (const i of items) {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${i.x}px;top:${i.y}px;width:${i.w}px;height:${i.h}px;box-sizing:border-box;border:3px solid ${RED};border-radius:${i.kind === 'circle' ? '50%' : '10px'}`;
      layer.appendChild(d);
      if (i.n) {
        const n = document.createElement('div'); const left = i.nPos.includes('r') ? i.x + i.w - 4 : i.x - 12, top = i.nPos.includes('b') ? i.y + i.h - 4 : i.y - 12;
        n.textContent = i.n; n.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:24px;height:24px;border-radius:50%;background:${RED};color:#fff;font:700 13px/24px Inter,Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff`;
        layer.appendChild(n);
      }
    }
    document.body.appendChild(layer);
  }, { items, RED });
}
async function snap(p, name, { focus, marks = [], margin = 24 }) {
  await mark(p, marks);
  const rects = []; for (const s of focus) { const b = await p.locator(s).first().boundingBox(); if (!b) throw new Error('focus target not visible: ' + s); rects.push(b); }
  for (const m of marks) { const b = await box(p, m); const pad = (m.pad ?? 6) + 14; rects.push({ x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 }); }
  const x0 = Math.min(...rects.map(r => r.x)) - margin, y0 = Math.min(...rects.map(r => r.y)) - margin;
  const x1 = Math.max(...rects.map(r => r.x + r.width)) + margin, y1 = Math.max(...rects.map(r => r.y + r.height)) + margin;
  const vp = p.viewportSize();
  const clip = { x: Math.max(0, x0), y: Math.max(0, y0), width: Math.min(vp.width, x1) - Math.max(0, x0), height: Math.min(vp.height, y1) - Math.max(0, y0) };
  await p.screenshot({ path: path.join(out, name + '.png'), clip });
  await p.evaluate(() => document.getElementById('ann-layer')?.remove());
  console.log('shot', name, Math.round(clip.width) + 'x' + Math.round(clip.height));
}
const row = k => `#so-rows .table-row[data-key="${k}"]`;
const sw = k => `${row(k)} [data-act=toggle]`;

(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1300 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.addInitScript(() => { const s = document.createElement('style'); s.textContent = '.sk,.chat-bubble,.chat-panel,.m-fab--menu,.m-fab--sk{display:none!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); });
  const fresh = async (h) => { if (h) await p.setViewportSize({ width: 1440, height: h }); await p.goto(URL_); await p.waitForSelector('#so-rows'); await p.waitForTimeout(150); };
  const toastUp = async () => { await p.waitForSelector('#toast.show'); await p.waitForTimeout(350); };

  /* 01 menu Sort in the sidebar */
  await fresh();
  await snap(p, 'sort_01_menu', { focus: ['.sh-appgroup'], marks: [{ sel: '.sh-item--sub[aria-current=page]', kind: 'rect', pad: 4 }], margin: 14 });

  /* 02 overview with numbered marks */
  await snap(p, 'sort_02_overview', { focus: ['.fdt-header', row('created_at_asc')], marks: [
    { sel: '.ft-sort-defaults', n: 1, pad: 4 },
{ sel: `${row('relevance')} .pg-switch`, kind: 'circle', n: 2, pad: 7, nPos: 'tr' },    { sel: `${row('relevance')} .so-handle svg`, kind: 'circle', n: 3, pad: 4 },    { sel: `${row('relevance')} .sort-label .so-grab span`, n: 4, pad: 5, text: true },    { sel: `${row('relevance')} .sort-type .so-t`, n: 5, pad: 5, text: true },
    { sel: `${row('relevance')} [data-act=edit]`, kind: 'circle', n: 6, pad: 6 },
  ] });

  /* 03 every option has its own switch (nothing switches another option off) */
  await fresh();
  await p.locator(sw("title_asc")).click(); await p.locator(sw("featured")).click();
  await snap(p, "sort_03_toggle", { focus: [".ft-sort-table .table-head", row("relevance"), row("title_desc")], marks: [
    { sel: `${row("relevance")} .pg-switch`, kind: "circle", n: 1, pad: 8 },
    { sel: `${row("title_asc")} .pg-switch`, kind: "circle", n: 2, pad: 8 },
  ], margin: 20 });

  /* 04 scope badges + tooltip */
  await fresh();
  await p.locator(`${row('featured')} .sort-label-badge`).hover(); await p.waitForTimeout(200);
  await snap(p, 'sort_04_badges', { focus: [row('featured'), '.so-tooltip', row('sale_desc')], marks: [
    { sel: `${row('featured')} .sort-label-badge`, n: 1, pad: 5 },
    { sel: '.so-tooltip', n: 2, pad: 4 },
  ], margin: 24 });

  /* 05 Search rule: the last option besides Featured cannot be turned off */
  await fresh(900);
  await p.locator(sw('featured')).click();
  for (const k of ['relevance', 'created_at', 'price_low_high']) await p.locator(sw(k)).click();
  await p.evaluate(() => document.querySelector('.sh-scroll').scrollTo(0, 99999)); await p.waitForTimeout(100);
  await p.locator(sw('price_high_low')).click({ force: true }); await toastUp();
  await snap(p, 'sort_05_error_search', { focus: ['.sh-main'], marks: [
    { sel: sw('price_high_low'), kind: 'circle', n: 1, pad: 8 }, { sel: sw('featured'), kind: 'circle', n: 2, pad: 8 }, { sel: '#toast.show', n: 3, pad: 6 } ], margin: 0 });

  /* 06 Collection rule: Relevance alone is not enough */
  await fresh(900);
  for (const k of ['created_at', 'price_low_high']) await p.locator(sw(k)).click();
  await p.locator(sw('price_high_low')).click({ force: true }); await toastUp();
  await snap(p, 'sort_06_error_collection', { focus: ['.sh-main'], marks: [
    { sel: sw('relevance'), kind: 'circle', n: 1, pad: 8 }, { sel: sw('price_high_low'), kind: 'circle', n: 2, pad: 8 }, { sel: '#toast.show', n: 3, pad: 6 } ], margin: 0 });

  /* 07 Edit label window */
  await fresh();
  await p.locator(`${row('created_at')} [data-act=edit]`).click(); await p.waitForTimeout(150);
  await snap(p, 'sort_07_edit_modal', { focus: ['.mf-modal'], marks: [
    { sel: '.mf-modal__title', n: 1, pad: 5 }, { sel: '#so-edit-label', n: 2, pad: 4 }, { sel: '#so-edit-count', pad: 4 }, { sel: '.so-note', n: 3, pad: 4 }, { sel: '.mf-modal [data-m=ok]', n: 4, pad: 5 } ], margin: 40 });

  /* 08 renamed option shows everywhere */
  await p.fill('#so-edit-label', 'Hàng mới về'); await p.locator('.mf-modal [data-m=ok]').click(); await p.waitForTimeout(150);
  await snap(p, 'sort_08_renamed', { focus: ['.ft-sort-defaults', row('created_at')], marks: [
    { sel: `${row('created_at')} .sort-label`, n: 1, pad: 5 }, { sel: '.ft-sort-defaults .so-box:first-child .Polaris-Select', n: 2, pad: 4 } ], margin: 20 });

  /* 09 default sort by value */
  await fresh();
  await snap(p, 'sort_09_defaults', { focus: ['.ft-sort-defaults'], marks: [
    { sel: '.ft-sort-defaults .so-box:nth-child(1)', n: 1, pad: 4 }, { sel: '.ft-sort-defaults .so-box:nth-child(2)', n: 2, pad: 4 } ], margin: 24 });

  /* 10 save bar */
  await fresh();
  await p.locator(sw('title_asc')).click();
  await snap(p, 'sort_10_savebar', { focus: ['.so-savebar', '.fdt-header'], marks: [
    { sel: '.so-savebar__t', n: 1, pad: 4 }, { sel: '.so-sbtn--discard', n: 2, pad: 4 }, { sel: '.so-sbtn--save', n: 3, pad: 4 } ], margin: 16 });

  /* 11 discard window */
  await p.locator('.so-sbtn--discard').click(); await p.waitForTimeout(150);
  await snap(p, 'sort_11_discard', { focus: ['.mf-modal'], marks: [
    { sel: '.mf-modal [data-m=cancel]', n: 1, pad: 5 }, { sel: '.mf-modal [data-m=ok]', n: 2, pad: 5 } ], margin: 40 });

  /* 12 dragging a row */
  await fresh();
  const hb = await p.locator(`${row('title_asc')} .so-handle`).boundingBox(); const tb = await p.locator(row('created_at')).boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.mouse.move(hb.x + 6, hb.y - 14, { steps: 4 }); await p.mouse.move(hb.x + 6, tb.y + 6, { steps: 8 }); await p.mouse.move(hb.x + 6, tb.y + 24, { steps: 3 }); await p.waitForTimeout(250);
  await snap(p, 'sort_12_drag', { focus: ['.ft-sort-table .table-head', row('relevance'), '.so-drag-overlay', row('title_desc')], marks: [
    { sel: '.so-drag-overlay', n: 1, pad: 3 }, { sel: `#so-rows .table-row.is-ghost`, n: 2, pad: 3, nPos: 'br' } ], margin: 20 });
  await p.mouse.up();

  /* 13 saved */
  await fresh(900);
  await p.locator(sw('title_asc')).click(); await p.locator('.so-sbtn--save').click(); await toastUp();
  await snap(p, 'sort_13_saved', { focus: ['.sh-main'], marks: [{ sel: '#toast.show', n: 1, pad: 6 }], margin: 0 });

  /* 15 shop without Collection Manual Sorting (spf_sorting off): Featured is hidden from the table and the Default dropdown */
  await p.setViewportSize({ width: 1440, height: 1500 }); await p.goto(URL_ + '&spf=0'); await p.waitForSelector('#so-rows'); await p.waitForTimeout(150);
  await snap(p, 'sort_15_spf_off', { focus: ['.ft-sort-defaults', row('sale_desc')], marks: [
    { sel: '.ft-sort-defaults .so-box:first-child .Polaris-Select', n: 1, pad: 4 }, { sel: row('sale_desc'), n: 2, pad: 3 } ], margin: 20 });

  /* 14 empty state */
  await p.goto(URL_.replace('?reset=1', '?state=empty')); await p.waitForSelector('.so-empty'); await p.waitForTimeout(150);
  await snap(p, 'sort_14_empty', { focus: ['.fdt-header', '.so-empty'], marks: [{ sel: '.so-empty h2', n: 1, pad: 6 }], margin: 24 });
  await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
