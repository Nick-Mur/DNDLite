// language: JavaScript
// Тест: загрузка карты (PNG/JPG) через UI

describe('Загрузка карты', () => {
  it('Пользователь может загрузить изображение карты', () => {
    cy.visit('http://localhost:5173');
    cy.get('[data-cy=session-id-input]').clear().type('test-map-upload');
    cy.get('[data-cy=connect-btn]').click();
    cy.get('input[placeholder="Имя токена"]').type('Для загрузки');
    cy.get('[data-cy=add-token-btn]').should('be.visible').click();
    cy.get('[data-cy=upload-map-btn]').should('be.visible').click();
    cy.get('input[type=file][data-cy=upload-map-input]').selectFile('cypress/fixtures/test-map.png', { force: true });
    cy.get('[data-cy=map-image]').should('be.visible');
  });
}); 