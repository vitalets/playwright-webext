import { test } from '../../src/index.js';

test('stores state in the shared extension', async ({ extensionW }) => {
  await extensionW.storage.local.set({ theme: 'dark' });
});

test('reuses the extension and its state in the next test', async ({ extensionW }) => {
  await extensionW.storage.local.expect('theme').toEqual('dark');
});
