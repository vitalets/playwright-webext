/**
 * Records first installation, opens the welcome page, and registers the uninstall page.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    void chrome.storage.local.set({ installationDate: new Date().toISOString() });
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome.html') });
  }
});

void chrome.runtime.setUninstallURL('https://example.com/uninstall');
