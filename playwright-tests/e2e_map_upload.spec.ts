import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Загрузка карты', () => {
  test('Пользователь может загрузить изображение карты', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ID сессии').fill('test-map-upload');
    await page.getByRole('button', { name: /подключиться/i }).click();
    await page.getByPlaceholder('Имя токена').fill('Для загрузки');
    await page.locator('[data-cy=add-token-btn]').click({ force: true });
    await expect(page.locator('[data-cy=token]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-cy=upload-map-btn]').click({ force: true });
    const filePath = path.resolve('assets/11bf4bc7-0268-4876-a175-83e05a4e60a2.png');
    await page.setInputFiles('input[type=file][data-cy=upload-map-input]', filePath);
    // Ждём появления карты после загрузки
    await expect.poll(async () => await page.locator('[data-cy=map-image]').isVisible(), { timeout: 10000 }).toBe(true);
    // Логируем токены после добавления
    const tokens = await page.evaluate(() => (window as any).useTokenStore?.getState?.().tokens || []);
    console.log('TOKENS_AFTER_ADD', tokens);
    // Перезагружаем страницу и проверяем, что карта восстановилась
    await page.reload();
    await expect.poll(async () => await page.locator('[data-cy=map-image]').isVisible(), { timeout: 10000 }).toBe(true);
  });
}); 