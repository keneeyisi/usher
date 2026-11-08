#!/usr/bin/env node
// Usher widget browser tests (phase 1 item d): mobile widths, axe-core, reduced motion, keyboard, console/external-request hygiene, and a SECOND site
// (tests/mini-site, a 6-page static site with a path-mode profile, no CivicSphere code) to prove portability and multi-page route persistence.
// usage: NODE_PATH=... node tests/gate_widget_browser.js http://localhost:8030/
const path = require('path'), fs = require('fs'), { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8030/').replace(/\/?$/, '/'), AXE = fs.readFileSync(path.join(__dirname, 'vendor', 'axe.min.js'), 'utf8');
const res = []; const add = (id, pass, d) => { res.push({ id, pass: !!pass, detail: d }); console.log((pass ? 'PASS ' : 'FAIL ') + id.padEnd(46) + ' ' + JSON.stringify(d).slice(0, 260)); };
(async () => {
  const b = await chromium.launch(); const errs = [], ext = [];
  const mk = async (vp, opts = {}) => { const ctx = await b.newContext({ viewport: vp, ...opts }); const pg = await ctx.newPage(); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push(e.message)); pg.on('request', r => { const u = r.url(); if (!u.startsWith(BASE.replace(/\/$/, '')) && !/^(data|blob):/.test(u)) ext.push(u); }); return pg; };
  const axe = async pg => { await pg.addScriptTag({ content: AXE }); return pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length }))); };
  const ready = pg => pg.waitForFunction(() => window.usher && window.usher.embedder && window.usher.embedder.state !== 'loading', null, { timeout: 120000 });
  const arrived = pg => pg.waitForFunction(() => document.getElementById('usher-root').shadowRoot.getElementById('nbresult').dataset.navigation === 'complete', null, { timeout: 60000 });
  const sh = (pg, sel) => pg.locator(sel);
  // ---- A. CivicSphere at three phone widths ----
  for (const w of [320, 375, 414]) {
    const pg = await mk({ width: w, height: 760 }); await pg.goto(BASE + 'index.html#home'); await ready(pg);
    await sh(pg, '#nbpill').click(); await pg.waitForTimeout(450);
    const pr = await pg.evaluate(() => { const p = document.getElementById('usher-root').shadowRoot.getElementById('nbpanel').getBoundingClientRect(); return { left: Math.round(p.left), right: Math.round(p.right), w: Math.round(p.width) }; });
    const v0 = await axe(pg); add(`A_mobile_${w}_axe_panel_open`, v0.length === 0, v0);
    await sh(pg, '#nbinput').fill('I need to replace my identity document'); await sh(pg, '#nbfind').click(); await arrived(pg); await pg.waitForTimeout(500);
    const m = await pg.evaluate(() => { const r = document.getElementById('usher-root').shadowRoot; const p = r.getElementById('nbpanel').getBoundingClientRect(), s = r.getElementById('routestrip').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, panelRight: Math.round(p.right), panelLeft: Math.round(p.left), stripVisible: !r.getElementById('routestrip').hidden && s.height > 0, stripBottom: Math.round(s.bottom) }; });
    add(`A_mobile_${w}_no_overflow_panel_inside`, m.sw <= w + 2 && pr.left >= -1 && pr.right <= w + 1 && pr.w > 200, { ...m, panel: pr });
    add(`A_mobile_${w}_strip_visible_after_arrival`, m.stripVisible, m);
    const v = await axe(pg); add(`A_mobile_${w}_axe_panel_and_strip`, v.length === 0, v);
    await pg.close();
  }
  // ---- keyboard, focus, reduced motion (desktop) ----
  { const pg = await mk({ width: 1280, height: 800 }, { reducedMotion: 'reduce' }); await pg.goto(BASE + 'index.html#home'); await ready(pg);
    await pg.keyboard.press('/'); const open = await pg.evaluate(() => document.getElementById('usher-root').shadowRoot.getElementById('nbpanel').classList.contains('open'));
    const focusIn = await pg.evaluate(() => { const r = document.getElementById('usher-root').shadowRoot; return r.activeElement && r.activeElement.id; });
    add('A_keyboard_slash_opens_and_focuses_input', open && focusIn === 'nbinput', { open, focusIn });
    await pg.keyboard.press('Escape'); const back = await pg.evaluate(() => { const r = document.getElementById('usher-root').shadowRoot; return { open: r.getElementById('nbpanel').classList.contains('open'), focus: r.activeElement && r.activeElement.id }; });
    add('A_keyboard_escape_closes_returns_focus_to_pill', !back.open && back.focus === 'nbpill', back);
    await pg.keyboard.press('/'); await sh(pg, '#nbinput').fill('I need to replace my identity document'); await pg.keyboard.press('Enter'); await arrived(pg);
    const hash = await pg.evaluate(() => location.hash); add('A_reduced_motion_navigates_and_arrives', /identity-replacement/.test(hash), { hash });
    const v = await axe(pg); add('A_reduced_motion_axe', v.length === 0, v);
    await pg.keyboard.press('Escape'); await sh(pg, '#nbpill').click(); await sh(pg, '#nbinput').fill('tell me a joke about cats'); await sh(pg, '#nbfind').click();
    await pg.waitForFunction(() => document.getElementById('usher-root').shadowRoot.getElementById('nbresult').dataset.decision === 'reject', null, { timeout: 30000 }).then(() => add('A_off_topic_rejected_no_navigation', true, {}), () => add('A_off_topic_rejected_no_navigation', false, {}));
    await pg.close(); }
  // ---- B. second site, path mode, multi-page ----
  { const M = BASE + 'tests/mini-site/'; const pg = await mk({ width: 1280, height: 800 }); await pg.goto(M + 'index.html'); await ready(pg);
    add('B_mini_profile_loaded_not_civicsphere', await pg.evaluate(() => window.usher.profile.site.id === 'riverside-library' && window.usher.engine.SERVICES.length === 3), {});
    await sh(pg, '#nbpill').click(); await sh(pg, '#nbinput').fill('Extend the due date on my borrowed books'); await sh(pg, '#nbfind').click();
    await pg.waitForURL(/library\/renew\.html/, { timeout: 30000 }); await pg.waitForLoadState('load'); await pg.waitForTimeout(800);
    add('B_multipage_route_ends_on_renew_page', /library\/renew\.html/.test(pg.url()), { url: pg.url() });
    const strip = await pg.evaluate(() => { const r = document.getElementById('usher-root') && document.getElementById('usher-root').shadowRoot; const s = r && r.getElementById('routestrip'); return { shown: !!s && !s.hidden, text: s ? s.innerText.replace(/\s+/g, ' ').slice(0, 160) : '' }; });
    add('B_route_strip_persists_across_page_loads', strip.shown && /Renew/.test(strip.text), strip);
    await pg.goto(M + 'index.html'); await ready(pg); await sh(pg, '#nbpill').click(); await sh(pg, '#nbinput').fill('how much do overdue books cost per day in late fees'); await sh(pg, '#nbfind').click();
    await pg.waitForURL(/library\/renew\.html#late-fees/, { timeout: 30000 }).then(() => add('B_section_deep_link_reached', true, { url: pg.url() }), () => add('B_section_deep_link_reached', false, { url: pg.url() }));
    await pg.waitForTimeout(1200); const v = await axe(pg); add('B_axe_destination_page', v.length === 0, v);
    await pg.goto(M + 'index.html'); await ready(pg); await sh(pg, '#nbpill').click(); await sh(pg, '#nbinput').fill('what was the football score last night'); await sh(pg, '#nbfind').click();
    await pg.waitForFunction(() => document.getElementById('usher-root').shadowRoot.getElementById('nbresult').dataset.decision === 'reject', null, { timeout: 30000 }).then(() => add('B_off_topic_rejected', true, {}), () => add('B_off_topic_rejected', false, {}));
    await pg.close(); }
  add('Z_console_errors_zero', errs.length === 0, errs.slice(0, 3)); add('Z_external_requests_zero', ext.length === 0, ext.slice(0, 3));
  const pass = res.every(r => r.pass); fs.writeFileSync(path.join(__dirname, 'gate_widget_results.json'), JSON.stringify({ when: new Date().toISOString(), pass, results: res }, null, 1));
  console.log(`WIDGET TESTS ${res.filter(r => r.pass).length}/${res.length} ${pass ? 'PASSED' : 'FAILED'}`); await b.close(); process.exit(pass ? 0 : 1);
})();
