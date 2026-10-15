import { expect } from '@playwright/test';
import { test } from './fixtures';

test.beforeEach(async ({ welcome }) => {
  await welcome.waitForOpen();
});

test('opens the welcome page on installation and closes it', async ({ welcome, extension }) => {
  await expect(welcome.heading).toHaveText('Welcome');
  await expect(welcome.closeButton).toHaveText('Close');
  await welcome.closeButton.click();
  await extension.pollForPageClosed(welcome.page);
});

test.describe('es', () => {
  test.use({ locale: 'es' });

  test('shows Spanish text', async ({ welcome }) => {
    await expect(welcome.heading).toHaveText('Bienvenido');
    await expect(welcome.closeButton).toHaveText('Cerrar');
  });
});
