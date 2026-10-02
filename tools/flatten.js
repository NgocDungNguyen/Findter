const fs = require('fs'); const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 1500 });
  const out = await app.evaluate(() => {
    const PROPS = ['display','flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis','align-items','align-self','justify-content','row-gap','column-gap','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','color','background-color','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','font-size','font-weight','font-style','line-height','letter-spacing','text-decoration-line','text-decoration-style','text-decoration-color','text-align','white-space','overflow-x','overflow-y','opacity','cursor','list-style-type','position','vertical-align','text-transform'];
    const DEF = new Set(['none','normal','0px','auto','static','visible','rgba(0, 0, 0, 0)','baseline','start','initial','1','stretch','row','nowrap','0','content-box','repeat','block']);
    const css = new Map(); let n = 0;
    const cls = (el, size) => {
      const cs = getComputedStyle(el); const parts = [];
      for (const p of PROPS) { let v = cs.getPropertyValue(p); if (p === 'display' && v === 'block') continue; if (v && !DEF.has(v)) parts.push(p + ':' + v); }
      for (const p of size || []) { const v = cs.getPropertyValue(p); if (v && v !== 'auto' && v !== 'none') parts.push(p + ':' + v); }
      const s = parts.join(';'); if (!s) return ''; if (!css.has(s)) css.set(s, 'f' + (++n)); return css.get(s);
    };
    const VOID = new Set(['br','img','hr','input','wbr','source','col']);
    const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const attr = (node, names) => names.filter(a => node.hasAttribute(a)).map(a => ` ${a}="${node.getAttribute(a).replace(/"/g, '&quot;')}"`).join('');
    const COPY = ['href','target','rel','src','alt','width','height','type','id','aria-label','aria-hidden','tabindex','role','data-polaris-unstyled'];
    function build(node, inS) {
      if (node.nodeType === 3) return esc(node.textContent);
      if (node.nodeType !== 1) return '';
      const tag = node.tagName.toLowerCase();
      if (['style','script','img#x'].includes(tag)) return '';
      if (tag === 'slot') { const a = node.assignedNodes({ flatten: true }); return (a.length ? a : [...node.childNodes]).map(k => build(k, true)).join(''); }
      if (tag === 'svg') return node.outerHTML;
      if (tag === 's-modal') return '<!--MODAL-->';
      if (tag === 's-select') {
        const sel = node.shadowRoot && node.shadowRoot.querySelector('select');
        const optEls = [...node.querySelectorAll('s-option')];
        const selVal = (sel && sel.value) || (optEls[0] && optEls[0].getAttribute('value'));
        const cur = optEls.find(o => o.getAttribute('value') === selVal) || optEls[0];
        const opts = optEls.map(o => '<option value="' + o.getAttribute('value') + '"' + (o === cur ? ' selected' : '') + '>' + esc(o.textContent.trim()) + '</option>').join('');
        const arrow = '<svg viewBox="0 0 20 20" class="fs-select__ic"><path d="M10.884 4.323a1.25 1.25 0 0 0-1.768 0l-2.646 2.647a.75.75 0 0 0 1.06 1.06l2.47-2.47 2.47 2.47a.75.75 0 1 0 1.06-1.06z"/><path d="m7.53 12.03 2.47 2.47 2.47-2.47a.75.75 0 1 1 1.06 1.06l-2.646 2.647a1.25 1.25 0 0 1-1.768 0l-2.646-2.647a.75.75 0 1 1 1.06-1.06z"/></svg>';
        return '<span class="fs-select"><span class="fs-select__value">' + esc(cur ? cur.textContent.trim() : '') + '</span>' + arrow + '<select aria-label="' + (node.getAttribute('label') || '') + '">' + opts + '</select></span>';
      }
      const isS = tag.startsWith('s-');
      const hasClass = !isS && node.getAttribute('class') && node.getRootNode() === document;
      if (!isS && !inS) {          // plain Polaris / app markup: keep verbatim
        const style = node.getAttribute('style');
        const a = [...node.attributes].filter(x => !['style','class'].includes(x.name) && !x.name.startsWith('data-state') && !x.name.startsWith('aria-owns')).map(x => ` ${x.name}="${x.value.replace(/"/g, '&quot;')}"`).join('');
        const c = hasClass ? ` class="${node.getAttribute('class')}"` : '';
        const st = style ? ` style="${style.replace(/"/g, '&quot;')}"` : '';
        const kids = [...node.childNodes].map(k => build(k, false)).join('');
        return VOID.has(tag) ? `<${tag}${a}${c}${st}>` : `<${tag}${a}${c}${st}>${kids}</${tag}>`;
      }
      // s-* host or unclassed light-DOM child inside one: bake computed style
      const size = tag === 's-page' ? ['max-width'] : (tag === 's-icon' ? ['width','height'] : []);
      const c = cls(node, size);
      const map = { 's-link': 'span', 's-button': 'span', 's-text': 'span', 's-badge': 'span', 's-icon': 'span', 's-list-item': 'span', 's-unordered-list': 'div', 's-internal-icon': 'span' };
      const oTag = isS ? (map[tag] || 'div') : tag;
      let kids;
      const childInS = hasClass ? false : true;
      if (isS && node.shadowRoot) kids = [...node.shadowRoot.childNodes].map(k => build(k, true)).join('');
      else kids = [...node.childNodes].map(k => build(k, childInS)).join('');
      let a = attr(node, COPY);
      if (isS) a += ` data-s="${tag}"` + attr(node, ['icon','tone','variant','disabled','size']);
      const extra = (hasClass && node.getRootNode() === document) ? ' ' + node.getAttribute('class') : '';
      return VOID.has(oTag) ? `<${oTag}${a} class="${(c + extra).trim()}">` : `<${oTag}${a} class="${(c + extra).trim()}">${kids}</${oTag}>`;
    }
    const html = build(document.querySelector('#app'), false);
    const cssText = [...css].map(([s, c]) => `.${c}{${s}}`).join('\n');
    return { html, cssText };
  });
  fs.writeFileSync('cap/flat.html', out.html); fs.writeFileSync('cap/flat.css', out.cssText);
  console.log('html', out.html.length, 'css', out.cssText.length);
  process.exit(0);
})();
