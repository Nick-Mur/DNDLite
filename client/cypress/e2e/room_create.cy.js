// Тест: создание новой комнаты и подключение

describe('Создание комнаты', () => {
  it('Пользователь может создать новую комнату и подключиться', () => {
    cy.visit('http://localhost:5173');
    cy.get('[data-cy=session-id-input]').clear().type('test-room-create');
    cy.get('[data-cy=create-room-btn]').click();
    cy.url().should('include', '?room=');
    cy.get('[data-cy=connect-btn]').should('contain', 'Подключено');
  });
}); 