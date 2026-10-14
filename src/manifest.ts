/**
 * Reads Chrome's resolved manifest and detects service worker declarations in manifest files.
 */

import { readFile } from 'node:fs/promises';
import type { BrowserContext, Worker } from '@playwright/test';

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

/**
 * Detects a service worker declaration by looking for its quoted key in the manifest file.
 */
export async function hasServiceWorker(manifestPath: string) {
  const source = await readFile(manifestPath, 'utf8');
  return source.includes('"service_worker"');
}
