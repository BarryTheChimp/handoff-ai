import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');

    // Should see the Handoff AI branding
    await expect(page.getByText('Handoff')).toBeVisible();
    await expect(page.getByText('AI')).toBeVisible();
  });

  test('dashboard shows upload button', async ({ page }) => {
    await page.goto('/');

    // Should see the upload spec button
    await expect(page.getByRole('button', { name: /upload spec/i })).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');

    // Should see the login form
    await expect(page.getByText('Sign in to continue')).toBeVisible();
    await expect(page.getByPlaceholder('admin')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('can navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Dashboard should be accessible
    await expect(page.locator('header')).toBeVisible();

    // Navigate to a non-existent route should redirect to home
    await page.goto('/nonexistent');
    await expect(page.getByText('Handoff')).toBeVisible();
  });
});
