/**
 * Owns one extension instance's prepared directory throughout installation and upgrades.
 */

import { existsSync } from 'node:fs';
import { cp, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ExtensionDirCache } from './extension-dir-cache.js';
import { resolveExtensionLocale } from './i18n.js';
import { addInitScriptToServiceWorker } from './init-script.js';

export type PreparedDirRequest = {
  // Identifies the build and supplies the files to copy.
  sourcePath: string;
  // Reuses the already-loaded manifest to avoid another read; preparation clones it.
  manifest: chrome.runtime.ManifestV3;
  // Selects the translation catalog; default behavior is normalized to undefined.
  locale?: string;
  // Supplies the service-worker initialization and distinguishes prepared variants.
  initScriptContent?: string;
};

/**
 * Manages directory creation, replacement, and cleanup with optional worker-cache reuse.
 */
export class PreparedExtensionDir {
  // Extension directory created under the system temp directory for installation and upgrades.
  path = '';
  private modified = false;
  // Absolute path to the original build being prepared.
  private sourcePath!: string;
  // Original manifest modified for the prepared build.
  private manifest!: chrome.runtime.ManifestV3;

  constructor(private readonly cache?: ExtensionDirCache) {}

  async create(request: PreparedDirRequest) {
    if (this.cache) {
      // Reuse the worker's prepared build for initial installation when caching is available.
      this.path = await this.cache.acquireDir(request);
    } else {
      // Without a cache, prepare the owned directory directly.
      this.path ||= await mkdtemp(join(tmpdir(), 'playwright-webext-'));
      await this.prepare(request);
    }
    return this.path;
  }

  async replace(request: PreparedDirRequest) {
    // Upgrades replace files at the existing path to preserve extension identity.
    // Mark it before preparation so failed upgrades are also discarded during cleanup.
    this.modified = true;
    await this.prepare(request);
  }

  async cleanup() {
    if (!this.path) return;
    if (!this.cache) return rm(this.path, { recursive: true, force: true });
    if (this.modified) await this.cache.removeDir(this.path);
  }

  private async prepare(request: PreparedDirRequest) {
    this.sourcePath = resolve(request.sourcePath);
    this.manifest = structuredClone(request.manifest);
    await this.clearContents();
    await this.copyResources();
    await this.handleLocales(request.locale);
    await this.handleInitScript(request.initScriptContent);
    await this.writeManifest();
  }

  private async copyResources() {
    const exclude = [
      // Chrome can generate _metadata after extension installation,
      // so we exclude it from the copy to keep each installation's metadata private.
      join(this.sourcePath, '_metadata'),
      // handleLocales copies all catalogs or only the requested locale.
      join(this.sourcePath, '_locales'),
    ];
    await cp(this.sourcePath, this.path, {
      recursive: true,
      // Copy symlink targets so resources resolve inside the temporary directory.
      dereference: true,
      filter: (path) => !exclude.includes(path),
    });
  }

  private async handleLocales(requestedLocale: string | undefined) {
    const sourceLocales = join(this.sourcePath, '_locales');
    const targetLocales = join(this.path, '_locales');
    if (requestedLocale) {
      const locale = await resolveExtensionLocale(this.sourcePath, requestedLocale);
      await cp(join(sourceLocales, locale), join(targetLocales, locale), {
        recursive: true,
        dereference: true,
      });
      this.manifest.default_locale = locale;
      return;
    }

    if (existsSync(sourceLocales)) {
      await cp(sourceLocales, targetLocales, { recursive: true, dereference: true });
    }
  }

  private async handleInitScript(initScriptContent: string | undefined) {
    if (!initScriptContent || !this.manifest.background?.service_worker) return;
    await addInitScriptToServiceWorker(this.path, this.manifest, initScriptContent);
  }

  private async writeManifest() {
    await writeFile(
      join(this.path, 'manifest.json'),
      `${JSON.stringify(this.manifest, null, 2)}\n`,
    );
  }

  /**
   * Empties the private directory while preserving its path for extension upgrades.
   */
  private async clearContents() {
    const entries = await readdir(this.path);
    await Promise.all(
      entries.map((entry) => rm(join(this.path, entry), { recursive: true, force: true })),
    );
  }
}
