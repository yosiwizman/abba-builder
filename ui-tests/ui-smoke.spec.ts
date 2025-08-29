import { test, expect } from '@playwright/test';

/**
 * Simple UI smoke test that captures screenshots of key pages.
 * Screenshots saved under ui-tests/screenshots
 */

const waitForStable = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
};

const take = async (page, name) => {
  await page.screenshot({ path: `ui-tests/screenshots/${name}.png`, fullPage: true });
};

test.describe('UI smoke screenshots', () => {
  test('home renders', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);

    // Try to wait for headline text if present, otherwise continue
    try { await page.getByText(/Build your dream app/i).waitFor({ timeout: 3000 }); } catch {}

    // Assert common error toasts are not visible in browser mode
    await expect(page.getByText(/IPC not available/i)).toHaveCount(0);
    await expect(page.getByText(/Error loading apps/i)).toHaveCount(0);

    await take(page, 'home');
  });

  test('library renders', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/library`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await expect(page.getByText(/IPC not available/i)).toHaveCount(0);
    await take(page, 'library');
  });

  test('settings renders', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/settings`, { waitUntil: 'domcontentloaded' });
    await waitForStable(page);
    await expect(page.getByText(/IPC not available/i)).toHaveCount(0);
    await take(page, 'settings');
  });
});
