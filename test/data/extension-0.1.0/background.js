chrome.runtime.onInstalled.addListener((details) => {
  void chrome.storage.local.set({
    onInstalled: {
      reason: details.reason,
      previousVersion: details.previousVersion,
    },
  });
});
