---
title: ExtensionClock
toc_max_heading_level: 3
description: Control fake time in extension pages and service workers.
---

`extension.clock` controls fake time in the service worker and all pages and frames in
`extension.context`. Enable it with [`extensionClock`](../basics/configuration.md#extensionclock)
before installation. There is no public `clock.install()` method: configure `timers: true`
to install full timer mocking before extension code runs.

The methods follow [Playwright's Clock API](https://playwright.dev/docs/api/class-clock),
with browser-local date parsing as described below. See [Fake timers](../guides/fake-timers.md)
for examples and lifecycle behavior.

## Date inputs

`setFixedTime()`, `setSystemTime()`, and `pauseAt()` accept a `number`, `string`, or `Date`.
Numbers are Unix timestamps in milliseconds. Invalid dates throw.
Date-time strings without a timezone use the browser's timezone, just like
[`extensionClock.time`](../basics/configuration.md#extensionclock).
Strings with `Z` or an offset identify an absolute instant.

Time-only strings in `HH:mm` format, such as `'13:00'`, use the current browser clock date
and reset seconds and milliseconds to zero. The target is resolved once and applied to both
page and worker clocks. It never rolls forward to tomorrow automatically.

## Methods

All methods return `Promise<void>`.

### setFixedTime

See [Playwright’s `clock.setFixedTime()` documentation](https://playwright.dev/docs/api/class-clock#clock-set-fixed-time).

Fixes the reported date without changing timer scheduling or the paused state.
Native timers keep running when timer mocking is disabled.

```ts
await extension.clock.setFixedTime('2026-02-01T00:00:00Z');
await extension.clock.setFixedTime('13:00');
```

### setSystemTime

See [Playwright’s `clock.setSystemTime()` documentation](https://playwright.dev/docs/api/class-clock#clock-set-system-time).

Changes the system date without firing timers or changing their remaining delays.
Clears a previously fixed date; dates then advance with the clock, unless it is paused.
Works with or without timer mocking. Moving backward is allowed.

```ts
await extension.clock.setSystemTime('2026-02-01T00:00:00Z');
```

### fastForward

See [Playwright’s `clock.fastForward()` documentation](https://playwright.dev/docs/api/class-clock#clock-fast-forward).

Jumps forward by a duration, firing each due timer at most once.
Requires `timers: true` and preserves the running or paused state.

```ts
await extension.clock.fastForward('01:00');
```

The duration accepts non-negative, finite milliseconds or a string in `ss`, `mm:ss`, or
`hh:mm:ss` format. For example, a one-second interval runs once during `fastForward(60_000)`.

### runFor

See [Playwright’s `clock.runFor()` documentation](https://playwright.dev/docs/api/class-clock#clock-run-for).

Advances by a duration, executing all due callbacks at their scheduled times.
Requires `timers: true` and preserves the running or paused state.
Accepts the same duration inputs as `fastForward()`.

```ts
await extension.clock.runFor(5000);
```

A one-second interval runs 60 times during `runFor(60_000)`. Timers scheduled by callbacks
can run within the remaining duration.

Use assertions to wait for resulting asynchronous work. Each execution context has its own
timer queue, so callback ordering across pages and the worker is not guaranteed.

### pauseAt

See [Playwright’s `clock.pauseAt()` documentation](https://playwright.dev/docs/api/class-clock#clock-pause-at).

Jumps to the target date, firing each due timer at most once, then pauses automatic advancement.
Requires `timers: true`. A target earlier than the current clock time throws, including
an earlier time-only target on the same day.

```ts
await extension.clock.pauseAt('2026-02-01T13:00:00Z');
```

Configure `paused: true` to start paused before extension code executes.

### resume

See [Playwright’s `clock.resume()` documentation](https://playwright.dev/docs/api/class-clock#clock-resume).

Resumes automatic advancement without restoring native timers. Requires `timers: true`.

```ts
await extension.clock.resume();
```
