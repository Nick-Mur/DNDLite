// Тест: отображение действий в Action Log

describe('Action Log', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('http://localhost:5173');
  });
  afterEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });
  it('Действия отображаются в логе', () => {
    cy.get('[data-cy=session-id-input]').clear().type('test-action-log');
    cy.get('[data-cy=connect-btn]').click();
    cy.get('[data-cy=connect-btn]').should('contain.text', 'Подключено');
    cy.get('[data-cy=action-log]', { timeout: 10000 }).should('exist');
    cy.get('input[placeholder="Имя токена"]').type('Тестовый токен');
    cy.get('[data-cy=add-token-btn]').should('be.visible').click();
    cy.get('[data-cy=action-log]').contains('Добавлен токен');
    cy.get('[data-cy=chat-input]').type('/roll 1d6{enter}');
    cy.window().then(win => {
      if (win.ws) win.ws.send(JSON.stringify({ action: "get_log" }));
    });
    cy.get('[data-cy=action-log]').contains('Бросок');
  });
}); 