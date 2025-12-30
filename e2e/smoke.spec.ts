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

test.describe('API Health Checks', () => {
  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
  });

  test('auth login endpoint exists', async ({ request }) => {
    const response = await request.post('http://localhost:3001/api/auth/login', {
      data: { username: 'invalid', password: 'invalid' },
    });
    // Should return 401, not 404
    expect(response.status()).toBe(401);
  });

  test('protected routes require auth', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/specs');
    expect(response.status()).toBe(401);
  });
});

test.describe('Authentication Flow', () => {
  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after login
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder="admin"]', 'wrong');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.bg-toucan-error\\/20, [class*="error"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Accessibility', () => {
  test('login page has accessible form', async ({ page }) => {
    await page.goto('/login');

    // Form should have proper labels
    await expect(page.getByText('Username')).toBeVisible();
    await expect(page.getByText('Password')).toBeVisible();

    // Button should be accessible
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeEnabled();
  });
});

test.describe('Performance', () => {
  test('login page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('API health check responds quickly', async ({ request }) => {
    const startTime = Date.now();
    await request.get('http://localhost:3001/api/health');
    const responseTime = Date.now() - startTime;

    // API should respond in under 500ms
    expect(responseTime).toBeLessThan(500);
  });
});
