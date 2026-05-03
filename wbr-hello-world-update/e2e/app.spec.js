import { expect, test } from '@playwright/test';

test('loads the hello world map shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Walk Bike Run/);
  await expect(page.getByRole('heading', { name: 'Hello, map.' })).toBeVisible();
  await expect(page.getByTestId('map')).toBeVisible();
  await expect(page.getByText('Desktop/mobile sanity test')).toBeVisible();
});

test('adds and clears a sample point', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Add sample point' }).click();
  await expect(page.getByTestId('point-count')).toHaveText('1');
  await expect(page.getByTestId('point-list')).toContainText('Sample point 1');

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByTestId('point-count')).toHaveText('0');
});
