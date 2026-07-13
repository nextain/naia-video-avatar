const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../../..');
const ARTIFACT_DIR = path.join(ROOT, '.agents', 'work', 'test-results', 'nva-state-engine');
const EXAMPLES = fs.readdirSync(path.join(ROOT, 'examples'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.endsWith('.nva') && fs.existsSync(path.join(ROOT, 'examples', entry.name, 'manifest.json')))
  .map((entry) => `examples/${entry.name}`);
const PRIMARY_STATES = ['neutral', 'happy', 'thinking', 'surprised', 'sad', 'angry'];
const QUALITY_STATES = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'thinking'];
const { execFileSync } = require('node:child_process');

function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else out.push(path.relative(root, p).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out;
}

function pngStats(file) {
  const data = fs.readFileSync(file);
  return {
    bytes: data.length,
    hash: require('node:crypto').createHash('sha256').update(data).digest('hex'),
  };
}

function sha256File(file) {
  return require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function core() {
  return import(pathToFileURL(path.join(ROOT, 'src/main/nva-core.js')).href);
}

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  return ARTIFACT_DIR;
}

test('P1 contract: samples contain state video cache assets and sync metadata', async () => {
  const nva = await core();
  for (const rel of EXAMPLES) {
    const root = path.join(ROOT, rel);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    const files = listFiles(root);
    const manifestText = JSON.stringify(manifest).toLowerCase();
    expect(manifest.prebaked_speech, `${rel}:prebaked_speech`).toBeUndefined();
    expect(manifest.vrm_slots?.speech, `${rel}:vrm_slots.speech`).toBeUndefined();
    expect(files.filter((f) => /(^|\/)say-.*\.webm$/.test(f))).toEqual([]);
    for (const banned of ['voxcpm', 'elevenlabs', 'typecast', 'audio_path']) {
      expect(manifestText.includes(banned), `${rel}:portable:${banned}`).toBe(false);
    }
    const result = nva.validateManifest(manifest, {
      clipFiles: files,
      requireStateSpecificAssets: !rel.endsWith('demo.nva'),
    });
    expect(result.errors, rel).toEqual([]);

    const engine = manifest.state_engine;
    expect(engine?.states, rel).toBeTruthy();
    expect(Object.keys(engine.states).every((key) => PRIMARY_STATES.includes(key)), `${rel}:primary states only`).toBe(true);
    if (rel.includes('-prebaked.nva')) {
      expect(new Set(Object.keys(engine.states)), `${rel}:exact generated state set`).toEqual(new Set(PRIMARY_STATES));
    }
    if (PRIMARY_STATES.every((key) => engine.states[key])) {
      expect(manifest.prosody_map?.laughing?.state, `${rel}:laughing`).toBe('happy');
      expect(manifest.prosody_map?.sigh?.state, `${rel}:sigh`).toBe('sad');
      expect(manifest.prosody_map?.hesitation?.state, `${rel}:hesitation`).toBe('thinking');
      expect(manifest.prosody_map?.gasp?.state, `${rel}:gasp`).toBe('surprised');
      expect(manifest.prosody_map?.shout?.state, `${rel}:shout`).toBe('angry');
    }
    for (const [stateKey, state] of Object.entries(engine.states)) {
      expect(state.idle, `${rel}:${stateKey}:idle`).toMatch(/^clips\//);
      expect(state.talking_body, `${rel}:${stateKey}:talking_body`).toMatch(/^clips\//);
      expect(state.talking_heads, `${rel}:${stateKey}:heads`).toBeTruthy();
      expect(state.sync?.default_hold_ms, `${rel}:${stateKey}:default_hold_ms`).toBeGreaterThan(0);
      for (const viseme of engine.visemes) {
        expect(state.talking_heads[viseme], `${rel}:${stateKey}:${viseme}`).toBeTruthy();
        expect(state.sync?.heads?.[viseme]?.duration_ms, `${rel}:${stateKey}:${viseme}:duration`).toBeGreaterThan(0);
        expect(state.sync?.heads?.[viseme]?.fps, `${rel}:${stateKey}:${viseme}:fps`).toBeGreaterThan(0);
        expect(typeof state.sync?.heads?.[viseme]?.loopable, `${rel}:${stateKey}:${viseme}:loopable`).toBe('boolean');
      }
    }
  }
});

test('P1c contract: Naia prebaked bundle preserves original idle and gesture animations', async () => {
  const root = path.join(ROOT, 'examples/naia-prebaked.nva');
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/naia.nva/manifest.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const files = listFiles(root);
  expect(manifest.animations.idle?.clip, 'naia idle preserved').toBe(source.animations.idle.clip);
  expect(files).toContain(manifest.animations.idle.clip);
  expect(manifest.animations['gesture-1']?.clip, 'water_drop gesture').toBe('clips/water_drop.webm');
  expect(manifest.animations['gesture-2']?.clip, 'heart gesture').toBe('clips/heart.webm');
  expect(manifest.vrm_slots.motions.idle.clip).toBe(source.animations.idle.clip);
  expect(manifest.vrm_slots.motions['gesture-1'].clip).toBe('clips/water_drop.webm');
  expect(manifest.vrm_slots.motions['gesture-2'].clip).toBe('clips/heart.webm');
  expect(files).toContain('clips/water_drop.webm');
  expect(files).toContain('clips/heart.webm');
  expect(manifest.state_engine.states.neutral.idle).not.toBe(manifest.animations['gesture-1'].clip);
  expect(manifest.state_engine.states.neutral.idle).not.toBe(manifest.animations['gesture-2'].clip);
});

test('P1d contract: expression previews are real distinct assets, not text/color placeholders', async () => {
  for (const rel of ['examples/naia-prebaked.nva', 'examples/osarang-prebaked.nva']) {
    const root = path.join(ROOT, rel);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    const review = JSON.parse(fs.readFileSync(path.join(root, 'asset-quality.review.json'), 'utf8'));
    const checklist = review.expression_previews?.checklist || {};
    expect(review.reviewer, `${rel}:reviewer`).toBeTruthy();
    expect(Array.isArray(review.evidence) && review.evidence.length > 0, `${rel}:evidence`).toBe(true);
    expect(review.expression_previews?.status, `${rel}:quality reviewed`).toBe('reviewed-pass');
    for (const key of ['full_head_visible', 'eyes_open', 'front_facing', 'identity_preserved', 'not_color_border_placeholder', 'no_text_label']) {
      expect(checklist[key], `${rel}:${key}`).toBe(true);
    }
    const stats = QUALITY_STATES.map((state) => [state, pngStats(path.join(root, `expressions/${state}.png`))]);
    expect(new Set(stats.map(([, s]) => s.hash)).size, `${rel}:distinct hashes`).toBe(QUALITY_STATES.length);
    for (const [state, stat] of stats) {
      expect(stat.bytes, `${rel}:${state}:nontrivial image`).toBeGreaterThan(50000);
      expect(review.expression_previews.sha256[`expressions/${state}.png`], `${rel}:${state}:hash-bound`).toBe(sha256File(path.join(root, `expressions/${state}.png`)));
    }
    const expectedStateVideoStatus = rel.includes('naia-prebaked.nva') ? 'held' : 'reviewed-pass';
    expect(review.state_videos?.status, `${rel}:state video review`).toBe(expectedStateVideoStatus);
    expect(manifest.asset_quality?.state_videos?.status, `${rel}:manifest state video status`).toBe(expectedStateVideoStatus);
    const idleHashes = new Set();
    const bodyHashes = new Set();
    for (const state of QUALITY_STATES) {
      idleHashes.add(review.state_videos.sha256[`clips/${state}/idle.webm`]);
      bodyHashes.add(review.state_videos.sha256[`clips/${state}/talking-body.webm`]);
      for (const relPath of [`clips/${state}/idle.webm`, `clips/${state}/talking-body.webm`, ...['sil','a','i','u','e','o'].map((v) => `clips/${state}/head-${v}.webm`)]) {
        expect(review.state_videos.sha256[relPath], `${rel}:${relPath}:hash-bound`).toBe(sha256File(path.join(root, relPath)));
      }
    }
    if (rel.includes('naia-prebaked.nva')) {
      expect(idleHashes.size, `${rel}:held prototype reuses source idle`).toBe(1);
      expect(review.state_videos?.checklist?.state_idle_distinct, `${rel}:idle distinct is honestly held`).toBe(false);
      expect(review.state_videos?.checklist?.full_body_idle, `${rel}:full-body idle checklist`).toBe(true);
    } else {
      expect(idleHashes.size, `${rel}:state idle distinct`).toBe(QUALITY_STATES.length);
    }
    expect(bodyHashes.size, `${rel}:state talking body distinct`).toBe(QUALITY_STATES.length);
  }
});

test('P1e contract: builder does not silently create placeholder expression images', async () => {
  const text = fs.readFileSync(path.join(ROOT, 'scripts/build-prebaked-nva.mjs'), 'utf8');
  expect(text).toContain('real expression assets required');
  expect(text).toContain('--expression-dir');
  expect(text).toContain('real state video assets required');
  expect(text).toContain('--state-asset-dir');
  expect(text).toContain('default_locale');
  expect(text).toContain('available_locales');
  expect(text).not.toContain('run("cp"');
  expect(text).not.toContain('runQuiet("find"');
  expect(text).not.toContain('viseme-${key}.webm');
  expect(text).not.toContain('function ffmpegTextClip');
  expect(text).not.toContain('function ffmpegStateImage');
});

test('P1f contract: builder runs with real expression and state asset dirs', async () => {
  const out = path.join(ROOT, `.agents/work/tmp/test-build-prebaked-js-${process.pid}.nva`);
  fs.rmSync(out, { recursive: true, force: true });
  execFileSync('node', [
    path.join(ROOT, 'scripts/build-prebaked-nva.mjs'),
    '--source', path.join(ROOT, 'examples/naia.nva'),
    '--out', out,
    '--character', 'naia',
    '--expression-dir', path.join(ROOT, 'examples/naia-prebaked.nva/expressions'),
    '--state-asset-dir', path.join(ROOT, 'examples/naia-prebaked.nva/clips'),
    '--force',
  ], { cwd: ROOT, stdio: 'pipe' });
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  expect(manifest.vrm_slots.profile.default_locale).toBe('ko-KR');
  expect(manifest.vrm_slots.profile.available_locales).toContain('ko-KR');
  expect(manifest.state_engine.states.happy.talking_heads.o).toBe('clips/happy/head-o.webm');
  expect(fs.existsSync(path.join(out, 'clips/happy/head-o.webm'))).toBe(true);
  expect(fs.existsSync(path.join(out, 'clips/viseme-o.webm'))).toBe(false);
  fs.rmSync(out, { recursive: true, force: true });
});

test('P1b contract: runtime sources do not retain legacy sentence speech paths', async () => {
  const nva = await core();
  const invalid = {
    nva_version: '0.2',
    canvas: { width: 1, height: 1 },
    animations: { idle: { clip: 'x.webm', loop: true } },
    state_engine: {
      default_state: 'neutral',
      visemes: ['sil'],
      states: {
        neutral: {
          idle: 'idle.webm',
          talking_body: 'body.webm',
          face_bbox: [0, 0, 1, 1],
          talking_heads: { sil: 'head.webm' },
          sync: { default_hold_ms: 160, heads: { sil: { duration_ms: 160, fps: 25, loopable: true } } },
        },
      },
    },
    vrm_slots: { speech: {}, visemes: {}, foo: {} },
    viseme_clips: {},
    audio_path: 'audio.wav',
  };
  const errors = nva.validateManifest(invalid).errors.join('\n');
  expect(errors).toMatch(/held prototype state_engine\.visemes must include/);
  expect(errors).toMatch(/talking_heads\.a: clip required/);
  expect(errors).toMatch(/face_preview required/);
  expect(errors).toMatch(/speech slot map/);
  expect(errors).toMatch(/viseme slot map/);
  expect(errors).toMatch(/vrm_slots.foo/);
  expect(errors).toMatch(/top-level viseme clip map/);
  expect(errors).toMatch(/cached audio path/);

  const generated = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/osarang-prebaked.nva/manifest.json'), 'utf8'));
  delete generated.state_engine.states.happy.face_preview;
  generated.state_engine.states.extra = JSON.parse(JSON.stringify(generated.state_engine.states.neutral));
  const generatedErrors = nva.validateManifest(generated).errors.join('\n');
  expect(generatedErrors).toMatch(/state_engine\.states\.happy: face_preview required/);
  expect(generatedErrors).toMatch(/state_engine\.states\.extra: not allowed in primary generated state set/);

  const sourceFiles = [
    'src/main/editor.html',
    'src/main/prebaked-player.html',
    'scripts/build-prebaked-nva.mjs',
    'scripts/generate-local-tts-wav.mjs',
  ];
  const banned = [
    'prebaked' + '_speech',
    'vrm_slots' + '.speech',
    'slots' + '.speech',
    's' + '.speech',
    'say-' + '*.webm',
    'say-' + '*.wav',
    'audio_path',
    'viseme_clips',
    'vrm_slots' + '.visemes',
    'slots' + '.visemes',
  ];
  for (const rel of sourceFiles) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const token of banned) {
      if (token.includes('*')) {
        const re = new RegExp(token.replace('.', '\\.').replace('*', '.*'));
        expect(re.test(text), `${rel}:${token}`).toBe(false);
      } else {
        expect(text.includes(token), `${rel}:${token}`).toBe(false);
      }
    }
  }
});

test('P2 contract: TTS-independent timeline adapter honors phoneme, boundary, and text fallback', async () => {
  const nva = await core();
  const visemes = ['sil', 'a', 'i', 'u', 'e', 'o'];

  const phoneme = nva.buildTtsVisemeTimeline({
    text: 'ignored',
    visemes,
    phonemes: [
      { t_ms: 10, viseme: 'a' },
      { t_ms: 70, phoneme: 'i' },
    ],
  });
  expect(phoneme.map((x) => x.viseme)).toEqual(['a', 'i']);
  expect(phoneme.map((x) => x.source)).toEqual(['phoneme', 'phoneme']);

  const boundary = nva.buildTtsVisemeTimeline({
    text: 'ao',
    visemes,
    boundaries: [
      { elapsedTime: 0.12, charIndex: 0 },
      { elapsedTime: 0.34, charIndex: 1 },
    ],
  });
  expect(boundary.map((x) => x.viseme)).toEqual(['a', 'o']);
  expect(boundary.map((x) => x.source)).toEqual(['boundary', 'boundary']);

  const fallback = nva.buildTtsVisemeTimeline({ text: 'aiueo', visemes, sync: { default_hold_ms: 160 } });
  expect(fallback.map((x) => x.viseme)).toEqual(['sil', 'a', 'i', 'u', 'e', 'o', 'sil']);
  expect(nva.visemeAtTime(fallback, 500)).toBe('u');

  const messy = nva.buildTtsVisemeTimeline({
    text: 'ao',
    visemes,
    boundaries: [
      { elapsed_ms: 300, char_index: 9 },
      { t_ms: -20, index: 0 },
      { elapsedTimeMs: 120, charIndex: 1 },
    ],
  });
  expect(messy.map((x) => x.t_ms)).toEqual([...messy.map((x) => x.t_ms)].sort((a, b) => a - b));
  expect(messy.every((x) => x.t_ms >= 0)).toBe(true);
  expect(messy.every((x) => visemes.includes(x.viseme))).toBe(true);
});

test('P2b contract: VoxCPM2 prosody tags route to primary states only', async () => {
  const nva = await core();
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/osarang-prebaked.nva/manifest.json'), 'utf8'));
  expect(nva.extractProsodyTags('[laughing] hi [sigh]').map((x) => x.tag)).toEqual(['laughing', 'sigh']);
  expect(nva.stripProsodyTags('[laughing] hello [pause] world')).toBe('hello world');
  expect(nva.routeProsodyState(manifest, '[laughing] aiueo').state).toBe('happy');
  expect(nva.routeProsodyState(manifest, '[sigh] aiueo').state).toBe('sad');
  expect(nva.routeProsodyState(manifest, '[pause] aiueo').state).toBe('thinking');
  expect(nva.routeProsodyState(manifest, '[gasp] aiueo').state).toBe('surprised');
  expect(nva.routeProsodyState(manifest, '[shout] aiueo').state).toBe('angry');
  expect(nva.routeProsodyState(manifest, '[whisper] aiueo').state).toBe('neutral');
  expect(Object.keys(manifest.prosody_map)).not.toEqual(expect.arrayContaining(PRIMARY_STATES));
  const bad = JSON.parse(JSON.stringify(manifest));
  bad.prosody_map.laughing.state = 'laughing';
  expect(nva.validateManifest(bad).errors.join('\n')).toMatch(/prosody_map\.laughing: state missing laughing/);
});

test('P3 runtime: editor uses state timeline playback, not sentence video cache', async ({ page }) => {
  const errors = [];
  const failedRequests = [];
  const assetResponses = [];
  const sentenceClipRequests = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('requestfailed', (req) => {
    if (!/ERR_ABORTED/i.test(req.failure()?.errorText || '')) failedRequests.push(req.url());
  });
  page.on('response', (res) => {
    const url = res.url();
    if (/\/clips\/.*\.webm$|\/expressions\/.*\.png$/.test(url)) assetResponses.push({ url, status: res.status() });
  });
  page.on('request', (req) => { if (req.url().includes('say-')) sentenceClipRequests.push(req.url()); });
  await page.goto('http://localhost:8785/src/main/editor.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#cv')).toBeVisible();
  await page.click('#loadOsarang');
  await page.waitForTimeout(800);
  const defaultText = await page.locator('#ttsText').inputValue();
  expect(defaultText).toMatch(/[가-힣]/);
  expect(defaultText).not.toBe('aiueo');
  await page.click('#ttsVisemeSmoke');
  await expect(page.locator('#ttsText')).toHaveValue('aiueo');
  await page.click('#ttsKoreanSample');
  await expect(page.locator('#ttsText')).toHaveValue(/[가-힣]/);
  await expect(page.locator('#ttsStatus')).toContainText(/numbers and symbols|aiueo is only/i);

  await page.locator('#exprGalleryGrid button').nth(1).click();
  await page.waitForTimeout(300);
  await page.fill('#ttsText', 'aiueo');
  await page.click('#ttsSpeak');
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.ttsStarted || false), { timeout: 5000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.headReady || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: path.join(ensureArtifactDir(), 'editor-tts-overlay.png'), fullPage: true });

  const debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.activeState).toBeTruthy();
  expect(debug.current.key).toMatch(/^state:.*:talking$/);
  expect(debug.current.clip).toMatch(/talking-body\.webm$/);
  expect(debug.engineSpeech.timeline.map((x) => x.viseme)).toEqual(['sil', 'a', 'i', 'u', 'e', 'o', 'sil']);
  expect(debug.engineSpeech.sync.mode).toMatch(/timeline|speechSynthesis\.boundary/);
  expect(debug.ttsStarted).toBe(true);
  expect(debug.ttsError).toBeNull();
  expect(debug.videoReady, 'body video ready').toBeGreaterThanOrEqual(2);
  expect(debug.headReady, 'head video ready').toBeGreaterThanOrEqual(2);
  expect(assetResponses.some((r) => /talking-body\.webm$/.test(r.url) && r.status === 200), 'talking body requested').toBe(true);
  expect(assetResponses.some((r) => /head-.*\.webm$/.test(r.url) && r.status === 200), 'head clip requested').toBe(true);
  expect(failedRequests).toEqual([]);
  expect(sentenceClipRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('P3c runtime: Naia original idle and gestures play as real media in editor', async ({ page }) => {
  const failedRequests = [];
  page.on('requestfailed', (req) => {
    if (!/ERR_ABORTED/i.test(req.failure()?.errorText || '')) failedRequests.push(req.url());
  });
  await page.goto('http://localhost:8785/src/main/editor.html', { waitUntil: 'domcontentloaded' });
  await page.click('#loadNaia');
  await page.waitForTimeout(800);

  await page.locator('#animList .item').first().click();
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.videoReady || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
  let debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.current.clip).toBe('clips/sijak.webm');

  await page.locator('#animList .item', { hasText: 'water drop' }).click();
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.videoReady || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
  debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.current.clip).toBe('clips/water_drop.webm');

  await page.locator('#animList .item', { hasText: 'heart' }).click();
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.videoReady || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
  debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.current.clip).toBe('clips/heart.webm');
  expect(failedRequests).toEqual([]);
});

test('P3d runtime: selected state exposes individual resource previews', async ({ page }) => {
  await page.goto('http://localhost:8785/src/main/editor.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('#exprGalleryGrid button', { hasText: 'sad' }).click();
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.current?.clip || ''), { timeout: 5000 }).toMatch(/clips\/sad\/idle\.webm$/);
  await expect(page.locator('#formBody .resRow')).toHaveCount(9);

  await page.locator('#formBody .resRow button[data-res-preview="face_preview"]').click();
  let debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.resourcePreview).toMatchObject({ state: 'sad', role: 'face_preview', type: 'image' });
  expect(debug.engineSpeech).toBeNull();
  await expect(page.locator('#resourcePreviewBox img')).toHaveAttribute('src', /expressions\/sad\.png$/);

  await page.locator('#formBody .resRow button[data-res-preview="idle"]').click();
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.resourcePreview?.readyState || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
  debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.resourcePreview).toMatchObject({ state: 'sad', role: 'idle', type: 'video', path: 'clips/sad/idle.webm' });
  expect(debug.current.key).toBe('state:sad:idle');
  expect(debug.engineSpeech).toBeNull();

  await page.locator('#formBody .resRow button[data-res-preview="head:a"]').click();
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.resourcePreview?.readyState || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
  debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.resourcePreview).toMatchObject({ state: 'sad', role: 'head:a', type: 'video' });
  expect(debug.resourcePreview.path).toBe('clips/sad/head-a.webm');
  expect(debug.engineSpeech).toBeNull();

  const expectedResources = [
    ['face_preview', 'image', 'expressions/sad.png'],
    ['idle', 'video', 'clips/sad/idle.webm'],
    ['talking_body', 'video', 'clips/sad/talking-body.webm'],
    ['head:sil', 'video', 'clips/sad/head-sil.webm'],
    ['head:a', 'video', 'clips/sad/head-a.webm'],
    ['head:i', 'video', 'clips/sad/head-i.webm'],
    ['head:u', 'video', 'clips/sad/head-u.webm'],
    ['head:e', 'video', 'clips/sad/head-e.webm'],
    ['head:o', 'video', 'clips/sad/head-o.webm'],
  ];
  for (const [role, type, resourcePath] of expectedResources) {
    await page.locator(`#formBody .resRow button[data-res-preview="${role}"]`).click();
    if (type === 'video') {
      await expect.poll(() => page.evaluate(() => window.__nvaDebug?.resourcePreview?.readyState || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
    }
    debug = await page.evaluate(() => window.__nvaDebug);
    expect(debug.resourcePreview).toMatchObject({ state: 'sad', role, type, path: resourcePath });
  }

  await page.fill('#ttsText', 'aiueo');
  await page.click('#ttsSpeak');
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.ttsStarted || false), { timeout: 5000 }).toBe(true);
  const before = await page.evaluate(() => ({ current: window.__nvaDebug.current, engineSpeech: window.__nvaDebug.engineSpeech }));
  await page.locator('#formBody .resRow button[data-res-preview="face_preview"]').click();
  debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.engineSpeech.state).toBe(before.engineSpeech.state);
  expect(debug.current.key).toBe(before.current.key);
  expect(debug.current.clip).toBe(before.current.clip);
});

test('P3b runtime: editor routes prosody tags to state talking preview and stores visual evidence', async ({ page }) => {
  const errors = [];
  const failedRequests = [];
  const assetResponses = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('requestfailed', (req) => {
    if (!/ERR_ABORTED/i.test(req.failure()?.errorText || '')) failedRequests.push(req.url());
  });
  page.on('response', (res) => {
    const url = res.url();
    if (/\/clips\/.*\.webm$|\/expressions\/.*\.png$/.test(url)) assetResponses.push({ url, status: res.status() });
  });
  await page.goto('http://localhost:8785/src/main/editor.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#cv')).toBeVisible();
  await page.click('#loadOsarang');
  await page.waitForTimeout(800);
  await expect(page.locator('#exprGalleryGrid button')).toHaveCount(PRIMARY_STATES.length);
  const artifactDir = ensureArtifactDir();
  await page.locator('#right').screenshot({ path: path.join(artifactDir, 'editor-state-gallery.png') });
  await page.fill('#ttsText', '[sigh] aiueo');
  await page.click('#ttsSpeak');
  await expect.poll(() => page.evaluate(() => window.__nvaDebug?.headReady || 0), { timeout: 5000 }).toBeGreaterThanOrEqual(2);
  const debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.activeState).toBe('sad');
  expect(debug.ttsRawText).toBe('[sigh] aiueo');
  expect(debug.ttsSpokenText).toBe('aiueo');
  expect(debug.ttsSpokenText).not.toContain('[sigh]');
  expect(debug.engineSpeech.state).toBe('sad');
  expect(debug.current.key).toBe('state:sad:talking');
  expect(debug.videoReady).toBeGreaterThanOrEqual(2);
  expect(debug.headReady).toBeGreaterThanOrEqual(2);
  expect(assetResponses.some((r) => /sad\/talking-body\.webm$/.test(r.url) && r.status === 200)).toBe(true);
  expect(assetResponses.some((r) => /sad\/head-.*\.webm$/.test(r.url) && r.status === 200)).toBe(true);
  expect(failedRequests).toEqual([]);
  await page.screenshot({ path: path.join(artifactDir, 'editor-prosody-sad-talking.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('P4 runtime: missing viseme head blocks TTS instead of silently playing partial cache', async ({ page }) => {
  await page.goto('http://localhost:8785/src/main/editor.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('#exprGalleryGrid button').first().click();
  await page.locator('[data-head="a"]').fill('');
  await page.locator('[data-head="a"]').dispatchEvent('change');
  await page.fill('#ttsText', 'a');
  await page.click('#ttsSpeak');
  await page.waitForTimeout(400);
  const status = (await page.locator('#ttsStatus').textContent()) || '';
  expect(status).toMatch(/State engine assets missing|blocked/i);

  await page.click('#loadOsarang');
  await page.waitForTimeout(700);
  await page.fill('#ttsText', 'aiueo');
  await page.click('#ttsSpeak');
  await page.waitForTimeout(500);
  await page.click('#ttsStop');
  await page.waitForTimeout(300);
  const debug = await page.evaluate(() => window.__nvaDebug);
  expect(debug.engineSpeech).toBeNull();
  expect(debug.current.key).toMatch(/^state:.*:idle$/);
});
