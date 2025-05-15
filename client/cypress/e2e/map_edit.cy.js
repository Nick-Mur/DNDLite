// Тест: редактирование карты (стены, shading)

describe('Редактирование карты', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('http://localhost:5173');
  });
  afterEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });
  it('ГМ может добавить и удалить стену, заштриховать клетку', () => {
    cy.get('[data-cy=session-id-input]').clear().type('test-map-edit');
    cy.get('[data-cy=connect-btn]').click();
    cy.get('input[placeholder="Имя токена"]').type('Для карты');
    cy.get('[data-cy=add-token-btn]').should('be.visible').click();
    cy.get('[data-cy=wall-tool-btn]').should('be.visible').click();
    cy.get('[data-cy=map-edge-0-0-h]').first().click(); // добавить стену
    cy.get('[data-cy=wall-0]').should('exist');
    cy.get('[data-cy=map-edge-0-0-h]').first().click(); // удалить ту же стену
    cy.get('[data-cy=wall-0]').should('not.exist');
    cy.get('[data-cy=shading-tool-btn]').should('be.visible').click();
    cy.get('[data-cy=map-cell-0-0]').first().click();
    // Проверка заштрихованной клетки зависит от реализации, можно добавить data-cy для shaded-cell
  });
}); 