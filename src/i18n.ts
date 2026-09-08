/**
 * Projects a requested translation catalog onto an extension directory.
 */

import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Playwright's implicit locale.
 */
const DEFAULT_PLAYWRIGHT_LOCALE = 'en-US';

type DefaultLocale = typeof DEFAULT_PLAYWRIGHT_LOCALE | undefined;

/**
 * Returns whether a locale uses Playwright's default localization behavior.
 */
export function isDefaultLocale(locale: string | undefined): locale is DefaultLocale {
  return !locale || locale === DEFAULT_PLAYWRIGHT_LOCALE;
}

/**
 * Projects the requested locale onto an extension directory in place.
 */
export async function localizeExtension(extensionPath: string, locale: string): Promise<void> {
  const extensionLocale = await resolveExtensionLocale(extensionPath, locale);
  await applyExtensionLocale(extensionPath, extensionLocale);
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

async function applyExtensionLocale(extensionPath: string, locale: string): Promise<void> {
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
