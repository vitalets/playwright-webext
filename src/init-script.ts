/**
 * Registers initialization for extension documents and generates worker startup wrappers.
 */

import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import type { BrowserContext } from '@playwright/test';
import type { ExtensionInitScript } from './options.js';
import { FileCache } from './utils/file-cache.js';

/**
 * Shares script file contents for the lifetime of this process.
 */
const fileCache = new FileCache();

/**
 * Combines scripts in order, reusing file contents while applying current inline content.
 * Script files are assumed unchanged for the lifetime of this process.
 */
export async function getInitScriptContent(script: ExtensionInitScript | ExtensionInitScript[]) {
  const scripts = Array.isArray(script) ? script : [script];
  const sources = await Promise.all(
    scripts.map(async (item) => {
      const source = typeof item === 'string' ? await fileCache.read(item) : item.content;
      return `(() => {\n${source}\n})();`;
    }),
  );
  return sources.join('\n');
}

/**
 * Registers initialization before application scripts in each new browser context.
 * Context init scripts also run on website pages, so the generated guard limits their execution.
 */
export async function addInitScriptToContext(context: BrowserContext, initScriptContent: string) {
  await context.addInitScript({
    content: [
      "if (globalThis.location.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.id) {",
      '(() => {',
      initScriptContent,
      '})();',
      '}',
    ].join('\n'),
  });
}

/**
 * Context init scripts do not run in service workers. Redirect the prepared manifest to a
 * sibling wrapper that loads initialization before the original worker on every start.
 */
export async function addInitScriptToServiceWorker(
  extensionDir: string,
  manifest: chrome.runtime.ManifestV3,
  initScriptContent: string,
) {
  const background = manifest.background!;
  const origScript = background.service_worker;
  const suffix = randomUUID();
  const initScriptFile = `webext-init-script-${suffix}.js`;
  const wrapper = `webext-wrapper-${suffix}.js`;
  const imports = [initScriptFile, posix.basename(origScript)].map(
    (name) => `./${encodeURIComponent(name)}`,
  );
  const code =
    background.type === 'module'
      ? imports.map((path) => `import ${JSON.stringify(path)};`).join('\n')
      : imports.map((path) => `importScripts(${JSON.stringify(path)});`).join('\n');
  const directory = join(extensionDir, dirname(origScript));
  await writeFile(join(directory, initScriptFile), `(() => {\n${initScriptContent}\n})();\n`);
  await writeFile(join(directory, wrapper), `${code}\n`);
  background.service_worker = posix.join(posix.dirname(origScript), wrapper);
}

/**
 * Resolves initialization file paths relative to the configuration directory.
 */
export function resolveInitScripts(
  baseDir: string,
  script?: ExtensionInitScript | ExtensionInitScript[],
) {
  if (script === undefined) return;
  const resolveScript = (item: ExtensionInitScript) =>
    typeof item === 'string' && item ? resolve(baseDir, item) : item;
  return Array.isArray(script) ? script.map(resolveScript) : resolveScript(script);
}
