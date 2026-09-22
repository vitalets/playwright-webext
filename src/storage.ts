/**
 * Provides Promise-based access to extension storage through the current service worker.
 */

import type { Worker } from '@playwright/test';

type StorageAreaName = 'local' | 'sync' | 'session' | 'managed';
type StorageKeys<T> = keyof T | Array<keyof T> | Partial<T> | null | undefined;

export type ExtensionStorage = {
  readonly local: StorageArea;
  readonly sync: StorageArea;
  readonly session: StorageArea;
  readonly managed: StorageArea;
};

/**
 * Creates storage handles that follow service worker replacements.
 */
export function createStorage(getWorker: () => Worker): ExtensionStorage {
  return {
    local: new StorageArea(getWorker, 'local'),
    sync: new StorageArea(getWorker, 'sync'),
    session: new StorageArea(getWorker, 'session'),
    managed: new StorageArea(getWorker, 'managed'),
  };
}

class StorageArea {
  constructor(
    private readonly getWorker: () => Worker,
    private readonly area: StorageAreaName,
  ) {}

  /**
   * Reads stored values, optionally supplying defaults for missing keys.
   */
  async get<T = { [key: string]: unknown }>(keys?: StorageKeys<NoInfer<T>>): Promise<T> {
    return this.getWorker().evaluate(
      ({ area, keys }) => chrome.storage[area].get<T>(keys as StorageKeys<T>),
      {
        area: this.area,
        keys,
      },
    );
  }

  /**
   * Updates the supplied keys without replacing other stored values.
   */
  async set<T = { [key: string]: any }>(items: Partial<T>): Promise<void> {
    await this.getWorker().evaluate(
      ({ area, items }) => chrome.storage[area].set<T>(items as Partial<T>),
      {
        area: this.area,
        items,
      },
    );
  }

  /**
   * Removes one or more stored keys.
   */
  async remove<T = { [key: string]: any }>(keys: keyof T | Array<keyof T>): Promise<void> {
    await this.getWorker().evaluate(
      ({ area, keys }) => chrome.storage[area].remove<T>(keys as keyof T | Array<keyof T>),
      {
        area: this.area,
        keys,
      },
    );
  }

  /**
   * Removes every value in this storage area.
   */
  async clear(): Promise<void> {
    await this.getWorker().evaluate((area) => chrome.storage[area].clear(), this.area);
  }

  /**
   * Lists the keys in this storage area.
   */
  async getKeys(): Promise<string[]> {
    return this.getWorker().evaluate((area) => chrome.storage[area].getKeys(), this.area);
  }
}
