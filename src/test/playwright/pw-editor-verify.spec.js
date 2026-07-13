const { test, expect } = require('@playwright/test');

test('editor load and controls', async ({ page }) => {
  const manifestHits = [];
  const logs = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('examples') && url.includes('manifest.json')) {
      manifestHits.push({ url, status: res.status() });
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') logs.push(msg.text());
  });
  page.on('pageerror', err => logs.push(String(err)));

  await page.setDefaultTimeout(10000);
  page.setDefaultTimeout(10000);

  await page.goto('http://localhost:8785/src/main/editor.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#cv')).toBeVisible();
  await expect(page.locator('button#loadNaia')).toBeVisible();

  const readStatus = async () => (await page.locator('#status').textContent())?.trim() || '';
  const clickAndCheck = async (id) => {
    await page.click(`#${id}`);
    await page.waitForTimeout(600);
    return readStatus();
  };

  const naia = await clickAndCheck('loadNaia');
  expect(naia).toMatch(/불러|loaded/i);

  const osarang = await clickAndCheck('loadOsarang');
  expect(osarang).toMatch(/불러|loaded/i);

  const demo = await clickAndCheck('loadDemo');
  expect(demo).toMatch(/불러|loaded/i);

  const galleryCount = await page.locator('#exprGalleryGrid button').count();
  expect(galleryCount).toBeGreaterThan(0);

  await page.locator('#exprGalleryGrid button').first().click();
  await page.waitForTimeout(300);

  await page.fill('#ttsText', '안녕하세요.');
  await page.click('#ttsSpeak');
  await page.waitForTimeout(700);
  const tts = (await page.locator('#ttsStatus').textContent())?.trim() || '';
  expect(tts.length).toBeGreaterThan(0);

  await page.click('#ttsStop');
  await page.waitForTimeout(200);

  expect(manifestHits.length).toBeGreaterThanOrEqual(3);

  console.log(JSON.stringify({ naia, osarang, demo, galleryCount, tts, manifestHits, logs }, null, 2));
});
