// Certification tests: every accepted answer passes, faked answers fail, and no answers leak into the app.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const TX = require('./load.js')();
const BANK = require('../src/banks/questions.js');

let built;
test.before(async () => {
  built = await require('../src/banks/build-bank.js')(TX, BANK);
  TX.TESTBANK = built.bank;
});

test('bank builds with no problems, and every lesson has a full test', () => {
  assert.deepStrictEqual(built.problems, []);
  TX.lessons.LIST.forEach((L) => assert.ok((built.bank[L.id] || []).length >= TX.certtest.COUNT, L.id + ' has too few questions'));
});

test('every reference answer is accepted (hands-on answers are really run)', async () => {
  for (const lesson of Object.keys(BANK)) {
    for (const q of BANK[lesson]) {
      const shipped = built.bank[lesson].find((x) => x.id === q.id);
      if (q.t === 'mc') { assert.ok(await TX.certtest.grade(shipped, q.a), q.id); assert.ok(!(await TX.certtest.grade(shipped, q.o.find((o) => o !== q.a))), q.id + ' wrong option accepted'); continue; }
      for (const ref of q.refs) assert.ok(await TX.certtest.grade(shipped, ref), `${q.id}: "${ref}" was rejected`);
    }
  }
});

test('faked hands-on answers are rejected: echoing the expected output, wrong files, nonsense', async () => {
  for (const lesson of Object.keys(BANK)) {
    for (const q of BANK[lesson].filter((x) => x.t === 'cmd' && !x.same)) {
      const shipped = built.bank[lesson].find((x) => x.id === q.id);
      const expected = (await TX.certtest.runOn(q, q.refs[0], 'a')).split('\n')[0];
      const fakes = [`echo "${expected.replace(/"/g, '')}"`, 'ls', 'echo hello', ''];
      for (const f of fakes) assert.ok(!(await TX.certtest.grade(shipped, f)), `${q.id}: fake answer accepted: ${f}`);
    }
  }
});

test('draw: 10 questions, half hands-on when the bank allows', () => {
  for (const L of TX.lessons.LIST) {
    const t = TX.certtest.draw(L.id);
    assert.strictEqual(t.length, TX.certtest.COUNT, L.id);
    assert.strictEqual(new Set(t.map((q) => q.id)).size, t.length, L.id + ' duplicates');
    if (built.bank[L.id].filter((q) => q.t === 'cmd').length >= 5) assert.strictEqual(t.filter((q) => q.t === 'cmd').length, 5, L.id);
  }
});

test('the shipped app contains no answers', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
  const m = /window\.TX\.TESTBANK = (\{.*?\});\n\}\)\(\);/s.exec(html);
  assert.ok(m, 'bank found in the build');
  const shipped = JSON.parse(m[1]);
  assert.ok(!/"(a|refs|ref|answer)":/.test(m[1]));
  // Question wording may quote commands (that is the question). Everything else shipped must not contain an answer.
  const rest = JSON.stringify(Object.values(shipped).flat().map((q) => Object.assign({}, q, { q: '', o: [] })));
  for (const lesson of Object.keys(BANK)) for (const q of BANK[lesson]) if (q.t === 'cmd') q.refs.forEach((r) => assert.ok(!rest.includes(JSON.stringify(r).slice(1, -1)), `${q.id}: reference answer "${r}" appears in the app`));
  assert.ok(Object.keys(shipped).length >= 12);
});
