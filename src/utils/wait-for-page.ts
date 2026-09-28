/**
 * Finds browser context pages by URL or a custom predicate.
 */

import type { BrowserContext, Page } from '@playwright/test';
import { waitUntil, type WaitUntilOptions } from './wait-until.js';

export type PagePredicate = (page: Page) => boolean | Promise<boolean>;

/**
 * Polls existing and newly opened pages until an absolute URL or predicate matches.
 */
export async function waitForPage(
  context: BrowserContext,
  urlOrPredicate: string | PagePredicate,
  options?: WaitUntilOptions,
) {
  const targetUrl = typeof urlOrPredicate === 'string' ? new URL(urlOrPredicate).href : undefined;
  const predicate =
    typeof urlOrPredicate === 'function'
      ? urlOrPredicate
      : (page: Page) => page.url() === targetUrl;
  const page = await waitUntil(async () => {
    for (const page of context.pages()) {
      if (await predicate(page)) return page;
    }
  }, options);
  return page!;
}
