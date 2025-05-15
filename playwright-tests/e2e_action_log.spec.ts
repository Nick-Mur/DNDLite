import { test, expect } from '@playwright/test';

test.describe('Action Log', () => {
  test('Действия отображаются в логе', async ({ page }) => {
    // Создаём комнату и подключаемся
    await page.goto('/');
    await page.getByRole('button', { name: /создать/i }).click();
    await expect(page).toHaveURL(/\?room=/);
    // Ждём появления кнопки "Добавить"
    await expect(page.locator('[data-cy=add-token-btn]')).toBeVisible();
    // Заполняем имя токена
    await page.getByPlaceholder('Имя токена').fill('Тестовый токен');
    // Кликаем "Добавить"
    await page.locator('[data-cy=add-token-btn]').click({ force: true });
    // Ждём появления токена через polling
    await expect.poll(async () => await page.locator('[data-cy=token]').count(), { timeout: 10000 }).toBeGreaterThan(0);
    // Логируем токены после добавления
    const tokensAfter = await page.evaluate(() => (window as any).useTokenStore?.getState?.().tokens || []);
    console.log('TOKENS_AFTER_ADD', tokensAfter);
    // Проверяем, что действие отображается в логе
    await expect(page.locator('[data-cy=action-log]')).toContainText('Добавлен токен');
    await page.locator('[data-cy=chat-input]').fill('/roll 1d6');
    await page.locator('[data-cy=chat-input]').press('Enter');
    // Явно запрашиваем log через ws (если нужно)
    await page.evaluate(() => (window as any).ws && (window as any).ws.send(JSON.stringify({ action: 'get_log' })));
    await expect(page.locator('[data-cy=action-log]')).toContainText('Бросок');
    // Перехват консоли браузера
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    // Перехват ошибок браузера
    page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
    // Логируем ws, clientId, sessionId
    const wsState = await page.evaluate(() => ({
      ws: !!(window as any).ws,
      clientId: (window as any).getOrCreateClientId?.(),
      sessionId: (window as any).location?.search || (window as any).location?.pathname
    }));
    console.log('WS_STATE', wsState);
  });
}); 