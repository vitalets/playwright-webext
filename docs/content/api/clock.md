---
title: ExtensionClock
toc_max_heading_level: 3
description: Control fake time in extension pages and service workers.
---

`extension.clock` controls fake time in the service worker and all pages and frames in
`extension.context`. Enable it with the [`extensionClock`](../basics/configuration.md#extensionclock) option.

The methods follow [Playwright's Clock API](https://playwright.dev/docs/api/class-clock),
with browser-local date parsing as described below. See [Fake timers](../guides/fake-timers.md)
for examples and lifecycle behavior. There is no public `clock.install()` method: configure `timers: true`
to install full timer mocking before extension code runs.

## Date inputs

`setFixedTime()`, `setSystemTime()`, and `pauseAt()` accept a `number`, `string`, or `Date`.
Numbers are Unix timestamps in milliseconds. Invalid dates throw.
Date-time strings without a timezone use the browser's timezone, just like
[`extensionClock.time`](../basics/configuration.md#extensionclock).
Date-only strings in `YYYY-MM-DD` format use midnight in the browser's timezone.
Strings with `Z` or an offset identify an absolute instant.

Time-only strings in `HH:mm` format, such as `'13:00'`, use the current browser clock date
and reset seconds and milliseconds to zero. The target is resolved once and applied to both
page and worker clocks. It never rolls forward to tomorrow automatically.

## Methods

All methods return `Promise<void>`.

### setFixedTime

Fixes the reported date without changing timer scheduling or the paused state.
Native timers keep running when timer mocking is disabled.
Throws when `alarms: true`; use `paused: true` to freeze the clock instead.

```ts
await extension.clock.setFixedTime('2026-02-01T00:00:00');
await extension.clock.setFixedTime('13:00');
```

See [Playwright’s `clock.setFixedTime()` documentation](https://playwright.dev/docs/api/class-clock#clock-set-fixed-time).

### setSystemTime

Changes the system date without firing timers or changing their remaining delays.
Clears a previously fixed date; dates then advance with the clock, unless it is paused.
Works with or without timer mocking. Moving backward is allowed.

Emulated alarm deadlines remain unchanged. No alarms are delivered during this operation;
overdue alarms become eligible at the next scheduler opportunity, or the next explicit
advancement when paused.

```ts
await extension.clock.setSystemTime('2026-02-01T00:00:00');
```

See [Playwright’s `clock.setSystemTime()` documentation](https://playwright.dev/docs/api/class-clock#clock-set-system-time).

### fastForward

Jumps forward by a duration, firing each due timer at most once.
Requires `timers: true` or `alarms: true` and preserves the running or paused state.

```ts
await extension.clock.fastForward('01:00');
```

Emulated alarms also fire at most once. Repeating alarms skip missed occurrences while
preserving their original cadence; newly created alarms wait for a subsequent advancement
or automatic scheduler opportunity.

The duration accepts non-negative, finite milliseconds or a string in `ss`, `mm:ss`, or
`hh:mm:ss` format. For example, a one-second interval runs once during `fastForward(60_000)`.

See [Playwright’s `clock.fastForward()` documentation](https://playwright.dev/docs/api/class-clock#clock-fast-forward).

### runFor

Advances by a duration, executing all due callbacks at their scheduled times.
Requires `timers: true` or `alarms: true` and preserves the running or paused state.
Accepts the same duration inputs as `fastForward()`.

```ts
await extension.clock.runFor(5000);
```

Emulated alarms follow the same chronological advancement.

A one-second interval runs 60 times during `runFor(60_000)`. Timers scheduled by callbacks
can run within the remaining duration.

Use assertions to wait for resulting asynchronous work. Each execution context has its own
timer queue, so callback ordering across pages and the worker is not guaranteed.

See [Playwright’s `clock.runFor()` documentation](https://playwright.dev/docs/api/class-clock#clock-run-for).

### pauseAt

Jumps to the target date, firing each due timer at most once, then pauses automatic advancement.
Requires `timers: true` or `alarms: true`. A target earlier than the current clock time throws, including
an earlier time-only target on the same day.

```ts
await extension.clock.pauseAt('2026-02-01T13:00:00');
```

Configure `paused: true` to start paused before extension code executes.

See [Playwright’s `clock.pauseAt()` documentation](https://playwright.dev/docs/api/class-clock#clock-pause-at).

### resume

Resumes automatic advancement without restoring native timers. Requires `timers: true` or `alarms: true`.

```ts
await extension.clock.resume();
```

See [Playwright’s `clock.resume()` documentation](https://playwright.dev/docs/api/class-clock#clock-resume).
