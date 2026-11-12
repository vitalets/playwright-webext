importScripts('./dependency.js');
chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({ language: globalThis.startupLanguage });
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  respond(globalThis.startupLanguage);
});
