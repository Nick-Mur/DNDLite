// Тест: отображение действий в Action Log

describe('Action Log', () => {
  it('Действия отображаются в логе', () => {
    cy.visit('http://localhost:5173');
    cy.get('[data-cy=session-id-input]').clear().type('test-action-log');
    cy.get('[data-cy=connect-btn]').click();
    cy.get('[data-cy=connect-btn]').should('contain.text', 'Подключено');
    cy.get('[data-cy=action-log]', { timeout: 10000 }).invoke('text').then((text) => {
      console.log('ACTION LOG (после открытия):', text);
    });
    cy.get('input[placeholder="Имя токена"]').type('Тестовый токен');
    cy.get('[data-cy=add-token-btn]').should('be.visible').click();
    cy.wait(500);
    cy.get('[data-cy=action-log]', { timeout: 10000 }).invoke('text').then((text) => {
      console.log('ACTION LOG (после добавления токена):', text);
    });
    cy.get('[data-cy=action-log]').contains('Добавлен токен');
    cy.get('[data-cy=chat-input]').type('/roll 1d6{enter}');
    cy.wait(500);
    cy.window().then(win => {
      if (win.ws) win.ws.send(JSON.stringify({ action: "get_log" }));
    });
    cy.wait(500);
    cy.get('[data-cy=action-log]', { timeout: 10000 }).invoke('text').then((text) => {
      console.log('ACTION LOG (после броска кубика):', text);
    });
    cy.get('[data-cy=action-log]').contains('Бросок');
    cy.wait(2000);
  });
}); 