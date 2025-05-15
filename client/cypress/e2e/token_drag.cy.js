// language: JavaScript
// Тест: drag-n-drop токена по карте

describe('Перетаскивание токена', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('http://localhost:5173');
  });
  afterEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });
  it('Пользователь может перетащить токен по карте', () => {
    cy.get('[data-cy=session-id-input]').clear().type('test-token-drag');
    cy.get('[data-cy=connect-btn]').click();
    cy.get('input[placeholder="Имя токена"]').type('ДрагТокен');
    cy.get('[data-cy=add-token-btn]').should('be.visible').click();
    cy.get('[data-cy=token]').first().click();
    cy.get('[data-cy=token]').first()
      .trigger('mousedown', { which: 1 })
      .trigger('mousemove', { clientX: 300, clientY: 300 })
      .trigger('mouseup', { force: true });
    cy.get('[data-cy=token]').first().should('have.attr', 'data-x', '300');
  });
}); 