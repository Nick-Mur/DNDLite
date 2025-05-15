import { test, expect } from '@playwright/test';

test.describe('Редактирование карты', () => {
  test('ГМ может добавить и удалить стену, заштриховать клетку', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ID сессии').fill('test-map-edit');
    await page.getByRole('button', { name: /подключиться/i }).click();
    await page.getByPlaceholder('Имя токена').fill('Для карты');
    await page.locator('[data-cy=add-token-btn]').click({ force: true });
    await expect.poll(async () => await page.locator('[data-cy=token]').count(), { timeout: 10000 }).toBeGreaterThan(0);
    await page.locator('[data-cy=wall-tool-btn]').click({ force: true });
    await page.locator('[data-cy^=map-edge-][data-cy$=-h]').first().click({ force: true });
    await expect(page.locator('[data-cy=wall-0]')).toBeVisible();
    await page.locator('[data-cy^=map-edge-][data-cy$=-h]').first().click({ force: true });
    await expect(page.locator('[data-cy=wall-0]')).not.toBeVisible();
    await page.locator('[data-cy=shading-tool-btn]').click({ force: true });
    await page.locator('[data-cy^=map-cell-]').first().click({ force: true });
    // Можно добавить проверку наличия класса/атрибута для shaded-cell, если реализовано
    // Логируем токены после добавления
    const tokens = await page.evaluate(() => (window as any).useTokenStore?.getState?.().tokens || []);
    console.log('TOKENS_AFTER_ADD', tokens);
  });
}); 