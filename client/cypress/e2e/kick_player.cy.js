// Тест: кик игрока ГМом

describe('Кик игрока', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('http://localhost:5173');
  });
  afterEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });
  it('ГМ может кикнуть игрока, и тот не сможет вернуться', () => {
    // Первый пользователь (ГМ)
    cy.get('[data-cy=create-room-btn]').click();
    cy.url().then(url => {
      // Второй пользователь (игрок)
      cy.visit(url, { onBeforeLoad(win) { win.localStorage.setItem('client_id', 'player2'); } });
      cy.get('[data-cy=connect-btn]', { timeout: 10000 }).should('not.be.disabled').click();
      // ГМ кикает игрока (эмулируем через ws или UI, если есть кнопка)
      // Здесь предполагается, что есть кнопка кика с data-cy=kick-player-btn-player2
      cy.visit(url); // Вернуться к ГМу
      cy.get('[data-cy=kick-player-btn-player2]').click();
      // Игрок пытается переподключиться
      cy.clearLocalStorage();
      cy.visit(url, { onBeforeLoad(win) { win.localStorage.setItem('client_id', 'player2'); } });
      cy.get('[data-cy=connect-btn]', { timeout: 10000 }).should('not.be.disabled').click();
      cy.get('body').should('contain', 'kicked');
    });
  });
}); 