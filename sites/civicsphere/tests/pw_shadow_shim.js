/* Test-only preload (node -r tests/pw_shadow_shim.js tests/run_*.js).
 * The R6.3 browser suites query the assistant with document.getElementById/querySelector/activeElement. In RESOLVER7_GP the assistant lives in the Usher
 * widget's open shadow root, so every page created by Playwright gets an init script that makes those document-level lookups also search that shadow root.
 * No assertion in the suites is changed by this shim; it only keeps the lookups working. (Logged in RESEARCH_DEVELOPMENT_LOG.md.) */
const pw = require('playwright');
const SHIM = () => {
  const D = Document.prototype, gid = D.getElementById, qs = D.querySelector, qsa = D.querySelectorAll;
  const root = () => { const h = gid.call(document, 'usher-root'); return h && h.shadowRoot; };
  D.getElementById = function (id) { return gid.call(this, id) || (root() && root().getElementById(id)) || null; };
  D.querySelector = function (s) { return qs.call(this, s) || (root() && root().querySelector(s)) || null; };
  D.querySelectorAll = function (s) { const a = [...qsa.call(this, s)]; const r = root(); return r ? [...a, ...r.querySelectorAll(s)] : a; };
  const ae = Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement') || Object.getOwnPropertyDescriptor(DocumentOrShadowRoot.prototype, 'activeElement');
  Object.defineProperty(Document.prototype, 'activeElement', { configurable: true, get() { let e = ae.get.call(this); while (e && e.shadowRoot && e.shadowRoot.activeElement) e = e.shadowRoot.activeElement; return e; } });
};
const wrap = b => {
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(SHIM); return c; };
  b.newPage = async (...a) => { const p = await np(...a); await p.addInitScript(SHIM); return p; };
  return b;
};
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => wrap(await launch(...a));
