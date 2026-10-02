# Built for Shopify: pre-ship checklist

Distilled from [`Built For Shopify.txt`](../Built%20For%20Shopify.txt) (shopify.dev "Built for Shopify requirements"). Numbers match that file. If this checklist and the source file ever differ, the source file wins. Re-read it for anything not covered here.

Run this list on **every** new screen, component or feature before calling it finished. Note any item that cannot be met, and why.

## 4.1 Familiar (looks and behaves like the Shopify admin)

**4.1.1 UX best practices** (rejection reasons)
- [ ] No flicker, repeated load in/out, or content that jumps around (layout shift).
- [ ] Most content sits inside **cards** that look like admin cards.
- [ ] Buttons match Polaris. Primary is the dark `#303030` button, never green/purple/brand-colored.
- [ ] No serif or script fonts for body content (use Inter / system sans).
- [ ] Body text is admin-sized (13px/20px in this app's capture; see `02`).
- [ ] Page background is the admin's light gray (`#f1f1f1`), never a dark app background.
- [ ] **Tabs must not change content above the tabs.** Only the area under the tabs changes.
- [ ] In any group/list, either **all** items have icons or **none** do.
- [ ] Spacing follows the admin scale (see `02`/`03`).
- [ ] Text meets WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large text/UI parts).
- [ ] Every **sub-page has a back button** to its parent page.

**4.1.2 Mobile-friendly**
- [ ] No page-level horizontal scrolling on a phone.
- [ ] Nothing is unreachable on a phone (collapsed content needs a way to expand; wide content wraps or scrolls inside its own container, e.g. data tables).
- [ ] Multi-column desktop layouts **stack** on phones (no squeezed two-column layouts).

**4.1.3 Concise app name**: the app name must not truncate in the admin nav. This repo's sidebar item "Filter & product grid de…" truncates in the replica because it mirrors the original; for new nav labels keep them short.

**4.1.4 Nav menu**
- [ ] Use the admin navigation (App Bridge `s-app-nav`), not a custom in-app menu.
- [ ] Opening a sub-page highlights the correct nav item (and parent).
- [ ] No extra "Home" nav item besides the app name; the app name is the home link.
- [ ] No emojis in the nav.

**4.1.5 Contextual save bar (CSB)**
- [ ] Forms with editable values use the App Bridge **Contextual Save Bar** (Save/Discard at the top) instead of their own save button.
- [ ] While the CSB is shown, the merchant cannot navigate away without choosing Save or Discard.
- Note: the static replicas keep the original app's own "Save" buttons for fidelity. In the real app, prefer the CSB.

**4.1.6 Modals**
- [ ] Title via the `heading` attribute; actions only in the `primary-action` / `secondary-actions` slots (not inside the body).
- [ ] No deprecated Fullscreen bar; use `s-app-window` / `s-page`.
- [ ] Every modal has a visible close (X) and closes on Esc / outside click where safe.

## 4.2 Helpful

**4.2.1 Spelling, grammar, phrasing**
- [ ] No spelling or grammar errors, especially in headings, nav items, buttons.
- [ ] Labels have enough context (units! "Time" must say seconds/minutes).

**4.2.2 Onboarding**
- [ ] Concise, visible (not collapsed or out of view), guides to completion.
- [ ] Never imply that installing **another app** is a required onboarding step.
- [ ] Explain **why** any merchant information is asked.
- [ ] Onboarding UI can be **removed** once finished.

**4.2.3 Homepage**
- [ ] Shows whether the app is set up and working (status).
- [ ] Shows at least one real metric/performance block when obvious metrics exist.
- [ ] After dismissing every dismissible element, the homepage still has non-static content.
- [ ] Theme app block/embed status is reported on the homepage.

**4.2.4 Errors**
- [ ] Red, contextual (next to the field), and **never auto-dismissing** (no error toasts that vanish).
- [ ] A red field always has a message. No errors before the merchant interacts.
- [ ] Message says how to fix it.

**4.2.5 Logical actions**
- [ ] In a button group, the most logical next action is the visually dominant (primary) one; related actions don't share the same treatment.

**4.2.6 Visible previews**
- [ ] Anything visual that merchants customize has a **live preview**, visible at the same time as the editor on desktop (no toggling or scrolling between them).

## 4.3 User-friendly (no dark patterns)

- [ ] **4.3.1 False claims**: no promised/guaranteed outcomes ("increase sales by 18%"). Promoting another app: its displayed rating must match the App Store.
- [ ] **4.3.2 Pressure**: no countdown timers, guilt/shame wording ("No thanks, I prefer less sales"), or rewards for 5-star reviews.
- [ ] **4.3.3 Distraction**: no modals/popovers on page load, after a timer, or after an unrelated action (this includes "Get started" and live-chat popovers and review prompts); no large banners animating in; no attention-grabbing animation; **red only for errors/destructive actions**.
- [ ] **4.3.4 Overwhelm**: group long forms into logical sections; **never two banners close together**; no multi-paragraph walls of text (short, scannable copy).
- [ ] **4.3.5 Impersonation**: no Shopify logo/gradient-style app icon, no Sidekick icon, no Shopify "magic purple" for AI features.
- [ ] **4.3.6 Dismissible ads**: every ad/promotion has an **X**; once dismissed, the same or similar content **must not return**.
- [ ] **4.3.7 Premium features**: plan-gated features are **disabled and labelled** (with upgrade link and the tier needed); Plus-only features are hidden from non-Plus merchants. Never leave a gated feature clickable-but-disabled-looking or vice versa.

## 3 Integration and 2 Performance (design-relevant parts)

- [ ] Primary workflows complete inside the admin (no external site needed).
- [ ] Third-party connection settings (connect/disconnect) live in the app.
- [ ] Simplified reporting available in the admin if full reports live elsewhere.
- [ ] Theme work uses theme app extensions, never edits theme files (3.2).
- [ ] Admin Web Vitals targets: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms. Reserve image space (width/height) to avoid layout shift; lazy-load below the fold; avoid heavy blocking JS.
- [ ] Storefront impact: Lighthouse drop ≤ 10 points.

## Known tensions in this repo (decide consciously)

- Promotion banners: spec says they **come back on reload** (kept for the owner's testing). BFS 4.3.6 forbids returning dismissed promos. Real app: persist the dismissal.
- Banners inside the home columns: keep to **one banner per column area** and don't stack them next to another banner (4.3.4).
- Chat bubble (Crisp-style): must never open itself (4.3.3).
- "Save" buttons on settings pages: use the contextual save bar in the real app (4.1.5).
- Master / Home layout editor uses its own Save: it is an admin tool; keep Discard next to Save and warn on leaving with unsaved changes.
