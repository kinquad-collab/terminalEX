/* TerminalEX — certificates: shown on screen, printable / savable as PDF, downloadable as an image. */
(function () {
  'use strict';
  const TX = window.TX;
  const UI = TX.UI;
  const esc = UI.esc;

  UI.showCertificate = (L) => {
    const rec = UI.state.certs[L.id];
    if (!rec) return;
    const r = UI.readCert(rec.code);
    if (!r.ok) return UI.modal('Certificate problem', `<p>${esc(r.why)}</p>`, [{ text: 'OK' }]);
    const c = r.cert;
    const p = UI.openPage('cert', '🎓 Certificate', `
      <div class="cert" id="cert">
        <div class="cert-inner">
          <div class="cert-logo">Terminal<b>EX</b></div>
          <div class="cert-kicker">Certificate of Completion</div>
          <div class="cert-this">This certifies that</div>
          <div class="cert-name">${esc(c.name)}</div>
          <div class="cert-this">has completed</div>
          <div class="cert-lesson">Lesson ${c.n}: ${esc(c.title)}</div>
          <ul class="cert-skills">${L.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
          <div class="cert-facts"><span>Test score <b>${c.score}/${c.of}</b></span><span>Attempt <b>${c.attempt}</b></span><span>Practice missions <b>${c.missions}</b></span><span>Missions with hints <b>${c.hints}</b></span><span>Date <b>${esc(c.date)}</b></span></div>
          <div class="cert-code">Verification: the student's sealed progress file. Code ${esc(rec.code.slice(-12))}</div>
        </div>
      </div>
      <p class="cert-actions"><button class="ux-btn primary" data-print>🖨 Print / save as PDF</button> <button class="ux-btn" data-img>⬇ Download image</button></p>`, { cls: 'cert-page' });
    p.querySelector('[data-print]').addEventListener('click', () => window.print());
    p.querySelector('[data-img]').addEventListener('click', () => drawImage(c, L));
  };

  function drawImage(c, L) {
    const W = 1600, H = 1130;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1f6f4a'; g.lineWidth = 14; g.strokeRect(40, 40, W - 80, H - 80);
    g.strokeStyle = '#39d98a'; g.lineWidth = 3; g.strokeRect(70, 70, W - 140, H - 140);
    g.textAlign = 'center'; g.fillStyle = '#16181d';
    const t = (s, y, font, color) => { g.font = font; g.fillStyle = color || '#16181d'; g.fillText(s, W / 2, y); };
    t('TerminalEX', 170, '700 56px Georgia, serif', '#1f6f4a');
    t('CERTIFICATE OF COMPLETION', 240, '600 30px Helvetica, Arial, sans-serif', '#555');
    t('This certifies that', 330, 'italic 30px Georgia, serif', '#444');
    t(c.name, 420, '700 76px Georgia, serif');
    t('has completed', 490, 'italic 30px Georgia, serif', '#444');
    t(`Lesson ${c.n}: ${c.title}`, 570, '700 44px Helvetica, Arial, sans-serif', '#1f6f4a');
    L.skills.slice(0, 4).forEach((s, i) => t('• ' + s, 650 + i * 44, '28px Helvetica, Arial, sans-serif', '#333'));
    t(`Test ${c.score}/${c.of}  ·  Attempt ${c.attempt}  ·  ${c.missions} practice missions  ·  ${c.date}`, 900, '600 28px Helvetica, Arial, sans-serif', '#333');
    t('Verified by the student\'s sealed TerminalEX progress file', 1000, '22px Helvetica, Arial, sans-serif', '#777');
    try {
      cv.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `TerminalEX-Certificate-${c.n}-${c.name.replace(/[^A-Za-z0-9]+/g, '-')}.png`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); });
    } catch (e) { TX.app.toast('Downloads are blocked here — use Print / save as PDF instead.'); }
  }
})();
