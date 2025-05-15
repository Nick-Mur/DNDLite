import { test, expect } from '@playwright/test';

test.describe('Кик игрока', () => {
  test('ГМ может кикнуть игрока, и тот не сможет вернуться', async ({ page, context }) => {
    // Первый пользователь (ГМ)
    await page.goto('/');
    await page.getByRole('button', { name: /создать/i }).click();
    const url = page.url();

    // Второй пользователь (игрок)
    const playerPage = await context.newPage();
    await playerPage.goto(url);
    await playerPage.evaluate(() => localStorage.setItem('client_id', 'player2'));
    await playerPage.reload();
    await playerPage.getByRole('button', { name: /подключиться/i }).click();
    await expect(playerPage.getByRole('button', { name: /подключено/i })).toBeVisible();

    // ГМ кикает игрока
    await page.reload();
    await page.getByRole('button', { name: /кик/i }).click();

    // Ожидаем alert и редирект после кика
    let alertShown = false;
    playerPage.on('dialog', async dialog => {
      alertShown = true;
      expect(dialog.message().toLowerCase()).toContain('kicked');
      await dialog.dismiss();
    });
    // Ждём появления alert (до reload)
    await expect.poll(() => alertShown, { timeout: 10000 }).toBe(true);
    // После reload должен быть редирект на главную
    await playerPage.reload();
    await expect.poll(async () => {
      const url = playerPage.url();
      return url.endsWith('/') || url.endsWith('/index.html');
    }, { timeout: 10000 }).toBe(true);
  });
}); 