import { expect, test } from '@playwright/test';

test('loads the app shell and map', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Walk Bike Run' })).toBeVisible();
  await expect(page.getByLabel('Route panel')).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
});
