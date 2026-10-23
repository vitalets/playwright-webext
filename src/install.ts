/**
 * Installs and upgrades unpacked extensions through CDP while managing private build copies.
 * Worker lifecycle synchronization is supplied by the extension facade.
 */

import { join, resolve } from 'node:path';
import type { BrowserContext } from '@playwright/test';
import type { ExtensionInitScript } from './options.js';
import { PreparedExtensionDir } from './prepare-dir.js';
import { hasServiceWorker } from './manifest.js';
import { isDefaultLocale } from './i18n.js';
import { registerContextInitScript } from './init-script.js';

type InstallState = 'not-installed' | 'installing' | 'installed' | 'upgrading' | 'upgraded';

export type InstallOptions = {
  extensionPath: string;
  locale?: string;
  extensionInitScript?: ExtensionInitScript | ExtensionInitScript[];
};

/**
 * Coordinates one initial installation and an optional upgrade at the same filesystem path.
 */
export class ExtensionInstaller {
  readonly #directory = new PreparedExtensionDir();
  readonly #extensionPath: string;
  #state: InstallState = 'not-installed';
  #canUpgrade = false;
  #id?: string;
  #initScript?: string;
  #initScriptRegistered = false;
  #hasServiceWorker?: boolean;

  constructor(
    private readonly context: BrowserContext,
    private readonly options: InstallOptions,
  ) {
    this.#extensionPath = resolve(options.extensionPath);
  }

  /**
   * Whether the last loaded build declares a background service worker.
   */
  get hasServiceWorker() {
    return this.#hasServiceWorker;
  }

  /**
   * Loads a build and returns its ID. The caller waits for worker readiness.
   * Failed loads can be retried; successful loads consume the installation.
   */
  async install(path?: string) {
    this.verifyStateForInstall();
    this.#state = 'installing';
    try {
      await this.registerInitScript();
      const installPath = await this.resolveInstallPath(path);
      this.#id = await this.loadUnpacked(installPath);
      this.#state = 'installed';
      this.#canUpgrade = path !== undefined;
      await this.updateHasServiceWorker(installPath);
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
      await this.prepareDirectory(this.#extensionPath);
      this.#state = 'upgraded';
      this.#canUpgrade = false;
      const id = await this.loadUnpacked(this.#directory.path);
      if (id !== this.#id) throw new Error('Extension upgrade changed the extension ID.');
      await this.updateHasServiceWorker(this.#directory.path);
    } catch (error) {
      if (this.#state === 'upgrading') this.#state = 'installed';
      throw error;
    }
  }

  /**
   * Removes the private build copy owned by this installer.
   */
  async cleanup() {
    await this.#directory.cleanup();
  }

  private async resolveInstallPath(path?: string) {
    const source = path === undefined ? this.#extensionPath : resolve(path);
    return path !== undefined ||
      this.#initScript !== undefined ||
      !isDefaultLocale(this.options.locale)
      ? this.prepareDirectory(source)
      : source;
  }

  private async prepareDirectory(source: string) {
    await this.#directory.prepare(source, {
      locale: isDefaultLocale(this.options.locale) ? undefined : this.options.locale,
      initScript: this.#initScript,
    });
    return this.#directory.path;
  }

  private async registerInitScript() {
    if (this.#initScriptRegistered || !this.options.extensionInitScript) return;
    this.#initScript = await registerContextInitScript(
      this.context,
      this.options.extensionInitScript,
    );
    this.#initScriptRegistered = true;
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

  private async updateHasServiceWorker(path: string) {
    this.#hasServiceWorker = await hasServiceWorker(join(path, 'manifest.json'));
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
