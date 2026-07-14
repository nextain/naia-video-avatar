import { test, expect } from '@playwright/test';

test('state edit preserves unrelated revisions and remote request carries state', async ({ page }) => {
  let streamBody = null;
  await page.route('http://mock-cascade.invalid/**', async route => {
    const url = route.request().url();
    if (url.endsWith('/health')) return route.fulfill({ json: { ok: true } });
    if (url.endsWith('/upload_nva')) return route.fulfill({ json: { ok: true, bundle_id: 'demo' } });
    if (url.endsWith('/stream_text')) {
      streamBody = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.from('test') });
    }
    if (url.includes('/idle?')) return route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.from('test') });
    return route.fulfill({ status: 404, json: { error: 'unexpected-test-route' } });
  });
  await page.goto('http://127.0.0.1:8785/src/main/editor.html');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__nvaEditorTest?.getManifest());
  const before = await page.evaluate(() => window.__nvaEditorTest.getManifest());
  await page.evaluate(() => { window.__nvaEditorTest.selectState('seated'); window.__nvaEditorTest.endpoint('http://mock-cascade.invalid'); });
  const seatedBefore = before.character_states.seated;
  await page.locator('[data-head-field="profile_ref"]').fill('windows-e2e-profile');
  await page.locator('[data-head-field="profile_ref"]').dispatchEvent('change');
  await page.locator('#remoteSpeak').click();
  await expect(page.locator('#speakStatus')).toContainText('원격 렌더 완료');
  const after = await page.evaluate(() => window.__nvaEditorTest.getManifest());
  expect(after.character_states.neutral).toEqual(before.character_states.neutral);
  expect(after.character_states.seated.talking_head.descriptor.profile_ref).toBe('windows-e2e-profile');
  expect(after.character_states.seated.talking_head.revision.id).not.toBe(seatedBefore.talking_head.revision.id);
  expect(after.character_states.seated.revision.id).not.toBe(seatedBefore.revision.id);
  expect(streamBody.character_state_id).toBe('seated');

  await page.evaluate(() => window.__nvaEditorTest.selectGesture('wave'));
  await page.locator('#previewGesture').click();
  const preview = await page.evaluate(() => window.__nvaEditorTest.preview());
  expect(preview.mode).toBe('gesture');
  expect(preview.body_src).toMatch(/clips\/wave\.webm$/);
  expect(preview.body_loop).toBe(false);
});

test('future versions and path traversal are rejected', async ({ page }) => {
  await page.goto('http://127.0.0.1:8785/src/main/editor.html');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__nvaEditorTest?.getManifest());
  const errors = await page.evaluate(async () => {
    const base = window.__nvaEditorTest.getManifest();
    const traversal = structuredClone(base); traversal.character_states.neutral.idle.path = '../secret.webm';
    const future = structuredClone(base); future.nva_version = '0.4';
    const result = [];
    for (const value of [traversal, future]) {
      try { await window.__nvaEditorTest.loadManifest(value); result.push(''); }
      catch (error) { result.push(String(error.message || error)); }
    }
    return result;
  });
  expect(errors[0]).toContain('portable relative asset path');
  expect(errors[1]).toContain('지원하지 않는 NVA 버전');
});
