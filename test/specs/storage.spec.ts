import { test } from '../../src/index.js';

test('reads and writes local storage', async ({ extension }) => {
  await extension.storage.local.set({ theme: 'dark' });
  await extension.storage.local.expect('theme').toEqual('dark');
});

test('reads and writes sync storage', async ({ extension }) => {
  await extension.storage.sync.set({ theme: 'dark' });
  await extension.storage.sync.expect('theme').toEqual('dark');
});

test('reads and writes session storage', async ({ extension }) => {
  await extension.storage.session.set({ theme: 'dark' });
  await extension.storage.session.expect('theme').toEqual('dark');
});
