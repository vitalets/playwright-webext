import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

for (const area of ['local', 'sync', 'session'] as const) {
  test(`reads and updates ${area} storage`, async ({ extension }) => {
    // Wait for the fixture's install handler before clearing local storage.
    await extension.storage.local.expect('onInstalled').toEqual(expect.any(Object));
    const storage = extension.storage[area];
    await storage.clear();

    await storage.set({ theme: 'dark', enabled: true });
    await storage.expect('theme').toEqual('dark');
    await storage.expect(['theme', 'enabled']).toEqual({ theme: 'dark', enabled: true });
    await storage.expect(['theme']).toEqual({ theme: 'dark' });
    await storage.expect(['theme', 'missing']).toEqual({ theme: 'dark' });
    await storage.expect(['missing']).toEqual({});
    await storage.expect([]).toEqual({});
    expect((await storage.getKeys()).sort()).toEqual(['enabled', 'theme']);

    await storage.set({ theme: 'light' });
    await storage.expect().toEqual({ theme: 'light', enabled: true });

    await storage.remove('theme');
    await storage.expect(undefined).toEqual({ enabled: true });

    await storage.clear();
    await storage.expect().toEqual({});
  });

  test(`waits for ${area} storage changes`, async ({ extension }) => {
    const storage = extension.storage[area];
    await storage.set({ preferences: { theme: 'light' }, saved: false });
    await extension.evaluate((area) => {
      setTimeout(() => {
        void chrome.storage[area].set({
          preferences: { theme: 'dark', enabled: true },
          saved: true,
        });
      }, 250);
    }, area);

    await storage.expect(['preferences', 'saved']).toEqual({
      preferences: { theme: 'dark', enabled: true },
      saved: true,
    });
    await storage.expect('preferences').not.toEqual({ theme: 'light' });
    await storage.expect('preferences').toEqual({ theme: 'dark', enabled: true });
    await storage.expect('preferences').toEqual(expect.objectContaining({ theme: 'dark' }));
    await storage.expect('missing').toBeUndefined();
  });
}
