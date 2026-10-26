/**
 * Reuses prepared builds between sequential tests and owns their worker's temporary root.
 */

import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PreparedExtensionDir, type PreparedDirRequest } from './prepare-dir.js';
import { isDefaultLocale } from './i18n.js';

/**
 * Caches unchanged source builds for one worker. Callers must close the previous browser
 * before acquiring another directory; cached directories cannot be shared by live browsers.
 */
export class ExtensionDirCache {
  private parentDir = '';
  private readonly completed = new Set<string>();

  async acquireDir(request: PreparedDirRequest) {
    request = this.normalizeRequest(request);
    const key = this.calculateHash(request);
    const parentDir = await this.ensureParentDir();
    const extensionDir = join(parentDir, key);
    if (!this.completed.has(extensionDir)) {
      await this.prepareDir(extensionDir, request);
    }
    await this.removeMetadata(extensionDir);
    return extensionDir;
  }

  async removeDir(extensionDir: string) {
    if (!this.completed.has(extensionDir)) return;
    this.completed.delete(extensionDir);
    await rm(extensionDir, { recursive: true, force: true });
  }

  async cleanup() {
    if (!this.parentDir) return;
    await rm(this.parentDir, { recursive: true, force: true });
    this.completed.clear();
    this.parentDir = '';
  }

  private normalizeRequest(request: PreparedDirRequest) {
    return {
      ...request,
      sourcePath: resolve(request.sourcePath),
      locale: isDefaultLocale(request.locale) ? undefined : request.locale,
    };
  }

  private calculateHash(request: PreparedDirRequest) {
    return createHash('sha256')
      .update(JSON.stringify([request.sourcePath, request.locale, request.initScriptContent]))
      .digest('hex');
  }

  private async ensureParentDir() {
    this.parentDir ||= await mkdtemp(join(tmpdir(), 'playwright-webext-worker-'));
    return this.parentDir;
  }

  private async removeMetadata(extensionDir: string) {
    await rm(join(extensionDir, '_metadata'), { recursive: true, force: true });
  }

  private async prepareDir(extensionDir: string, request: PreparedDirRequest) {
    const directory = new PreparedExtensionDir();
    directory.path = extensionDir;
    try {
      await mkdir(extensionDir, { recursive: true });
      await directory.create(request);
      this.completed.add(extensionDir);
    } catch (error) {
      await rm(extensionDir, { recursive: true, force: true });
      throw error;
    }
  }
}
