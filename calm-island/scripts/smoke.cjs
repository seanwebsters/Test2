/**
 * Smoke test: boots the built game in headless Chromium and actually plays it —
 * walks, runs, hops and swims — failing on any console error.
 *
 *   npm run build && npm run preview &     (serves http://localhost:4173)
 *   npm run smoke
 *
 * Needs Playwright (`npm i -D playwright && npx playwright install chromium`).
 * Software rendering is slow, so waits are counted in rendered frames.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.CALM_URL || 'http://localhost:4173';
const OUT = path.join(__dirname, '..', 'test-results');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  page.setDefaultTimeout(240000);
  const problems = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || (m.type() === 'warning' && /THREE|WebGL: INVALID|shader/i.test(t))) problems.push(`${m.type()}: ${t}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  const state = () => page.evaluate(() => window.__calm.debugState());
  const frames = async (n) => {
    const start = (await state()).frames;
    await page.waitForFunction((target) => window.__calm.frames >= target, start + n);
  };
  const check = (name, ok, detail) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
    if (!ok) problems.push(`check failed: ${name}`);
  };

  await page.goto(`${URL}/?test=1&quality=low`);
  await page.waitForFunction(() => window.__calm && window.__calm.ready);
  check('game loads', true);
  await page.evaluate(() => document.getElementById('play').click());
  await frames(5);
  const s0 = await state();
  check('starts on the ground in the garden', s0.grounded && s0.playing && Math.abs(s0.pos[1] - s0.ground) < 0.05);

  await page.keyboard.down('KeyW');
  await frames(40);
  const s1 = await state();
  const walked = Math.hypot(s1.pos[0] - s0.pos[0], s1.pos[2] - s0.pos[2]);
  check('W walks forward (north)', walked > 3 && s1.pos[2] < s0.pos[2], `${walked.toFixed(1)} m, speed ${s1.speed.toFixed(1)}`);

  await page.keyboard.down('ShiftLeft');
  await frames(25);
  const s2 = await state();
  check('Shift runs faster', s2.speed > s1.speed * 1.6, `speed ${s2.speed.toFixed(1)}`);
  await page.keyboard.up('ShiftLeft');

  await page.keyboard.down('Space');
  await frames(5);
  const s3 = await state();
  check('Space hops', !s3.grounded && s3.pos[1] > s3.ground + 0.3, `${(s3.pos[1] - s3.ground).toFixed(2)} m up`);
  await page.keyboard.up('Space');
  await frames(25);
  check('lands again', (await state()).grounded);
  await page.keyboard.up('KeyW');

  await page.keyboard.down('KeyD');
  await frames(20);
  await page.keyboard.up('KeyD');
  const s4 = await state();
  check('D strafes right (east)', s4.pos[0] > s2.pos[0] + 1);

  // a tree trunk must stop us: walk straight into the great tree
  await page.evaluate(() => { const g = window.__calm; g.player.teleport(-11, -8, 3.14); g.rig.yaw = 0; g.rig.snap(g.player); });
  await page.keyboard.down('KeyW');
  await frames(40);
  const s5 = await state();
  check('tree trunks are solid', Math.hypot(s5.pos[0] + 11, s5.pos[2] + 13) > 1.2, `${Math.hypot(s5.pos[0] + 11, s5.pos[2] + 13).toFixed(2)} m from trunk`);
  await page.keyboard.up('KeyW');

  // cliffs must not be climbable
  const cliff = await page.evaluate(() => { const g = window.__calm; g.player.teleport(-20, -92, 3.14); g.rig.yaw = 0; g.rig.snap(g.player); return g.player.pos.y; });
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ShiftLeft');
  await frames(80);
  const s6 = await state();
  check('cliffs cannot be climbed', s6.pos[1] < cliff + 14, `rose ${(s6.pos[1] - cliff).toFixed(1)} m`);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');

  // swimming in the lake below the falls
  await page.evaluate(() => { const g = window.__calm; const l = g.island.lakes[0]; g.player.teleport(l.x, l.z + 8, 0); g.rig.snap(g.player); });
  await page.keyboard.down('KeyS');
  await frames(15);
  const s7 = await state();
  check('floats and swims in deep water', s7.swimming && s7.pos[1] > s7.ground + 1, `speed ${s7.speed.toFixed(1)}`);
  await page.keyboard.up('KeyS');

  await page.evaluate(() => { const g = window.__calm; g.player.teleport(0, 6, 0.5); g.rig.yaw = 0; g.rig.snap(g.player); });
  await frames(3);
  await page.keyboard.press('Escape');
  await frames(2);
  check('Esc opens the menu', await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden')));
  await page.screenshot({ path: path.join(OUT, 'menu.png') });
  await page.evaluate(() => document.getElementById('resume').click());
  await frames(3);
  check('resume returns to play', (await state()).playing);
  await page.evaluate(() => (document.getElementById('hints').style.display = 'none'));
  await page.screenshot({ path: path.join(OUT, 'garden.png') });
  check('discovered the garden', (await state()).discovered.includes('garden'));

  await browser.close();
  if (problems.length) {
    console.log('\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log('\nAll smoke checks passed.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
