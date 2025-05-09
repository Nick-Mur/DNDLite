// language: JavaScript
// Тест: загрузка карты (PNG/JPG) через UI

describe('Загрузка карты', () => {
  it('Пользователь может загрузить изображение карты', () => {
    cy.visit('http://localhost:5173');
    // Открыть диалог загрузки карты (замените селектор на актуальный для вашего UI)
    cy.get('[data-cy=upload-map-btn]').click();
    // Загрузить тестовый файл (test-map.png должен лежать в cypress/fixtures)
    cy.get('input[type=file]').selectFile('cypress/fixtures/test-map.png', { force: true });
    // Проверить, что изображение появилось на доске (замените селектор на актуальный)
    cy.get('[data-cy=map-image]').should('be.visible');
  });
}); 