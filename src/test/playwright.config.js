const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './playwright',
  testMatch: /pw-.*\.spec\.js/,
  timeout: 120000,
  reporter: [['line']],
});
