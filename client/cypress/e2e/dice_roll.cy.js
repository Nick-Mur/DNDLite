// language: JavaScript
// Тест: бросок кубиков через чат-команду /roll

describe('Бросок кубиков', () => {
  it('Пользователь может бросить кубики через чат', () => {
    cy.visit('http://localhost:5173');
    cy.get('[data-cy=session-id-input]').clear().type('test-dice-roll');
    cy.get('[data-cy=connect-btn]').click();
    cy.get('[data-cy=chat-input]').should('be.visible').type('/roll 2d6+1{enter}');
    cy.get('[data-cy=chat-log]').contains('бросил 2d6+1');
  });
}); 