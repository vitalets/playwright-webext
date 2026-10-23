/**
 * Prepares private extension directories by linking unchanged resources and writing overrides.
 */

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix, resolve } from 'node:path';
import { resolveExtensionLocale } from './i18n.js';
import { wrapServiceWorkerInitScript } from './init-script.js';
import { symlink } from './utils/symlink.js';

type PreparationOptions = {
  locale?: string;
  initScriptContent?: string;
};

type LinkOptions = {
  source: string;
  target: string;
  directory: string;
  locale: boolean;
  relative?: string;
};

/**
 * A private prepared directory owned by one extension instance.
 */
export class PreparedExtensionDir {
  path = '';
  private sourcePath!: string;
  private manifest!: chrome.runtime.ManifestV3;

  /**
   * Replaces the private directory contents with the supplied extension build.
   */
  async prepare(extensionPath: string, options: PreparationOptions = {}) {
    this.sourcePath = resolve(extensionPath);
    this.manifest = await this.readManifest();
    this.path = await this.createTargetPath();
    await this.clearContents();
    await this.linkResources(options);
    await this.handleLocale(options.locale);
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

  private async linkResources(options: PreparationOptions) {
    const workerToWrap =
      options.initScriptContent !== undefined
        ? this.manifest.background?.service_worker
        : undefined;
    await linkDirectoryResources({
      source: this.sourcePath,
      target: this.path,
      directory: posix.dirname(workerToWrap || '.'),
      locale: Boolean(options.locale),
    });
  }

  private async handleLocale(requestedLocale: string | undefined) {
    if (!requestedLocale) return;
    const locale = await resolveExtensionLocale(this.sourcePath, requestedLocale);
    const localesDir = join(this.path, '_locales');
    await mkdir(localesDir);
    await symlink(join(this.sourcePath, '_locales', locale), join(localesDir, locale));
    this.manifest.default_locale = locale;
  }

  private async handleInitScript(initScriptContent: string | undefined) {
    if (initScriptContent === undefined || !this.manifest.background?.service_worker) return;
    await wrapServiceWorkerInitScript(this.path, this.manifest, initScriptContent);
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

/**
 * Links extension resources while leaving overridden files and worker directories writable.
 */
async function linkDirectoryResources(options: LinkOptions) {
  const { source, target, directory, locale, relative = '' } = options;
  for (const entry of await readdir(source)) {
    const path = posix.join(relative, entry);
    if (isOverridden(path, locale)) continue;
    const from = join(source, entry);
    const to = join(target, entry);
    if (directory === path || directory.startsWith(`${path}/`)) {
      await mkdir(to);
      await linkDirectoryResources({ source: from, target: to, directory, locale, relative: path });
    } else {
      await symlink(from, to);
    }
  }
}

function isOverridden(path: string, locale: boolean) {
  return path === 'manifest.json' || (locale && path === '_locales');
}
