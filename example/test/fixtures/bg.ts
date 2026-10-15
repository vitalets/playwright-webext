/**
 * Reads the state maintained by the extension background worker.
 */

import type { Extension } from 'playwright-webext';

export class Bg {
  constructor(private readonly extension: Extension) {}

  async getInstallationDate() {
    const { installationDate } = await this.extension.storage.local.get<{
      installationDate?: string;
    }>('installationDate');
    return installationDate;
  }
}
