// Browser smoke test (Playwright + Chromium): drives the real page and fails on any page error OR any network request.
// Usage: npm run test:browser
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }

const FILE = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const SHOTS = process.env.SHOTS || '';
const fail = (m) => { console.error('✗ ' + m); process.exitCode = 1; };
const ok = (m) => console.log('✓ ' + m);

(async () => {
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
  const errors = [], requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url()); });
  await page.goto(FILE);
  await page.waitForSelector('.ux-overlay #w-name', { timeout: 5000 });
  ok('welcome screen asks for a name');
  await page.fill('#w-name', 'Ada Lovelace');
  await page.click('.ux-modal-foot .primary');
  await page.click('text=Yes, lock it in');
  const name = await page.evaluate(() => TX.UI.state.name);
  if (name !== 'Ada Lovelace') fail('name not locked: ' + name); else ok('name locked');
  const relock = await page.evaluate(() => TX.UI.setIdentity('Someone Else'));
  if (relock !== false) fail('name could be changed'); else ok('name cannot be changed');
  if (!(await page.isVisible('.lesson-grid'))) fail('home page lesson grid missing'); else ok('home page shows ' + (await page.$$eval('.lesson-card', (x) => x.length)) + ' lessons');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/home.png', fullPage: false });

  // every terminal opens and runs a command
  for (const k of await page.evaluate(() => TX.SHELL_ORDER)) {
    await page.evaluate((k) => TX.app.newTab(k), k);
    await page.waitForTimeout(k === 'dos' ? 900 : 300);
    await page.keyboard.type(k === 'dos' ? 'VER' : k === 'cmd' ? 'ver' : k.startsWith('pw') || k === 'powershell' ? 'Get-Location' : 'pwd');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  const visited = await page.evaluate(() => Object.keys(TX.UI.state.visited).length);
  if (visited !== 10) fail('not all terminals opened: ' + visited); else ok('all 10 terminals open and run commands');
  const badges = await page.evaluate(() => Object.keys(TX.UI.state.badges));
  if (!badges.includes('explorer') || !badges.includes('timetravel')) fail('badges missing: ' + badges); else ok('badges: ' + badges.join(', '));

  // a mission completes from typing in the terminal
  await page.evaluate(() => TX.app.newTab('bash'));
  await page.waitForTimeout(300);
  await page.keyboard.type('pwd'); await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const done = await page.evaluate(() => TX.UI.isDone('l-pwd'));
  if (!done) fail('mission l-pwd did not complete'); else ok('typing pwd completes a mission, XP = ' + (await page.evaluate(() => TX.UI.state.xp)));

  // cheat sheet: search and run
  await page.evaluate(() => TX.UI.openCheatSheet('hidden'));
  await page.waitForSelector('.cs-task');
  const runBtn = await page.$('.cs-cell[data-plat="dos"] [data-run]');
  await runBtn.click();
  await page.waitForFunction(() => { const o = document.querySelector('.cs-cell[data-plat="dos"] .cs-out'); return o && /SECRET|Volume/.test(o.textContent); }, null, { timeout: 8000 });
  ok('cheat sheet ▶ Run works (MS-DOS DIR /A)');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/cheatsheet.png' });

  // history tree
  await page.evaluate(() => TX.UI.openHistory());
  for (const id of ['unix', 'bsd', 'linux', 'msdos', 'powershell', 'solaris']) await page.click(`.tree-node[data-id="${id}"]`);
  const hn = await page.evaluate(() => TX.UI.state.stats.historyNodes);
  if (hn < 6) fail('history nodes not counted'); else ok('history tree: explored ' + hn + ', test unlocked = ' + (await page.evaluate(() => TX.UI.lessonDone(TX.lessons.byId('history')))));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/history.png' });

  // take the History certification test through the real test screen (answers read from the bank on disk)
  const BANK = require('../src/banks/questions.js');
  await page.evaluate(() => { TX.UI.closePage(); TX.UI.startTest(TX.lessons.byId('history')); });
  await page.click('text=Start the test');
  for (let k = 0; k < 10; k++) {
    await page.waitForSelector('.test-q h2');
    const q = await page.$eval('.test-q h2', (h) => h.textContent);
    const item = BANK.history.find((x) => x.q === q);
    const opts = await page.$$eval('.test-opt span', (x) => x.map((e) => e.textContent));
    await page.click(`.test-opt:nth-child(${opts.indexOf(item.a) + 1})`);
    await page.click('[data-next]');
  }
  await page.waitForSelector('.test-result', { timeout: 15000 });
  const score = await page.$eval('.test-score', (x) => x.textContent);
  if (score !== '10/10') fail('history test score ' + score); else ok('History test taken in the UI: ' + score);
  await page.click('.test-result [data-cert]');
  await page.waitForSelector('.cert-name');
  if ((await page.$eval('.cert-name', (x) => x.textContent)) !== 'Ada Lovelace') fail('certificate name'); else ok('certificate shows the locked name');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/cert.png' });

  // hands-on grading gives the same fingerprints in the browser as at build time
  const hands = [['linux', 'lx-count', 'cat groceries.txt | wc -l', true], ['dos', 'ds-sort', 'TYPE GROCERY.TXT | SORT', true], ['automation', 'au-weather', 'python3 weather_stats.py data/weather.csv Cumming', true], ['linux', 'lx-count', 'echo 13', false]];
  for (const [L, id, ans, want] of hands) {
    const got = await page.evaluate(async ([L, id, ans]) => TX.certtest.grade(TX.TESTBANK[L].find((q) => q.id === id), ans), [L, id, ans]);
    if (got !== want) fail(`browser grading ${id} "${ans}" → ${got}`); else ok(`browser grading ${id}: "${ans}" → ${got ? 'correct' : 'rejected'}`);
  }

  // progress file round trip
  const text = await page.evaluate(() => TX.UI.progressFileText());
  const good = await page.evaluate((t) => TX.UI.readProgressFile(t).ok, text);
  const bad = await page.evaluate((t) => TX.UI.readProgressFile(t.replace('"xp": ', '"xp": 1')).ok, text);
  if (!good || bad) fail('progress file seal'); else ok('progress file: genuine accepted, edited refused');

  if (requests.length) fail('network requests made (FERPA): ' + requests.join(', ')); else ok('no network requests at all');
  if (errors.length) fail('page errors:\n' + errors.join('\n')); else ok('no page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
