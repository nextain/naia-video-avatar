import { test, expect } from '@playwright/test';

test('NVA v0.3 editor loads the state-resource contract', async ({ page }) => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto('http://127.0.0.1:8785/src/main/editor.html');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__nvaEditorTest?.getManifest());
  const manifest = await page.evaluate(() => window.__nvaEditorTest.getManifest());
  expect(manifest.nva_version).toBe('0.3');
  expect(Object.keys(manifest.character_states).sort()).toEqual(['neutral', 'seated']);
  await expect(page.locator('#validation')).toContainText('VALID');
  await expect(page.locator('#stateList .item')).toHaveCount(2);
  expect(errors).toEqual([]);
});
