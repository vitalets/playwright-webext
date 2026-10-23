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
  initScript?: string;
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

  /**
   * Replaces the private directory contents with the supplied extension build.
   */
  async prepare(extensionPath: string, options: PreparationOptions = {}) {
    await this.ensurePath();
    await this.clearContents();
    await this.prepareDir(resolve(extensionPath), options);
    return this;
  }

  /**
   * Removes the private extension directory when one has been created.
   */
  async cleanup() {
    if (!this.path) return;
    await rm(this.path, { recursive: true, force: true });
  }

  /**
   * Populates an empty private directory with the requested manifest, locale, and worker startup.
   */
  private async prepareDir(source: string, options: PreparationOptions) {
    const target = this.path;
    const manifest = JSON.parse(
      await readFile(join(source, 'manifest.json'), 'utf8'),
    ) as chrome.runtime.ManifestV3;
    const locale = options.locale && (await resolveExtensionLocale(source, options.locale));
    const workerToWrap =
      options.initScript !== undefined ? manifest.background?.service_worker : undefined;
    const directory = posix.dirname(workerToWrap || '.');
    await linkResources({ source, target, directory, locale: Boolean(locale) });
    await prepareLocale({ source, target, locale, manifest });
    if (workerToWrap) await wrapServiceWorkerInitScript(target, manifest, options.initScript!);
    await writeFile(join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
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

  private async ensurePath() {
    this.path = this.path || (await mkdtemp(join(tmpdir(), 'playwright-webext-')));
  }
}

/**
 * Links extension resources while leaving overridden files and worker directories writable.
 */
async function linkResources(options: LinkOptions) {
  const { source, target, directory, locale, relative = '' } = options;
  for (const entry of await readdir(source)) {
    const path = posix.join(relative, entry);
    if (isOverridden(path, locale)) continue;
    const from = join(source, entry);
    const to = join(target, entry);
    if (directory === path || directory.startsWith(`${path}/`)) {
      await mkdir(to);
      await linkResources({ source: from, target: to, directory, locale, relative: path });
    } else {
      await symlink(from, to);
    }
  }
}

async function prepareLocale({
  source,
  target,
  locale,
  manifest,
}: {
  source: string;
  target: string;
  locale: string | undefined;
  manifest: chrome.runtime.ManifestV3;
}) {
  if (!locale) return;
  await mkdir(join(target, '_locales'));
  await symlink(join(source, '_locales', locale), join(target, '_locales', locale));
  manifest.default_locale = locale;
}

function isOverridden(path: string, locale: boolean) {
  return path === 'manifest.json' || (locale && path === '_locales');
}
