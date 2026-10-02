# Tokens: colors, typography, spacing, radius, shadow

Real values taken from the Polaris stylesheet captured from the live app (`assets/common.css`). Use the Polaris CSS variables (`--p-*`) when they exist; do not invent new hex values.

## Colors

| Role | Token | Value |
|---|---|---|
| Page background | `--p-color-bg` | `#f1f1f1` |
| Card / surface | `--p-color-bg-surface` | `#ffffff` |
| Secondary surface (zebra rows, inset boxes) | `--p-color-bg-surface-secondary` | `#f7f7f7` |
| Primary text | `--p-color-text` | `#303030` |
| Secondary / subdued text | `--p-color-text-secondary` | `#616161` |
| Border | `--p-color-border` | `#e3e3e3` |
| Subtle border | `--p-color-border-secondary` | `#ebebeb` |
| **Primary button / brand fill** | `--p-color-bg-fill-brand` | `#303030` (dark, never colored) |
| Link | `--p-color-text-link` | `#005bd3` |
| Critical fill (errors, destructive) | `--p-color-bg-fill-critical` | `#e51c00` |
| Critical text | `--p-color-text-critical` | `#8e1f0b` |
| Success fill | `--p-color-bg-fill-success` | `#29845a` |
| Warning fill | `--p-color-bg-fill-warning` | `#ffb800` |
| Info fill | `--p-color-bg-fill-info` | `#91d0ff` |

Admin shell (outside the app, replicated in `index.html`): sidebar `#0a0a0a`, nav text `#dcdcdc`, muted `#a6a6a6`, hover `#181818`, active pill `#262626`, search field `#383838`, menus `#1a1a1a`, outer radius 16px, sidebar width 220px.

Rules
- Red is **only** for errors and destructive actions (BFS 4.3.3).
- Don't use Shopify's magic purple or the Sidekick icon for AI features (BFS 4.3.5).
- Every text/background pair must reach WCAG AA (4.5:1; 3:1 for large text and UI borders). `#616161` on white passes; lighter grays do not.
- Status is never color-only: pair color with text or an icon.

## Typography

- Font: **Inter**, fallback `-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif`. No serif or script fonts.
- Body: **13px / 20px**, weight **450**, color `#303030`.
- Weights: regular 450, medium 550, semibold 650, bold 700.
- Sizes: 12px (`--p-font-size-300`) captions/badges, 14px (`-350`) emphasised body, 16px (`-400`), 20px (`-500`) page/card headings.
- Page title (h1): ~20px, semibold. Card heading: 14px (headingSm) or 16px (headingMd), semibold.
- Sentence case everywhere (see `05`). No ALL CAPS except tiny labels already used by Polaris.
- Links: `#005bd3`, underlined in running text.

## Spacing scale (Polaris `--p-space-*`)

`100=4px · 200=8px · 300=12px · 400=16px · 500=20px · 600=24px` (and 800=32px)

- Gap between cards: **16px**. Card inner padding: **16px** (12px on small cards/phones).
- Gap between a heading and its text: 4px. Between form fields: 16px. Between button and button: 8px.
- On phones: page side gutters 10px, uniform block width, 10px gaps.

## Radius

- `--p-border-radius-200` 8px (inputs, buttons), `-300` 12px (cards), `-400` 16px (large containers, admin shell), pills `9999px` (badges, toggles).

## Shadow

- Card: `--p-shadow-100` = `0 1px 0 0 rgba(26,26,26,.07)` plus 1px inset border look. Popovers/menus/modals use the larger Polaris `--p-shadow-300/400/600`. Never use heavy custom drop shadows.

## Icons

- Polaris icons (20px, `currentColor`), outline style. Don't mix icon sets. In a list either all rows have icons or none do (BFS 4.1.1 #8).
- No emojis in navigation or buttons.
