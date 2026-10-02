# Layout, cards and responsive behavior

## The frame around the app

- The app is embedded in the Shopify admin: dark left nav (220px; 60px icon rail at 768–799px; slide-over drawer ≤767px), top bar with search, white rounded main area on the dark background, Sidekick bar, and an app header ("Findter Filter & Search" + ⋯ menu).
- The app **does not draw its own nav**. Sub-pages are sidebar items under the app name; open sub-page → highlighted sub item, parent shown as active text without pill (BFS 4.1.4).
- Page background `#f1f1f1`, content sits in cards.

## Page structure

```
page header (title h1 + short description / back button on sub-pages)
tabs (optional, only when the tabs are views of one thing)
card
card
...
```

- Max content width **966px**, centered, 16px gutters (0–10px on phones).
- Vertical gap between cards: 16px.
- Sub-page → **back button** to the parent (BFS 4.1.1 #11). Tabs are not sub-pages: they are peers.
- Tabs only change what's **below** them; the page title and anything above stay put (BFS 4.1.1 #7).

## Cards

- White surface, 12px radius, 1px border `#e3e3e3` + Polaris card shadow, 16px padding.
- Structure: heading (14–16px semibold) → short supporting text → content → action row. One idea per card.
- Most content on a page lives in cards (BFS 4.1.1 #2). Free-floating text on the gray background is only for the page title/description.
- Cards in a grid: equal height rows, 16–20px gap.
- A card with media: media on top (full-bleed, fixed aspect ratio to avoid layout shift), text block below with 16px padding.

## Grids and responsive rules

- Desktop columns: 2 or 3 equal columns with 16–20px gap. Home page uses a left and a right column; the order of blocks is configurable (Master → Home).
- ≤1024px: 3 → 2 columns. ≤767px: **1 column**, every block full width with the same left/right edges (no block narrower than the rest).
- Never two-column on a phone for text-heavy content (BFS 4.1.2 #3).
- Data tables on phones become a horizontally scrolling container with arrows and dots **inside** the card; the page itself never scrolls sideways (BFS 4.1.2 #1/#2).
- Use `minmax(0, …)` in grid templates and `min-width:0` in flex children so long text can't push the layout wider than the screen.
- Touch targets ≥ 44px tall on phones (buttons, toggles, list rows).
- Reserve space for images/video (`width`/`height` or aspect-ratio) to keep CLS ≤ 0.1.

## Editors with previews

- Anything visual must have a **live preview** (BFS 4.2.6). Desktop: editor controls and preview visible side by side. Phone: preview above or below, still on the same page.

## Dismissible and promo areas

- Promotions/ads/tips are cards or banners with an **X** (top right). Dismissed items must not come back (BFS 4.3.6).
- Never stack two banners together; max one banner at the top of a page.
- Nothing slides, pops up or animates in on page load.

## Sticky/overlay elements

- Chat bubble and Sidekick bar sit above content on the bottom edge; they must never cover primary actions on phones (leave bottom padding).
- Modals: centered, max-width ~620px (small 400px), scrim `rgba(0,0,0,.5)`, body scrolls inside, header and footer fixed.
