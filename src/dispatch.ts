/**
 * Dispatches synthetic Chrome events in an extension service worker.
 */

import type { Worker } from '@playwright/test';

/**
 * Bounds traversal to namespace paths such as storage.local.onChanged.
 */
type EventEntries<
  T,
  Prefix extends string = '',
  Depth extends unknown[] = [],
> = Depth['length'] extends 3
  ? never
  : {
      [K in keyof T & string]: T[K] extends chrome.events.Event<infer Listener>
        ? { name: `${Prefix}${K}`; args: Parameters<Listener> }
        : T[K] extends (...args: never[]) => unknown
          ? never
          : T[K] extends object
            ? EventEntries<T[K], `${Prefix}${K}.`, [...Depth, unknown]>
            : never;
    }[keyof T & string];

type ChromeEvent = EventEntries<typeof chrome>;

export type ExtensionEventName = ChromeEvent['name'];

export type ExtensionEventArgs<Name extends ExtensionEventName> = Extract<
  ChromeEvent,
  { name: Name }
>['args'];

/**
 * Invokes Chromium's internal event dispatcher without awaiting listener work or retrying.
 */
export async function dispatch(worker: Worker, name: string, args: unknown[]) {
  await worker.evaluate(
    ({ name, args }) => {
      let event: unknown = chrome;
      for (const part of name.split('.')) {
        event = (event as Record<string, unknown> | undefined)?.[part];
      }
      const dispatchable = event as { dispatch?: (...args: unknown[]) => void } | undefined;
      if (typeof dispatchable?.dispatch !== 'function') {
        throw new Error(`Chrome event "${name}" is unavailable or does not support dispatch.`);
      }
      dispatchable.dispatch(...args);
    },
    { name, args },
  );
}
