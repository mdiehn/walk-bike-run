import { expect, test } from '@playwright/test';

test('loads the route editor shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Walk Bike Run/);
  await expect(page.getByRole('heading', { name: 'Build a route.' })).toBeVisible();
  await expect(page.getByTestId('map')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Route list' })).toBeVisible();
});

test('adds, renames, reorders, and clears route points', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Add point at map center' }).click();
  await page.getByRole('button', { name: 'Add point at map center' }).click();

  await expect(page.getByTestId('point-count')).toHaveText('2');
  await expect(page.getByTestId('point-list')).toContainText('Map point 1');
  await expect(page.getByTestId('point-list')).toContainText('Map point 2');

  await page.getByLabel('Point 2 name').fill('Turnaround');
  await page.getByLabel('Point 2 name').blur();
  await expect(page.getByTestId('point-list')).toContainText('Turnaround');

  await page.getByRole('button', { name: 'Up' }).last().click();
  await expect(page.getByLabel('Point 1 name')).toHaveValue('Turnaround');

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByTestId('point-count')).toHaveText('0');
  await expect(page.getByTestId('point-list')).toContainText('No points yet.');
});
