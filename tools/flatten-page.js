// Flattens one page of the live app (Shopify web components -> plain HTML + generated classes) for the stand-alone page builder.
//   node flatten-page.js <key> <path> <prefix>      e.g.  node flatten-page.js ymm /ymm ym
// Writes cap/pages/<key>.flat.html, <key>.flat.css (classes are <prefix><n>) and <key>.css (the page's own stylesheets). Read-only.
const fs = require('fs'); const { chromium } = require('playwright');
const [key, route, prefix] = process.argv.slice(2);
const BASE = 'https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf';
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0]; await page.bringToFront();
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9500);
  const app = page.frames().find(f => f !== page.mainFrame());
  const out = await app.evaluate((prefix) => {
    const PROPS = ['display','flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis','align-items','align-self','justify-content','justify-items','row-gap','column-gap','grid-template-columns','grid-column-start','grid-column-end','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','color','background-color','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','font-size','font-weight','font-style','line-height','letter-spacing','text-decoration-line','text-decoration-style','text-decoration-color','text-align','white-space','overflow-x','overflow-y','opacity','cursor','list-style-type','position','vertical-align','text-transform','object-fit'];
    const DEF = new Set(['none','normal','0px','auto','static','visible','rgba(0, 0, 0, 0)','baseline','start','initial','1','stretch','row','nowrap','0','content-box','repeat','block']);
    const css = new Map(); let n = 0;
    const cls = (el, size) => {
      const cs = getComputedStyle(el); const parts = [];
      for (const p of PROPS) { let v = cs.getPropertyValue(p); if (p === 'display' && v === 'block') continue; if (v && !DEF.has(v)) parts.push(p + ':' + v); }
      for (const p of size || []) { const v = cs.getPropertyValue(p); if (v && v !== 'auto' && v !== 'none') parts.push(p + ':' + v); }
      const s = parts.join(';'); if (!s) return ''; if (!css.has(s)) css.set(s, prefix + (++n)); return css.get(s);
    };
    const VOID = new Set(['br','img','hr','input','wbr','source','col']);
    const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const q = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const abs = u => (u && u.startsWith('/assets/')) ? location.origin + u : u;
    const attr = (node, names) => names.filter(a => node.hasAttribute(a)).map(a => ` ${a}="${q(/^(src|href)$/.test(a) ? abs(node.getAttribute(a)) : node.getAttribute(a))}"`).join('');
    const COPY = ['href','target','rel','src','alt','width','height','type','id','aria-label','aria-hidden','tabindex','role','data-polaris-unstyled'];
    const ctl = (node, cls2) => { const inp = node.shadowRoot && node.shadowRoot.querySelector('input'); const on = inp ? inp.checked : node.hasAttribute('checked'); const dis = node.hasAttribute('disabled') || (inp && inp.disabled); return `<input type="checkbox" class="${cls2}"${cls2 === 'pg-switch' ? ' role="switch"' : ''} aria-label="${q(node.getAttribute('label') || '')}"${on ? ' checked' : ''}${dis ? ' disabled' : ''}>`; };
    function build(node, inS) {
      if (node.nodeType === 3) return esc(node.textContent);
      if (node.nodeType !== 1) return '';
      const tag = node.tagName.toLowerCase();
      if (['style','script'].includes(tag)) return '';
      if (tag === 'slot') { const a = node.assignedNodes({ flatten: true }); return (a.length ? a : [...node.childNodes]).map(k => build(k, true)).join(''); }
      if (node.classList && node.classList.contains('visually-hidden')) return '';
      if (tag === 'svg') return node.outerHTML;
      if (tag === 's-modal') return '';
      if (tag === 's-switch') return ctl(node, 'pg-switch');
      if (tag === 's-checkbox') return ctl(node, 'pg-check');
      const isS = tag.startsWith('s-');
      const hasClass = !isS && node.getAttribute('class') && node.getRootNode() === document;
      if (!isS && !inS) {          // plain Polaris / app markup: keep verbatim (assets made absolute so the page builder can localise them)
        const style = node.getAttribute('style');
        const a = [...node.attributes].filter(x => !['style','class'].includes(x.name) && !x.name.startsWith('data-state') && !x.name.startsWith('aria-owns')).map(x => ` ${x.name}="${q(/^(src|href|poster)$/.test(x.name) ? abs(x.value) : x.value)}"`).join('');
        const c = hasClass ? ` class="${node.getAttribute('class')}"` : '';
        const st = style ? ` style="${q(style.replace(/url\((['"]?)\/assets\//g, 'url($1' + location.origin + '/assets/'))}"` : '';
        const kids = [...node.childNodes].map(k => build(k, false)).join('');
        return VOID.has(tag) ? `<${tag}${a}${c}${st}>` : `<${tag}${a}${c}${st}>${kids}</${tag}>`;
      }
      const size = tag === 's-page' ? ['max-width'] : (tag === 's-icon' ? ['width','height'] : (tag === 'img' ? ['width','height'] : []));
      const c = cls(node, size);
      const map = { 's-link': 'span', 's-button': 'span', 's-text': 'span', 's-badge': 'span', 's-icon': 'span', 's-list-item': 'span', 's-unordered-list': 'div', 's-internal-icon': 'span' };
      const oTag = isS ? (map[tag] || 'div') : tag;
      const childInS = hasClass ? false : true;
      const kids = (isS && node.shadowRoot) ? [...node.shadowRoot.childNodes].map(k => build(k, true)).join('') : [...node.childNodes].map(k => build(k, childInS)).join('');
      let a = attr(node, COPY);
      if (isS) a += ` data-s="${tag}"` + attr(node, ['icon','tone','variant','disabled','size']);
      const extra = (hasClass && node.getRootNode() === document) ? ' ' + node.getAttribute('class') : '';
      return VOID.has(oTag) ? `<${oTag}${a} class="${(c + extra).trim()}">` : `<${oTag}${a} class="${(c + extra).trim()}">${kids}</${oTag}>`;
    }
    const html = build(document.querySelector('#app'), false);
    const cssText = [...css].map(([s, c]) => `.${c}{${s}}`).join('\n');
    const sheets = [...document.styleSheets].map(s => { let t = ''; try { t = [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) {} return { href: s.href, t }; }).filter(s => !/crisp|fonts\/inter/.test(s.href || ''));
    return { html, cssText, sheetCss: sheets.map(s => s.t).join('\n/*---*/\n'), path: location.pathname };
  }, prefix);
  fs.writeFileSync(`cap/pages/${key}.flat.html`, out.html); fs.writeFileSync(`cap/pages/${key}.flat.css`, out.cssText); fs.writeFileSync(`cap/pages/${key}.css`, out.sheetCss);
  console.log(`${key.padEnd(15)} ${out.path.padEnd(22)} html ${String(out.html.length).padStart(6)} | flat css ${String(out.cssText.length).padStart(5)} | stylesheets ${out.sheetCss.length}`);
  process.exit(0);
})();
