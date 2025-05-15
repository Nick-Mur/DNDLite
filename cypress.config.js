const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'client/cypress/e2e/*.cy.js',
    supportFile: false,
  },
}); 