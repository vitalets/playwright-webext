/**
 * Registers initialization for extension documents and generates worker startup wrappers.
 */

import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import type { BrowserContext } from '@playwright/test';

/**
 * Reads initialization once and registers it before application scripts in extension documents.
 * Context init scripts also run on website pages, so the generated guard limits their execution.
 */
export async function registerContextInitScript(context: BrowserContext, path: string) {
  const content = await readFile(resolve(path), 'utf8');
  await context.addInitScript({
    content: [
      "if (globalThis.location.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.id) {",
      '(() => {',
      content,
      '})();',
      '}',
    ].join('\n'),
  });
  return content;
}

/**
 * Context init scripts do not run in service workers. Redirect the prepared manifest to a
 * sibling wrapper that loads initialization before the original worker on every start.
 */
export async function prepareWorkerInitScript(
  target: string,
  manifest: chrome.runtime.ManifestV3,
  content: string,
) {
  const background = manifest.background!;
  const worker = background.service_worker;
  const suffix = randomUUID();
  const init = `webext-init-script-${suffix}.js`;
  const wrapper = `webext-wrapper-${suffix}.js`;
  const imports = [init, posix.basename(worker)].map((name) => `./${encodeURIComponent(name)}`);
  const code =
    background.type === 'module'
      ? imports.map((path) => `import ${JSON.stringify(path)};`).join('\n')
      : imports.map((path) => `importScripts(${JSON.stringify(path)});`).join('\n');
  const directory = join(target, dirname(worker));
  await writeFile(join(directory, init), `(() => {\n${content}\n})();\n`);
  await writeFile(join(directory, wrapper), `${code}\n`);
  background.service_worker = posix.join(posix.dirname(worker), wrapper);
}
