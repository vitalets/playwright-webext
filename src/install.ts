/**
 * Installs and upgrades unpacked extensions through CDP while managing private build copies.
 * Worker lifecycle synchronization is supplied by the extension facade.
 */

import { resolve } from 'node:path';
import type { BrowserContext } from '@playwright/test';
import type { ExtensionInitScript, ExtensionClockOptions } from './options.js';
import { PreparedExtensionDir } from './extension-dir/index.js';
import type { ExtensionDirCache } from './extension-dir/cache.js';
import { Manifest } from './manifest.js';
import { isDefaultLocale } from './i18n.js';
import { getInitScriptContent, addInitScriptToContext } from './init-script.js';
import { getClockInitScript } from './clock/init-script.js';
import { initContextClock } from './clock/context.js';

type InstallState = 'not-installed' | 'installing' | 'installed' | 'upgrading' | 'upgraded';

export type InstallOptions = {
  extensionPath: string;
  extensionDirCache?: ExtensionDirCache;
  locale?: string;
  extensionInitScript?: ExtensionInitScript | ExtensionInitScript[];
  extensionClock?: ExtensionClockOptions;
};

/**
 * Coordinates one initial installation and an optional upgrade at the same filesystem path.
 */
export class ExtensionInstaller {
  readonly #directory: PreparedExtensionDir;
  readonly #manifest = new Manifest();
  readonly #extensionPath: string;
  #state: InstallState = 'not-installed';
  #canUpgrade = false;
  #id?: string;
  #loadedPath?: string;
  #initScriptContent?: string;
  #contextInitialized = false;

  constructor(
    private readonly context: BrowserContext,
    private readonly options: InstallOptions,
  ) {
    this.#extensionPath = resolve(options.extensionPath);
    this.#directory = new PreparedExtensionDir(options.extensionDirCache);
  }

  /**
   * Whether the loaded source manifest declares a background service worker.
   */
  get hasServiceWorker() {
    return this.#manifest.hasServiceWorker;
  }

  /**
   * Returns the absolute installation directory, or throws before a successful load.
   */
  get loadedPath() {
    if (!this.#loadedPath)
      throw new Error('Extension is not installed. Call extension.install() first.');
    return this.#loadedPath;
  }

  /**
   * Loads a build and returns its ID. The caller waits for worker readiness.
   * Failed loads can be retried; successful loads consume the installation.
   */
  async install(path?: string) {
    this.verifyStateForInstall();
    this.#state = 'installing';
    try {
      await this.initializeContext();
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
      await this.#manifest.load(this.#extensionPath);
      await this.#directory.replace(this.createPreparationRequest(this.#extensionPath));
      this.#state = 'upgraded';
      this.#canUpgrade = false;
      const id = await this.loadUnpacked(this.#directory.path);
      if (id !== this.#id) throw new Error('Extension upgrade changed the extension ID.');
    } catch (error) {
      if (this.#state === 'upgrading') this.#state = 'installed';
      throw error;
    }
  }

  /**
   * Retains reusable cached builds and removes private or upgraded copies.
   */
  async cleanup() {
    await this.#directory.cleanup();
  }

  private async resolveInstallPath(path?: string) {
    const source = path === undefined ? this.#extensionPath : resolve(path);
    await this.#manifest.load(source);
    return path !== undefined || this.requiresPreparedDirectory()
      ? this.#directory.create(this.createPreparationRequest(source))
      : source;
  }

  private requiresPreparedDirectory() {
    return (
      this.#initScriptContent !== undefined ||
      !isDefaultLocale(this.options.locale) ||
      this.#manifest.hasDnr
    );
  }

  private createPreparationRequest(sourcePath: string) {
    return {
      sourcePath,
      manifest: this.#manifest.data,
      locale: isDefaultLocale(this.options.locale) ? undefined : this.options.locale,
      initScriptContent: this.#initScriptContent,
    };
  }

  private async initializeContext() {
    if (this.#contextInitialized) return;
    this.#initScriptContent = await this.prepareInitScript();
    if (this.options.extensionClock)
      await initContextClock(this.context, this.options.extensionClock);
    if (this.#initScriptContent)
      await addInitScriptToContext(this.context, this.#initScriptContent);
    this.#contextInitialized = true;
  }

  private async prepareInitScript() {
    const clockScript = this.options.extensionClock
      ? await getClockInitScript(this.options.extensionClock)
      : '';
    const userScript = this.options.extensionInitScript
      ? await getInitScriptContent(this.options.extensionInitScript)
      : '';
    return [clockScript, userScript].filter(Boolean).join('\n') || undefined;
  }

  private async loadUnpacked(path: string) {
    const browser = this.context.browser();
    if (!browser) throw new Error('Extension installation requires a browser CDP session.');
    const session = await browser.newBrowserCDPSession();
    try {
      const { id } = await session.send('Extensions.loadUnpacked', { path });
      this.#loadedPath = path;
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
