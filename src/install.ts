/**
 * Installs and upgrades unpacked extensions through CDP while managing private build copies.
 * Worker lifecycle synchronization is supplied by the extension facade.
 */

import { resolve } from 'node:path';
import type { BrowserContext } from '@playwright/test';
import type { ExtensionCopy } from './extension-copy.js';
import { isDefaultLocale, localizeExtension } from './i18n.js';

type InstallState = 'not-installed' | 'installing' | 'installed' | 'upgrading' | 'upgraded';

export type InstallOptions = {
  extensionPath: string;
  extensionCopy: ExtensionCopy;
  baseDir: string;
  locale?: string;
};

/**
 * Coordinates one initial installation and an optional upgrade at the same filesystem path.
 */
export class ExtensionInstaller {
  #state: InstallState = 'not-installed';
  #canUpgrade = false;
  #id?: string;

  /**
   * Creates an installer for the browser context and configured extension sources.
   */
  constructor(
    private readonly context: BrowserContext,
    private readonly options: InstallOptions,
  ) {}

  /**
   * Loads a build and returns its ID. The caller waits for worker readiness.
   * Failed loads can be retried; successful loads consume the installation.
   */
  async install(path?: string): Promise<string> {
    this.verifyStateForInstall();
    this.#state = 'installing';
    try {
      const installPath = await this.resolveInstallPath(path);
      this.#id = await this.loadUnpacked(installPath);
      this.#state = 'installed';
      this.#canUpgrade = path !== undefined;
      return this.#id;
    } catch (error) {
      if (this.#state === 'installing') this.#state = 'not-installed';
      throw error;
    }
  }

  /**
   * Replaces and reloads the private build once. The caller synchronizes worker lifecycle.
   */
  async upgrade(): Promise<void> {
    this.verifyStateForUpgrade();
    this.#state = 'upgrading';
    try {
      await this.prepareCopy(this.options.extensionPath);
      this.#state = 'upgraded';
      this.#canUpgrade = false;
      const id = await this.loadUnpacked(this.options.extensionCopy.path);
      if (id !== this.#id) throw new Error('Extension upgrade changed the extension ID.');
    } catch (error) {
      if (this.#state === 'upgrading') this.#state = 'installed';
      throw error;
    }
  }

  private verifyStateForInstall(): void {
    if (this.#state === 'installing')
      throw new Error('Extension installation is already in progress.');
    if (this.#state !== 'not-installed')
      throw new Error('Extension installation has already been used.');
  }

  private verifyStateForUpgrade(): void {
    if (this.#state === 'upgrading') throw new Error('Extension upgrade is already in progress.');
    if (this.#state === 'upgraded') throw new Error('Extension upgrade has already been used.');
    if (!this.#canUpgrade) throw new Error('Extension upgrade requires extension.install(path).');
  }

  private async resolveInstallPath(path?: string): Promise<string> {
    const source =
      path === undefined ? this.options.extensionPath : resolve(this.options.baseDir, path);
    return path !== undefined || !isDefaultLocale(this.options.locale)
      ? this.prepareCopy(source)
      : source;
  }

  private async prepareCopy(source: string): Promise<string> {
    await this.options.extensionCopy.copyFrom(source);
    if (!isDefaultLocale(this.options.locale)) {
      await localizeExtension(this.options.extensionCopy.path, this.options.locale);
    }
    return this.options.extensionCopy.path;
  }

  private async loadUnpacked(path: string): Promise<string> {
    const browser = this.context.browser();
    if (!browser) throw new Error('Extension installation requires a browser CDP session.');
    const session = await browser.newBrowserCDPSession();
    try {
      const { id } = await session.send('Extensions.loadUnpacked', { path });
      return id;
    } finally {
      await session.detach();
    }
  }
}
