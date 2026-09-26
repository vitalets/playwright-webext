import { expect, type BrowserContext } from '@playwright/test';
import { test } from '../../src/index.js';

test.use({
  baseURL: 'https://example.test',
  storageState: {
    cookies: [
      {
        name: 'session',
        value: 'signed-in',
        domain: 'example.test',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  },
});

test('forwards baseURL and restores cookies', async ({ extension }) => {
  await mockNavigation(extension.context);

  const page = await extension.context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL('https://example.test/');

  expect(await extension.context.cookies('https://example.test')).toEqual([
    expect.objectContaining({ name: 'session', value: 'signed-in' }),
  ]);
});

async function mockNavigation(context: BrowserContext) {
  await context.route('**/*', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Website</h1>' }),
  );
}
