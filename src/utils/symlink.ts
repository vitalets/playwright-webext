/**
 * Creates filesystem links for files and directories.
 */

import { stat, symlink as rawSymlink } from 'node:fs/promises';

/**
 * Links a file or directory, using junctions for directories on Windows.
 */
export async function symlink(source: string, target: string) {
  const directory = (await stat(source)).isDirectory();
  // TODO: Fall back to copying when symbolic links are unsupported.
  await rawSymlink(source, target, directory ? 'junction' : 'file');
}
