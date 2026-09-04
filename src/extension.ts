/// <reference types="chrome" preserve="true" />

import type { BrowserContext, Worker } from '@playwright/test';
import { throwIf } from './utils.js';

type ExtensionOptions = {
  context: BrowserContext;
  id: string;
  manifest: chrome.runtime.ManifestV3;
  worker: Worker;
};

export class Extension {
  private readonly options: ExtensionOptions;

  private constructor(options: ExtensionOptions) {
    this.options = options;
  }

  get context(): BrowserContext {
    return this.options.context;
  }

  get id(): string {
    return this.options.id;
  }

  get manifest(): chrome.runtime.ManifestV3 {
    return this.options.manifest;
  }

  get worker(): Worker {
    return this.options.worker;
  }

  /**
   * Returns a fully qualified URL for a resource inside the extension.
   *
   * The path may be passed with or without a leading slash. An empty path
   * returns the extension root URL.
   *
   * This intentionally does not emulate dynamic URLs created by
   * web_accessible_resources entries with use_dynamic_url.
   *
   * @param path Path relative to the extension root.
   */
  getURL(path = ''): string {
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return new URL(`chrome-extension://${this.id}${suffix}`).href;
  }

  static async create(
    context: BrowserContext,
    timeout: number,
  ): Promise<Extension> {
    const worker = await waitForWorker(context, timeout);
    const workerUrl = assertBackgroundWorker(worker);

    const manifest = await worker.evaluate(
      () => chrome.runtime.getManifest(),
    ) as chrome.runtime.ManifestV3;

    return new Extension({
      context,
      id: workerUrl.hostname,
      manifest,
      worker,
    });
  }
}

export async function waitForWorker(
  context: BrowserContext,
  timeout: number,
): Promise<Worker> {
  const worker = context.serviceWorkers().find(isExtensionWorker);
  return worker ?? context.waitForEvent('serviceworker', {
    predicate: isExtensionWorker,
    timeout,
  });
}

function isExtensionWorker(worker: Worker): boolean {
  return worker.url().startsWith('chrome-extension://');
}

function assertBackgroundWorker(worker: Worker): URL {
  const workerUrl = new URL(worker.url());
  throwIf(
    workerUrl.protocol !== 'chrome-extension:' || !workerUrl.hostname,
    `Expected a Chrome extension service worker, received: ${worker.url()}`,
  );
  return workerUrl;
}
