# Components

Use the Polaris version of every component. Class names in the captured pages are `Polaris-*`; web components are `s-*` (`s-button`, `s-switch`, `s-checkbox`, `s-section`, `s-stack`, `s-grid`, `s-modal`...). Static replicas draw them as plain HTML (see `06`).

## Buttons

| Type | Look | Use |
|---|---|---|
| Primary | Dark `#303030` fill, white text, 8px radius | **One per view/group**: the most logical next action (BFS 4.2.5) |
| Secondary (default) | White, 1px border, dark text | Other actions |
| Tertiary / plain | Text only, link blue or dark | Low-emphasis actions |
| Critical | Red fill `#e51c00` (or red text plain) | Destructive only (delete, remove) |
| Disabled | Grayed, `aria-disabled`, no hover | Not currently possible |

- Height 28px default (36px large on phones/hero actions). Padding 4px 12px. Weight 550.
- Labels: sentence case, verb first ("Add filter set", "Save"), 1–3 words. No "Click here".
- Button groups: primary on the right (or the single prominent one); 8px gap; secondary actions never share the primary treatment.
- Loading: spinner inside the button, label kept, button disabled.
- Never green/purple/brand-colored primary buttons (BFS 4.1.1 #3).

## Modals

- Title through the modal `heading`; actions only in the footer slots (`primary-action` right, `secondary-actions` left of it). No buttons in the body.
- Always a close X at the top right, Esc closes, outside click closes unless there are unsaved edits (then confirm).
- Never open automatically on load/timer (BFS 4.3.3). Open only from a merchant action.
- Destructive confirm: title "Delete {thing}?", body says what happens, buttons "Cancel" + red "Delete".
- Don't stack modals. Don't use the deprecated Fullscreen bar (BFS 4.1.6).

## Banners

- Variants: info (blue), success (green), warning (yellow), critical (red). Critical only for real errors.
- Dismissible unless it reports a state the merchant must fix. One banner at a time on a page (BFS 4.3.4 #2).
- Content: 1 short sentence + at most 1 action. No paragraphs.
- Promotional banners: image links, 100% column width, X overlay top right, optional arrows when a group has more than one image, auto-advance interval set in seconds.

## Forms

- Group fields into logical sections/cards (BFS 4.3.4 #1). Labels above inputs, sentence case, with units in the label ("Delay (seconds)").
- Helper text under the field in subdued `#616161`.
- Validation: on blur/submit, **never before interaction**. Error text in red directly under the field, field outline red; message says how to fix ("Enter an email like name@example.com"). Errors never auto-dismiss (BFS 4.2.4).
- Save pattern: contextual save bar (Save + Discard) while there are unsaved changes; leaving blocked until the merchant chooses (BFS 4.1.5).
- Required fields are marked in the label text, not only by color.

## Toggles, checkboxes, radios

- Toggle (`s-switch`): 32×16px track; on = dark `#303030`, off = white with gray border. Immediate-effect settings only; otherwise use a checkbox + Save.
- Checkbox (`s-checkbox`): 16px, 4px radius, dark when checked. Radios/single-choice groups: only one selectable at a time.
- Label to the right of the control; the whole row is clickable.

## Tabs

- Few (2–5) peer views of the same thing. Selected tab has the 2px dark underline and weight 550. Tabs change only the content below them (BFS 4.1.1 #7).
- If tabs are separate pages (as in this repo) every tab is a link and the browser Back button works.

## Tables / lists

- Header row subdued, rows separated by 1px `#ebebeb`, row actions at the right (icon buttons with `aria-label`).
- Condensed mode on phones: horizontal scroll inside the card with prev/next arrows and dots.
- In a list either all rows have leading icons or none (BFS 4.1.1 #8).

## Badges and status

- Pill badges 12px text: neutral (gray), info (blue), success (green), warning (yellow), critical (red). Always text-labeled ("Active", "Not set up").
- Premium/plan-gated features: disabled **and** labelled with the required plan and an upgrade link (BFS 4.3.7).

## Empty states

- Centered illustration (max 140px wide), one-line heading, one-line explanation, one primary action ("Add your first filter set").

## Toasts

- Short success confirmations only ("Saved"), auto-dismiss ~3 s, bottom center. **Errors are never toasts** (BFS 4.2.4); they go inline.

## Tooltips and popovers

- Open on hover/focus of an `(i)` icon or on click of a menu button; never on page load or a timer (BFS 4.3.3).

## Accessibility baseline

- Visible focus ring (2px `#005bd3`, offset 2px), full keyboard operation, `aria-label` on icon-only buttons, `role="switch"` on toggles, `aria-current="page"` on active nav, `aria-selected` on tabs, alt text on images.
