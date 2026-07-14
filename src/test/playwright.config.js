import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  testMatch: /pw-.*\.spec\.js/,
  timeout: 120000,
  reporter: [['line']],
});
