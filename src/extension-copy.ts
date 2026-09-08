/**
 * Manages private extension directories used by workflows that modify extension files.
 */

import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A disposable copy of an unpacked extension.
 */
export class ExtensionCopy {
  path = '';

  async copyFrom(extensionPath: string) {
    await this.ensurePath();
    await this.clearContents();
    await cp(extensionPath, this.path, { recursive: true });
    return this;
  }

  async cleanup(): Promise<void> {
    await rm(this.path, { recursive: true, force: true });
  }

  async clearContents() {
    const entries = await readdir(this.path);
    await Promise.all(
      entries.map((entry) => rm(join(this.path, entry), { recursive: true, force: true })),
    );
  }

  private async ensurePath() {
    this.path = this.path || (await mkdtemp(join(tmpdir(), 'playwright-webext-')));
  }
}
