/* TerminalEX — certification-test engine.
 * Hands-on questions are RUN, not pattern-matched: the student's command runs on a fresh pretend computer AND on a second
 * one whose files have been changed (lines reversed, numbers shifted, an extra line added). The output must match the
 * reference answer's output on both. Any correct command passes; typing the expected text with echo does not.
 * The app ships only fingerprints (hashes) of the right results. The answers live in src/banks/questions.js. */
(function () {
  'use strict';
  const TX = window.TX;
  const COUNT = 10, PASS = 8, HANDS_ON = 5;

  // The changed computer: every .txt and .csv file under the student's folder is altered in a predictable way:
  // text files are reversed and get five extra lines; CSV rows are reversed, numbers go up by 3, and the first row repeats.
  function variantB(m) {
    const start = m.kind === 'dos' ? ['C:', 'STUDENT'] : m.home;
    const root = m.vfs.get(start);
    if (!root) return;
    const walk = (n) => {
      if (n.t === 'd') { Object.keys(n.ch).forEach((k) => walk(n.ch[k])); return; }
      if (n.t !== 'f' || n.sz || n.gen || !/\.(txt|csv)$/i.test(n.name) || typeof n.c !== 'string') return;
      const lines = n.c.replace(/\n$/, '').split('\n');
      if (/\.csv$/i.test(n.name)) {
        const head = lines.shift();
        const rows = lines.reverse().map((l) => l.replace(/(^|,)(\d+)(\.\d+)?(?=,|$)/g, (all, sep, i, d) => sep + (parseInt(i, 10) + 3) + (d || '')));
        if (rows.length) rows.push(rows[rows.length - 1]); // one row appears twice
        n.c = [head].concat(rows).join('\n') + '\n';
      } else n.c = lines.reverse().concat(['kiwi', 'apple juice', 'iced coffee', 'banana bread', 'green tea']).join('\n') + '\n';
    };
    walk(root);
  }

  // Outputs are compared after removing colors, trailing spaces and extra blank lines.
  function normOut(s) { return TX.sandbox.norm(s).replace(/\n{3,}/g, '\n\n'); }
  const normMc = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toLowerCase();

  async function runOn(q, answer, variant) {
    const shell = q.shell;
    const def = TX.SHELLS[shell];
    const m = TX.sandbox.machine(def.machine, { seed: 11, variant: variant === 'b' ? variantB : null });
    const setup = q.setup || [];
    const r = await TX.sandbox.run(shell, setup.concat([answer], q.probe || []), { machine: m, captureFrom: setup.length, input: (q.input || []).slice(), timeout: 5000, seed: 11 });
    return r.timedOut ? '\u0000timeout' : normOut(r.captured);
  }
  function cleanAnswer(a) {
    const s = String(a == null ? '' : a).replace(/\r/g, '');
    if (!s.trim() || s.includes('\n') || s.length > 400) return null;
    return s.trim();
  }
  // -> { a, b } hashes of a hands-on answer's output on both computers
  async function fingerprint(q, answer) {
    const a = cleanAnswer(answer);
    if (a == null) return null;
    return { a: TX.seal.answerHash(q.id + '|a', await runOn(q, a, 'a')), b: TX.seal.answerHash(q.id + '|b', await runOn(q, a, 'b')) };
  }
  async function grade(q, answer) {
    if (q.t === 'mc') return TX.seal.answerHash(q.id, normMc(answer)) === q.h;
    const f = await fingerprint(q, answer);
    if (!f) return false;
    return (q.h || []).some((h) => h[0] === f.a && h[1] === f.b);
  }
  // Draw a test: half hands-on, half multiple choice (whatever the bank allows), shuffled.
  function draw(lessonId, rand) {
    rand = rand || Math.random;
    const bank = (TX.TESTBANK || {})[lessonId] || [];
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const hands = shuffle(bank.filter((q) => q.t === 'cmd')), mc = shuffle(bank.filter((q) => q.t === 'mc'));
    const nh = Math.min(hands.length, HANDS_ON);
    const pick = hands.slice(0, nh).concat(mc.slice(0, COUNT - nh));
    if (pick.length < COUNT) pick.push(...hands.slice(nh, nh + COUNT - pick.length));
    return shuffle(pick);
  }

  TX.certtest = { COUNT, PASS, HANDS_ON, variantB, runOn, fingerprint, grade, draw, normOut, normMc };
})();
