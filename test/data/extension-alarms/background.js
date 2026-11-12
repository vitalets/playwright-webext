globalThis.alarmEvents = [];
chrome.alarms.onAlarm.addListener((alarm) => {
  globalThis.alarmEvents.push({
    name: alarm.name,
    scheduledTime: alarm.scheduledTime,
    now: Date.now(),
  });
});
chrome.alarms.create('my-alarm', { delayInMinutes: 60 });
