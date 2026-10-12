// Loads the TerminalEX source files into Node (no browser) for tests and the build.
// Usage: const TX = require('./load.js')(); — returns the TX namespace with every engine loaded.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function load(extra = []) {
  const ORDER = require('../build.js').JS_ENGINE;
  const store = {};
  globalThis.window = globalThis;
  globalThis.document = globalThis.document || { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
  globalThis.localStorage = globalThis.localStorage || { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  if (!globalThis.TX || !globalThis.TX.__loaded) {
    for (const f of ORDER.concat(extra)) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', f), 'utf8'), { filename: f });
    globalThis.TX.__loaded = true;
  }
  return globalThis.TX;
};
