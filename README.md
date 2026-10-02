# Findter Filter & Search: home screen replica

A single-file, static replica of the **Findter Filter & Search** app home screen inside the Shopify admin (desktop and mobile), plus a small "Master UI" area for arranging the homepage.

Open [`index.html`](index.html) in a browser. There is no build step and no server. It needs an internet connection for the Inter font and the app icons (loaded from Shopify's CDN).

## What's inside

- **Homepage:** onboarding guide (expand/collapse, four steps), recommended apps carousel, data insight with date picker and tooltips, app status, help & support, sync, and the Shopify admin shell (sidebar, collapsed rail, mobile drawer, search, menus, Sidekick bar).
- **Master UI** (`#/master`, via the **Master** card): tabs, and a **Home** tab where you
  - drag and drop blocks between the desktop left / right columns,
  - set a separate order for phones,
  - add, edit and delete **promotion banners** under each section (desktop banners and phone banners are separate; a block with several banners gets arrows and an auto-slide timer).
- All Master changes are a **draft until you click Save**. Saved data lives in the browser's `localStorage`; nothing is sent to a server.
- Dismissing a block with its **X** only lasts until the page is reloaded.

## Layout rules

- Up to 767px wide the page uses the single-column **mobile layout**, using the order from the *Mobile phone order* list. Default order: Findter app status, Sync recent updates, Onboarding guide, Help & Support, Recommended apps, Data insight, Master.
- Every block shares one width (10px side margins) on mobile.

## Tooling

`tools/` holds the scripts used to build `index.html` (`node tools/build.js`): it flattens the app's web components to plain HTML, trims the Polaris CSS to the classes in use, and assembles the page together with the hand-written shell (`tools/build/`). The raw captures of the live admin (`tools/cap`) and local browser profiles are **not** part of the repository, so the build can't be re-run from a clean checkout. `index.html` is the deliverable.

This is an unofficial UI replica for design/prototyping. Shopify, Polaris and Findter belong to their respective owners.
