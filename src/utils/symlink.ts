/**
 * Creates filesystem links for files and directories.
 */

import { mkdir, readdir, stat, symlink as rawSymlink } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

type DirectoryToLink = {
  originalDir: string;
  targetDir: string;
  excludePaths: string[];
};

/**
 * Links entries from originalDir into targetDir.
 * excludePaths accepts absolute paths or paths relative to originalDir. Paths are normalized;
 * paths outside originalDir throw before any links are created.
 * Use exact file or directory paths, e.g. ['settings.json', 'assets/private', 'scripts/worker.js'].
 * Leading './' and trailing slashes are accepted. Glob patterns are not supported.
 * Excluding originalDir itself throws an error.
 * Excluding a directory skips its entire subtree. Existing excluded entries in targetDir are untouched.
 * Ancestors of excluded paths become real directories; other directories are linked whole.
 */
export async function symlinkDirEntries(
  originalDir: string,
  targetDir: string,
  excludePaths: string[] = [],
) {
  const exclusions = excludePaths.map((path) => normalizeExcludePath(originalDir, path));
  const directories = [{ originalDir, targetDir, excludePaths: exclusions }];
  for (const directory of directories) {
    directories.push(...(await linkDirectory(directory)));
  }
}

/**
 * Links a file or directory, using junctions for directories on Windows.
 */
export async function symlink(source: string, target: string) {
  const directory = (await stat(source)).isDirectory();
  // TODO: Fall back to copying when symbolic links are unsupported.
  await rawSymlink(source, target, directory ? 'junction' : 'file');
}

async function linkDirectory({ originalDir, targetDir, excludePaths }: DirectoryToLink) {
  const directories: DirectoryToLink[] = [];
  await mkdir(targetDir, { recursive: true });
  for (const entry of await readdir(originalDir)) {
    if (excludePaths.includes(entry)) continue;
    const nestedExclusions = excludePaths
      .filter((path) => path.startsWith(`${entry}/`))
      .map((path) => path.slice(entry.length + 1));
    const from = join(originalDir, entry);
    const to = join(targetDir, entry);
    if (nestedExclusions.length) {
      directories.push({ originalDir: from, targetDir: to, excludePaths: nestedExclusions });
    } else {
      await symlink(from, to);
    }
  }
  return directories;
}

function normalizeExcludePath(originalDir: string, path: string) {
  const relativePath = relative(originalDir, resolve(originalDir, path));
  if (!relativePath) {
    throw new Error(
      `Excluded path "${path}" resolves to original directory "${originalDir}" itself.`,
    );
  }
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Excluded path "${path}" is outside original directory "${originalDir}".`);
  }
  return relativePath.split(sep).join('/');
}
