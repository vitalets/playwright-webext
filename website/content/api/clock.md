---
title: ExtensionClock
toc_max_heading_level: 3
description: Control fake time in extension pages and service workers.
---

`extension.clock` controls fake time in the service worker and all pages and frames in
`extension.context`. Enable it with [`extensionClock`](../basics/configuration.md#extensionclock)
before installation. Calls in an unsupported mode throw a configuration error. See [Fake timers](../guides/fake-timers.md) for examples and lifecycle behavior.

## Methods

### pause

Stops automatic advancement at each clock's current fake date. Native worker APIs excluded by
`workerFake` keep running. Requires `mode: 'full-control'`.

#### Usage

```ts
await extension.clock.pause();
```

#### Returns

`Promise<void>`

### resume

Resumes automatic advancement. Fake timers stay installed. Requires `mode: 'full-control'`.

#### Usage

```ts
await extension.clock.resume();
```

#### Returns

`Promise<void>`

### runFor

Advances time and runs due timers, including repeated intervals. Preserves the running or paused mode. Requires `mode: 'full-control'`.
Use assertions to wait for resulting asynchronous work to finish. Requires `mode: 'full-control'`.

#### Usage

```ts
await extension.clock.runFor(5000);
await extension.clock.runFor('01:00');
```

#### Arguments

- `ticks` (`number | string`) — Non-negative, finite milliseconds or a duration string in
  `ss`, `mm:ss`, or `hh:mm:ss` format. Invalid values throw.

#### Returns

`Promise<void>`

### setFixedTime

Changes the fixed date while timers keep running. Requires `mode: 'fixed-time'` (the default).

#### Usage

```ts
await extension.clock.setFixedTime('2026-02-01T00:00:00Z');
```

#### Arguments

- `time` (`number | string | Date`) — Unix timestamp in milliseconds, date string, or `Date`.
  Invalid dates throw.

#### Returns

`Promise<void>`

### setSystemTime

Changes the date without firing timers or changing their remaining delays. Preserves the running
or paused mode. Requires `mode: 'full-control'`.

#### Usage

```ts
await extension.clock.setSystemTime('2026-02-01T00:00:00Z');
```

#### Arguments

- `time` (`number | string | Date`) — Unix timestamp in milliseconds, date string, or `Date`.
  Invalid dates throw.

#### Returns

`Promise<void>`
