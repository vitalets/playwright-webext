---
status: accepted
---

# Open the popup document in a regular tab

`Extension.openPopup()` opens the Popup Document in a regular browser tab and returns its
Playwright `Page`. Chromium's native `chrome.action.openPopup()` successfully opens the real
toolbar popup in a browser with the extension loaded, but that browser-owned surface does not
appear in `BrowserContext.pages()` and is not interactable as a Playwright `Page`. The regular tab
therefore favors reliable UI interaction over exact toolbar-popup fidelity.

## Consequences

The opened document has a normal tab viewport, focus, history, and lifecycle. It does not emulate
the native popup's sizing, dismissal, reload behavior, toolbar-action user gesture, or `activeTab`
grant. Active-tab queries select the popup document's own tab, and messages sent from it include
`sender.tab` and `sender.tab.id`; messages sent from the native popup normally do not.
