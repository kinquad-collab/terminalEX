// Turns src/banks/questions.js (WITH answers) into the shipped bank (fingerprints only).
// Hands-on answers are run on both test computers; each accepted reference answer contributes one [hashA, hashB] pair.
const BAD = /command not found|: not found|is not recognized as|Bad command or file name|TerminalEX internal error|Traceback \(most recent|No such file or directory|cannot find|not recognized/i;

module.exports = async function buildBank(TX, BANK) {
  const out = {}, problems = [];
  const seen = new Set();
  for (const lesson of Object.keys(BANK)) {
    if (!TX.lessons.byId(lesson)) problems.push(`bank: unknown lesson ${lesson}`);
    out[lesson] = [];
    for (const q of BANK[lesson]) {
      if (seen.has(q.id)) problems.push(`${q.id}: duplicate id`);
      seen.add(q.id);
      if (q.t === 'mc') {
        if (!q.o.includes(q.a)) { problems.push(`${q.id}: answer is not one of the options`); continue; }
        out[lesson].push({ id: q.id, t: 'mc', q: q.q, o: q.o, h: TX.seal.answerHash(q.id, TX.certtest.normMc(q.a)), topic: q.topic || '' });
        continue;
      }
      if (!TX.SHELLS[q.shell]) { problems.push(`${q.id}: unknown shell ${q.shell}`); continue; }
      const pairs = [];
      for (const ref of q.refs) {
        const A = await TX.certtest.runOn(q, ref, 'a');
        const B = await TX.certtest.runOn(q, ref, 'b');
        if (!A.trim() || A.includes('\u0000timeout')) problems.push(`${q.id}: reference "${ref}" printed nothing or timed out`);
        else if (BAD.test(A) && !q.allowErr) problems.push(`${q.id}: reference "${ref}" failed:\n${A.split('\n').slice(0, 4).join('\n')}`);
        if (A === B && !q.same) problems.push(`${q.id}: "${ref}" gives the same output on both test computers — the question could be answered with echo. Use data from a file, or mark it same: true.`);
        const p = [TX.seal.answerHash(q.id + '|a', A), TX.seal.answerHash(q.id + '|b', B)];
        if (!pairs.some((x) => x[0] === p[0] && x[1] === p[1])) pairs.push(p);
      }
      out[lesson].push({ id: q.id, t: 'cmd', q: q.q, shell: q.shell, setup: q.setup || [], probe: q.probe || [], input: q.input || [], h: pairs, topic: q.topic || '' });
    }
    const L = TX.lessons.byId(lesson);
    if (L && out[lesson].length < TX.certtest.COUNT) problems.push(`${lesson}: only ${out[lesson].length} questions (need at least ${TX.certtest.COUNT})`);
  }
  return { bank: out, problems };
};
