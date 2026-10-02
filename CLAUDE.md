# Project rules for Claude

This repo is a static replica of the Findter Filter & Search Shopify app UI.

## Standing rules (always apply)

1. **Before designing or finalizing any UI/UX, component or feature**, read [`Built For Shopify.txt`](Built%20For%20Shopify.txt) (Built for Shopify requirements and rejection reasons) and check the work against it. Never knowingly violate a BFS rule. If a request conflicts with one, say which rule (for example "4.3.6 dismissible ads") and propose a compliant alternative before building.
2. Follow the rules in [`design-rules/`](design-rules/README.md) (style, tone, colors, buttons, modals, layout, copy, repo conventions). Run `design-rules/01-bfs-checklist.md` before calling a screen done.
3. One HTML file per page; edit sources in `tools/` and rebuild (`node tools/build.js && node tools/build-pages.js`), don't hand-edit generated files.
4. Replicate only what's visible on first open of a page unless told to go deeper.
5. Never publish credentials, store emails, browser profiles or raw live captures (`tools/cap`, `tools/profile*`, `tools/test`).
