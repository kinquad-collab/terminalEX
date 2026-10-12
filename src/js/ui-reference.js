/* TerminalEX — the Interactive Cheat Sheet page: every task side by side on eight systems, with ▶ Run on a fresh
 * pretend computer (nothing changes on yours) and "type it in my terminal". */
(function () {
  'use strict';
  const TX = window.TX;
  const UI = TX.UI;
  const esc = UI.esc;
  const R = () => TX.reference;
  const pref = { get(k, d) { try { const v = localStorage.getItem('tx.cheat.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('tx.cheat.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } } };

  UI.openCheatSheet = (q) => {
    const PL = R().PLATS;
    let shown = pref.get('plats', ['bash', 'zsh', 'cmd', 'powershell', 'dos', 'unix']).filter((k) => PL.some((p) => p.k === k));
    if (TX.app && TX.app.active) { const k = TX.trackOf(TX.app.active.kind) === 'gitbash' ? 'bash' : TX.trackOf(TX.app.active.kind); if (PL.some((p) => p.k === k) && !shown.includes(k)) shown = [k].concat(shown); }
    let cat = '';
    const p = UI.openPage('cheat', '📘 Interactive Cheat Sheet', `
      <div class="cs-controls">
        <input class="ux-input cs-search" type="search" placeholder="Search: copy, hidden, RAID, python, ping…" value="${esc(q || '')}" aria-label="Search the cheat sheet">
        <div class="cs-cats"><button class="chip on" data-cat="">All</button>${R().CATS.map(([k, i, l]) => `<button class="chip" data-cat="${k}">${i} ${esc(l)}</button>`).join('')}</div>
        <div class="cs-plats"><span class="ux-dim">Compare:</span>${PL.map((x) => `<label class="chip-check"><input type="checkbox" value="${x.k}" ${shown.includes(x.k) ? 'checked' : ''}><span style="--c:${TX.SHELLS[x.shell].color}">${esc(x.label)}</span></label>`).join('')}</div>
        <p class="ux-dim">▶ Run tries the command on a brand-new pretend computer, so nothing changes on yours. ⤵ types it into your terminal.</p>
      </div>
      <div class="cs-list" aria-live="polite"></div>`, { cls: 'cheat-page' });
    const list = p.querySelector('.cs-list');
    const render = () => {
      const tasks = R().search(p.querySelector('.cs-search').value).filter((t) => !cat || t.cat === cat);
      const plats = PL.filter((x) => shown.includes(x.k));
      list.innerHTML = tasks.length ? tasks.map((t) => `<section class="cs-task" data-id="${t.id}">
        <header><h3>${esc(t.task)}</h3>${t.why ? `<p>${esc(t.why)}</p>` : ''}</header>
        <div class="cs-cells" style="--n:${plats.length}">${plats.map((x) => {
          const c = R().cell(t, x.k);
          const head = `<div class="cs-plat" style="--c:${TX.SHELLS[x.shell].color}">${esc(x.label)} <span>${esc(x.sub)}</span></div>`;
          if (!c.c) return `<div class="cs-cell none">${head}<p>✗ ${esc(c.none)}</p></div>`;
          return `<div class="cs-cell" data-plat="${x.k}">${head}<pre class="cs-code">${esc(c.c)}</pre>${c.n ? `<p class="cs-note">${esc(c.n)}</p>` : ''}<div class="cs-btns">${c.run === false ? '<span class="ux-dim">interactive — try it in a tab</span>' : `<button class="ux-btn small" data-run>▶ Run</button>`}<button class="ux-btn small ghost" data-type title="Type it into a ${esc(x.label)} terminal">⤵ Type it</button></div><div class="cs-out" hidden></div></div>`;
        }).join('')}</div></section>`).join('') : '<p class="ux-dim">Nothing matches. Try fewer words.</p>';
    };
    p.querySelector('.cs-search').addEventListener('input', render);
    p.querySelector('.cs-cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; p.querySelectorAll('.cs-cats .chip').forEach((x) => x.classList.toggle('on', x === b)); render(); });
    p.querySelector('.cs-plats').addEventListener('change', () => { shown = [...p.querySelectorAll('.cs-plats input:checked')].map((i) => i.value); pref.set('plats', shown); render(); });
    list.addEventListener('click', async (e) => {
      const cellEl = e.target.closest('.cs-cell'); if (!cellEl) return;
      const t = R().TASKS.find((x) => x.id === cellEl.closest('.cs-task').dataset.id), plat = cellEl.dataset.plat;
      const c = R().cell(t, plat);
      if (e.target.closest('[data-run]')) {
        const b = e.target.closest('[data-run]'), out = cellEl.querySelector('.cs-out');
        b.disabled = true; b.textContent = '… running'; out.hidden = false; out.innerHTML = '';
        try {
          const prompt = { dos: 'C:\\STUDENT>', cmd: 'C:\\Users\\student>', powershell: 'PS C:\\Users\\student> ', unix: '$ ' }[plat] || '$ ';
          const r = await R().runCell(t, plat, { echo: prompt + (prompt.endsWith(' ') ? '' : ' ') });
          out.innerHTML = UI.ansiToHtml(r.out.replace(/\n+$/, '')) || '<span class="ux-dim">(no output — that usually means it worked!)</span>';
          UI.stat('refRuns');
        } catch (err) { out.textContent = 'Could not run: ' + (err && err.message); }
        b.disabled = false; b.textContent = '▶ Run again';
      }
      if (e.target.closest('[data-type]')) {
        const shell = R().PLATS.find((x) => x.k === plat).shell;
        const first = c.c.split('\n')[0];
        UI.closePage();
        const ex = TX.app.sessions.find((s) => TX.trackOf(s.kind) === shell);
        if (ex) TX.app.activate(ex); else TX.app.newTab(shell);
        setTimeout(() => { if (TX.app.active) { TX.app.active.term.paste(first); TX.app.active.focus(); } }, ex ? 60 : 900);
        if (c.c.includes('\n')) TX.app.toast('Typed the first line. This example has more lines: check the cheat sheet for the rest.');
      }
    });
    render();
    setTimeout(() => p.querySelector('.cs-search').focus(), 30);
  };
})();
