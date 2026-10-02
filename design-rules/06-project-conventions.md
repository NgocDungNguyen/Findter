# Project conventions (this repo)

Static, pixel-faithful replica of the Findter Filter & Search app inside the Shopify admin, used to design and review UI/UX.

## Files

- One HTML file per page at the repo root: `index.html` (home + Master), `filter.html`, `filter-boost.html`, `search.html`, `search-boost.html`, `metafield.html`, `ymm.html`, `features.html`, `design.html` (Filter design tab), `design-product-grid.html` (Product grid design tab).
- Shared: `assets/common.css`, `assets/shell.js` (admin shell behavior), `assets/pages.js` (page behavior), `assets/img/`.
- `index.html` is self-contained (its CSS/JS are inline).
- Tabs that are separate pages link to each other via `data-href`. Sidebar items link to the real files.

## Rebuilding

Sources live in `tools/` (`build.js` → `index.html`; `build-pages.js` → the other pages and `assets/`). Edit sources, not generated files, then run both builds with Node. Tests: `t-pages.js` (pixel diff against captures), `t-pages-interact.js`, `t-nav.js`, `t-interact.js`, `t-master.js`, `t-v4.js`. `tools/cap/` (live captures) is git-ignored and never published.

## Scope rule for replicas

Replicate what is visible when a page first opens. Don't dive into nested settings unless asked.

## Patterns implemented

- **Draft until Save** (Master → Home): edits go to a draft; the real homepage changes only after Save. Keys: `findter.homeLayout.v2`, `findter.promos.v2`.
- **Layout editor**: three independent orders (desktop left, desktop right, mobile). Promotion banners are added per area (left, right, mobile) with their own banner lists; desktop banners are not used on mobile.
- Default mobile order: Findter app status → Sync recent updates → Onboarding guide → Help & Support → Recommended apps → Data insight → Master.
- Promotion banner: X overlay, arrows when it has more than one image, per-banner interval in seconds.
- Sidebar "View more" reveals Analytics and Pricing and turns into "View less" (state in `findter.navExpanded`). Analytics/Pricing pages are not built.

## Don't commit

Browser profiles, raw captures of the live admin (store data), test screenshots, credentials, store emails. See `.gitignore`.

## Before finalizing any UI/UX or feature

1. Re-read `Built For Shopify.txt` rules and rejection reasons relevant to what was built.
2. Walk through `01-bfs-checklist.md`.
3. Test desktop, 768–799 rail, and phone (≤767) widths.
4. Report any conflict between a request and a BFS rule instead of silently building it.
