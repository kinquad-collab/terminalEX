/* TerminalEX — the certification test screen. Covers everything: no hints, no cheat sheet, no terminal tabs.
 * Starting a test counts as an attempt; closing or reloading mid-test counts as a fail. A failed attempt has a
 * 2-minute review break. Results show the topics to review, never the answers. */
(function () {
  'use strict';
  const TX = window.TX;
  const UI = TX.UI;
  const esc = UI.esc;
  const BREAK_MS = 2 * 60 * 1000;
  const PROMPT = { bash: 'student@ubuntu-lab:~$', zsh: 'student@MacBook-Pro ~ %', gitbash: 'student@DESKTOP-LAB42 MINGW64 ~ $', freebsd: 'student@freebsd-lab:~ $', solaris: 'student@sol-lab:~$', unix: '$', cmd: 'C:\\Users\\student>', powershell: 'PS C:\\Users\\student>', pwsh: 'PS C:\\Users\\student>', dos: 'C:\\STUDENT>' };

  // A test left open (page closed or reloaded) is recorded as a failed attempt the next time the app starts.
  UI.settleOpenTests = () => {
    Object.keys(UI.state.tests).forEach((k) => { const t = UI.state.tests[k]; if (t.open) { t.open = 0; t.lastFail = Date.now(); t.best = t.best || 0; } });
    UI.save();
  };

  UI.startTest = (L) => {
    if (!UI.state.name) return UI.welcome();
    if (!UI.lessonDone(L)) return TX.app.toast('Finish the practice missions first.');
    const t = UI.state.tests[L.id] = UI.state.tests[L.id] || { attempts: 0, best: 0, of: TX.certtest.COUNT };
    if (t.lastFail && Date.now() - t.lastFail < BREAK_MS && !t.passed) {
      const s = Math.ceil((BREAK_MS - (Date.now() - t.lastFail)) / 1000);
      return UI.modal('Review break', `<p>Take ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} to review before trying again. Re-read the 📖 guide and redo a few missions.</p>`, [{ text: '📖 Open the guide', primary: true, onclick: () => { UI.showGuide(L); } }, { text: 'OK' }]);
    }
    UI.modal(`🎓 ${esc(L.title)}: certification test`, `<ul><li>${TX.certtest.COUNT} questions, drawn at random. About half are <b>hands-on</b>: you type a real command.</li><li>Hands-on answers are run on a pretend computer and checked by what they DO, so any command that works is right.</li><li><b>No hints, no cheat sheet, no terminal tabs.</b> You need ${TX.certtest.PASS} of ${TX.certtest.COUNT} to pass.</li><li>The attempt counts as soon as you start. Closing the page counts as a fail.</li></ul>`, [{ text: 'Not yet' }, { text: 'Start the test', primary: true, onclick: () => run(L) }]);
  };

  function run(L) {
    const t = UI.state.tests[L.id];
    t.attempts = (t.attempts || 0) + 1; t.open = 1; t.of = TX.certtest.COUNT;
    UI.saveNow();
    const qs = TX.certtest.draw(L.id);
    const answers = new Array(qs.length).fill('');
    let i = 0;
    const started = Date.now();
    const p = UI.openPage('test', `🎓 ${esc(L.title)} — test`, '<div class="test-wrap"></div>', { cls: 'test-page', back: 'Quit test', onBack: () => UI.modal('Quit the test?', '<p>Quitting now counts as a failed attempt.</p>', [{ text: 'Keep going', primary: true }, { text: 'Quit', danger: true, onclick: () => finish(true) }]) });
    document.body.classList.add('testing');
    const wrap = p.querySelector('.test-wrap');
    const show = () => {
      const q = qs[i];
      wrap.innerHTML = `<div class="test-progress">${qs.map((_, k) => `<span class="${k === i ? 'on' : answers[k] ? 'ans' : ''}"></span>`).join('')}</div>
        <div class="test-q"><div class="test-n">Question ${i + 1} of ${qs.length}${q.t === 'cmd' ? ` · hands-on · ${esc(TX.SHELLS[q.shell].label)}` : ''}</div><h2>${esc(q.q)}</h2>
        ${q.t === 'mc' ? `<div class="test-opts">${q.o.map((o, k) => `<label class="test-opt"><input type="radio" name="o" value="${k}" ${answers[i] === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`
          : `<div class="test-term"><span class="test-prompt">${esc(PROMPT[q.shell] || '$')}</span><input class="test-cmd" spellcheck="false" autocomplete="off" autocapitalize="off" value="${esc(answers[i])}" aria-label="Your command"></div>
             ${q.setup.length ? `<p class="ux-dim">Before your command runs: <code>${esc(q.setup.join(' ; '))}</code></p>` : ''}
             <button class="ux-btn small" data-try>▶ Try it</button><pre class="test-out" hidden></pre><p class="ux-dim">"Try it" shows what your command prints. It does not tell you if it is right — that is your job!</p>`}
        </div>
        <div class="test-nav"><button class="ux-btn" data-prev ${i ? '' : 'disabled'}>← Back</button><button class="ux-btn primary" data-next>${i === qs.length - 1 ? 'Finish and grade' : 'Next →'}</button></div>`;
      const inp = wrap.querySelector('.test-cmd');
      if (inp) { inp.focus(); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') wrap.querySelector('[data-try]').click(); }); }
    };
    const save = () => {
      const q = qs[i];
      if (q.t === 'mc') { const r = wrap.querySelector('input[name="o"]:checked'); answers[i] = r ? q.o[+r.value] : ''; }
      else answers[i] = wrap.querySelector('.test-cmd').value;
    };
    wrap.addEventListener('click', async (e) => {
      if (e.target.closest('[data-try]')) {
        save();
        const q = qs[i], out = wrap.querySelector('.test-out'), b = e.target.closest('[data-try]');
        if (!answers[i].trim()) return;
        b.disabled = true; out.hidden = false; out.textContent = '… running';
        out.textContent = (await TX.certtest.runOn(q, answers[i].trim(), 'a')).replace('\u0000timeout', '(it took too long — is it waiting for input?)') || '(no output)';
        b.disabled = false;
      }
      if (e.target.closest('[data-prev]')) { save(); i--; show(); }
      if (e.target.closest('[data-next]')) {
        save();
        if (i < qs.length - 1) { i++; show(); return; }
        const blank = answers.filter((a) => !String(a).trim()).length;
        if (blank) UI.modal('Some answers are blank', `<p>${blank} question${blank > 1 ? 's are' : ' is'} empty. Grade anyway?</p>`, [{ text: 'Go back' }, { text: 'Grade it', primary: true, onclick: () => finish(false) }]);
        else finish(false);
      }
    });
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input[type=radio]')) wrap.querySelector('[data-next]').click(); });
    async function finish(quit) {
      wrap.innerHTML = '<div class="test-grading"><div class="spinner"></div><p>Grading… hands-on answers are being run on two pretend computers.</p></div>';
      const ok = [];
      for (let k = 0; k < qs.length; k++) ok.push(quit ? false : await TX.certtest.grade(qs[k], answers[k]));
      const score = ok.filter(Boolean).length, passed = !quit && score >= TX.certtest.PASS;
      t.open = 0; t.best = Math.max(t.best || 0, score); t.secs = Math.round((Date.now() - started) / 1000);
      UI.stat('tests');
      if (passed && !t.passed) {
        t.passed = Date.now(); t.passScore = score; t.passAttempt = t.attempts;
        UI.state.certs[L.id] = { code: UI.makeCert(L, t), t: Date.now() };
        UI.badge('certified');
        if (score === qs.length) UI.badge('ace');
        if (Object.keys(UI.state.certs).length >= 5) UI.badge('cert-5');
        UI.addXP(50);
      } else if (!passed) t.lastFail = Date.now();
      UI.saveNow();
      document.body.classList.remove('testing');
      const missed = [...new Set(qs.filter((q, k) => !ok[k]).map((q) => q.topic).filter(Boolean))];
      wrap.innerHTML = `<div class="test-result ${passed ? 'pass' : 'fail'}"><div class="test-score">${score}/${qs.length}</div><h2>${passed ? '🎉 Passed! Certificate earned (+50 XP)' : quit ? 'Test ended' : 'Not this time'}</h2>
        ${passed ? '' : `<p>You need ${TX.certtest.PASS}. Take a 2-minute review break, then try a new set of questions.</p>`}
        ${missed.length ? `<h3>Topics to review</h3><ul>${missed.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
        <div class="test-nav">${passed ? '<button class="ux-btn primary" data-cert>🎓 See my certificate</button>' : '<button class="ux-btn primary" data-guide>📖 Review the guide</button>'}<button class="ux-btn" data-home>Home</button></div></div>`;
      wrap.onclick = (ev) => {
        if (ev.target.closest('[data-cert]')) UI.showCertificate(L);
        if (ev.target.closest('[data-guide]')) { UI.closePage(); TX.app.showLauncher(); UI.showGuide(L); }
        if (ev.target.closest('[data-home]')) { UI.closePage(); TX.app.showLauncher(); }
      };
      UI.renderHome();
    }
    show();
  }
})();
