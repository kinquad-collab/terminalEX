// Every mission can be completed: run each reference solution in order on a fresh machine per track,
// then ask the mission's own checker. Also: every lesson points at real missions.
const test = require('node:test');
const assert = require('node:assert');
const TX = require('./load.js')();
const SOL = require('./solutions.js');

const TRACK_SHELL = { bash: 'bash', zsh: 'zsh', cmd: 'cmd', powershell: 'powershell', gitbash: 'gitbash', dos: 'dos', unix: 'unix', solaris: 'solaris', freebsd: 'freebsd' };

for (const [track, shell] of Object.entries(TRACK_SHELL)) {
  test(`missions: every ${track} mission can be completed`, async () => {
    const list = TX.missions.tracks[track].list;
    const m = TX.sandbox.machine(TX.SHELLS[shell].machine, { seed: 7 });
    const log = [];
    const fails = [];
    // one shell session for the whole track, like a student working through the list
    let cwdKeep = null;
    for (const mi of list) {
      const s = SOL[mi.id] || [mi.answer];
      const lines = Array.isArray(s) ? s : s.lines;
      const input = Array.isArray(s) ? [] : s.input || [];
      const r = await TX.sandbox.run(shell, lines, { machine: m, input, timeout: 8000, cwd: cwdKeep, seed: 7 });
      cwdKeep = r.sh.cwd;
      lines.forEach((l) => log.push(l.trim()));
      let ok = false;
      try { ok = !!mi.check({ log, m, vfs: m.vfs }); } catch (e) { ok = false; }
      if (!ok) fails.push(`${mi.id} (${mi.title}) after: ${lines.join(' ⏎ ')}\n${TX.sandbox.norm(r.out).split('\n').slice(-6).map((x) => '      | ' + x).join('\n')}`);
    }
    assert.deepStrictEqual(fails, [], `${fails.length} ${track} missions could not be completed:\n` + fails.join('\n'));
  });
}

test('lessons: every lesson mission exists, and every mission belongs to a lesson', () => {
  const inLessons = new Set(TX.lessons.LIST.flatMap((l) => l.missions));
  TX.lessons.LIST.forEach((l) => l.missions.forEach((id) => assert.ok(TX.lessons.mission(id), `${l.id} lists unknown mission ${id}`)));
  const orphans = [];
  Object.entries(TX.missions.tracks).forEach(([k, t]) => { if (k !== 'pwsh') t.list.forEach((mi) => { if (!inLessons.has(mi.id)) orphans.push(mi.id); }); });
  assert.deepStrictEqual(orphans, []);
});
