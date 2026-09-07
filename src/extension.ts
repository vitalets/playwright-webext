/**
 * Represents a running browser extension and exposes its Playwright runtime handles.
 */

/// <reference types="chrome" preserve="true" />

import type { BrowserContext, Worker } from '@playwright/test';
import { ExtensionDetailsPage } from './details-page.js';

/**
 * Provides access to a loaded extension's context, metadata, worker, and resource URLs.
 */
export class Extension {
  readonly context: BrowserContext;
  #worker?: Worker;
  id!: string;
  manifest!: chrome.runtime.ManifestV3;

  /**
   * Creates an extension facade for the supplied browser context.
   */
  constructor(context: BrowserContext) {
    this.context = context;
    this.autoAttachToWorker();
  }

  get worker(): Worker {
    if (!this.#worker) {
      throw new Error('Extension service worker is not yet available.');
    }

    return this.#worker;
  }

  /**
   * Waits for this extension's service worker and refreshes its runtime metadata.
   * Fails if the worker closes or is replaced during initialization.
   */
  async waitForReady(timeout = 5_000): Promise<void> {
    const worker = await waitForExtensionWorker(this.context, timeout);
    this.attachToWorker(worker);
    this.populateExtensionId(worker);
    await this.populateManifest();
  }

  /**
   * Returns a fully qualified URL for a resource inside the extension.
   *
   * This intentionally does not emulate dynamic URLs created by
   * web_accessible_resources entries with use_dynamic_url.
   */
  getURL(path = ''): string {
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return new URL(`chrome-extension://${this.id}${suffix}`).href;
  }

  /**
   * Opens Chromium's management details for this extension.
   */
  async openDetailsPage(): Promise<ExtensionDetailsPage> {
    const page = await this.context.newPage();
    await page.goto(`chrome://extensions/?id=${this.id}`);
    return new ExtensionDetailsPage(page);
  }

  private autoAttachToWorker(): void {
    this.context.on('serviceworker', (worker) => {
      if (isExtensionWorker(worker)) {
        this.attachToWorker(worker);
      }
    });
  }

  private attachToWorker(worker: Worker): void {
    if (this.#worker === worker) return;
    this.#worker = worker;
    worker.once('close', () => {
      if (this.#worker === worker) {
        this.#worker = undefined;
      }
    });
  }

  private populateExtensionId(worker: Worker): void {
    this.id = new URL(worker.url()).hostname;
  }

  private async populateManifest(): Promise<void> {
    const manifest = await this.worker.evaluate(() => chrome.runtime.getManifest());
    // potentially worker can re-start during .evaluate call,
    // then we should check: if (this.#worker !== worker) { ... }
    this.manifest = manifest as chrome.runtime.ManifestV3;
  }
}

/**
 * Returns the extension service worker, waiting for it when necessary.
 */
async function waitForExtensionWorker(context: BrowserContext, timeout: number): Promise<Worker> {
  const worker = context.serviceWorkers().find(isExtensionWorker);
  return (
    worker ??
    context.waitForEvent('serviceworker', {
      predicate: isExtensionWorker,
      timeout,
    })
  );
}

function isExtensionWorker(worker: Worker): boolean {
  return worker.url().startsWith('chrome-extension://');
}
