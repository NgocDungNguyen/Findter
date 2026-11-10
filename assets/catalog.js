/* Sample catalog for the prototype pages that pick or rank products (Merchandising, Search suggestions).
   It is the SAME 72 products as the sample storefront (tools/build/storefront.js: same titles, prices, stock and the same fixed hash), so what the admin previews is what the storefront shows.
   window.FindterCatalog = { PRODUCTS, COLLECTIONS, METAFIELDS, money, rnd } */
(() => {
  'use strict';
  const BASE = [
    ['Hydrating Face Serum', 'Skin care', 34, 'in', 'Serums'], ['Vitamin C Brightening Cream', 'Skin care', 29, 'in', 'Moisturizers'], ['Gentle Foaming Cleanser', 'Skin care', 18, 'in', 'Cleansers'],
    ['Rose Water Toner', 'Skin care', 16, 'out', 'Toners'], ['Matte Liquid Lipstick', 'Makeup', 22, 'in', 'Lips'], ['Daily Sunscreen SPF 50', 'Skin care', 27, 'in', 'Sunscreen'],
    ['Overnight Repair Mask', 'Skin care', 31, 'out', 'Masks'], ['Eye Contour Gel', 'Skin care', 26, 'in', 'Eyes'], ['Hand Cream Trio', 'Body', 21, 'in', 'Hands'],
    ['Cocoa Body Lotion', 'Body', 19, 'in', 'Body care'], ['Hair Repair Oil', 'Hair', 24, 'out', 'Hair care'], ['Cotton Makeup Pads', 'Makeup', 9, 'in', 'Accessories'],
  ];
  const LINES = ['Aloe', 'Argan', 'Bamboo', 'Cacao', 'Dew', 'Ember', 'Fig', 'Glow', 'Honey', 'Iris', 'Jade', 'Kelp'];
  const KINDS = [['Face Cream', 'Skin care', 28, 'Moisturizers'], ['Body Wash', 'Body', 15, 'Cleansers'], ['Lip Balm', 'Makeup', 8, 'Lips'], ['Hair Mask', 'Hair', 23, 'Masks'], ['Night Serum', 'Skin care', 36, 'Serums']];
  LINES.forEach((l, i) => KINDS.forEach(([k, type, base, cat], j) => BASE.push([l + ' ' + k, type, base + ((i * 7 + j * 3) % 9), (i * 5 + j) % 7 === 3 ? 'out' : 'in', cat])));
  const rnd = (i, k) => { let x = Math.imul(i + 1, 374761393) + Math.imul(k, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const COLORS = { 'Skin care': '#d6a77a', Makeup: '#b83a5e', Hair: '#7a5a3a', Body: '#8aa88a' };
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  const PRODUCTS = BASE.map(([name, type, price, stock, category], i) => {
    const tags = []; if (i % 4 === 0) tags.push('Best seller'); if (i % 5 === 1) tags.push('New'); if (i % 3 === 2) tags.push('Vegan');
    const created = Date.UTC(2026, 10, 6) - Math.floor(rnd(i, 1) * 300) * 864e5;
    return { id: i + 1, name, price, color: COLORS[type], collections: [type].concat(tags.includes('Best seller') ? ['Best sellers'] : []), type, category, vendor: 'Demo Cosmetics', tags,
      sku: String(10001 + i), inventory: stock === 'out' ? 'Out of stock' : 'In stock', qty: stock === 'out' ? 0 : 3 + Math.floor(rnd(i, 4) * 97), published: iso(created),
      rating: +(3.4 + rnd(i, 5) * 1.6).toFixed(1), reviews: 3 + Math.floor(Math.pow(rnd(i, 6), 2) * 417) };
  });
  const COLLECTIONS = ['Skin care', 'Makeup', 'Hair', 'Body', 'Best sellers'];
  const METAFIELDS = ['Shelf life: 12 months', 'Shelf life: 24 months', 'Vegan: Yes', 'Cruelty free: Yes'];
  const money = n => '$' + Number(n).toFixed(2);
  /* the demo store's starting rules, shared by the Merchandising page and other pages that read what the admin saved, or these when nothing is saved yet */
  const MERCH_SEEDS = {
    collection: [
      { id: 1, enabled: true, type: 'boost', name: 'Boost best sellers in Skin care', start: '', end: '', market: 'Store default', applyMode: 'specific', collection: 'Skin care', productMode: 'specific', productIds: [1, 2], groups: [], groupRelation: 'AND' },
      { id: 2, enabled: true, type: 'hide', name: 'Hide out of stock storewide', start: '', end: '', market: 'Store default', applyMode: 'all', collection: '', productMode: 'attributes', productIds: [], groups: [{ id: 9001, name: 'Condition group 1', conditions: [{ id: 9002, attr: 'Inventory', operator: 'is', value: 'Out of stock' }] }], groupRelation: 'AND' },
      { id: 3, enabled: false, type: 'demote', name: 'Demote slow movers in Body', start: '2026-01-01', end: '2026-02-01', market: 'Store default', applyMode: 'specific', collection: 'Body', productMode: 'specific', productIds: [10], groups: [], groupRelation: 'AND' },
    ],
    search: [
      { id: 1, enabled: true, type: 'boost', name: 'Boost holiday favorites', start: '2026-11-01', end: '2026-12-31', market: 'Store default', applyMode: 'specific', matchMode: 'contains', terms: ['cream', 'lotion'], productMode: 'specific', productIds: [9, 10, 2], groups: [], groupRelation: 'AND' },
      { id: 2, enabled: true, type: 'hide', name: 'Hide out of stock items', start: '', end: '', market: 'Store default', applyMode: 'all', matchMode: 'contains', terms: [], productMode: 'attributes', productIds: [], groups: [{ id: 9101, name: 'Condition group 1', conditions: [{ id: 9102, attr: 'Inventory', operator: 'is', value: 'Out of stock' }] }], groupRelation: 'AND' },
      { id: 3, enabled: false, type: 'demote', name: 'Demote old clearance', start: '2026-01-01', end: '2026-03-01', market: 'Store default', applyMode: 'specific', matchMode: 'is', terms: ['clearance'], productMode: 'specific', productIds: [6], groups: [], groupRelation: 'AND' },
    ],
  };
  const REDIRECT_SEED = [{ id: 1, terms: ['sale', 'deals'], url: '/collections/sale' }, { id: 2, terms: ['shoes', 'footwear'], url: '/collections/footwear' }];
  const SYNONYM_SEED = [   // same as the Synonyms search page's starting rows (extra.js)
    { id: 1, status: true, name: 'moisturizer', relation: 'two_ways', synonym_term: ['cream', 'lotion'] },
    { id: 2, status: true, name: 'spf', relation: 'one_way', synonym_term: ['sunscreen', 'sun cream'] },
    { id: 3, status: false, name: 'lippy', relation: 'one_way', synonym_term: ['lipstick', 'lip balm'] },
  ];
  window.FindterCatalog = { PRODUCTS, COLLECTIONS, METAFIELDS, money, rnd, MERCH_SEEDS, REDIRECT_SEED, SYNONYM_SEED };
})();
