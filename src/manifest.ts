/**
 * Reads source manifests from disk and resolved manifests from Chrome.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BrowserContext, Worker } from '@playwright/test';

/**
 * Holds a source manifest loaded from an extension directory.
 */
export class Manifest {
  #data?: chrome.runtime.ManifestV3;

  /**
   * Returns the source manifest for preparing a private extension copy.
   */
  get data() {
    if (!this.#data) throw new Error('Manifest is not loaded.');
    return this.#data;
  }

  /**
   * Whether the source declares a background worker; undefined before loading.
   */
  get hasServiceWorker() {
    return this.#data ? Boolean(this.#data.background?.service_worker) : undefined;
  }

  /**
   * Whether the source declares static DNR rulesets, including disabled ones.
   */
  get hasDnr() {
    return this.#data
      ? Boolean(this.#data.declarative_net_request?.rule_resources?.length)
      : undefined;
  }

  /**
   * Loads or reloads the source manifest from the provided extension directory.
   */
  async load(directory: string) {
    // Chrome accepts some manifest syntax that JSON.parse rejects.
    // We currently require source manifests to be valid JSON.
    this.#data = JSON.parse(
      await readFile(join(directory, 'manifest.json'), 'utf8'),
    ) as chrome.runtime.ManifestV3;
  }
}

/**
 * Reads the loaded manifest from a temporary tab and closes it on success or failure.
 */
export async function readManifestFromTab(context: BrowserContext, id: string) {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${id}/manifest.json`);
    return await page.evaluate(() => chrome.runtime.getManifest() as chrome.runtime.ManifestV3);
  } finally {
    await page.close();
  }
}

/**
 * Reads the loaded manifest from an available extension service worker.
 */
export async function readManifestFromWorker(worker: Worker) {
  return await worker.evaluate(() => chrome.runtime.getManifest() as chrome.runtime.ManifestV3);
}
