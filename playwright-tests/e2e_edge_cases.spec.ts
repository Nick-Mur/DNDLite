import { test, expect } from '@playwright/test';

test.describe('Edge/Negative e2e: подключение и ошибки', () => {
  test('Нельзя подключиться с пустым ID', async ({ page }) => {
    await page.goto('/');
    const connectBtn = page.getByRole('button', { name: /подключиться/i });
    await expect(connectBtn).toBeDisabled();
  });

  test('Создание комнаты работает без ID', async ({ page }) => {
    await page.goto('/');
    const createBtn = page.getByRole('button', { name: /создать/i });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();
    // После создания должен быть редирект с ?room=...
    await expect(page).toHaveURL(/\?room=/);
  });

  test('Повторное подключение с тем же ID', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ID сессии').fill('test-edge-reconnect');
    await page.getByRole('button', { name: /подключиться/i }).click();
    await expect(page.getByRole('button', { name: /подключено/i })).toBeVisible();
    // Пробуем переподключиться (reload)
    await page.reload();
    await page.getByPlaceholder('ID сессии').fill('test-edge-reconnect');
    await page.getByRole('button', { name: /подключиться/i }).click();
    await expect(page.getByRole('button', { name: /подключено/i })).toBeVisible();
  });
}); 