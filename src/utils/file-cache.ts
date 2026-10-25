/**
 * Caches UTF-8 file contents in memory without retaining failed reads.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Reuses file contents by absolute path for the lifetime of the instance.
 */
export class FileCache {
  // Cache promises so simultaneous reads of the same file share one filesystem read.
  private readonly contents = new Map<string, Promise<string>>();

  async read(path: string) {
    const key = resolve(path);
    let content = this.contents.get(key);
    if (!content) {
      content = readFile(key, 'utf8').catch((error: unknown) => {
        this.contents.delete(key);
        throw error;
      });
      this.contents.set(key, content);
    }
    return content;
  }
}
