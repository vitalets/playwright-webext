/**
 * Finds browser context pages by URL, URL pattern, or a custom predicate.
 */

import type { BrowserContext, Page } from '@playwright/test';
import { poll, type PollOptions } from './poll.js';

export type PagePredicate = (page: Page) => boolean | Promise<boolean>;

/**
 * Omits pattern types when the consumer's global declarations do not provide URLPattern.
 */
type NativeURLPattern = typeof globalThis extends { URLPattern: { prototype: infer T } }
  ? T
  : never;
type NativeURLPatternInit = typeof globalThis extends {
  URLPattern: new (...args: infer Args) => unknown;
}
  ? Exclude<Args[0], string | URL | undefined>
  : never;

export type PageMatcher = string | RegExp | NativeURLPattern | NativeURLPatternInit | PagePredicate;

/**
 * Polls existing and newly opened pages until a URL, pattern, or predicate matches.
 */
export async function pollForPage(
  context: BrowserContext,
  urlOrPredicate: PageMatcher,
  options?: PollOptions,
) {
  const predicate = createPagePredicate(urlOrPredicate);
  const page = await poll(async () => {
    for (const page of context.pages()) {
      if (await predicate(page)) return page;
    }
  }, options);
  return page!;
}

function createPagePredicate(matcher: PageMatcher): PagePredicate {
  if (typeof matcher === 'function') return matcher;
  if (typeof matcher === 'string') {
    const targetUrl = new URL(matcher).href;
    return (page) => page.url() === targetUrl;
  }
  if (matcher instanceof RegExp) {
    return (page) => {
      matcher.lastIndex = 0;
      return matcher.test(page.url());
    };
  }
  const pattern = createURLPattern(matcher);
  return (page) => pattern.test(page.url());
}

function createURLPattern(matcher: NativeURLPattern | NativeURLPatternInit) {
  if (typeof globalThis.URLPattern !== 'function') {
    throw new Error('URL pattern matching requires global URLPattern support (Node.js 24+).');
  }
  return matcher instanceof globalThis.URLPattern ? matcher : new globalThis.URLPattern(matcher);
}
