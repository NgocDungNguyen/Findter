/* "Powered by Findter" badge: the rules shared by the Master setting, the Search settings card and the sample storefront.
   Stand-alone, loaded after demo.js (index.html inlines it, every other page loads assets/watermark.js).
   - The badge is a flag per store (a shop metafield the storefront reads, no server call). The flag is set for every store installed after the release, and by a background job that
     works through the Free and Trial stores that already existed, a few at a time, until all are done. A store that was paying on the release date, and a development store, never gets the flag,
     so it never shows the badge. The demo bar's Store stands for one such store: Trial and Free have the flag, the others do not.
   - Master -> Features has no switch and no shop-type list any more: only "Remove or restore for one store" (a CSE types a store domain). Changing the link or turning the badge off for everyone is a code change in the theme extension, then a deploy.
   - cardShown()   the admin's "Remove “Powered by Findter” badge" card is shown: the shop has the flag
   - removed()     the badge was removed (the Remove button: the chat flow; the demo bar's Badge group; Master Remove)
   - onStorefront() the badge shows on the storefront: the shop has the flag AND it was not removed
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
  const LINK = 'https://apps.shopify.com/findter-custom-filter-search?utm_source=trademark&utm_medium=referral';   // fixed in the theme extension code; changing it is a deploy
  const FLAG_TYPES = ['Trial', 'Free'];                                          // the shop types that carry the flag (installed after the release, or Free/Trial at the release)
  const listeners = [];
  const changed = () => listeners.forEach(fn => fn());
  const shopType = () => SHOP_TYPE_OF_PLAN[D.DEMO.plan] || 'Free';
  /* per-store state by domain (Master -> Features): Shown (flag on), Removed, Not set (no flag: a store that was paying at the release, a development store, or a store QA cleared).
     The demo store's own domain drives the demo state (the demo bar's Badge group + the flag below); other domains are kept in a small list so the page can show their status. */
  const SHOPS_KEY = 'findter.watermark.shops.v1', FLAG_KEY = 'findter.watermark.flag.v1', DEMO_SHOP = 'brgmnnlukas.myshopify.com';
  let shops = {}, flag = null;                                                    // flag: null = from the demo bar's Store; true / false = set from Master (Restore / Clear)
  const loadShops = () => { try { shops = JSON.parse(localStorage.getItem(SHOPS_KEY)) || {}; } catch (e) { shops = {}; } try { const v = localStorage.getItem(FLAG_KEY); flag = v === '1' ? true : v === '0' ? false : null; } catch (e) { flag = null; } };
  loadShops();
  const saveShops = () => { try { localStorage.setItem(SHOPS_KEY, JSON.stringify(shops)); } catch (e) { /* storage blocked */ } try { if (flag === null) localStorage.removeItem(FLAG_KEY); else localStorage.setItem(FLAG_KEY, flag ? '1' : '0'); } catch (e) { /* storage blocked */ } };
  const api = {
    SHOP_TYPES, SHOP_TYPE_OF_PLAN, shopType,
    link: () => LINK,
    hasFlag: () => flag !== null ? flag : FLAG_TYPES.includes(shopType()),
    cardShown: () => api.hasFlag() || api.removed(),                         // a store that removed the badge keeps its green Removed badge even after it buys a plan
    removed: () => D.DEMO.wm === 'removed',
    DEMO_SHOP,
    shopState: d => d === DEMO_SHOP ? (D.DEMO.wm === 'removed' ? 'Removed' : api.hasFlag() ? 'Shown' : 'Not set') : (shops[d] === 'removed' ? 'Removed' : shops[d] === 'none' ? 'Not set' : 'Shown'),
    setShopState: (d, st) => {                                               // st: 'removed' | 'shown' (Restore) | 'none' (Clear)
      if (d === DEMO_SHOP) { flag = st === 'shown' ? true : st === 'none' ? false : flag; saveShops(); D.set('wm', st === 'removed' ? 'removed' : 'shown'); changed(); return; }
      if (st === 'shown') delete shops[d]; else shops[d] = st; saveShops(); changed();
    },
    shopRemoved: d => api.shopState(d) === 'Removed',
    setShopRemoved: (d, on) => api.setShopState(d, on ? 'removed' : 'shown'),
    setRemoved: on => D.set('wm', on ? 'removed' : 'shown'),
    onStorefront: () => api.hasFlag() && !api.removed(),
    onChange: fn => { listeners.push(fn); },
  };
  window.FindterWatermark = api;
  window.addEventListener('findter:demo-reset', () => { flag = null; saveShops(); });          // Reset on the demo bar: the store goes back to what its Store says
  D.onChange(changed);                                                          // the shop changed (bar, chat, or another tab)
})();
