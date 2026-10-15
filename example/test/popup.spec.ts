import { expect } from '@playwright/test';
import { test } from './fixtures';

test('opens and closes the popup', async ({ popup, extension }) => {
  await popup.open();
  await expect(popup.heading).toHaveText('Popup');
  await expect(popup.closeButton).toHaveText('Close');
  await popup.closeButton.click();
  await extension.pollForPageClosed(popup.page);
});

test.describe('es', () => {
  test.use({ locale: 'es' });

  test('shows Spanish text', async ({ popup }) => {
    await popup.open();
    await expect(popup.heading).toHaveText('Ventana emergente');
    await expect(popup.closeButton).toHaveText('Cerrar');
  });
});
