import { test, expect } from '@playwright/test';

test.describe('Перетаскивание токена', () => {
  test('Пользователь может перетащить токен по карте', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ID сессии').fill('test-token-drag');
    await page.getByRole('button', { name: /подключиться/i }).click();
    await page.getByPlaceholder('Имя токена').fill('ДрагТокен');
    await page.locator('[data-cy=add-token-btn]').click({ force: true });
    // Ждём появления токена через polling
    await expect.poll(async () => await page.locator('[data-cy=token]').count(), { timeout: 10000 }).toBeGreaterThan(0);
    const token = page.locator('[data-cy=token]');
    // Перетаскиваем токен
    await token.dragTo(page.locator('[data-cy=map-canvas]'), { targetPosition: { x: 300, y: 200 } });
    // Проверяем координаты токена
    await expect.poll(async () => await token.getAttribute('data-x'), { timeout: 5000 }).toBe('300');
    await expect.poll(async () => await token.getAttribute('data-y'), { timeout: 5000 }).toBe('200');
    // Перезагружаем страницу и проверяем, что токен остался на месте
    await page.reload();
    const tokenAfter = page.locator('[data-cy=token]');
    await expect.poll(async () => await tokenAfter.getAttribute('data-x'), { timeout: 5000 }).toBe('300');
    await expect.poll(async () => await tokenAfter.getAttribute('data-y'), { timeout: 5000 }).toBe('200');
  });
}); 