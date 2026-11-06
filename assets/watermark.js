/* "Powered by Findter" badge: the rules shared by the Master setting, the Search settings card and the sample storefront.
   Stand-alone, loaded after demo.js (index.html inlines it, every other page loads assets/watermark.js).
   - Master -> Features sets the config: the feature on/off, and which shop types it applies to (saved in localStorage, like the other Master settings).
   - cardShown()   the admin's "Remove “Powered by Findter” badge" card is shown: feature on AND the shop's type is ticked
   - removed()     the badge was removed (the Remove button: at once for a shop that has paid, through the chat for Trial and Free; the demo bar's Badge group)
   - onStorefront() the badge shows under the storefront's search suggestions: card shown AND not removed
   In the real app the config comes from the server and "removed" is a shop setting that Master Admin and the chat both write. */
(() => {
  'use strict';
  const D = window.FindterDemo;
  const KEY = 'findter.watermark.v1';
  const SHOP_TYPES = [
    ['Subscription', 'A paid plan is in effect now (including a cancelled plan until its paid period ends)'],
    ['Development store', 'Shopify partner development store without a paid plan'],
    ['Trial', 'Pre-purchase trial is running'],
    ['Paid before', 'Had a paid plan before, none now (cancelled and lapsed). Untick to reach never-paid shops only'],
    ['Service', 'Bought a one-time service charge, never had a paid plan'],
    ['Free', 'Never paid anything: trial ended, or an old install that never subscribed'],
  ];
  const SHOP_TYPE_OF_PLAN = { Trial: 'Trial', 'Trial not started': 'Free', Starter: 'Subscription', Enterprise: 'Subscription', Free: 'Free', Development: 'Development store', 'Paid before': 'Paid before', Service: 'Service', Legacy: 'Free', 'Old install': 'Free' };   // what the demo bar's Store means for targeting (a trial that has not started is not "running", so the app targets it as Free)
  const LINK_DEFAULT = 'https://apps.shopify.com/findter-custom-filter-search?utm_source=trademark&utm_medium=referral';   // the badge opens this when the Master link field has one; an empty field makes the badge plain (not clickable)
  const linkOk = v => v === '' || /^https?:\/\/\S+$/i.test(v);
  const DEFAULT = { enabled: true, types: ['Subscription', 'Trial', 'Paid before', 'Service', 'Free'], link: LINK_DEFAULT };   // Development stores (Shopify's reviewers) are off by default
  const clean = c => ({ enabled: !c || c.enabled !== false, types: Array.isArray(c && c.types) ? c.types.filter(t => SHOP_TYPES.some(([n]) => n === t)) : DEFAULT.types.slice(), link: c && typeof c.link === 'string' && linkOk(c.link.trim()) ? c.link.trim() : (c && typeof c.link === 'string' ? '' : LINK_DEFAULT) });
  let config = clean(null);
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); config = s ? clean(s) : clean(null); } catch (e) { config = clean(null); } };
  load();
  const listeners = [];
  const changed = () => listeners.forEach(fn => fn());
  const shopType = () => SHOP_TYPE_OF_PLAN[D.DEMO.plan] || 'Free';
  /* removal by store domain (Master -> Features): the demo store's own domain drives the demo state; other domains are kept in a small list so the page can show their status */
  const SHOPS_KEY = 'findter.watermark.shops.v1', DEMO_SHOP = 'brgmnnlukas.myshopify.com';
  let shops = {};
  const loadShops = () => { try { shops = JSON.parse(localStorage.getItem(SHOPS_KEY)) || {}; } catch (e) { shops = {}; } };
  loadShops();
  const api = {
    SHOP_TYPES, SHOP_TYPE_OF_PLAN, DEFAULT, shopType, linkOk,
    config: () => ({ enabled: config.enabled, types: config.types.slice(), link: config.link }),
    link: () => config.link,
    saveConfig: c => { config = clean(c); try { localStorage.setItem(KEY, JSON.stringify(config)); } catch (e) { /* storage blocked: applies for this visit only */ } changed(); },
    cardShown: () => config.enabled && config.types.includes(shopType()),
    removed: () => D.DEMO.wm === 'removed',
    DEMO_SHOP,
    shopRemoved: d => d === DEMO_SHOP ? D.DEMO.wm === 'removed' : !!shops[d],
    setShopRemoved: (d, on) => { if (d === DEMO_SHOP) { D.set('wm', on ? 'removed' : 'shown'); return; } if (on) shops[d] = 1; else delete shops[d]; try { localStorage.setItem(SHOPS_KEY, JSON.stringify(shops)); } catch (e) { /* storage blocked */ } changed(); },
    setRemoved: on => D.set('wm', on ? 'removed' : 'shown'),
    onStorefront: () => api.cardShown() && !api.removed(),
    onChange: fn => { listeners.push(fn); },
  };
  window.FindterWatermark = api;
  D.onChange(changed);                                                          // the shop changed (bar, chat, or another tab)
  window.addEventListener('storage', e => { if (e.key === KEY) { load(); changed(); } });   // Master saved in another tab
})();
