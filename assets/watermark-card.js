/* Filter & product grid design > Filter design: the "Remove “Powered by Findter” badge" row, at the top of the Filter layout card under its description (between the description and "Desktop").
   Every store type that sees it gets the same row: the label, a tooltip and a text button "Remove". Nobody turns the badge back on.
   Clicking Remove (build/watermark.js decides who sees it, Master -> Features) opens the chat for every store type, one click, no questions:
   the chat opens with the shop's message and the button reads "Removing…" for about a second, then the badge is removed, the support team confirms in the chat and asks if there is
   anything else to help with (the same way "Enable" on the Features page hands over to the chat); the button becomes "Removed". The removal does not depend on the chat.
   Whether a CSE is online does not change anything: the message is there for a CSE to follow up on later.
   The row follows the demo bar (Store, Badge) and Master's Save through FindterWatermark.onChange. */
(() => {
  'use strict';
  const host = document.querySelector('[data-wm-card]'), WM = window.FindterWatermark, S = window.__shell;
  if (!host || !WM) return;
  const TITLE = 'Remove “Powered by Findter” badge';
  const TIP = 'Our team will remove the badge for you via live chat.';
  const ICON_INFO = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10 14a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Z"></path><path d="M9 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"></path><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"></path></svg>';
  const label = '<span class="wm-label"><span id="wm-label">' + TITLE + '</span><span class="mf-tip" tabindex="0" role="img" aria-label="About this setting"><span class="Polaris-Icon Polaris-Icon--toneSubdued">' + ICON_INFO + '</span><span class="mf-tip__bubble" role="tooltip">' + TIP + '</span></span></span>';
  const BADGE = '<span class="wm-badge Polaris-Badge Polaris-Badge--toneSuccess"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Removed</span></span>';

  let pending = false, timer = 0;                                                     // Remove was clicked and the chat has not confirmed the removal yet
  function render() {
    const show = WM.cardShown(); host.hidden = !show; if (!show) { host.textContent = ''; return; }
    const removed = WM.removed(); if (removed) pending = false;
    const control = removed ? BADGE
      : '<button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" data-wm-btn aria-label="' + TITLE + '"' + (pending ? ' aria-disabled="true" aria-busy="true"' : '') + '><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">' + (pending ? 'Removing…' : 'Remove') + '</span></button>';
    host.innerHTML = '<div class="wm-row">' + label + control + '</div>';
  }
  function removeViaChat() {                                               // the shop's message, a moment of loading, then the removal and the support team's confirmation
    pending = true; render();
    if (!S) { WM.setRemoved(true); return; }
    S.toggleChat(true); S.sendChat('Hi, please remove the “Powered by Findter” badge from my storefront.');
    timer = setTimeout(() => {
      pending = false; WM.setRemoved(true);
      S.replyChat('We’ve removed the badge. Could you refresh your storefront and confirm it’s no longer showing?');
    }, 1200);
  }
  host.addEventListener('click', e => {
    if (!e.target.closest('[data-wm-btn]')) return;
    if (pending) return;                                                   // one request at a time: the removal is already on its way, nothing is sent twice
    removeViaChat();
  });
  window.addEventListener('findter:demo-reset', () => { pending = false; clearTimeout(timer); render(); });   // the demo bar's Reset: start over
  WM.onChange(render); render();
})();
