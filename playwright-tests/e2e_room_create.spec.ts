import { test, expect } from '@playwright/test';

test.describe('Создание комнаты', () => {
  test('Пользователь может создать новую комнату и подключиться', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ID сессии').fill('test-room-create');
    await page.locator('[data-cy=create-room-btn]').click({ force: true });
    await expect(page).toHaveURL(/\?room=/);
    await page.locator('[data-cy=connect-btn]').click({ force: true });
    await expect(page.locator('[data-cy=connect-btn]')).toHaveText(/подключено/i);
  });
}); 