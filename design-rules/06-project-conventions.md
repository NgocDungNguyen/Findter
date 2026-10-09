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
- **Layout editor**: three independent orders (desktop left, desktop right, mobile). The Promotion block can be placed in the left column and the phone order only; promotions are created in Master → Promotion and are live at once.
- Default mobile order: Findter app status → Sync recent updates → Onboarding guide → Help & Support → Data insight → Promotion banner → Recommended apps → Master.
- Promotion block: one banner block with the live promotions that target the shop (arrows + dots when several, equal height for every slide), X closes one promotion for good (stored per SKU), banner = link or "Copy code" / "Copy and apply" button underneath, depending on the promotion action.
- Sidebar "View more" reveals Analytics and Pricing and turns into "View less" (state in `findter.navExpanded`). Pricing is built (`pricing.html`, from the iframe of a raw capture kept in git-ignored `tools/cap/pages/pricing.raw.html`); Analytics is not.
- Promotion links use shortcuts (`/filter`, `/pricing`, ...): same tab, and the "Code: … copied successfully" pill is shown on the landing page (`tools/build/code-notice.js`, loaded by every page). `https://` links open a new tab.

## Don't commit

Browser profiles, raw captures of the live admin (store data), test screenshots, credentials, store emails. See `.gitignore`.

## Before finalizing any UI/UX or feature

1. Re-read `Built For Shopify.txt` rules and rejection reasons relevant to what was built.
2. Walk through `01-bfs-checklist.md`.
3. Test desktop, 768–799 rail, and phone (≤767) widths.
4. Report any conflict between a request and a BFS rule instead of silently building it.
