/* R6.2 feature checks (presentation layer): interpretation, terminology bridge, route walk + coach replay, Why here,
   situation awareness, clarification question, rejection, comparison mode, reduced motion, keyboard, mobile, axe-core.
   Usage: node tests/run_r62_features.js [baseUrl] [outDir]   (serve the build first: python3 -m http.server 8008) */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const BASE = (process.argv[2] || 'http://localhost:8008/').replace(/\/?$/, '/usher-demonstrator/sites/civicsphere/'); const OUT = process.argv[3] || path.join(__dirname, '..', 'r62_feature_results');
const SH = path.join(OUT, 'screens'); fs.mkdirSync(SH, { recursive: true }); const AXE = path.join(__dirname, 'vendor', 'axe.min.js');
const Q = { passport: 'I need a new passport', parking: "I've just moved into a new house and need to sort out parking. I want to know what I'll have to pay.", resume: "I filled in part of my residents' parking permit application. Can I pick it up again?", situ: 'I started a parking permit application yesterday and want to finish it', appeal: 'I want to appeal', poem: 'Write me a poem about autumn', damp: 'my landlord won’t fix the damp in my flat' };
const checks = [], axeRes = [], errs = [], ext = [];
const add = (id, pass, detail) => { checks.push({ id, pass: !!pass, detail }); console.log((pass ? 'PASS ' : 'FAIL ') + id.padEnd(34) + ' ' + JSON.stringify(detail).slice(0, 240)); };
(async () => {
  const b = await chromium.launch();
  async function page(url, opts = {}) { const ctx = await b.newContext({ viewport: opts.vp || { width: 1366, height: 900 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' }); const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { const u = r.url(); if (!u.startsWith(BASE.replace(/\/$/, '')) && !/^(data|blob):/.test(u)) ext.push(u) });
    await p.goto(BASE + url); await p.waitForFunction(() => window.CivicEmbedder && CivicEmbedder.state !== 'loading', null, { timeout: 120000 }); return { ctx, p }; }
  async function ask(p, q) { if (!(await p.isVisible('#nbinput'))) await p.click('#nbpill'); await p.fill('#nbinput', q); await p.click('#nbfind'); await p.waitForFunction(() => document.querySelector('#nbresult').dataset.state === 'done', null, { timeout: 30000 }); }
  const navDone = p => p.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 15000 }).then(() => true, () => false);
  async function axe(p, name, vp) { await p.addScriptTag({ path: AXE }); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }))); axeRes.push({ state: name, viewport: vp || 'desktop', violations: v }); }
  const txt = (p, sel) => p.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
  // A. passport: interpretation + bridge before moving; route mid-walk
  { const { ctx, p } = await page('#home'); await ask(p, Q.passport);
    const a = { interp: await txt(p, '#nbresult .interp'), bridge: await txt(p, '#nbresult .bridge'), why: await txt(p, '#nbresult .why'), hash: await p.evaluate(() => location.hash) };
    await p.screenshot({ path: path.join(SH, '01_passport_interpretation_bridge.png') });
    add('A1_passport_interpretation_before_move', /^It sounds like you need a replacement identity document\./.test(a.interp) && a.hash === '#home', a);
    add('A2_passport_bridge', /You said “new passport”: on this site that’s called Document Replacement/.test(a.bridge), a.bridge);
    await p.waitForFunction(() => document.body.classList.contains('walking') && location.hash.startsWith('#group/'), null, { timeout: 10000, polling: 20 }); await p.waitForTimeout(120);
    const mid = await p.evaluate(() => ({ active: (document.querySelector('#trace .route li.active') || {}).textContent, done: [...document.querySelectorAll('#trace .route li.done')].map(x => x.textContent), crumbLit: getComputedStyle(document.querySelector('.crumb li:last-child span')).backgroundColor, hash: location.hash }));
    await p.screenshot({ path: path.join(SH, '02_route_mid_walk.png') });
    add('A3_route_mid_walk', mid.active === 'Certificates & Documents' && mid.done.join('|') === 'Home|Identity & Records' && /240, 177, 59/.test(mid.crumbLit), mid);
    const nav = await navDone(p); const end = await p.evaluate(() => ({ h1: document.querySelector('#app h1').textContent, trace: window.__civicTrace.slice(-1)[0] }));
    add('A4_passport_arrives', nav && end.h1 === 'Document Replacement', end); await ctx.close(); }
  // B. parking cost: Why here + section bridge + situation note; coach replay
  { const { ctx, p } = await page('#home'); await ask(p, Q.parking); const nav = await navDone(p); await p.waitForSelector('#sec-2[data-highlighted="1"]', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(600);
    const r = { interp: await txt(p, '#nbresult .interp'), bridge: await txt(p, '#nbresult .bridge'), why: await txt(p, '#nbresult .why'), situ: await txt(p, '#routestrip .situation'), how: await p.isVisible('#howbtn'), hash: await p.evaluate(() => location.hash) };
    await p.evaluate(() => document.querySelector('#nbresult .dest').scrollIntoView({ block: 'start' })); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(SH, '03_why_here_and_situation_note.png') });
    add('B1_parking_interpretation', r.interp === "It sounds like you've moved house and want to know what a residents' parking permit costs.", r.interp);
    add('B2_parking_section_bridge', /You said “have to pay”: on this page that’s under Permit charges/.test(r.bridge), r.bridge);
    add('B3_why_here', /Why here/i.test(r.why) && /Permit charges” is the part of the page about costs and fees/.test(r.why), r.why);
    add('B4_situation_note', nav && /saved residents' parking permit application/.test(r.situ) && /Continue from step 3 of 4, Permit\?/.test(r.situ) && r.hash === '#service/residential-parking/section/2', r.situ);
    await axe(p, 'panel: answer + why + situation (arrived)');
    await p.click('#howbtn'); await p.waitForFunction(() => location.hash === '#home' && document.querySelector('.coach-target'), null, { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(500);
    const c1 = await p.evaluate(() => ({ text: document.getElementById('coachtext').innerText, target: document.querySelector('.coach-target').getAttribute('href'), focused: document.activeElement.getAttribute('href') }));
    await p.screenshot({ path: path.join(SH, '04_find_it_yourself_step1.png') }); await axe(p, 'coach step 1 on homepage');
    // follow the highlighted link with the keyboard (real menu click), then let the guide do the rest
    await p.keyboard.press('Enter'); await p.waitForFunction(t => location.hash.startsWith('#domain/') && document.querySelector('.coach-target') && document.getElementById('coachtext').innerText !== t, c1.text, { timeout: 5000 }).catch(() => {});
    const c2 = await txt(p, '#coachtext');
    for (let i = 0; i < 4; i++) { if (!(await p.isVisible('#coachnext'))) break; await p.click('#coachnext'); await p.waitForTimeout(500); }
    const c3 = { text: await txt(p, '#coachtext'), hash: await p.evaluate(() => location.hash) };
    add('B5_coach_replay', c1.target === '#domain/transport-vehicles' && c1.focused === '#domain/transport-vehicles' && /choose “Transport & Vehicles”/.test(c1.text) && /Parking & Road Access/.test(c2) && c3.hash === '#service/residential-parking/section/2' && /That’s the route/.test(c3.text), { c1, c2, c3 });
    await p.keyboard.press('Escape'); add('B6_escape_closes_coach', await p.evaluate(() => document.getElementById('coach').hidden), {}); await ctx.close(); }
  // C. resume (flagship 3): committed answer, no duplicate situation note, Continue still works
  { const { ctx, p } = await page('#home'); await ask(p, Q.resume); const nav = await navDone(p); await p.waitForTimeout(400);
    const r = { interp: await txt(p, '#nbresult .interp'), why: await txt(p, '#nbresult .why'), situ: await p.$$eval('#nbresult .situation', x => x.length), resumeBtns: await p.$$eval('#resumeBtn', x => x.length) };
    await p.click('#resumeBtn'); await p.waitForFunction(() => location.hash.startsWith('#task/parking/'), null, { timeout: 3000 }).catch(() => {});
    add('C1_resume_answer', nav && /pick up the residents' parking permit application you saved/.test(r.interp) && /carry on where you left off/.test(r.why) && r.situ === 0 && r.resumeBtns === 1 && (await p.evaluate(() => location.hash)) === '#task/parking/2/resumed', r); await ctx.close(); }
  // D. situation awareness on a NON-resume parking query (decision unchanged: How to apply)
  { const { ctx, p } = await page('#home'); await ask(p, Q.situ); const nav = await navDone(p); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ decision: __civicLastResult.decision, dest: __civicLastResult.destinationId, section: __civicLastResult.sectionId, situ: (document.querySelector('#routestrip .situation') || {}).innerText }));
    await p.click('#routestrip .situbtn'); await p.waitForFunction(() => location.hash.startsWith('#task/parking/'), null, { timeout: 3000 }).catch(() => {});
    const h = await p.evaluate(() => location.hash);
    add('D1_situation_non_resume', nav && r.dest === 'residential-parking' && r.section === 'how-to-apply' && /Continue from step 3/.test(r.situ || '') && h === '#task/parking/2/resumed', { ...r, hashAfter: h }); await ctx.close(); }
  // E. clarification: one question, 2-3 options, keyboard
  { const { ctx, p } = await page('#home'); await ask(p, Q.appeal);
    const r = { interp: await txt(p, '#nbresult .interp'), q: await txt(p, '#askq-h'), n: await p.$$eval('.optbtn', x => x.length), group: await p.evaluate(() => (document.querySelector('.optlist.question') || {}).getAttribute && document.querySelector('.optlist.question').getAttribute('role')) };
    await p.screenshot({ path: path.join(SH, '05_clarification_question.png') }); await axe(p, 'panel: clarification question');
    await p.focus('.optbtn >> nth=1'); await p.keyboard.press('Enter'); const nav = await navDone(p);
    add('E1_clarification_question', /appeal/.test(r.interp) && /Which one is about your situation\?/.test(r.q) && r.n >= 2 && r.n <= 3 && r.group === 'group' && nav && (await p.evaluate(() => location.hash)).startsWith('#service/'), r); await ctx.close(); }
  // F. rejection
  { const { ctx, p } = await page('#home'); await ask(p, Q.poem); await p.waitForTimeout(200);
    const r = { panel: await txt(p, '#nbresult'), eg: await p.$$eval('.egbtn', x => x.length), hash: await p.evaluate(() => location.hash) };
    await p.screenshot({ path: path.join(SH, '06_rejection.png') }); await axe(p, 'panel: rejection');
    add('F1_rejection', /doesn't look like something the council handles/.test(r.panel) && /could not match/i.test(r.panel) && r.eg === 2 && r.hash === '#home', { eg: r.eg, hash: r.hash }); await ctx.close(); }
  // G. Stop before moving
  { const { ctx, p } = await page('#home'); await ask(p, Q.parking); await p.click('#stopwalk'); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ nav: document.querySelector('#nbresult').dataset.navigation, hash: location.hash, walking: document.body.classList.contains('walking') }));
    add('G1_stop_before_moving', r.nav === 'cancelled' && r.hash === '#home' && !r.walking, r); await ctx.close(); }
  // H. comparison mode on 3 queries
  { const { ctx, p } = await page('?compare=1'); const start = await p.evaluate(() => location.hash); const vs = [];
    for (const [k, q] of [['passport', Q.passport], ['parking', Q.parking], ['damp', Q.damp]]) {
      await p.evaluate(() => { window.__oldInterp = document.querySelector('#vsNav .interp'); }); await p.fill('#vsq', q); await p.click('.vsform button[type=submit]'); await p.waitForFunction(() => { const e = document.querySelector('#vsNav .interp'); return e && e !== window.__oldInterp; }, null, { timeout: 30000 }); await p.waitForFunction(() => { const li = document.querySelectorAll('#vsroute li'); return li.length && document.querySelectorAll('#vsroute li.done').length === li.length; }, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(300);
      const r = await p.evaluate(() => ({ total: (document.querySelector('.vsmeta') || {}).textContent, results: [...document.querySelectorAll('#vsSearch .searchresult h3')].map(x => x.textContent), marks: document.querySelectorAll('#vsSearch mark').length, interp: document.querySelector('#vsNav .interp').textContent, answer: (document.querySelector('#vsNav .dest h3') || {}).textContent, routeDone: document.querySelectorAll('#vsroute li.done').length, routeLen: document.querySelectorAll('#vsroute li').length }));
      vs.push({ k, ...r }); if (k === 'parking') { await p.screenshot({ path: path.join(SH, '07_compare_mode_parking.png'), fullPage: true }); await axe(p, 'compare view (parking)'); }
      if (k === 'parking') vs.push({ k: 'situ-button', ok: await p.evaluate(() => { const b = document.querySelector('#vsNav .situbtn'); return !!(b && b.onclick); }) });
      if (k === 'passport') await p.screenshot({ path: path.join(SH, '07b_compare_mode_passport.png'), fullPage: true }); }
    add('H1_compare_mode_3_queries', start === '#versus' && vs.find(v => v.k === 'situ-button').ok && vs.filter(v => v.k !== 'situ-button').every(v => v.results.length >= 1 && v.marks > 0 && /^It sounds like/.test(v.interp) && v.answer && v.routeDone === v.routeLen), vs);
    await p.click('#vsgo'); const nav = await navDone(p); add('H2_compare_take_me_there', nav && (await p.evaluate(() => location.hash)).startsWith('#service/housing-property-housing-repairs'), {}); await ctx.close(); }
  // I. reduced motion: no animations, journey still completes
  { const { ctx, p } = await page('#home', { reduced: true }); await ask(p, Q.passport); await p.waitForFunction(() => document.body.classList.contains('walking'), null, { timeout: 5000 }).catch(() => {});
    const anim = await p.evaluate(() => ({ trace: getComputedStyle(document.getElementById('trace')).animationName, app: getComputedStyle(document.getElementById('app')).animationName, html: getComputedStyle(document.documentElement).scrollBehavior }));
    const nav = await navDone(p); add('I1_reduced_motion', nav && anim.trace === 'none' && anim.app === 'none' && anim.html === 'auto', anim); await ctx.close(); }
  // J. debug mode still renders with the new panel
  { const { ctx, p } = await page('?debug=1#home'); await ask(p, Q.parking); const has = await p.isVisible('#debugbox'); await axe(p, 'debug panel with answer'); await navDone(p); add('J1_debug_mode', has, {}); await ctx.close(); }
  // K. mobile: walk, panel closes on arrival, compare view stacks
  { const { ctx, p } = await page('#home', { vp: { width: 390, height: 844 } }); await ask(p, Q.parking); await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SH, '08a_mobile_answer_sheet.png') }); await axe(p, 'mobile answer sheet', 'mobile-390');
    const nav = await navDone(p); await p.waitForTimeout(900); const closed = await p.evaluate(() => !document.getElementById('nbpanel').classList.contains('open'));
    await p.screenshot({ path: path.join(SH, '08b_mobile_arrived.png') });
    await p.evaluate(() => { location.hash = '#versus/' + encodeURIComponent('I need a new passport') }); await p.waitForFunction(() => document.querySelector('#vsNav .interp'), null, { timeout: 30000 }); await p.waitForTimeout(3000);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); await p.screenshot({ path: path.join(SH, '08c_mobile_compare.png'), fullPage: true }); await axe(p, 'mobile compare view', 'mobile-390');
    add('K1_mobile', nav && closed && sw <= 392, { closed, scrollWidth: sw }); await ctx.close(); }
  // L. search page uses the same BM25
  { const { ctx, p } = await page('#search/' + encodeURIComponent('parking permit cost')); await p.waitForTimeout(300); const r = await p.evaluate(() => ({ n: document.querySelectorAll('#searchResults .searchresult').length, first: (document.querySelector('#searchResults h3') || {}).textContent })); await axe(p, 'search page (BM25)');
    add('L1_search_page_bm25', r.n >= 3, r); await ctx.close(); }
  const tally = {}; axeRes.forEach(r => r.violations.forEach(v => { tally[v.impact] = (tally[v.impact] || 0) + v.nodes }));
  const summary = { base: BASE, checks, passed: checks.filter(c => c.pass).length, total: checks.length, axe: { states: axeRes.length, impactNodeTotals: tally, results: axeRes }, consoleErrors: errs, externalRequests: ext };
  fs.writeFileSync(path.join(OUT, 'r62_features.json'), JSON.stringify(summary, null, 2));
  axeRes.forEach(r => console.log(`axe ${r.viewport.padEnd(10)} ${r.state.padEnd(44)} ${r.violations.length ? r.violations.map(v => v.impact + ':' + v.id + '(' + v.nodes + ') ' + v.targets.join(';')).join(', ') : 'no violations'}`));
  console.log(`SUMMARY features ${summary.passed}/${summary.total} | axe states ${axeRes.length} violations ${JSON.stringify(tally)} | console errors ${errs.length} | external requests ${ext.length}`);
  await b.close();
})();
