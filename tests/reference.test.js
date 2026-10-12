// Every runnable Interactive Cheat Sheet example must actually run on its own platform:
// no "command not found", no "not recognized", no "Bad command", no simulator bugs.
const test = require('node:test');
const assert = require('node:assert');
const TX = require('./load.js')();

const BAD = /command not found|: not found|is not recognized as|Bad command or file name|TerminalEX internal error|is not recognized as the name of a cmdlet|\[stopped: the command took too long\]|Traceback \(most recent/;

test('cheat sheet: every platform cell is filled in or explained', () => {
  for (const t of TX.reference.TASKS) for (const p of TX.reference.PLATS) {
    const c = TX.reference.cell(t, p.k);
    assert.ok(c.c || c.none, `${t.id}/${p.k} is empty`);
  }
});

test('cheat sheet: every runnable example runs cleanly', async () => {
  const fails = [];
  for (const t of TX.reference.TASKS) for (const p of TX.reference.PLATS) {
    const c = TX.reference.cell(t, p.k);
    if (!c.c || c.run === false) continue;
    const r = await TX.reference.runCell(t, p.k, { timeout: 6000 });
    const m = BAD.exec(TX.stripAnsi(r.out));
    if (m) fails.push(`${t.id} [${p.k}] ${c.c.replace(/\n/g, ' ⏎ ')}\n    → ${TX.stripAnsi(r.out).split('\n').filter((l) => BAD.test(l))[0]}`);
  }
  assert.deepStrictEqual(fails, [], fails.length + ' examples failed:\n' + fails.join('\n'));
});
