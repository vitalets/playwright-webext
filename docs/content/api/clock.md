---
title: ExtensionClock
toc_max_heading_level: 3
description: Control fake time in extension pages and service workers.
---

`extension.clock` controls fake time in the service worker and all pages and frames in
`extension.context`. Enable it with [`extensionClock`](../basics/configuration.md#extensionclock)
before installation. See [Fake timers](../guides/fake-timers.md) for examples and lifecycle behavior.

## Methods

### setTime

Sets the date without firing timers or changing their remaining delays. Preserves whether time is
fixed, paused, or advancing automatically. Moving backward is allowed.

```ts
await extension.clock.setTime('2026-02-01T00:00:00Z');
```

#### Arguments

- `time` (`number | string | Date`) — Unix timestamp in milliseconds, date string, or `Date`.
  Invalid dates throw.

#### Returns

`Promise<void>`

### tick

Advances each clock by a duration, preserving its running or paused state.
With `withTimers: false`, only the fixed date changes; native timers and `performance.now()`
continue on real time. With `withTimers: true`, due mocked timers also execute.

```ts
await extension.clock.tick(5000);
await extension.clock.tick('01:00', { timers: 'all' });
```

#### Arguments

- `duration` (`number | string`) — Non-negative, finite milliseconds or a duration string in
  `ss`, `mm:ss`, or `hh:mm:ss` format. Invalid values throw.
- `options.timers` (`'all' | 'once'`) — Defaults to `'once'`. Jumps to the destination and fires each due timer
  at most once. Use `'all'` to run every due occurrence at its scheduled time.
  Both options have the same effect with `withTimers: false`.

For a one-second interval, `tick(60_000)` runs one callback; `tick(60_000, { timers: 'all' })`
runs 60. Timeouts scheduled by callbacks can run within the remaining duration with `'all'`;
with `'once'`, positive-delay timers scheduled at the destination wait for a later tick.

Use assertions to wait for resulting asynchronous work. Each execution context has its own timer
queue, so callback ordering across pages and the worker is not guaranteed. The `'all'` policy allows
promise callbacks between timer callbacks. With `'once'`, Sinon's worker jump is synchronous and
does not yield between timer callbacks, unlike Playwright's page clock.

#### Returns

`Promise<void>`

### pause

Stops automatic advancement at each clock's current fake date. Requires `withTimers: true`.

```ts
await extension.clock.pause();
```

The paused date depends on when this call executes and can vary between test runs.
Configure `paused: true` to start at an exact date without automatic advancement.

#### Returns

`Promise<void>`

### resume

Resumes automatic advancement without restoring native timers. Requires `withTimers: true`.

```ts
await extension.clock.resume();
```

#### Returns

`Promise<void>`
