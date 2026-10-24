/**
 * Prepares private extension directories by copying builds and applying manifest and script overrides.
 */

import { existsSync } from 'node:fs';
import { cp, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveExtensionLocale } from './i18n.js';
import { wrapServiceWorkerInitScript } from './init-script.js';

type PreparationOptions = {
  locale?: string;
  initScriptContent?: string;
};

/**
 * A private prepared directory owned by one extension instance.
 */
export class PreparedExtensionDir {
  // Extension directory created under the system temp directory for installation and upgrades.
  path = '';
  // Absolute path to the original build being prepared.
  private sourcePath!: string;
  // Original manifest modified for the prepared build.
  private manifest!: chrome.runtime.ManifestV3;

  /**
   * Replaces the private directory contents with the supplied extension build.
   */
  async prepare(
    extensionPath: string,
    manifest: chrome.runtime.ManifestV3,
    options: PreparationOptions = {},
  ) {
    this.sourcePath = resolve(extensionPath);
    this.manifest = structuredClone(manifest);
    this.path = await this.createTargetPath();
    await this.clearContents();
    await this.copyResources();
    await this.handleLocales(options.locale);
    await this.handleInitScript(options.initScriptContent);
    await this.writeManifest();
    return this;
  }

  /**
   * Removes the private extension directory when one has been created.
   */
  async cleanup() {
    if (!this.path) return;
    await rm(this.path, { recursive: true, force: true });
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
    await wrapServiceWorkerInitScript(this.path, this.manifest, initScriptContent);
  }

  private async writeManifest() {
    await writeFile(
      join(this.path, 'manifest.json'),
      `${JSON.stringify(this.manifest, null, 2)}\n`,
    );
  }

  private async createTargetPath() {
    return this.path || (await mkdtemp(join(tmpdir(), 'playwright-webext-')));
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
