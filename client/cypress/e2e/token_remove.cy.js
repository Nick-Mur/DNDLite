// Тест: удаление токена ГМ

describe('Удаление токена', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('http://localhost:5173');
  });
  afterEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });
  it('ГМ может удалить токен', () => {
    cy.get('[data-cy=session-id-input]').clear().type('test-token-remove');
    cy.get('[data-cy=connect-btn]').click();
    cy.get('input[placeholder="Имя токена"]').type('Удаляемый токен');
    cy.get('[data-cy=add-token-btn]').should('be.visible').click();
    cy.get('[data-cy=token]').first().click();
    cy.get('[data-cy=remove-token-btn]').should('be.visible').click();
    cy.get('[data-cy=token]').should('not.exist');
  });
}); 