/* TerminalEX — shared utilities (ANSI, formatting, globbing, diff, hashing) */
(function () {
  'use strict';
  const TX = (window.TX = window.TX || {});

  // ---------------------------------------------------------------- ANSI
  const ESC = '\x1b[';
  const codes = {
    reset: 0, bold: 1, dim: 2, italic: 3, underline: 4, inverse: 7,
    black: 30, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, white: 37,
    gray: 90, brightRed: 91, brightGreen: 92, brightYellow: 93, brightBlue: 94,
    brightMagenta: 95, brightCyan: 96, brightWhite: 97,
    bgBlack: 40, bgRed: 41, bgGreen: 42, bgYellow: 43, bgBlue: 44, bgMagenta: 45, bgCyan: 46, bgWhite: 47,
    bgGray: 100, bgBrightRed: 101, bgBrightGreen: 102, bgBrightYellow: 103, bgBrightBlue: 104,
  };
  const C = {};
  Object.keys(codes).forEach((k) => {
    C[k] = (s) => ESC + codes[k] + 'm' + s + ESC + '0m';
  });
  C.code = (n) => ESC + n + 'm';
  C.rgb = (r, g, b, s) => ESC + '38;2;' + r + ';' + g + ';' + b + 'm' + s + ESC + '0m';
  C.c256 = (n, s) => ESC + '38;5;' + n + 'm' + s + ESC + '0m';
  C.style = (styles, s) => ESC + styles.map((x) => codes[x]).join(';') + 'm' + s + ESC + '0m';
  TX.C = C;

  const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g;
  TX.stripAnsi = (s) => String(s).replace(ANSI_RE, '');
  TX.visLen = (s) => TX.stripAnsi(s).length;
  TX.padR = (s, n, ch = ' ') => { s = String(s); const l = TX.visLen(s); return l >= n ? s : s + ch.repeat(n - l); };
  TX.padL = (s, n, ch = ' ') => { s = String(s); const l = TX.visLen(s); return l >= n ? s : ch.repeat(n - l) + s; };
  TX.center = (s, n) => { s = String(s); const l = TX.visLen(s); if (l >= n) return s; const a = Math.floor((n - l) / 2); return ' '.repeat(a) + s + ' '.repeat(n - l - a); };
  TX.trunc = (s, n) => { s = String(s); return s.length > n ? s.slice(0, Math.max(0, n - 3)) + '...' : s; };

  // ---------------------------------------------------------------- numbers & sizes
  TX.fmtNum = (n) => Number(n).toLocaleString('en-US');
  TX.human = (bytes, opts = {}) => {
    const base = opts.si ? 1000 : 1024;
    const units = opts.long ? ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] : ['', 'K', 'M', 'G', 'T', 'P'];
    let i = 0, n = bytes;
    while (n >= base && i < units.length - 1) { n /= base; i++; }
    if (i === 0) return String(Math.round(n)) + (opts.long ? ' B' : '');
    const s = n < 10 ? (Math.ceil(n * 10) / 10).toFixed(1) : String(Math.ceil(n));
    return s + (opts.long ? ' ' : '') + units[i];
  };
  TX.gb = (n) => n * 1024 * 1024 * 1024;
  TX.mb = (n) => n * 1024 * 1024;
  TX.rand = (a, b) => a + Math.random() * (b - a);
  TX.randInt = (a, b) => Math.floor(TX.rand(a, b + 1));
  TX.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------------------------------------------------------------- dates
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  TX.MON = MON; TX.DAY = DAY; TX.MONTHS = MONTHS; TX.DAYS = DAYS;
  const p2 = (n) => String(n).padStart(2, '0');
  TX.p2 = p2;
  TX.lsDate = (ms) => {
    const d = new Date(ms);
    const sixMonths = 1000 * 60 * 60 * 24 * 182;
    const tail = Date.now() - ms > sixMonths ? ' ' + String(d.getFullYear()).padStart(5) : ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
    return MON[d.getMonth()] + ' ' + String(d.getDate()).padStart(2) + tail;
  };
  TX.winDate = (ms) => { const d = new Date(ms); return p2(d.getMonth() + 1) + '/' + p2(d.getDate()) + '/' + d.getFullYear(); };
  TX.winTime = (ms) => { const d = new Date(ms); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return p2(h) + ':' + p2(d.getMinutes()) + ' ' + ap; };
  TX.psDate = (ms) => { const d = new Date(ms); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' + String(h).padStart(2) + ':' + p2(d.getMinutes()) + ' ' + ap; };
  TX.psLongDate = (ms) => { const d = new Date(ms); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' + h + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + ' ' + ap; };
  TX.unixDate = (ms, tz = 'EDT') => { const d = new Date(ms); return DAY[d.getDay()] + ' ' + MON[d.getMonth()] + ' ' + String(d.getDate()).padStart(2) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + ' ' + tz + ' ' + d.getFullYear(); };
  TX.gitDate = (ms) => { const d = new Date(ms); const off = -d.getTimezoneOffset(); const sign = off >= 0 ? '+' : '-'; const oh = p2(Math.floor(Math.abs(off) / 60)), om = p2(Math.abs(off) % 60); return DAY[d.getDay()] + ' ' + MON[d.getMonth()] + ' ' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + ' ' + d.getFullYear() + ' ' + sign + oh + om; };
  TX.isoDate = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); };
  TX.relTime = (ms) => {
    const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
    const u = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']];
    for (const [n, w] of u) if (s >= n) { const k = Math.floor(s / n); return k + ' ' + w + (k > 1 ? 's' : '') + ' ago'; }
    return 'just now';
  };
  TX.uptimeStr = (bootMs) => {
    const s = Math.floor((Date.now() - bootMs) / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return (d ? d + ' day' + (d > 1 ? 's' : '') + ', ' : '') + (h ? h + ':' + p2(m) : m + ' min');
  };

  // ---------------------------------------------------------------- glob
  TX.hasGlob = (s) => /[*?[]/.test(s);
  TX.globToRegex = (pat, ci) => {
    let re = '^';
    for (let i = 0; i < pat.length; i++) {
      const c = pat[i];
      if (c === '*') re += '[^/]*';
      else if (c === '?') re += '[^/]';
      else if (c === '[') {
        const j = pat.indexOf(']', i + 1);
        if (j < 0) { re += '\\['; continue; }
        let cls = pat.slice(i + 1, j);
        if (cls[0] === '!') cls = '^' + cls.slice(1);
        re += '[' + cls.replace(/\\/g, '\\\\') + ']';
        i = j;
      } else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
    }
    return new RegExp(re + '$', ci ? 'i' : '');
  };
  // PowerShell -like wildcard
  TX.likeToRegex = (pat, cs) => {
    let re = '^';
    for (const c of String(pat)) {
      if (c === '*') re += '.*';
      else if (c === '?') re += '.';
      else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(re + '$', cs ? '' : 'i');
  };

  // ---------------------------------------------------------------- columns (ls-style)
  TX.columns = (items, width, sep = 2) => {
    if (!items.length) return '';
    const lens = items.map((s) => TX.visLen(s));
    for (let cols = Math.min(items.length, Math.floor(width / 2) || 1); cols >= 1; cols--) {
      const rows = Math.ceil(items.length / cols);
      const cw = [];
      for (let c = 0; c < cols; c++) {
        let m = 0;
        for (let r = 0; r < rows; r++) { const i = c * rows + r; if (i < items.length) m = Math.max(m, lens[i]); }
        cw.push(m);
      }
      const total = cw.reduce((a, b) => a + b, 0) + sep * (cols - 1);
      if (total <= width || cols === 1) {
        const out = [];
        for (let r = 0; r < rows; r++) {
          let line = '';
          for (let c = 0; c < cols; c++) {
            const i = c * rows + r;
            if (i >= items.length) continue;
            const last = c === cols - 1 || (c + 1) * rows + r >= items.length;
            line += last ? items[i] : TX.padR(items[i], cw[c] + sep);
          }
          out.push(line);
        }
        return out.join('\n');
      }
    }
    return items.join('\n');
  };

  // simple aligned table: rows = array of arrays; align = array of 'l'|'r'
  TX.table = (rows, align = [], sep = ' ') => {
    const w = [];
    rows.forEach((r) => r.forEach((c, i) => { w[i] = Math.max(w[i] || 0, TX.visLen(c)); }));
    return rows.map((r) => r.map((c, i) => (i === r.length - 1 && align[i] !== 'r') ? String(c) : (align[i] === 'r' ? TX.padL(c, w[i]) : TX.padR(c, w[i]))).join(sep)).join('\n');
  };

  // ---------------------------------------------------------------- diff (LCS)
  TX.diffLines = (a, b) => {
    // returns array of {op:' '|'-'|'+', line}
    const A = a, B = b, n = A.length, m = B.length;
    if (n * m > 4e6) return A.map((l) => ({ op: '-', line: l })).concat(B.map((l) => ({ op: '+', line: l })));
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ op: ' ', line: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ op: '-', line: A[i++] }); }
      else out.push({ op: '+', line: B[j++] });
    }
    while (i < n) out.push({ op: '-', line: A[i++] });
    while (j < m) out.push({ op: '+', line: B[j++] });
    return out;
  };
  TX.splitLines = (s) => { if (s === '' || s == null) return []; const L = String(s).split('\n'); if (L[L.length - 1] === '') L.pop(); return L; };
  // unified diff hunks
  TX.unifiedDiff = (aText, bText, ctx = 3) => {
    const d = TX.diffLines(TX.splitLines(aText), TX.splitLines(bText));
    const hunks = [];
    let ai = 1, bi = 1;
    const marks = d.map((x) => { const r = { ...x, a: ai, b: bi }; if (x.op !== '+') ai++; if (x.op !== '-') bi++; return r; });
    let i = 0;
    while (i < marks.length) {
      if (marks[i].op === ' ') { i++; continue; }
      let start = Math.max(0, i - ctx), end = i;
      while (end < marks.length) {
        if (marks[end].op !== ' ') { end++; continue; }
        let k = end; while (k < marks.length && marks[k].op === ' ') k++;
        if (k < marks.length && k - end <= ctx * 2) { end = k; continue; }
        end = Math.min(marks.length, end + ctx); break;
      }
      const lines = marks.slice(start, end);
      const aStart = lines[0].a, bStart = lines[0].b;
      const aLen = lines.filter((l) => l.op !== '+').length, bLen = lines.filter((l) => l.op !== '-').length;
      hunks.push({ header: '@@ -' + (aLen ? aStart : aStart - 1) + (aLen !== 1 ? ',' + aLen : '') + ' +' + (bLen ? bStart : bStart - 1) + (bLen !== 1 ? ',' + bLen : '') + ' @@', lines });
      i = end;
    }
    return hunks;
  };

  // ---------------------------------------------------------------- hashes (sync, small inputs)
  function utf8(str) { return new TextEncoder().encode(str); }
  function hex(words, n) { let s = ''; for (let i = 0; i < n; i++) s += (words[i] >>> 0).toString(16).padStart(8, '0'); return s; }
  TX.sha1 = (str) => {
    const b = utf8(str), l = b.length, nb = ((l + 8) >> 6) + 1, w = new Uint32Array(nb * 16);
    for (let i = 0; i < l; i++) w[i >> 2] |= b[i] << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[nb * 16 - 1] = l * 8;
    let [h0, h1, h2, h3, h4] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    const W = new Uint32Array(80);
    for (let i = 0; i < w.length; i += 16) {
      for (let t = 0; t < 80; t++) { W[t] = t < 16 ? w[i + t] : ((x) => (x << 1) | (x >>> 31))(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16]); }
      let [a, bb, c, d, e] = [h0, h1, h2, h3, h4];
      for (let t = 0; t < 80; t++) {
        const f = t < 20 ? (bb & c) | (~bb & d) : t < 40 ? bb ^ c ^ d : t < 60 ? (bb & c) | (bb & d) | (c & d) : bb ^ c ^ d;
        const k = t < 20 ? 0x5a827999 : t < 40 ? 0x6ed9eba1 : t < 60 ? 0x8f1bbcdc : 0xca62c1d6;
        const tmp = (((a << 5) | (a >>> 27)) + f + e + k + W[t]) >>> 0;
        e = d; d = c; c = (bb << 30) | (bb >>> 2); bb = a; a = tmp;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + bb) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    return hex([h0, h1, h2, h3, h4], 5);
  };
  TX.sha256 = (str) => {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const b = utf8(str), l = b.length, nb = ((l + 8) >> 6) + 1, w = new Uint32Array(nb * 16);
    for (let i = 0; i < l; i++) w[i >> 2] |= b[i] << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[nb * 16 - 1] = l * 8;
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    const W = new Uint32Array(64);
    for (let i = 0; i < w.length; i += 16) {
      for (let t = 0; t < 64; t++) {
        if (t < 16) W[t] = w[i + t];
        else { const s0 = rr(W[t - 15], 7) ^ rr(W[t - 15], 18) ^ (W[t - 15] >>> 3); const s1 = rr(W[t - 2], 17) ^ rr(W[t - 2], 19) ^ (W[t - 2] >>> 10); W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0; }
      }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return hex(H, 8);
  };
  TX.md5 = (str) => {
    const b = utf8(str), l = b.length, nb = ((l + 8) >> 6) + 1, x = new Uint32Array(nb * 16);
    for (let i = 0; i < l; i++) x[i >> 2] |= b[i] << ((i % 4) * 8);
    x[l >> 2] |= 0x80 << ((l % 4) * 8); x[nb * 16 - 2] = (l * 8) >>> 0;
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const T = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let i = 0; i < x.length; i += 16) {
      let A = a0, B = b0, Cc = c0, D = d0;
      for (let j = 0; j < 64; j++) {
        let F, g;
        if (j < 16) { F = (B & Cc) | (~B & D); g = j; } else if (j < 32) { F = (D & B) | (~D & Cc); g = (5 * j + 1) % 16; } else if (j < 48) { F = B ^ Cc ^ D; g = (3 * j + 5) % 16; } else { F = Cc ^ (B | ~D); g = (7 * j) % 16; }
        const s = S[(j >> 4) * 4 + (j % 4)];
        const tmp = D; D = Cc; Cc = B;
        const sum = (A + F + T[j] + x[i + g]) >>> 0;
        B = (B + ((sum << s) | (sum >>> (32 - s)))) >>> 0; A = tmp;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + Cc) >>> 0; d0 = (d0 + D) >>> 0;
    }
    return [a0, b0, c0, d0].map((v) => [0, 8, 16, 24].map((s) => ((v >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('');
  };

  TX.b64encode = (s) => btoa(String.fromCharCode(...utf8(s)));
  TX.b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s+/g, '')), (c) => c.charCodeAt(0)));

  TX.sleep = (ms, signal) => new Promise((res, rej) => {
    if (signal && signal.aborted) return rej(new TX.Interrupt());
    const t = setTimeout(() => { if (signal) signal.off(onAbort); res(); }, ms);
    const onAbort = () => { clearTimeout(t); rej(new TX.Interrupt()); };
    if (signal) signal.on(onAbort);
  });
  TX.Interrupt = class Interrupt extends Error { constructor() { super('^C'); this.interrupt = true; } };
  TX.ExitShell = class ExitShell extends Error { constructor(code = 0) { super('exit'); this.exitShell = true; this.code = code; } };

  // simple abort signal
  TX.Signal = class Signal {
    constructor() { this.aborted = false; this.listeners = []; }
    on(f) { this.listeners.push(f); }
    off(f) { this.listeners = this.listeners.filter((x) => x !== f); }
    abort() { if (this.aborted) return; this.aborted = true; const l = this.listeners; this.listeners = []; l.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); }
  };

  TX.escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Levenshtein for "did you mean"
  TX.lev = (a, b) => {
    a = a.toLowerCase(); b = b.toLowerCase();
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  TX.suggest = (word, list, max = 2) => {
    let best = null, bd = 99;
    for (const c of list) { const d = TX.lev(word, c); if (d < bd) { bd = d; best = c; } }
    return bd <= max ? best : null;
  };

  TX.progressBar = (frac, width = 40, fill = '#', empty = '.') => {
    const n = Math.round(frac * width);
    return fill.repeat(n) + empty.repeat(width - n);
  };
})();
