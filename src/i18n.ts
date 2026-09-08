/**
 * Prepares temporary extension builds that use one requested locale.
 */

import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Playwright's implicit locale.
 */
const DEFAULT_PLAYWRIGHT_LOCALE = 'en-US';

type DefaultLocale = typeof DEFAULT_PLAYWRIGHT_LOCALE | undefined;

/**
 * A temporary extension build configured for one locale.
 */
export class LocalizedExtensionCopy {
  /**
   * Creates a localized copy of an extension for the requested locale.
   */
  static async create(extensionPath: string, locale: string): Promise<LocalizedExtensionCopy> {
    const extensionLocale = await resolveExtensionLocale(extensionPath, locale);
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'playwright-webext-'));
    const projectedPath = join(temporaryRoot, 'extension');

    try {
      await cp(extensionPath, projectedPath, { recursive: true });
      await localizeExtension(projectedPath, extensionLocale);
      return new LocalizedExtensionCopy(projectedPath, temporaryRoot);
    } catch (error) {
      await rm(temporaryRoot, { recursive: true, force: true });
      throw error;
    }
  }

  private temporaryRoot?: string;

  private constructor(
    readonly path: string,
    temporaryRoot: string,
  ) {
    this.temporaryRoot = temporaryRoot;
  }

  /**
   * Removes the temporary extension build. Repeated calls are safe.
   */
  async close(): Promise<void> {
    if (!this.temporaryRoot) return;

    await rm(this.temporaryRoot, { recursive: true, force: true });
    this.temporaryRoot = undefined;
  }
}

/**
 * Returns whether a locale uses Playwright's default localization behavior.
 */
export function isDefaultLocale(locale: string | undefined): locale is DefaultLocale {
  return !locale || locale === DEFAULT_PLAYWRIGHT_LOCALE;
}

/**
 * Creates a localized extension copy when the locale differs from Playwright's default.
 */
export async function createLocalizedCopyIfNeeded(
  extensionPath: string,
  locale: string | undefined,
): Promise<LocalizedExtensionCopy | undefined> {
  return isDefaultLocale(locale) ? undefined : LocalizedExtensionCopy.create(extensionPath, locale);
}

async function resolveExtensionLocale(extensionPath: string, locale: string): Promise<string> {
  const normalizedLocale = locale.replace(/-/g, '_');
  if (!/^[A-Za-z0-9_]+$/.test(normalizedLocale)) {
    throw new Error(`Invalid extension locale "${locale}".`);
  }

  const localesPath = join(extensionPath, '_locales');
  const availableLocales = await readAvailableLocales(localesPath, extensionPath, locale);
  const candidates = [normalizedLocale, normalizedLocale.split('_')[0]];
  const extensionLocale = candidates
    .map((candidate) =>
      availableLocales.find((available) => available.toLowerCase() === candidate.toLowerCase()),
    )
    .find(Boolean);

  if (!extensionLocale) {
    throw new Error(
      `Extension at "${extensionPath}" does not provide messages for locale "${locale}".`,
    );
  }

  return extensionLocale;
}

async function readAvailableLocales(
  localesPath: string,
  extensionPath: string,
  locale: string,
): Promise<string[]> {
  try {
    const entries = await readdir(localesPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (isMissingPathError(error)) {
      throw new Error(
        `Extension at "${extensionPath}" has no _locales directory for locale "${locale}".`,
      );
    }
    throw error;
  }
}

async function localizeExtension(extensionPath: string, locale: string): Promise<void> {
  const manifestPath = join(extensionPath, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as chrome.runtime.Manifest;
  manifest.default_locale = locale;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const localesPath = join(extensionPath, '_locales');
  const entries = await readdir(localesPath);
  await Promise.all(
    entries
      .filter((entry) => entry !== locale)
      .map((entry) => rm(join(localesPath, entry), { recursive: true, force: true })),
  );
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
