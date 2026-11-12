import { startupLanguage } from './language.js';

void chrome.runtime.setUninstallURL('https://example.com/uninstalled');

chrome.runtime.onInstalled.addListener((details) => {
  void chrome.storage.local.set({
    onInstalled: {
      reason: details.reason,
      previousVersion: details.previousVersion,
    },
  });
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message === 'language') respond(startupLanguage);
});
