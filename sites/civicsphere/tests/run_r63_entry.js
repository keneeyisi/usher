/* R6.3 checks (R7_GP2: pill wording is now "I’m here because…"): pill, "/" shortcut, Esc, focus trap, command-line dialog (no chat wording), route strip, accessibility.
   Usage: node tests/run_r63_entry.js [baseUrl] [outDir]   (serve the build first: python3 -m http.server 8008) */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const BASE = (process.argv[2] || 'http://localhost:8008/').replace(/\/?$/, '/'); const OUT = process.argv[3] || path.join(__dirname, '..', 'r63_entry_results');
fs.mkdirSync(OUT, { recursive: true }); const AXE = path.join(__dirname, 'vendor', 'axe.min.js'), ROOT = path.join(__dirname, '..');
const checks = [], errs = [], ext = [];
const add = (id, pass, detail) => { checks.push({ id, pass: !!pass, detail }); console.log((pass ? 'PASS ' : 'FAIL ') + id.padEnd(40) + ' ' + JSON.stringify(detail).slice(0, 260)); };
const PARK = "I've just moved into a new house and need to sort out parking. I want to know what I'll have to pay.";
(async () => {
  const b = await chromium.launch();
  async function page(url, o = {}) { const ctx = await b.newContext({ viewport: o.vp || { width: 1366, height: 900 }, reducedMotion: o.reduced ? 'reduce' : 'no-preference' }); const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { const u = r.url(); if (!u.startsWith(BASE.replace(/\/$/, '')) && !/^(data|blob):/.test(u)) ext.push(u) });
    await p.goto(BASE + url); await p.waitForFunction(() => window.CivicEmbedder && CivicEmbedder.state !== 'loading', null, { timeout: 120000 }); return { ctx, p }; }
  const open = p => p.evaluate(() => document.getElementById('nbpanel').classList.contains('open'));
  const axe = async (p, name) => { await p.addScriptTag({ path: AXE }); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.length, t: v.nodes.slice(0, 2).map(n => n.target.join(' ')) }))); add('AXE ' + name, v.length === 0, v); };

  // 1. static: no old label anywhere in shipped text
  { const files = ['index.html', 'civicsphere-ui.js', 'assets/site.css', 'README.txt', 'civicsphere-explain.js', 'civicsphere-site.js', 'civicsphere-search.js']; const hits = [];
    for (const f of files) { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); const re = f === 'README.txt' ? /Ask CivicSphere/i : /Ask CivicSphere|how can I help|Hi,? there|\bchat(bot|s)?\b/i; /* README may name chat windows to say what R6.3 is not */ if (re.test(t)) hits.push(f + ': ' + t.match(re)[0]); }
    add('S1_no_chat_wording_in_source', hits.length === 0, hits); }

  // 2. pill
  { const { ctx, p } = await page('#home'); await p.screenshot({ path: path.join(OUT, '01_pill_on_page.png') });
    const g = await p.evaluate(() => { const pl = document.getElementById('nbpill'), r = pl.getBoundingClientRect(), s = document.getElementById('site-q').getBoundingClientRect(); return { text: pl.innerText.replace(/\s+/g, ' ').trim(), cx: Math.round(r.left + r.width / 2), vw: innerWidth, fromBottom: Math.round(innerHeight - r.bottom), pos: getComputedStyle(pl).position, inHeader: !!pl.closest('header'), searchBottom: Math.round(s.bottom), pillTop: Math.round(r.top), askbtn: !!document.getElementById('askbtn'), headerHasI: /I want to|Ask/.test(document.querySelector('.header-actions').innerText), label: pl.getAttribute('aria-controls'), svg: pl.querySelector('svg').getAttribute('aria-hidden') }; });
    add('P1_pill_text_and_icon', /^I’m here because…/.test(g.text) && !/I want to/.test(g.text) && g.svg === 'true', g.text);
    add('P2_pill_bottom_centre_fixed', g.pos === 'fixed' && Math.abs(g.cx - g.vw / 2) <= 2 && g.fromBottom < 40, g);
    add('P3_nothing_beside_search', !g.inHeader && !g.askbtn && !g.headerHasI && g.pillTop - g.searchBottom > 300, g);
    add('P4_pill_on_every_page', await (async () => { const out = []; for (const h of ['#directory', '#domain/housing-property', '#service/residential-parking', '#versus', '#about', '#search/bins']) { await p.evaluate(h => { location.hash = h }, h); await p.waitForTimeout(200); out.push(await p.isVisible('#nbpill')); } return out.every(Boolean) })(), true);
    await p.evaluate(() => { location.hash = '#home' }); await ctx.close(); }

  // 3. "/" shortcut, Esc, focus trap, scrim
  { const { ctx, p } = await page('#home');
    await p.keyboard.press('/'); await p.waitForTimeout(150);
    const o = await p.evaluate(() => { const d = document.getElementById('nbpanel'), r = d.getBoundingClientRect(); return { open: d.classList.contains('open'), role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), focused: document.activeElement.id, cx: Math.round(r.left + r.width / 2), vw: innerWidth, w: Math.round(r.width), scrim: !document.getElementById('nbscrim').hidden, expanded: document.getElementById('nbpill').getAttribute('aria-expanded'), val: document.getElementById('nbinput').value, labelled: document.getElementById(d.getAttribute('aria-labelledby')).innerText };});
    add('K1_slash_opens_dialog', o.open && o.role === 'dialog' && o.modal === 'true' && o.focused === 'nbinput' && o.scrim && o.expanded === 'true' && o.val === '', o);
    add('K2_dialog_centred_and_wide', Math.abs(o.cx - o.vw / 2) <= 2 && o.w >= 600, o); add('K2b_dialog_label', /^I’m here because…$/.test((o.labelled || '').trim()), o.labelled);
    await p.keyboard.type('a/b'); const v = await p.inputValue('#nbinput'); add('K3_slash_typed_in_field_not_hijacked', v === 'a/b' && await open(p), v);
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    add('K4_esc_closes_and_restores_focus', !(await open(p)) && (await p.evaluate(() => document.activeElement.id)) === 'nbpill' && !(await p.isVisible('#nbscrim')), {});
    // slash must not open while typing in the site search
    await p.focus('#site-q'); await p.keyboard.type('x/y'); add('K5_slash_ignored_in_site_search', !(await open(p)) && (await p.inputValue('#site-q')) === 'x/y', {});
    // pill click opens; focus trap
    await p.evaluate(() => document.activeElement.blur()); await p.click('#nbpill'); await p.waitForTimeout(150); let trapped = true, seen = new Set();
    for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); const r = await p.evaluate(() => { const a = document.activeElement; return [!!a.closest('#nbpanel'), a.id || a.tagName]; }); seen.add(r[1]); if (!r[0]) trapped = false; }
    for (let i = 0; i < 12; i++) { await p.keyboard.press('Shift+Tab'); if (!(await p.evaluate(() => !!document.activeElement.closest('#nbpanel')))) trapped = false; }
    add('K6_focus_trapped_in_dialog', trapped && seen.size >= 3, [...seen]);
    await p.mouse.click(20, 20); await p.waitForTimeout(100); add('K7_click_outside_closes', !(await open(p)), {});
    await p.keyboard.press('/'); await p.waitForTimeout(100); await p.click('#nbclose'); add('K8_close_button', !(await open(p)), {});
    // pill is keyboard operable
    await p.focus('#nbpill'); await p.keyboard.press('Enter'); await p.waitForTimeout(100); add('K9_pill_enter_opens', await open(p), {});
    await ctx.close(); }

  // 4. command line with interpretation, then route strip
  { const { ctx, p } = await page('#home'); await p.keyboard.press('/'); await p.keyboard.type(PARK); await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.querySelector('#nbresult').dataset.state === 'done', null, { timeout: 30000 });
    await p.waitForTimeout(250); await p.screenshot({ path: path.join(OUT, '02_command_line_with_interpretation.png') });
    const c = await p.evaluate(() => { const r = document.getElementById('nbresult'); return { kicker: (r.querySelector('.kicker') || {}).innerText, interp: (r.querySelector('.interp') || {}).innerText, bridge: !!r.querySelector('.bridge'), bubbles: document.querySelectorAll('#nbpanel [class*="bubble"],#nbpanel [class*="avatar"],#nbpanel [class*="msg"]').length, panelText: document.getElementById('nbpanel').innerText, stripShown: !document.getElementById('routestrip').hidden, decision: r.dataset.decision }; });
    add('C1_what_i_understood_card', /What I understood/i.test(c.kicker) && /parking permit costs/.test(c.interp) && c.bridge && c.decision === 'navigate', c);
    add('C2_no_chat_artifacts', c.bubbles === 0 && !/how can I help|^Hi\b|assistant/i.test(c.panelText), c.panelText.slice(0, 120));
    add('C3_strip_not_yet_shown_before_confirm', !c.stripShown, c.stripShown);
    await p.waitForFunction(() => document.getElementById('routestrip') && !document.getElementById('routestrip').hidden, null, { timeout: 10000 }); await p.waitForTimeout(250);
    add('R1_panel_closes_when_route_starts', !(await open(p)) && !(await p.isVisible('#nbscrim')), {});
    await p.screenshot({ path: path.join(OUT, '03_route_strip_walking.png') });
    const w = await p.evaluate(() => { const s = document.getElementById('routestrip'); return { items: [...s.querySelectorAll('.rsl li')].map(l => l.innerText.replace(/\s+/g, ' ').trim()), current: s.querySelectorAll('[aria-current="step"]').length, inputs: s.querySelectorAll('input,textarea').length, role: s.getAttribute('role'), label: s.getAttribute('aria-label'), dismiss: !!s.querySelector('#rsdismiss'), pos: getComputedStyle(s).position, top: Math.round(s.getBoundingClientRect().top) }; });
    add('R2_strip_numbered_steps_current_marked', w.items.length >= 4 && w.current === 1 && w.dismiss, w); add('R3_strip_has_no_input_and_is_nav', w.inputs === 0 && w.role === 'navigation' && w.label === 'Your route', w);
    await p.waitForFunction(() => document.querySelector('#nbresult').dataset.navigation === 'complete', null, { timeout: 15000 }); await p.waitForTimeout(3200);
    const a = await p.evaluate(() => { const s = document.getElementById('routestrip'), li = [...s.querySelectorAll('.rsl li')]; return { hidden: s.hidden, n: li.length, lastActive: li.length && li[li.length - 1].classList.contains('active'), done: li.filter(l => l.classList.contains('done')).length, how: !!s.querySelector('#howbtn'), situ: !!s.querySelector('.situation'), hash: location.hash, traceGone: !document.getElementById('trace').classList.contains('show') }; });
    add('R4_strip_persists_after_arrival', !a.hidden && a.lastActive && a.done === a.n - 1 && a.how && a.situ && a.traceGone, a);
    await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(200); add('R5_strip_sticky_when_scrolled', await p.evaluate(() => Math.round(document.getElementById('routestrip').getBoundingClientRect().top) === 0), {});
    await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(OUT, '04_route_strip_arrived.png') });
    await axe(p, 'route strip arrived');
    await p.click('#rsdismiss'); add('R6_dismiss_hides_strip', await p.evaluate(() => document.getElementById('routestrip').hidden), {});
    await p.keyboard.press('/'); await p.waitForTimeout(100); add('R7_pill_works_again_after_dismiss', await open(p), {});
    await axe(p, 'open command line with result'); await ctx.close(); }

  // 5. clarification stays in dialog, picking closes it and starts strip; Stop dismisses strip while walking
  { const { ctx, p } = await page('#home'); await p.click('#nbpill'); await p.fill('#nbinput', 'I want to appeal'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.querySelector('#nbresult').dataset.decision === 'clarify', null, { timeout: 30000 }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, '05_command_line_one_question.png') });
    const q = await p.evaluate(() => ({ open: document.getElementById('nbpanel').classList.contains('open'), opts: document.querySelectorAll('#nbpanel .optbtn').length, strip: !document.getElementById('routestrip').hidden }));
    add('Q1_clarify_keeps_dialog_open_one_question', q.open && q.opts >= 2 && q.opts <= 3 && !q.strip, q);
    await p.click('.optbtn >> nth=0'); await p.waitForFunction(() => !document.getElementById('routestrip').hidden, null, { timeout: 5000 });
    add('Q2_option_closes_dialog_shows_strip', !(await open(p)), {});
    await p.click('#stripstop').catch(() => {}); await p.waitForTimeout(300);
    add('Q3_stop_while_walking_hides_strip', await p.evaluate(() => document.getElementById('routestrip').hidden && !document.body.classList.contains('walking')), {}); await ctx.close(); }

  // 6. reduced motion + mobile
  { const { ctx, p } = await page('#home', { reduced: true }); await p.click('#nbpill'); await p.fill('#nbinput', 'I need a new passport'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => !document.getElementById('routestrip').hidden, null, { timeout: 15000 });
    const an = await p.evaluate(() => { const s = document.getElementById('routestrip'); return [getComputedStyle(s).animationName, getComputedStyle(document.getElementById('nbpanel')).animationName, getComputedStyle(s.querySelector('li')).transitionDuration] });
    add('M1_reduced_motion', an[0] === 'none' && an[1] === 'none' && /^0s/.test(an[2]), an); await ctx.close(); }
  { const { ctx, p } = await page('#home', { vp: { width: 390, height: 844 } }); await p.screenshot({ path: path.join(OUT, '06_mobile_pill.png') });
    const g = await p.evaluate(() => { const r = document.getElementById('nbpill').getBoundingClientRect(); return { l: r.left, r: innerWidth - r.right, sw: document.documentElement.scrollWidth }; });
    add('M2_mobile_pill_in_view', g.l >= 0 && g.r >= 0 && g.sw <= 392, g);
    await p.click('#nbpill'); await p.fill('#nbinput', 'I need a new passport'); await p.keyboard.press('Enter'); await p.waitForFunction(() => !document.getElementById('routestrip').hidden, null, { timeout: 15000 }); await p.waitForTimeout(3500);
    await p.screenshot({ path: path.join(OUT, '07_mobile_route_strip.png') }); add('M3_mobile_strip_no_overflow', await p.evaluate(() => document.documentElement.scrollWidth <= 392), {});
    await axe(p, 'mobile strip'); await ctx.close(); }
  { const { ctx, p } = await page('#home'); await axe(p, 'home with pill'); await ctx.close(); }

  add('E1_console_errors_and_external_requests', errs.length === 0 && ext.length === 0, { errs, ext });
  await b.close(); const f = checks.filter(c => !c.pass).length; console.log(`SUMMARY r63 entry/strip ${checks.length - f}/${checks.length} pass`); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(checks, null, 1)); process.exit(f ? 1 : 0);
})();
