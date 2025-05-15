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

  test('Чат между двумя вкладками, скролл', async ({ page, context }) => {
    // Вкладка A
    await page.goto('/');
    await page.getByRole('button', { name: /создать/i }).click();
    const url = page.url();

    // Вкладка B
    const pageB = await context.newPage();
    await pageB.goto(url);
    await pageB.getByRole('button', { name: /подключиться/i }).click();
    await expect(pageB.getByRole('button', { name: /подключено/i })).toBeVisible();

    // A шлёт сообщение
    await page.getByPlaceholder('Сообщение или /roll 2d6+1').fill('hello');
    await page.getByRole('button', { name: /отправить/i }).click();

    // Оба видят сообщение
    await expect.poll(async () => (await page.locator('[data-cy=chat-log]').innerText()).includes('hello'), { timeout: 10000 }).toBe(true);
    await expect.poll(async () => (await pageB.locator('[data-cy=chat-log]').innerText()).includes('hello'), { timeout: 10000 }).toBe(true);

    // Проверяем скролл (эмулируем, если есть возможность)
    const isScrolledA = await page.evaluate(() => {
      const el = document.querySelector('[data-cy=chat-log]');
      return el ? el.scrollTop + el.clientHeight >= el.scrollHeight : false;
    });
    const isScrolledB = await pageB.evaluate(() => {
      const el = document.querySelector('[data-cy=chat-log]');
      return el ? el.scrollTop + el.clientHeight >= el.scrollHeight : false;
    });
    expect(isScrolledA).toBeTruthy();
    expect(isScrolledB).toBeTruthy();
  });

  // test('Инициатива: очередь и циклический порядок', async ({ page }) => {
  //   await page.goto('/');
  //   await page.getByRole('button', { name: /создать/i }).click();
  //   await expect(page).toHaveURL(/\?room=/);
  //
  //   // Старт боя
  //   await page.getByRole('button', { name: /start combat/i }).click();
  //
  //   // Добавляем три токена
  //   for (let i = 1; i <= 3; ++i) {
  //     await page.getByPlaceholder('Имя токена').fill('Токен' + i);
  //     await page.locator('[data-cy=add-token-btn]').click({ force: true });
  //     await expect.poll(async () => await page.locator('[data-cy=token]').count(), { timeout: 10000 }).toBeGreaterThanOrEqual(i);
  //     // Добавляем в очередь инициативы (если есть кнопка)
  //     if (await page.getByRole('button', { name: new RegExp('add to initiative', 'i') }).isVisible()) {
  //       await page.getByRole('button', { name: new RegExp('add to initiative', 'i') }).click();
  //     }
  //   }
  //
  //   // Ждём появления очереди
  //   await expect.poll(async () => await page.locator('[data-cy=initiative-list] li').count(), { timeout: 10000 }).toBe(3);
  //
  //   // Жмём Next turn три раза и проверяем циклический порядок
  //   let order: string[] = [];
  //   for (let i = 0; i < 3; ++i) {
  //     await page.getByRole('button', { name: /next turn/i }).click();
  //     await page.waitForTimeout(500); // даём UI обновиться
  //     order.push(await page.locator('[data-cy=initiative-list] li.selected').innerText());
  //   }
  //   // Проверяем, что порядок циклический (все три токена были выбраны)
  //   expect(new Set(order).size).toBe(3);
  // });
}); 