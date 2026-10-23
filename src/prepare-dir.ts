/**
 * Prepares private extension directories by linking unchanged resources and writing overrides.
 */

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { resolveExtensionLocale } from './i18n.js';
import { wrapServiceWorkerInitScript } from './init-script.js';
import { symlink, symlinkDirEntries } from './utils/symlink.js';

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
  // Paths relative to sourcePath excluded from bulk linking.
  private handledPaths: string[] = [];

  /**
   * Replaces the private directory contents with the supplied extension build.
   */
  async prepare(extensionPath: string, options: PreparationOptions = {}) {
    this.sourcePath = resolve(extensionPath);
    this.handledPaths = [];
    this.manifest = await this.readManifest();
    this.path = await this.createTargetPath();
    await this.clearContents();
    await this.handleLocale(options.locale);
    await this.handleInitScript(options.initScriptContent);
    await this.writeManifest();
    await this.linkResources();
    return this;
  }

  /**
   * Removes the private extension directory when one has been created.
   */
  async cleanup() {
    if (!this.path) return;
    await rm(this.path, { recursive: true, force: true });
  }

  private async handleLocale(requestedLocale: string | undefined) {
    if (!requestedLocale) return;
    const locale = await resolveExtensionLocale(this.sourcePath, requestedLocale);
    const localesDir = join(this.path, '_locales');
    await mkdir(localesDir);
    await symlink(join(this.sourcePath, '_locales', locale), join(localesDir, locale));
    this.manifest.default_locale = locale;
    this.handledPaths.push('_locales');
  }

  private async handleInitScript(initScriptContent: string | undefined) {
    if (!initScriptContent) return;
    const workerPath = this.manifest.background?.service_worker;
    if (!workerPath) {
      throw new Error('extensionInitScript requires a background service worker.');
    }
    const targetWorkerPath = join(this.path, workerPath);
    await mkdir(dirname(targetWorkerPath), { recursive: true });
    await symlink(join(this.sourcePath, workerPath), targetWorkerPath);
    await wrapServiceWorkerInitScript(this.path, this.manifest, initScriptContent);
    this.handledPaths.push(workerPath);
  }

  private async linkResources() {
    await symlinkDirEntries(this.sourcePath, this.path, this.handledPaths);
  }

  private async readManifest() {
    return JSON.parse(
      await readFile(join(this.sourcePath, 'manifest.json'), 'utf8'),
    ) as chrome.runtime.ManifestV3;
  }

  private async writeManifest() {
    await writeFile(
      join(this.path, 'manifest.json'),
      `${JSON.stringify(this.manifest, null, 2)}\n`,
    );
    this.handledPaths.push('manifest.json');
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
