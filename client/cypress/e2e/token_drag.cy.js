// language: JavaScript
// Тест: drag-n-drop токена по карте

describe('Перетаскивание токена', () => {
  it('Пользователь может перетащить токен по карте', () => {
    cy.visit('http://localhost:5173');
    // Добавить токен (замените селектор на актуальный для вашего UI)
    cy.get('[data-cy=add-token-btn]').click();
    // Перетащить токен (замените селектор на актуальный)
    cy.get('[data-cy=token]').first()
      .trigger('mousedown', { which: 1 })
      .trigger('mousemove', { clientX: 300, clientY: 300 })
      .trigger('mouseup', { force: true });
    // Проверить, что токен переместился (например, по координатам или стилю)
    cy.get('[data-cy=token]').first().should('have.attr', 'data-x', '300');
  });
}); 