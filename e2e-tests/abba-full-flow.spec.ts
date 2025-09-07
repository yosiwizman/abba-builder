import { test, expect } from '@playwright/test';

test('ABBA Builder full flow', async ({ page }) => {
  await page.goto('/');

  // Chat flow
  await page.getByText('Chat').click();
  const input = page.locator('textarea, input').first();
  await input.fill('Build a todo app');
  await input.press('Enter');
  await expect(page.locator('.chat-response').first()).toBeVisible({ timeout: 30000 });

  // Hub/NFT
  await page.getByText('Hub').click();
  await page.getByText('Create NFT').first().click();
  await expect(page.locator('.nft-form')).toBeVisible();

  // CI/CD
  await page.getByText('CI/CD').click();
  await expect(page.locator('.deployment-manager')).toBeVisible();
});
