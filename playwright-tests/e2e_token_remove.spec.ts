import { test, expect } from '@playwright/test';

test.describe('Удаление токена', () => {
  test('ГМ может удалить токен', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ID сессии').fill('test-token-remove');
    await page.getByRole('button', { name: /подключиться/i }).click();
    await page.getByPlaceholder('Имя токена').fill('Удаляемый токен');
    await page.locator('[data-cy=add-token-btn]').click({ force: true });
    await expect.poll(async () => await page.locator('[data-cy=token]').count(), { timeout: 10000 }).toBeGreaterThan(0);
    await page.locator('[data-cy=token]').first().click({ force: true });
    await page.locator('[data-cy=remove-token-btn]').click({ force: true });
    await expect(page.locator('[data-cy=token]')).not.toBeVisible();
    // Логируем токены после добавления
    const tokens = await page.evaluate(() => (window as any).useTokenStore?.getState?.().tokens || []);
    console.log('TOKENS_AFTER_ADD', tokens);
  });
}); 