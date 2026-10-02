# Shopify app UI/UX rules

Rules to follow whenever a screen, component or feature is designed or built for the Findter Shopify app.
Read the files below **before** designing, and run `01-bfs-checklist.md` **before finalizing**.

| File | What it covers |
|---|---|
| [01-bfs-checklist.md](01-bfs-checklist.md) | Built for Shopify (BFS) rules and rejection reasons, turned into a pre-ship checklist. Source of truth: [`Built For Shopify.txt`](../Built%20For%20Shopify.txt) |
| [02-tokens-colors-type.md](02-tokens-colors-type.md) | Colors, typography, spacing, radius, shadow (real values used in this repo) |
| [03-layout-and-cards.md](03-layout-and-cards.md) | Page frame, cards, grids, responsive behavior, the admin shell around the app |
| [04-components.md](04-components.md) | Buttons, modals, banners, forms, tabs, tables, badges, toggles, empty states, toasts |
| [05-tone-and-copy.md](05-tone-and-copy.md) | Voice, wording, sentence case, error/empty/success messages |
| [06-project-conventions.md](06-project-conventions.md) | How this repo is organised (page-per-file, build scripts, draft/Save pattern, testing) |

## Order of authority

1. `Built For Shopify.txt` (hard requirements: a violation means rejection).
2. Polaris / Shopify admin look and feel (`02`–`04`).
3. Tone (`05`) and repo conventions (`06`).
4. A specific request from the app owner. If a request conflicts with 1, say so and propose a compliant alternative before building. Do not silently build the violation.

## Debating decisions

The `shopify-ai-toolkit` plugin (`claude plugin install shopify-ai-toolkit@claude-plugins-official`) and the Shopify MCP docs search can be used to check Polaris components, admin UX and policy questions. Cite the BFS rule number (for example "4.3.6") when a choice is driven by it.
