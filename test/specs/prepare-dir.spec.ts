import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { PreparedExtensionDir } from '../../src/prepare-dir.js';

test('copies declared scripts, preserves sibling links, and refreshes copied files', async () => {
  const source = test.info().outputPath('source');
  await mkdir(join(source, 'assets'), { recursive: true });
  await writeFile(join(source, 'assets/content.js'), 'foo');
  await writeFile(join(source, 'assets/content.css'), 'bar');
  await writeFile(join(source, 'assets/sibling.js'), 'baz');
  const manifest: chrome.runtime.ManifestV3 = {
    manifest_version: 3,
    name: 'foo',
    version: '1.0.0',
    background: { service_worker: './assets/content.js' },
    content_scripts: [
      { matches: ['http://example.test/*'], js: ['assets/content.js'] },
      {
        matches: ['http://example.test/*'],
        js: ['assets/content.js'],
        css: ['assets/content.css'],
      },
    ],
  };
  const directory = new PreparedExtensionDir();
  try {
    await directory.prepare(source, manifest, { initScriptContent: 'void 0;' });
    const loadedPath = await realpath(directory.path);
    expect(await realpath(join(loadedPath, 'assets/content.js'))).toBe(
      join(loadedPath, 'assets/content.js'),
    );
    expect(await realpath(join(loadedPath, 'assets/content.css'))).toBe(
      join(loadedPath, 'assets/content.css'),
    );
    expect(await realpath(join(loadedPath, 'assets/sibling.js'))).toBe(
      await realpath(join(source, 'assets/sibling.js')),
    );
    expect(await readFile(join(loadedPath, 'assets/content.js'), 'utf8')).toBe('foo');
    expect(await readFile(join(loadedPath, 'assets/content.css'), 'utf8')).toBe('bar');

    await writeFile(join(source, 'assets/content.js'), 'baz');
    await directory.prepare(source, manifest);
    expect(await realpath(directory.path)).toBe(loadedPath);
    expect(await readFile(join(loadedPath, 'assets/content.js'), 'utf8')).toBe('baz');
  } finally {
    await directory.cleanup();
  }
});
