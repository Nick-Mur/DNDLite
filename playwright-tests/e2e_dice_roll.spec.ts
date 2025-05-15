import { test, expect } from '@playwright/test';

test.describe('Бросок кубиков', () => {
  test('Пользователь может бросить кубики через чат', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('ID сессии').fill('test-dice-roll');
    await page.getByRole('button', { name: /подключиться/i }).click();
    await page.locator('[data-cy=chat-input]').fill('/roll 2d6+1');
    await page.locator('[data-cy=chat-input]').press('Enter');
    await expect(page.locator('[data-cy=chat-log]')).toContainText('бросил 2d6+1');

    // Ожидаем появления результата броска в чате
    await expect.poll(async () => {
      const logText = await page.locator('[data-cy=chat-log]').innerText();
      return /\d+d\d+.*=\s*\d+/.test(logText);
    }, { timeout: 10000 }).toBe(true);
    // Проверяем диапазон результата броска
    const logText = await page.locator('[data-cy=chat-log]').innerText();
    const match = logText.match(/=\s*(\d+)/);
    expect(match).not.toBeNull();
    const value = Number(match?.[1]);
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(13);
  });
}); 