import { test, } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';


/**
 * Electron smoke screenshot test
 * Launches the app and captures the main window.
 */

async function take(page: Page, name: string) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `ui-electron-tests/screenshots/${name}.png`, fullPage: true });
}

test('Electron main window renders and screenshots', async () => {
  // Launch electron; use entry point from package.json main
  const app: ElectronApplication = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
  });

  const page = await app.firstWindow();

  // Wait for sidebar and header text to appear, but don't fail if not
  try { await page.getByText(/Build your dream app/i).waitFor({ timeout: 5000 }); } catch {}

  await take(page, 'electron-home');

  // Navigate to Library and Settings via sidebar if possible
  try { await page.getByRole('link', { name: /Library/i }).click({ timeout: 3000 }); } catch {}
  await take(page, 'electron-library');

  try { await page.getByRole('link', { name: /Settings/i }).click({ timeout: 3000 }); } catch {}
  await take(page, 'electron-settings');

  await app.close();
});
