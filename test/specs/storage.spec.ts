import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

for (const area of ['local', 'sync', 'session'] as const) {
  test(`reads and updates ${area} storage`, async ({ extension }) => {
    // Wait for the fixture's install handler before clearing local storage.
    await expect
      .poll(() => extension.storage.local.get('onInstalled'))
      .toHaveProperty('onInstalled');
    const storage = extension.storage[area];
    await storage.clear();

    await storage.set({ theme: 'dark', enabled: true });
    expect(await storage.get('theme')).toEqual({ theme: 'dark' });
    expect((await storage.getKeys()).sort()).toEqual(['enabled', 'theme']);

    await storage.set({ theme: 'light' });
    expect(await storage.get()).toEqual({ theme: 'light', enabled: true });

    await storage.remove('theme');
    expect(await storage.get()).toEqual({ enabled: true });

    await storage.clear();
    expect(await storage.get()).toEqual({});
  });
}
