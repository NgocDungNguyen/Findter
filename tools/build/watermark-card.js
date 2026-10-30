/* Search settings: the card with the single "Remove “Powered by Findter” badge" row (no heading, no description), between the info banner and "Search field".
   Every store type sees the same row first: the label, a tooltip and a switch that is off. There is no button, and nobody turns the badge back on.
   Turning the switch on (build/watermark.js decides who sees the card, Master -> Features). One click, no questions, and the switch cannot be undone:
   - a shop that has paid (Subscription, Paid before, Service): the switch becomes the green "Removed" badge at once, no chat
   - Trial and Free (never paid): the chat opens with the shop's message, a moment later the badge is removed, the support team confirms in the chat
     and asks if there is anything else to help with or any feedback (the same way "Enable" on the Features page hands over to the chat); the switch becomes "Removed".
     Whether a CSE is online does not change anything: the message is there for a CSE to follow up on later
   The card follows the demo bar (Store, Badge) and Master's Save through FindterWatermark.onChange. */
(() => {
  'use strict';
  const host = document.querySelector('[data-wm-card]'), WM = window.FindterWatermark, S = window.__shell;
  if (!host || !WM) return;
  const TITLE = 'Remove “Powered by Findter” badge';
  const TIP = 'Hides the “Powered by Findter” text under the search suggestions on your storefront.';
  const ICON_INFO = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10 14a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Z"></path><path d="M9 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"></path><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"></path></svg>';
  const CARD = '<div class="Polaris-ShadowBevel" style="--pc-shadow-bevel-z-index: 32; --pc-shadow-bevel-content-xs: &quot;&quot;; --pc-shadow-bevel-box-shadow-xs: var(--p-shadow-100); --pc-shadow-bevel-border-radius-xs: var(--p-border-radius-300);"><div class="Polaris-Box" style="--pc-box-background: var(--p-color-bg-surface); --pc-box-min-height: 100%; --pc-box-overflow-x: visible; --pc-box-overflow-y: visible; --pc-box-padding-block-start-xs: var(--p-space-400); --pc-box-padding-block-end-xs: var(--p-space-400); --pc-box-padding-inline-start-xs: var(--p-space-400); --pc-box-padding-inline-end-xs: var(--p-space-400);"><div class="Polaris-BlockStack" style="--pc-block-stack-order: column; --pc-block-stack-gap-xs: var(--p-space-200);">';
  const label = '<span class="wm-label"><span id="wm-label">' + TITLE + '</span><span class="mf-tip" tabindex="0" role="img" aria-label="About this setting"><span class="Polaris-Icon Polaris-Icon--toneSubdued">' + ICON_INFO + '</span><span class="mf-tip__bubble" role="tooltip">' + TIP + '</span></span></span>';

  let pending = false, timer = 0;                                                     // the switch is on and the chat has not confirmed the removal yet
  function render() {
    const show = WM.cardShown(); host.hidden = !show; if (!show) { host.textContent = ''; return; }
    const removed = WM.removed(); if (removed) pending = false;
    const control = removed ? '<span class="wm-badge">Removed</span>'
      : '<input type="checkbox" class="pg-switch" role="switch" data-wm-switch aria-labelledby="wm-label"' + (pending ? ' checked' : '') + '>';
    host.innerHTML = CARD + '<div class="wm-row">' + label + control + '</div></div></div></div>';
  }
  function removeViaChat() {                                               // the shop's message, a moment of loading, then the removal and the support team's confirmation
    pending = true;
    if (!S) { WM.setRemoved(true); return; }
    S.toggleChat(true); S.sendChat('Hi, I would like to remove the “Powered by Findter” badge from my storefront.');
    timer = setTimeout(() => {
      pending = false; WM.setRemoved(true);
      S.replyChat('I have already removed the “Powered by Findter” badge from your storefront. Is there anything else I can help you with, or any feedback you would like to share?');
    }, 1200);
  }
  host.addEventListener('change', e => {
    if (!e.target.matches('[data-wm-switch]')) return;
    if (pending) { e.target.checked = true; return; }                      // one request at a time: the removal is already on its way, nothing is sent twice
    if (!e.target.checked) return;
    if (WM.hasPaid()) { WM.setRemoved(true); if (S) S.toast('The badge is removed from your storefront'); return; }
    removeViaChat();
  });
  window.addEventListener('findter:demo-reset', () => { pending = false; clearTimeout(timer); });   // the demo bar's Reset: start over
  WM.onChange(render); render();
})();
