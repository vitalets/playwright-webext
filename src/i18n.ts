/**
 * Resolves translation catalogs for prepared extension directories.
 */

import { readdir } from 'node:fs/promises';
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
 * Resolves a requested locale to an available translation catalog.
 */
export async function resolveExtensionLocale(extensionPath: string, locale: string) {
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

async function readAvailableLocales(localesPath: string, extensionPath: string, locale: string) {
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

function isMissingPathError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
