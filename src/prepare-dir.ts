/**
 * Prepares private extension directories by linking unchanged resources and writing overrides.
 */

import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix, resolve } from 'node:path';
import { resolveExtensionLocale } from './i18n.js';
import { wrapServiceWorkerInitScript } from './init-script.js';

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
    await prepareExtension(resolve(extensionPath), this.path, options);
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
 * Populates an empty private directory with the requested manifest, locale, and worker startup.
 */
async function prepareExtension(source: string, target: string, options: PreparationOptions) {
  const manifest = JSON.parse(
    await readFile(join(source, 'manifest.json'), 'utf8'),
  ) as chrome.runtime.ManifestV3;
  const locale = options.locale && (await resolveExtensionLocale(source, options.locale));
  const worker = options.initScript !== undefined ? manifest.background?.service_worker : undefined;
  const directory = posix.dirname(worker || '.');
  await linkResources({ source, target, directory, locale: Boolean(locale) });
  await prepareLocale({ source, target, locale, manifest });
  if (worker) await wrapServiceWorkerInitScript(target, manifest, options.initScript!);
  await writeFile(join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

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
      await linkResource(from, to);
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
  await linkResource(join(source, '_locales', locale), join(target, '_locales', locale));
  manifest.default_locale = locale;
}

async function linkResource(source: string, target: string) {
  const directory = (await stat(source)).isDirectory();
  try {
    await symlink(source, target, directory ? 'junction' : 'file');
  } catch (error) {
    if (!isLinkUnsupported(error)) throw error;
    await cp(source, target, { recursive: true, dereference: true });
  }
}

function isLinkUnsupported(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    ['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP'].includes(String(error.code))
  );
}

function isOverridden(path: string, locale: boolean) {
  return path === 'manifest.json' || (locale && path === '_locales');
}
