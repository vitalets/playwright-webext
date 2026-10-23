import { mkdir, mkdtemp, readFile, readdir, lstat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { symlinkDirEntries } from '../../src/utils/symlink.js';

for (const mode of ['none', 'relative', 'normalized', 'absolute']) {
  test(`links resources with ${mode} exclusions`, async () => {
    const excludePaths =
      mode === 'none' ? [] : ['settings.json', 'translations', 'nested/deep/owned.js'];
    const root = await mkdtemp(join(tmpdir(), 'webext-symlink-test-'));
    const source = join(root, 'source');
    const target = join(root, 'target');
    try {
      await mkdir(join(source, 'nested/deep'), { recursive: true });
      await mkdir(join(source, 'translations'));
      await mkdir(join(source, 'assets'));
      for (const file of ['settings.json', 'nested/deep/owned.js', 'nested/deep/sibling.js']) {
        await writeFile(join(source, file), 'original');
      }
      if (excludePaths.length) {
        await mkdir(join(target, 'nested/deep'), { recursive: true });
        await writeFile(join(target, 'nested/deep/owned.js'), 'replacement');
      }

      const paths = excludePaths.map((path) => {
        if (mode === 'absolute') return join(source, path) + '/';
        if (mode === 'normalized') return `./unused/../${path}/`;
        return path;
      });
      await symlinkDirEntries(source, target, paths);

      expect((await lstat(join(target, 'assets'))).isSymbolicLink()).toBe(true);
      expect(await readFile(join(target, 'nested/deep/sibling.js'), 'utf8')).toBe('original');
      expect((await lstat(join(target, 'nested'))).isSymbolicLink()).toBe(!excludePaths.length);
      if (excludePaths.length) {
        expect(await readdir(target)).toEqual(['assets', 'nested']);
        expect((await lstat(join(target, 'nested/deep'))).isDirectory()).toBe(true);
        expect((await lstat(join(target, 'nested/deep/sibling.js'))).isSymbolicLink()).toBe(true);
        expect(await readFile(join(target, 'nested/deep/owned.js'), 'utf8')).toBe('replacement');
        await writeFile(join(target, 'nested/deep/generated.js'), 'generated');
        expect(await readdir(join(source, 'nested/deep'))).toEqual(['owned.js', 'sibling.js']);
      }
      expect(await readFile(join(source, 'nested/deep/owned.js'), 'utf8')).toBe('original');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('rejects exclusions outside the original directory before creating the target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webext-symlink-test-'));
  const originalDir = join(root, 'original');
  const targetDir = join(root, 'target');
  try {
    await mkdir(originalDir);
    for (const path of [
      '../outside',
      'nested/../../outside',
      join(root, 'original-sibling/file'),
    ]) {
      await expect(symlinkDirEntries(originalDir, targetDir, ['valid', path])).rejects.toThrow(
        'is outside original directory',
      );
      await expect(lstat(targetDir)).rejects.toMatchObject({ code: 'ENOENT' });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects excluding the original directory itself', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webext-symlink-test-'));
  const originalDir = join(root, 'original');
  try {
    await mkdir(originalDir);
    await writeFile(join(originalDir, 'file'), 'original');
    for (const [index, path] of ['.', './nested/..', originalDir].entries()) {
      const targetDir = join(root, `target-${index}`);
      await expect(symlinkDirEntries(originalDir, targetDir, [path])).rejects.toThrow(
        'resolves to original directory',
      );
      await expect(lstat(targetDir)).rejects.toMatchObject({ code: 'ENOENT' });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
