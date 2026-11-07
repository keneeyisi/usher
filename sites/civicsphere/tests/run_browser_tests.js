#!/usr/bin/env node
// End-to-end browser harness (RESOLVER6; adds heldout_r6 and the five flagship demo journeys with screenshots in screenshots/flagship/): every fixture runs through the real UI (type -> submit -> interpret -> navigate)
// with the in-browser meaning model, plus loading/fallback scenarios and a Node-vs-browser parity check.
// Usage: (serve the app folder with python3 -m http.server 8008) node tests/run_browser_tests.js [baseUrl] [--out dir]
// Requires the 'playwright' npm package with Chromium, and for the parity check '@huggingface/transformers' + 'onnxruntime-web'
// (set NODE_PATH if they are installed elsewhere).
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const C = require(path.join(__dirname, '..', 'civicsphere-core.js'));
const check = require(path.join(__dirname, 'fixture_check.js'));
const S = require(path.join(__dirname, '..', 'civicsphere-semantic.js'));
const SETS = ['tuned', 'heldout_r6', 'heldout_r5', 'heldout_r4', 'heldout_r3'];
const args = process.argv.slice(2);
const BASE = (args.find(a => /^https?:/.test(a)) || 'http://localhost:8008/').replace(/\/?$/, '/usher-demonstrator/sites/civicsphere/');
const OUT = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : path.join(__dirname, 'browser_results');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
const { fixtures } = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const STUCK_MS = 6000, MODEL_MS = 60000;
const SHOTS = { T09_household_payment_assistance: 'T09', T10_complaint_followup: 'T10', T11_resume_parking_application: 'T11', T05_ambiguous_tax: 'T05', T12_new_passport: 'T12_passport', T04_moved_parking_cost: 'T04_parking_cost', R26_son_birth_record_passport: 'R26_birth_record_not_passport', R23_dumped_mattress_pavement: 'R23_dumped_mattress' };
const modelLoads = [];

async function newPage(browser, url, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  // Offline guarantee: any request that leaves the local server is aborted and counted as an error.
  await ctx.route('**/*', async r => { const u = r.request().url(); if (!u.startsWith(BASE.replace(/\/$/, ''))) return r.abort(); if (opts.route) return opts.route(r); return r.continue(); });
  const page = await ctx.newPage();
  const errors = [], warnings = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  ctx.on('request', r => { if (!r.url().startsWith(BASE.replace(/\/$/, ''))) errors.push('external request: ' + r.url()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(url);
  return { ctx, page, errors, warnings };
}
async function waitModel(page, record = true) {
  await page.waitForFunction(() => window.CivicEmbedder && window.CivicEmbedder.state !== 'loading', null, { timeout: MODEL_MS });
  const m = await page.evaluate(() => ({ state: CivicEmbedder.state, loadMs: CivicEmbedder.loadMs, error: CivicEmbedder.error }));
  if (record && m.loadMs != null) modelLoads.push(m.loadMs);
  return m;
}
async function ask(page, q) {
  if (!(await page.isVisible('#nbinput'))) await page.click('#nbpill');
  await page.fill('#nbinput', q);
  await page.click('#nbfind');
  try { await page.waitForFunction(() => document.querySelector('#nbresult').dataset.state === 'done', null, { timeout: STUCK_MS }); return false; }
  catch { return true; }
}

async function runFixture(browser, f) {
  const { ctx, page, errors, warnings } = await newPage(browser, BASE + '#home');
  const model = await waitModel(page);
  const t0 = Date.now();
  const stuck = await ask(page, f.query);
  const ui = await page.evaluate(() => { const o = document.querySelector('#nbresult'); return { decision: o.dataset.decision, destination: o.dataset.destination, section: o.dataset.section, text: o.innerText.replace(/\s+/g, ' ').trim(), options: [...o.querySelectorAll('.optbtn')].map(b => b.dataset.id), r: window.__civicLastResult ? { reason: window.__civicLastResult.reason, sectionId: window.__civicLastResult.sectionId, confidence: window.__civicLastResult.confidence, mode: window.__civicLastResult.mode, candidates: (window.__civicLastResult.candidates || []).map(c => ({ id: c.id, score: c.score })) } : null }; });
  const rec = { id: f.id, set: f.set, query: f.query, stuck, model, mode: ui.r && ui.r.mode, decision: ui.decision, panel: ui.text.slice(0, 220), options: ui.options, reason: ui.r && ui.r.reason, confidence: ui.r && ui.r.confidence, checks: {} };
  if (ui.decision === 'navigate') {
    const sec = ui.section === '' ? null : Number(ui.section);
    const navOk = await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).then(() => true, () => false);
    rec.checks.navigationCompleted = navOk;
    const expectedHash = `#service/${ui.destination}${sec != null ? '/usher-demonstrator/sites/civicsphere/section/' + sec : ''}`;
    if (sec != null) rec.checks.sectionHighlighted = await page.waitForSelector(`#sec-${sec}[data-highlighted="1"]`, { timeout: 3000 }).then(() => true, () => false);
    if (SHOTS[f.id]) { await page.waitForTimeout(500); rec.screenshot = path.join(OUT, 'screenshots', SHOTS[f.id] + '.png'); await page.screenshot({ path: rec.screenshot }); }
    const after = await page.evaluate(() => ({ hash: location.hash, trace: window.__civicTrace.slice(), h1: (document.querySelector('#app h1') || {}).textContent, secId: (document.querySelector('.content-section[data-highlighted="1"]') || { dataset: {} }).dataset.sectionId || null }));
    rec.hash = after.hash; rec.trace = after.trace; rec.pageTitle = after.h1;
    rec.checks.urlMatches = after.hash === expectedHash;
    const expectedTrace = 'FOUND: ' + C.pathLabels(ui.destination, sec).join(' → ');
    rec.checks.traceShown = after.trace.includes(expectedTrace) && after.trace.length >= 4;
    rec.destinationId = ui.destination; rec.sectionIndex = sec; rec.sectionId = after.secId || (sec == null ? null : C.byId(ui.destination).sections[sec].id);
  } else if (SHOTS[f.id]) { rec.screenshot = path.join(OUT, 'screenshots', SHOTS[f.id] + '.png'); await page.screenshot({ path: rec.screenshot }); }
  if (ui.decision === 'clarify') rec.checks.optionsAtMost3 = ui.options.length <= 3;
  rec.checks.semanticMode = rec.mode === 'semantic';
  rec.candidates = ui.r && ui.r.candidates ? ui.r.candidates.slice(0, 3).map(c => ({ id: c.id, score: c.score })) : [];
  rec.checks.noStuck = !stuck; rec.checks.noConsoleErrors = errors.length === 0;
  rec.errors = errors; rec.warnings = warnings; rec.ms = Date.now() - t0;
  const problems = check(f, { decision: rec.decision, destinationId: rec.destinationId || null, sectionIndex: rec.sectionIndex ?? null, sectionId: rec.sectionId ?? null, reason: rec.reason, options: rec.options }, C);
  for (const [k, v] of Object.entries(rec.checks)) if (!v) problems.push('ui check failed: ' + k);
  rec.problems = problems; rec.pass = problems.length === 0;
  await ctx.close();
  return rec;
}

async function scenarios(browser) {
  const out = [];
  const add = (id, pass, detail, errors) => out.push({ id, pass: pass && (!errors || errors.length === 0), detail, errors: errors || [] });
  // 0. RESOLVER6 flagship demo journeys (end to end in the real UI, screenshots in screenshots/flagship/)
  const FL = path.join(OUT, 'screenshots', 'flagship'); fs.mkdirSync(FL, { recursive: true });
  const navDone = page => page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).then(() => true, () => false);
  const last = page => page.evaluate(() => ({ mode: __civicLastResult.mode, decision: __civicLastResult.decision, reason: __civicLastResult.reason, dest: __civicLastResult.destinationId, section: __civicLastResult.sectionId, hash: location.hash, h1: (document.querySelector('#app h1') || {}).textContent, panel: document.querySelector('#nbresult').innerText.replace(/\s+/g, ' ').slice(0, 240) }));
  { const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
    const stuck = await ask(page, "I've just moved into a new house and need to sort out parking. I want to know what I'll have to pay."); const nav = await navDone(page);
    const hl = await page.waitForSelector('.content-section[data-highlighted="1"]', { timeout: 3000 }).then(() => true, () => false); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(FL, '1_parking_cost.png') }); const r = await last(page);
    add('FLAGSHIP_1_parking_cost', !stuck && nav && hl && r.mode === 'semantic' && r.dest === 'residential-parking' && r.section === 'permit-charges' && r.hash === '#service/residential-parking/section/2', r, errors); await ctx.close(); }
  { const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
    const stuck = await ask(page, 'I need a new passport'); const nav = await navDone(page); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(FL, '2_passport.png') }); const r = await last(page);
    add('FLAGSHIP_2_passport', !stuck && nav && r.mode === 'semantic' && r.dest === 'identity-replacement' && r.hash.startsWith('#service/identity-replacement') && r.h1 === 'Document Replacement', r, errors); await ctx.close(); }
  { const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
    const stuck = await ask(page, "I filled in part of my residents' parking permit application. Can I pick it up again?"); const nav = await navDone(page); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(FL, '3a_resume_found_saved_application.png') }); const r = await last(page);
    await page.click('#resumeBtn').catch(() => {}); await page.waitForFunction(() => location.hash.startsWith('#task/parking/'), null, { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ hash: location.hash, on: (document.querySelector('.step.on') || {}).textContent, done: [...document.querySelectorAll('.step.done')].map(x => x.textContent), notice: !!document.querySelector('#resumedNotice') }));
    await page.screenshot({ path: path.join(FL, '3b_resume_task_reopened.png') });
    add('FLAGSHIP_3_resume_application', !stuck && nav && r.mode === 'semantic' && r.dest === 'saved-residential-parking-application' && st.hash === '#task/parking/2/resumed' && st.on === 'Permit' && st.done.length === 2 && st.notice, { result: r, task: st }, errors); await ctx.close(); }
  { const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
    const stuck = await ask(page, 'I want to appeal'); const r = await last(page); const opts = await page.$$eval('.optbtn', b => b.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    await page.screenshot({ path: path.join(FL, '4a_clarification_options.png') });
    await page.click('.optbtn >> nth=0').catch(() => {}); const nav = await navDone(page); await page.waitForTimeout(400); const h = await page.evaluate(() => location.hash);
    await page.screenshot({ path: path.join(FL, '4b_clarification_option_opened.png') });
    add('FLAGSHIP_4_clarification', !stuck && r.mode === 'semantic' && r.decision === 'clarify' && r.reason === 'generic_action' && opts.length >= 2 && opts.length <= 3 && nav && h.startsWith('#service/'), { result: r, options: opts, hashAfterOption: h }, errors); await ctx.close(); }
  { const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
    const stuck = await ask(page, 'Write me a poem about autumn'); const r = await last(page); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(FL, '5_rejection.png') });
    add('FLAGSHIP_5_rejection', !stuck && r.mode === 'semantic' && r.decision === 'reject' && r.hash === '#home' && /could not match/i.test(r.panel), r, errors); await ctx.close(); }
  // 1. Resume end-to-end: query -> saved application -> Continue -> task opens at saved step
  { const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
    await ask(page, fixtures.find(f => f.id.startsWith('T11')).query);
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 });
    await page.click('#resumeBtn');
    await page.waitForFunction(() => location.hash.startsWith('#task/parking/'), null, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ hash: location.hash, on: (document.querySelector('.step.on') || {}).textContent, done: [...document.querySelectorAll('.step.done')].map(x => x.textContent), notice: !!document.querySelector('#resumedNotice') }));
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'T11_resumed_task.png') });
    add('E2E_resume_opens_saved_step', st.hash === '#task/parking/2/resumed' && st.on === 'Permit' && st.done.length === 2 && st.notice, st, errors);
    await page.reload(); await page.waitForTimeout(300);
    const st2 = await page.evaluate(() => (document.querySelector('.step.on') || {}).textContent);
    add('E2E_resume_survives_reload', st2 === 'Permit', { stepAfterReload: st2 }, errors);
    await ctx.close(); }
  // 2. Clarification option navigates
  { const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
    await ask(page, 'How much tax should I pay?');
    const n = await page.$$eval('.optbtn', b => b.length);
    await page.click('.optbtn >> nth=0');
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    const h = await page.evaluate(() => location.hash);
    add('E2E_clarification_option_navigates', n >= 2 && n <= 3 && h.startsWith('#service/'), { options: n, hash: h }, errors);
    await ctx.close(); }
  // 3. Hash routes: account area, In Progress list, invalid routes
  { const { ctx, page, errors } = await newPage(browser, BASE + '#domain/my-civicsphere');
    const a = await page.evaluate(() => document.querySelector('#app h1').textContent);
    await page.evaluate(() => { location.hash = '#group/my-civicsphere/' + encodeURIComponent('Activity & Records'); }); await page.waitForTimeout(200);
    const g = await page.evaluate(() => [...document.querySelectorAll('.listitem h3')].map(x => x.textContent));
    await page.evaluate(() => { location.hash = '#service/activity-in-progress/section/0'; }); await page.waitForTimeout(900);
    const ip = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.savedcard h3')].map(x => x.textContent), crumb: document.querySelector('.crumb').innerText }));
    await page.evaluate(() => { location.hash = '#service/saved-residential-parking-application'; }); await page.waitForTimeout(200);
    const sv = await page.evaluate(() => document.querySelector('.crumb').innerText);
    await page.evaluate(() => { location.hash = '#service/does-not-exist'; }); await page.waitForTimeout(200);
    const nf = await page.evaluate(() => document.querySelector('#app h1').textContent);
    await page.evaluate(() => { location.hash = '#service/residential-parking/section/99'; }); await page.waitForTimeout(200);
    const bad = await page.evaluate(() => !!document.querySelector('.notice.warning'));
    const val = await page.evaluate(() => window.CivicCore.validateCatalogue());
    const blocked = await page.evaluate(() => navigateTo('residential-parking', 42, 'test'));
    add('ROUTES_account_area', a === 'My CivicSphere' && g.includes('In Progress') && ip.cards.includes('Residential Parking Application') && /In Progress/.test(sv), { domain: a, group: g, inProgress: ip, savedCrumb: sv }, errors);
    add('ROUTES_invalid_handled', nf === 'Page not found' && bad && blocked === false, { notFound: nf, badSectionWarning: bad, navigateToInvalidReturned: blocked }, errors);
    add('CATALOGUE_valid_in_browser', val.ok, val.counts, errors);
    await ctx.close(); }
  // 4. Debug view
  { const { ctx, page, errors } = await newPage(browser, BASE + '?debug=1#home'); await waitModel(page);
    await ask(page, fixtures.find(f => f.id.startsWith('T09')).query);
    const has = await page.isVisible('#debugbox');
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'debug_T09.png') });
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    const { ctx: c2, page: p2, errors: e2 } = await newPage(browser, BASE + '?debug=1#home'); await waitModel(p2);
    await ask(p2, 'How much tax should I pay?');
    await p2.screenshot({ path: path.join(OUT, 'screenshots', 'debug_T05_clarify.png') });
    const semDebug = await page.evaluate(() => /semantic/.test((document.querySelector('#debugbox') || {}).innerText || ''));
    add('DEBUG_view_renders', has && semDebug && await p2.isVisible('#debugbox'), { semanticDebug: semDebug }, errors.concat(e2));
    await ctx.close(); await c2.close(); }
  // 5. Passport in debug view (screenshot of the semantic evidence)
  { const { ctx, page, errors } = await newPage(browser, BASE + '?debug=1#home'); await waitModel(page);
    await ask(page, 'I need a new passport');
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'debug_T12_passport.png') });
    const r = await page.evaluate(() => ({ mode: __civicLastResult.mode, decision: __civicLastResult.decision, dest: __civicLastResult.destinationId }));
    add('DEBUG_passport_semantic', r.mode === 'semantic' && r.decision === 'navigate' && r.dest === 'identity-replacement', r, errors);
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    await ctx.close(); }
  // 5b. Test 4 in debug view: shows the lexical tie-break inside the semantic band
  { const { ctx, page, errors } = await newPage(browser, BASE + '?debug=1#home'); await waitModel(page);
    await ask(page, fixtures.find(f => f.id.startsWith('T04')).query);
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'debug_T04_tiebreak.png') });
    const r = await page.evaluate(() => ({ mode: __civicLastResult.mode, decision: __civicLastResult.decision, dest: __civicLastResult.destinationId, section: __civicLastResult.sectionId, rules: __civicLastResult.adjustments, shown: /lexical/.test(document.querySelector('#debugbox').innerText) }));
    add('DEBUG_T04_lexical_tiebreak', r.mode === 'semantic' && r.dest === 'residential-parking' && r.section === 'permit-charges' && r.shown, r, errors);
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    await ctx.close(); }
  // 6. Loading state: model download slowed down; a query asked immediately shows "Preparing…" and then resolves semantically.
  { const delay = r => /model_quantized\.onnx$/.test(r.request().url()) ? new Promise(res => setTimeout(res, 4000)).then(() => r.continue()) : r.continue();
    const { ctx, page, errors } = await newPage(browser, BASE + '#home', { route: delay });
    await page.click('#nbpill');
    const statusLoading = await page.textContent('#nbstatus');
    await page.fill('#nbinput', 'I need a new passport'); await page.click('#nbfind');
    await page.waitForTimeout(800);
    const during = await page.evaluate(() => ({ state: document.querySelector('#nbresult').dataset.state, text: document.querySelector('#nbresult').innerText, btnEnabled: !document.querySelector('#nbfind').disabled, inputEnabled: !document.querySelector('#nbinput').disabled }));
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'loading_state.png') });
    const done = await page.waitForFunction(() => document.querySelector('#nbresult').dataset.state === 'done', null, { timeout: 40000 }).then(() => true, () => false);
    const r = await page.evaluate(() => ({ mode: __civicLastResult.mode, decision: __civicLastResult.decision, dest: __civicLastResult.destinationId, status: document.querySelector('#nbstatus').innerText }));
    add('LOADING_state_then_semantic', /Preparing/.test(statusLoading) && during.state === 'interpreting' && /Preparing the meaning model/.test(during.text) && during.btnEnabled && done && r.mode === 'semantic' && r.dest === 'identity-replacement' && /ready/.test(r.status), { statusLoading, during, done, result: r }, errors);
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    await ctx.close(); }
  // 7. Model slower than the wait limit (?modelwait=1500): lexical answer with a notice, never stuck; the next query is semantic.
  { const delay = r => /model_quantized\.onnx$/.test(r.request().url()) ? new Promise(res => setTimeout(res, 5000)).then(() => r.continue()) : r.continue();
    const { ctx, page, errors } = await newPage(browser, BASE + '?modelwait=1500#home', { route: delay });
    const stuck1 = await ask(page, 'I want to park outside my house. How do I get a permit?');
    const r1 = await page.evaluate(() => ({ mode: __civicLastResult.mode, decision: __civicLastResult.decision, dest: __civicLastResult.destinationId, notice: (document.querySelector('#fallbacknote') || {}).innerText }));
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'fallback_still_loading.png') });
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    await waitModel(page, false); // deliberately slowed: not counted in load-time stats
    const stuck2 = await ask(page, 'I need a new passport');
    const r2 = await page.evaluate(() => ({ mode: __civicLastResult.mode, dest: __civicLastResult.destinationId }));
    add('TIMEOUT_lexical_then_semantic', !stuck1 && r1.mode === 'lexical' && /still loading/.test(r1.notice || '') && !stuck2 && r2.mode === 'semantic' && r2.dest === 'identity-replacement', { first: r1, second: r2 }, errors);
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    await ctx.close(); }
  // 8. Model disabled (?semantic=off): RESOLVER3 lexical fallback with a small notice, zero console errors.
  { const { ctx, page, errors, warnings } = await newPage(browser, BASE + '?semantic=off#home');
    const m = await waitModel(page);
    const stuck = await ask(page, 'I want to park outside my house. How do I get a permit?');
    const r = await page.evaluate(() => ({ mode: __civicLastResult.mode, decision: __civicLastResult.decision, dest: __civicLastResult.destinationId, notice: (document.querySelector('#fallbacknote') || {}).innerText, status: document.querySelector('#nbstatus').innerText }));
    await page.screenshot({ path: path.join(OUT, 'screenshots', 'fallback_model_off.png') });
    add('FALLBACK_semantic_off', m.state === 'failed' && !stuck && r.mode === 'lexical' && r.dest === 'residential-parking' && /unavailable/.test(r.notice || '') && /keyword matching/.test(r.status), { model: m, result: r, warnings: warnings.length }, errors);
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    await ctx.close(); }
  // 9. Model file missing (HTTP 404): fallback, never stuck. The 404 itself is the only expected console error.
  { const missing = r => /model_quantized\.onnx$/.test(r.request().url()) ? r.fulfill({ status: 404, body: 'missing' }) : r.continue();
    const { ctx, page, errors } = await newPage(browser, BASE + '#home', { route: missing });
    const m = await waitModel(page);
    const stuck = await ask(page, 'I want to park outside my house. How do I get a permit?');
    const r = await page.evaluate(() => ({ mode: __civicLastResult.mode, dest: __civicLastResult.destinationId, notice: (document.querySelector('#fallbacknote') || {}).innerText }));
    const unexpected = errors.filter(e => !/404|model_quantized/.test(e));
    add('FALLBACK_model_missing', m.state === 'failed' && !stuck && r.mode === 'lexical' && r.dest === 'residential-parking' && /unavailable/.test(r.notice || ''), { model: m, result: r, expectedErrors: errors.length - unexpected.length }, unexpected);
    await page.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 9000 }).catch(() => {});
    await ctx.close(); }
  return out;
}

// Node vs browser parity: same model files, same queries. Compares the query vectors and the resolver decisions.
async function parity(browser) {
  const E = require(path.join(__dirname, '..', 'tools', 'node_embedder.js'));
  const index = S.decodeIndex(JSON.parse(fs.readFileSync(path.join(__dirname, '..', S.MODEL.indexFile), 'utf8')));
  const { ctx, page, errors } = await newPage(browser, BASE + '#home'); await waitModel(page);
  const qs = fixtures.map(f => f.query);
  const bvecs = await page.evaluate(async qs => { const o = []; for (const q of qs) o.push(await CivicEmbedder.embed(q)); return o; }, qs);
  await ctx.close();
  let minCos = 1, maxAbs = 0, maxScoreDiff = 0; const mismatches = [];
  for (let i = 0; i < qs.length; i++) {
    const nv = await E.embedQuery(qs[i]), bv = bvecs[i];
    let dot = 0; for (let k = 0; k < nv.length; k++) { dot += nv[k] * bv[k]; maxAbs = Math.max(maxAbs, Math.abs(nv[k] - bv[k])); }
    minCos = Math.min(minCos, dot);
    const rn = S.resolveSemantic(qs[i], nv, index), rb = S.resolveSemantic(qs[i], bv, index);
    const d = Math.abs((rn.candidates[0] || {}).score - (rb.candidates[0] || {}).score); maxScoreDiff = Math.max(maxScoreDiff, d);
    if (rn.decision !== rb.decision || rn.destinationId !== rb.destinationId || rn.sectionIndex !== rb.sectionIndex) mismatches.push({ id: fixtures[i].id, node: [rn.decision, rn.destinationId, rn.sectionIndex], browser: [rb.decision, rb.destinationId, rb.sectionIndex] });
  }
  return { queries: qs.length, minCosine: +minCos.toFixed(7), maxAbsComponentDiff: +maxAbs.toExponential(2), maxTopScoreDiff: +maxScoreDiff.toExponential(2), decisionMismatches: mismatches, errors };
}

(async () => {
  const browser = await chromium.launch();
  const results = []; let i = 0;
  const worker = async () => { while (i < fixtures.length) { const f = fixtures[i++]; try { results.push(await runFixture(browser, f)); } catch (e) { console.error('fixture crashed', f.id, e.message); results.push({ id: f.id, set: f.set, query: f.query, pass: false, problems: ['harness error: ' + e.message], checks: {}, errors: [String(e.message)] }); } } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  results.sort((a, b) => fixtures.findIndex(f => f.id === a.id) - fixtures.findIndex(f => f.id === b.id));
  const sc = await scenarios(browser);
  const par = await parity(browser);
  await browser.close();
  for (const set of SETS) {
    const rs = results.filter(r => r.set === set);
    console.log(`\n== BROWSER ${set.toUpperCase()}: ${rs.filter(r => r.pass).length}/${rs.length} pass`);
    for (const r of rs) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(38)} ${r.decision === 'navigate' ? r.hash : r.decision + (r.options.length ? ' [' + r.options.join(', ') + ']' : '')}${r.pass ? '' : '  <-- ' + r.problems.join('; ')}`);
  }
  console.log('\n== NODE vs BROWSER PARITY'); console.log(JSON.stringify(par));
  const ml = modelLoads.slice().sort((a, b) => a - b);
  const loadStats = { n: ml.length, min: ml[0], median: ml[Math.floor(ml.length / 2)], max: ml[ml.length - 1] };
  console.log('== MODEL LOAD (ms, fresh browser context each, local server)', JSON.stringify(loadStats));
  console.log('\n== SCENARIOS');
  for (const s of sc) console.log(`${s.pass ? 'PASS' : 'FAIL'}  ${s.id}  ${JSON.stringify(s.detail)}${s.errors.length ? ' ERR ' + s.errors.join('; ') : ''}`);
  const counts = {}; for (const set of SETS) counts[set] = { pass: results.filter(r => r.set === set && r.pass).length, total: results.filter(r => r.set === set).length };
  const totalErrors = results.reduce((n, r) => n + r.errors.length, 0) + sc.reduce((n, s) => n + s.errors.length, 0) + par.errors.length;
  const stuck = results.filter(r => r.stuck).length;
  const summary = { base: BASE, date: new Date().toISOString(), sets: counts, scenarios: { pass: sc.filter(s => s.pass).length, total: sc.length }, consoleErrors: totalErrors, stuck, modelLoadMs: loadStats, parity: par, results, scenarioResults: sc };
  fs.writeFileSync(path.join(OUT, 'browser_results.json'), JSON.stringify(summary, null, 2));
  console.log(`\nSUMMARY browser ${SETS.map(k => `${k} ${counts[k].pass}/${counts[k].total}`).join(' | ')} | scenarios ${summary.scenarios.pass}/${summary.scenarios.total} | console errors ${totalErrors} | stuck ${stuck} | parity mismatches ${par.decisionMismatches.length} | model load median ${loadStats.median} ms`);
  // Gate: harness integrity (scenarios, no errors, nothing stuck, Node/browser agree). Fixture pass counts are reported, not gated.
  process.exit(summary.scenarios.pass === summary.scenarios.total && totalErrors === 0 && stuck === 0 && par.decisionMismatches.length === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
