// DataTrace browser extension — service worker.
// Responsibilities:
// 1. Register a context-menu item so the user can trace any selected text.
// 2. Make the toolbar icon open the side panel (one surface, no popup).
// 3. Hand the selected claim to the side panel via session storage.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "datatrace-trace-selection",
    title: "Trace this claim with DataTrace",
    contexts: ["selection"],
  });
  // Clicking the toolbar icon opens the side panel instead of a popup.
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "datatrace-trace-selection") return;
  const claim = (info.selectionText || "").trim();
  if (!claim) return;
  // Stage the claim so the side panel picks it up on open.
  await chrome.storage.session.set({ pendingClaim: claim });
  if (tab && tab.windowId !== undefined) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (_) {
      // Some Chrome versions require the user to open the panel manually.
      // The staged claim will still auto-run when they open it.
    }
  }
});