/**
 * Smoke test: boots the built game in headless Chromium and actually plays it —
 * walks, runs, hops, sits to breathe and swims — failing on any console error.
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

  await page.keyboard.down('ArrowUp');
  await frames(14);
  const sWalk = await state();
  await frames(40);
  const s1 = await state();
  const walked = Math.hypot(s1.pos[0] - s0.pos[0], s1.pos[2] - s0.pos[2]);
  check('Up arrow walks forward (north)', walked > 3 && s1.pos[2] < s0.pos[2], `${walked.toFixed(1)} m`);
  check('sets off at a walk, then runs', sWalk.speed > 1 && sWalk.speed < 4.6 && s1.speed > 6.5, `${sWalk.speed.toFixed(1)} then ${s1.speed.toFixed(1)} m/s`);
  const s2 = s1;

  await page.keyboard.down('Space');
  await frames(5);
  const s3 = await state();
  check('Space hops', !s3.grounded && s3.pos[1] > s3.ground + 0.3, `${(s3.pos[1] - s3.ground).toFixed(2)} m up`);
  await page.keyboard.up('Space');
  await frames(25);
  check('lands again', (await state()).grounded);
  await page.keyboard.up('ArrowUp');

  await page.keyboard.down('ArrowRight');
  await frames(20);
  await page.keyboard.up('ArrowRight');
  const s4 = await state();
  check('Right arrow moves right (east)', s4.pos[0] > s2.pos[0] + 1);

  // Shift + arrows turn the camera instead of moving
  await frames(25);
  const before = await page.evaluate(() => ({ yaw: window.__calm.rig.yaw, p: window.__calm.debugState().pos }));
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('ArrowLeft');
  await frames(12);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('ShiftLeft');
  const after = await page.evaluate(() => ({ yaw: window.__calm.rig.yaw, p: window.__calm.debugState().pos }));
  check('Shift + arrow turns the camera, not the Calmling', Math.abs(after.yaw - before.yaw) > 0.5 && Math.hypot(after.p[0] - before.p[0], after.p[2] - before.p[2]) < 0.3, `yaw ${(after.yaw - before.yaw).toFixed(2)} rad`);

  // sit and breathe
  await page.keyboard.press('KeyB');
  await frames(6);
  const b1 = await state();
  check('B sits down and starts breathing', b1.sitting && b1.breathing && b1.breathPhase === 'in');
  check('the breathing guide is shown', await page.evaluate(() => !document.getElementById('breath').classList.contains('hidden') && document.getElementById('breath-label').textContent === 'Breathe in'));
  await frames(86);
  check('moves on from the in-breath', (await state()).breathPhase !== 'in', (await state()).breathPhase);
  await page.screenshot({ path: path.join(OUT, 'breathing.png') });
  await page.keyboard.down('ArrowUp');
  await frames(6);
  await page.keyboard.up('ArrowUp');
  const b2 = await state();
  check('moving stands up and ends the exercise', !b2.sitting && !b2.breathing && await page.evaluate(() => document.getElementById('breath').classList.contains('hidden')));

  // the touch controls drive the same inputs
  await frames(20);
  const t0 = await state();
  await page.evaluate(() => { window.__calm.input.joyY = 1; });
  await frames(30);
  await page.evaluate(() => { window.__calm.input.press('jump'); });
  await frames(4);
  const t1 = await state();
  await page.evaluate(() => { window.__calm.input.joyY = 0; window.__calm.input.release('jump'); });
  check('thumb stick and hop button work', Math.hypot(t1.pos[0] - t0.pos[0], t1.pos[2] - t0.pos[2]) > 2 && !t1.grounded);
  await frames(25);

  // meet a Calmling, invite them along, and find them in the log
  await page.evaluate(() => {
    const g = window.__calm;
    const n = g.npcs.find((x) => x.who.id === 'dadirri');
    g.player.teleport(n.pos.x + 1.6, n.pos.z + 0.4, 0);
    g.rig.snap(g.player);
  });
  await frames(4);
  check('a nearby Calmling offers a hello', (await state()).nearby === 'dadirri' && await page.evaluate(() => document.getElementById('prompt-text').textContent === 'Say hello'));
  await page.keyboard.press('KeyE');
  await frames(3);
  check('E meets them', (await state()).met.includes('dadirri'));
  await page.keyboard.press('KeyE');
  await frames(3);
  check('E again invites them along', (await state()).companion === 'dadirri');
  await page.keyboard.down('ArrowUp');
  await frames(70);
  await page.keyboard.up('ArrowUp');
  await frames(30);
  const gap = await page.evaluate(() => { const g = window.__calm; const n = g.npcs.find((x) => x.who.id === 'dadirri'); return Math.hypot(n.pos.x - g.player.pos.x, n.pos.z - g.player.pos.z); });
  const moved = await state();
  check('the companion keeps up', gap < 4 && Math.hypot(moved.pos[0] - 26, moved.pos[2] + 22) > 8, `${gap.toFixed(1)} m behind`);
  await page.keyboard.press('KeyL');
  await frames(2);
  const log = await page.evaluate(() => ({
    open: !document.getElementById('log').classList.contains('hidden'),
    items: document.querySelectorAll('.log-item').length,
    photos: document.querySelectorAll('.log-item img').length,
    pill: document.querySelectorAll('.log-item .pill').length,
    count: document.getElementById('log-count').textContent,
  }));
  check('L opens the log with 18 Calmlings, one met and walking with you', log.open && log.items === 18 && log.photos === 1 && log.pill === 1, log.count);
  await page.screenshot({ path: path.join(OUT, 'log.png') });
  await page.keyboard.press('KeyL');
  await frames(3);
  check('L closes the log', (await state()).playing);

  // a tree trunk must stop us: walk straight into the great tree
  await page.evaluate(() => { const g = window.__calm; g.player.teleport(-11, -8, 3.14); g.rig.yaw = 0; g.rig.snap(g.player); });
  await page.keyboard.down('ArrowUp');
  await frames(40);
  const s5 = await state();
  check('tree trunks are solid', Math.hypot(s5.pos[0] + 11, s5.pos[2] + 13) > 1.2, `${Math.hypot(s5.pos[0] + 11, s5.pos[2] + 13).toFixed(2)} m from trunk`);
  await page.keyboard.up('ArrowUp');

  // cliffs must not be climbable
  const cliff = await page.evaluate(() => { const g = window.__calm; g.player.teleport(-20, -92, 3.14); g.rig.yaw = 0; g.rig.snap(g.player); return g.player.pos.y; });
  await page.keyboard.down('ArrowUp');
  await frames(80);
  const s6 = await state();
  check('cliffs cannot be climbed', s6.pos[1] < cliff + 14, `rose ${(s6.pos[1] - cliff).toFixed(1)} m`);
  await page.keyboard.up('ArrowUp');

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
