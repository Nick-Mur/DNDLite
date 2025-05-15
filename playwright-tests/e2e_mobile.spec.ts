import { test, expect } from '@playwright/test';

test.describe('Мобильный e2e: главная страница', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test('Отображается форма подключения и кнопки', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('ID сессии')).toBeVisible();
    await expect(page.getByRole('button', { name: /создать/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /подключиться/i })).toBeVisible();
  });
}); 