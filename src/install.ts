/**
 * Installs and upgrades unpacked extensions through CDP while managing private build copies.
 * Worker lifecycle synchronization is supplied by the extension facade.
 */

import { resolve } from 'node:path';
import type { BrowserContext } from '@playwright/test';
import { ExtensionCopy } from './copy.js';
import { isDefaultLocale, localizeExtension } from './i18n.js';

type InstallState = 'not-installed' | 'installing' | 'installed' | 'upgrading' | 'upgraded';

export type InstallOptions = {
  extensionPath: string;
  locale?: string;
};

/**
 * Coordinates one initial installation and an optional upgrade at the same filesystem path.
 */
export class ExtensionInstaller {
  readonly #copy = new ExtensionCopy();
  readonly #extensionPath: string;
  #state: InstallState = 'not-installed';
  #canUpgrade = false;
  #id?: string;

  constructor(
    private readonly context: BrowserContext,
    private readonly options: InstallOptions,
  ) {
    this.#extensionPath = resolve(options.extensionPath);
  }

  /**
   * Loads a build and returns its ID. The caller waits for worker readiness.
   * Failed loads can be retried; successful loads consume the installation.
   */
  async install(path?: string) {
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
  async upgrade() {
    this.verifyStateForUpgrade();
    this.#state = 'upgrading';
    try {
      await this.prepareCopy(this.#extensionPath);
      this.#state = 'upgraded';
      this.#canUpgrade = false;
      const id = await this.loadUnpacked(this.#copy.path);
      if (id !== this.#id) throw new Error('Extension upgrade changed the extension ID.');
    } catch (error) {
      if (this.#state === 'upgrading') this.#state = 'installed';
      throw error;
    }
  }

  /**
   * Removes the private build copy owned by this installer.
   */
  async cleanup() {
    await this.#copy.cleanup();
  }

  private async resolveInstallPath(path?: string) {
    const source = path === undefined ? this.#extensionPath : resolve(path);
    return path !== undefined || !isDefaultLocale(this.options.locale)
      ? this.prepareCopy(source)
      : source;
  }

  private async prepareCopy(source: string) {
    await this.#copy.copyFrom(source);
    if (!isDefaultLocale(this.options.locale)) {
      await localizeExtension(this.#copy.path, this.options.locale);
    }
    return this.#copy.path;
  }

  private async loadUnpacked(path: string) {
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

  private verifyStateForInstall() {
    if (this.#state === 'installing')
      throw new Error('Extension installation is already in progress.');
    if (this.#state !== 'not-installed')
      throw new Error('Extension installation has already been used.');
  }

  private verifyStateForUpgrade() {
    if (this.#state === 'upgrading') throw new Error('Extension upgrade is already in progress.');
    if (this.#state === 'upgraded') throw new Error('Extension upgrade has already been used.');
    if (!this.#canUpgrade) throw new Error('Extension upgrade requires extension.install(path).');
  }
}
