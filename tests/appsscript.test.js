// The Apps Script copy: small files, assembled by Code.gs into the same app as dist/index.html, collecting nothing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const serve = require('./appsscript.js');
const DIR = path.join(__dirname, '..', 'apps-script');

test('every Apps Script file is small enough to paste', () => {
  fs.readdirSync(DIR).filter((f) => f.endsWith('.html')).forEach((f) => assert.ok(fs.statSync(path.join(DIR, f)).size < 400 * 1024, f + ' is too big'));
});

test('Code.gs serves the whole app with the class key filled in', () => {
  const { html, props } = serve();
  assert.ok(!html.includes('<?'.concat('!=')), 'every include was replaced');
  assert.ok(!html.includes('__TX_' + 'CLASS_KEY__'), 'class key marker replaced');
  assert.ok(html.includes('feedfacecafebeef0123456789abcdef'), 'class key inserted');
  assert.strictEqual(Object.keys(props).length, 1, 'only the class key is stored');
  const dist = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
  const js = (h) => [...h.matchAll(/<script>\n?([\s\S]*?)<\/script>/g)].map((m) => m[1].trim()).join('\n').replace(/\s+/g, '');
  assert.strictEqual(js(html), js(dist).replace('__TX_' + 'CLASS_KEY__', 'feedfacecafebeef0123456789abcdef'), 'same JavaScript as dist/index.html');
});

test('Code.gs collects nothing: no gradebook, no network, no Drive/Sheets/Gmail, no user identity', () => {
  const src = fs.readFileSync(path.join(DIR, 'Code.gs'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(src, /UrlFetchApp|SpreadsheetApp|DriveApp|GmailApp|DocumentApp|Session\.|ScriptApp|CacheService|google\.script\.run|doPost/);
  const fns = [...src.matchAll(/function\s+(\w+)/g)].map((m) => m[1]).sort();
  assert.deepStrictEqual(fns, ['classKey_', 'doGet', 'include', 'newClassKey']);
});
